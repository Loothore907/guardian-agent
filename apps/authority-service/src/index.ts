import { chmodSync, lstatSync } from "node:fs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type Server, type Socket } from "node:net";

import { assertLocalAuthorityEndpoint } from "@guardian/authority-client";
import { SqliteAuthorityStore } from "@guardian/authority-store";
import {
  AuthorityIpcRequestSchema,
  AuthorityIpcResponseSchema,
  AuthorityServiceProcessConfigSchema,
  TimestampSchema,
  type AuthorityCapabilityBinding,
  type AuthorityCallerRole,
  type AuthorityIpcOperation,
  type AuthorityIpcRequest,
  type AuthorityServiceProcessConfig,
} from "@guardian/contracts";

const MAX_IPC_REQUEST_BYTES = 16 * 1_024;
const DEFAULT_IPC_TIMEOUT_MS = 15_000;

const ROLE_OPERATIONS: Readonly<Record<AuthorityCallerRole, ReadonlySet<AuthorityIpcOperation>>> = {
  launcher: new Set(["connection.create", "session.create"]),
  research_service: new Set(["research.reserve", "research.settle", "context.append_exposures"]),
  authorization_service: new Set(["approval.store"]),
  broker_service: new Set([
    "session.get",
    "connection.list",
    "approval.get",
    "approval.state",
    "budget.consume_tool",
    "approval.consume",
    "context.append_attempt",
    "context.append_decision",
  ]),
  worker_dispatcher: new Set([
    "budget.consume_worker_tool",
    "budget.consume_local_command",
    "worker.record_violation",
    "worker.interrupt",
  ]),
};

function capabilitiesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function readJsonLine(socket: Socket, maximumBytes: number): Promise<string> {
  return new Promise((resolveLine, rejectLine) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      rejectLine(error);
    };
    socket.on("data", (chunk: Buffer) => {
      if (settled) return;
      bytes += chunk.byteLength;
      if (bytes > maximumBytes) {
        rejectOnce(new TypeError("authority IPC frame is oversized"));
        return;
      }
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks, bytes);
      const newline = buffer.indexOf(0x0a);
      if (newline < 0) return;
      if (
        buffer
          .subarray(newline + 1)
          .toString("utf8")
          .trim().length !== 0
      ) {
        rejectOnce(new TypeError("authority IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.subarray(0, newline).toString("utf8"));
    });
    socket.once("end", () => rejectOnce(new TypeError("authority IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("authority IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

function writeResponse(socket: Socket, response: unknown): void {
  const parsed = AuthorityIpcResponseSchema.parse(response);
  socket.end(`${JSON.stringify(parsed)}\n`);
}

function assertRoleOperations(config: AuthorityServiceProcessConfig): void {
  for (const binding of config.capabilities) {
    const roleOperations = ROLE_OPERATIONS[binding.callerRole];
    if (binding.allowedOperations.some((operation) => !roleOperations.has(operation))) {
      throw new TypeError("authority capability grants an operation outside its caller role");
    }
  }
}

function securePosixEndpoint(endpoint: string): void {
  chmodSync(endpoint, 0o600);
  const endpointStat = lstatSync(endpoint);
  if (
    !endpointStat.isSocket() ||
    endpointStat.uid !== process.getuid?.() ||
    (endpointStat.mode & 0o777) !== 0o600
  ) {
    throw new TypeError("authority IPC endpoint permissions could not be secured");
  }
}

export interface AuthorityServiceBoundary {
  readonly serviceInstanceId: string;
  readonly endpoint: string;
  readonly interruptedSessions: number;
  readonly listen: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export class LocalAuthorityIpcServer implements AuthorityServiceBoundary {
  readonly #config: AuthorityServiceProcessConfig;
  readonly #store: SqliteAuthorityStore;
  readonly #now: () => string;
  readonly #server: Server;
  readonly interruptedSessions: number;
  #listening = false;

  constructor(
    configValue: unknown,
    options: { readonly now?: () => string; readonly timeoutMs?: number } = {},
  ) {
    const parsedConfig = AuthorityServiceProcessConfigSchema.parse(configValue);
    this.#config = {
      ...parsedConfig,
      endpoint: assertLocalAuthorityEndpoint(parsedConfig.endpoint),
    };
    assertRoleOperations(this.#config);
    this.#now = options.now ?? (() => new Date().toISOString());
    const timeoutMs = options.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError(
        "authority IPC timeout must be an integer from 100 to 60000 milliseconds",
      );
    }
    this.#store = new SqliteAuthorityStore(this.#config.authorityStorePath, {
      workspaceRoots: this.#config.workspaceRoots,
      now: this.#now,
    });
    this.#store.initialize();
    this.interruptedSessions = this.#store.interruptActiveSessions();
    this.#server = createServer((socket) => {
      socket.setTimeout(timeoutMs, () => socket.destroy());
      void this.#serve(socket);
    });
  }

  get serviceInstanceId(): string {
    return this.#config.serviceInstanceId;
  }

  get endpoint(): string {
    return this.#config.endpoint;
  }

  async listen(): Promise<void> {
    if (this.#listening) throw new TypeError("authority IPC server is already listening");
    await new Promise<void>((resolveListen, rejectListen) => {
      const onError = (error: Error) => rejectListen(error);
      this.#server.once("error", onError);
      this.#server.listen(this.#config.endpoint, () => {
        this.#server.off("error", onError);
        this.#listening = true;
        try {
          if (process.platform !== "win32") securePosixEndpoint(this.#config.endpoint);
          resolveListen();
        } catch (error) {
          this.#server.close(() => {
            this.#listening = false;
            rejectListen(error instanceof Error ? error : new Error("authority IPC setup failed"));
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.#listening) {
      await new Promise<void>((resolveClose, rejectClose) => {
        this.#server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
      this.#listening = false;
    }
    this.#store.close();
  }

  #bindingFor(request: AuthorityIpcRequest): AuthorityCapabilityBinding | null {
    return (
      this.#config.capabilities.find((binding) =>
        capabilitiesMatch(request.capability, binding.capability),
      ) ?? null
    );
  }

  async #serve(socket: Socket): Promise<void> {
    let request: AuthorityIpcRequest;
    try {
      request = AuthorityIpcRequestSchema.parse(
        JSON.parse(await readJsonLine(socket, MAX_IPC_REQUEST_BYTES)) as unknown,
      );
    } catch {
      writeResponse(socket, {
        schemaVersion: 1,
        requestId: randomUUID(),
        ok: false,
        error: "invalid_request",
      });
      return;
    }

    const fail = (
      error:
        | "unauthorized"
        | "stale_capability"
        | "binding_mismatch"
        | "operation_not_allowed"
        | "authority_unavailable",
    ) =>
      writeResponse(socket, {
        schemaVersion: 1,
        requestId: request.requestId,
        ok: false,
        error,
      });
    const binding = this.#bindingFor(request);
    if (binding === null) {
      fail("unauthorized");
      return;
    }
    if (
      binding.callerRole !== request.callerRole ||
      binding.callerId !== request.callerId ||
      binding.sessionId !== request.sessionId
    ) {
      fail("binding_mismatch");
      return;
    }
    let evaluatedAt: string;
    try {
      evaluatedAt = TimestampSchema.parse(this.#now());
    } catch {
      fail("authority_unavailable");
      return;
    }
    if (
      Date.parse(evaluatedAt) < Date.parse(binding.issuedAt) ||
      Date.parse(evaluatedAt) >= Date.parse(binding.expiresAt)
    ) {
      fail("stale_capability");
      return;
    }
    if (
      !binding.allowedOperations.includes(request.operation) ||
      !ROLE_OPERATIONS[binding.callerRole].has(request.operation)
    ) {
      fail("operation_not_allowed");
      return;
    }

    try {
      const base = { schemaVersion: 1, requestId: request.requestId, ok: true as const };
      switch (request.operation) {
        case "connection.create":
          this.#store.createConnection(request.connection);
          writeResponse(socket, { ...base, operation: request.operation, result: "created" });
          return;
        case "session.create":
          if (
            request.session.sessionId !== request.sessionId ||
            request.session.callerId !== request.callerId ||
            request.budget.sessionId !== request.sessionId
          ) {
            fail("binding_mismatch");
            return;
          }
          this.#store.createSession(request.session, request.budget, request.connectionIds);
          writeResponse(socket, { ...base, operation: request.operation, result: "created" });
          return;
        case "approval.store":
          if (
            request.approval.sessionId !== request.sessionId ||
            request.approval.callerId !== request.callerId
          ) {
            fail("binding_mismatch");
            return;
          }
          this.#store.storeApproval(request.approval);
          writeResponse(socket, { ...base, operation: request.operation, result: "stored" });
          return;
        case "research.reserve":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.reserveResearch(request.sessionId, request.requestedResults),
          });
          return;
        case "research.settle":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.settleResearchResults(
              request.reservationId,
              request.sessionId,
              request.acceptedResults,
            ),
          });
          return;
        case "context.append_exposures":
          if (request.exposures.some((exposure) => exposure.sessionId !== request.sessionId)) {
            fail("binding_mismatch");
            return;
          }
          this.#store.appendEvidenceExposures(request.exposures);
          writeResponse(socket, { ...base, operation: request.operation, result: "recorded" });
          return;
        case "session.get":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.getSession(request.sessionId),
          });
          return;
        case "connection.list":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.getSessionConnections(request.sessionId),
          });
          return;
        case "approval.get": {
          const approval = this.#store.getApproval(request.approvalId);
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: approval?.sessionId === request.sessionId ? approval : null,
          });
          return;
        }
        case "approval.state": {
          const approval = this.#store.getApproval(request.approvalId);
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result:
              approval?.sessionId === request.sessionId
                ? this.#store.getApprovalState(request.approvalId)
                : null,
          });
          return;
        }
        case "budget.consume_tool":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.consumeToolCall(request.sessionId),
          });
          return;
        case "budget.consume_local_command":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.consumeLocalCommand(
              request.sessionId,
              request.executionId,
              request.executionDigest,
            ),
          });
          return;
        case "budget.consume_worker_tool":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.consumeWorkerToolCall(
              request.sessionId,
              request.executionId,
              request.executionDigest,
            ),
          });
          return;
        case "worker.record_violation":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.recordWorkerViolation(
              request.sessionId,
              request.boundaryId,
              request.boundaryDigest,
              request.code,
            ),
          });
          return;
        case "worker.interrupt":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.interruptWorkerSession(
              request.sessionId,
              request.boundaryId,
              request.boundaryDigest,
              request.failure,
            ),
          });
          return;
        case "approval.consume":
          if (
            request.consumption.sessionId !== request.sessionId ||
            request.consumption.callerId !== request.callerId
          ) {
            fail("binding_mismatch");
            return;
          }
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#store.consumeApproval(request.consumption),
          });
          return;
        case "context.append_attempt":
          if (
            request.attempt.sessionId !== request.sessionId ||
            request.attempt.callerId !== request.callerId
          ) {
            fail("binding_mismatch");
            return;
          }
          this.#store.appendAuthorityAttempt(request.attempt);
          writeResponse(socket, { ...base, operation: request.operation, result: "recorded" });
          return;
        case "context.append_decision":
          if (request.decision.sessionId !== request.sessionId) {
            fail("binding_mismatch");
            return;
          }
          this.#store.appendAuthorityDecision(request.decision);
          writeResponse(socket, { ...base, operation: request.operation, result: "recorded" });
          return;
      }
    } catch {
      fail("authority_unavailable");
    }
  }
}

export async function startAuthorityService(
  config: unknown,
  options: { readonly now?: () => string; readonly timeoutMs?: number } = {},
): Promise<AuthorityServiceBoundary> {
  const server = new LocalAuthorityIpcServer(config, options);
  try {
    await server.listen();
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
}
