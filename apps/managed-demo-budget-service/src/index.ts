import { randomUUID, timingSafeEqual } from "node:crypto";
import { chmodSync, lstatSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";

import {
  ManagedDemoBudgetIpcRequestSchema,
  ManagedDemoBudgetIpcResponseSchema,
  ManagedDemoBudgetServiceProcessConfigSchema,
  TimestampSchema,
  type ManagedDemoBudgetCallerRole,
  type ManagedDemoBudgetCapabilityBinding,
  type ManagedDemoBudgetIpcOperation,
  type ManagedDemoBudgetIpcRequest,
  type ManagedDemoBudgetServiceProcessConfig,
  type ManagedDemoUsageObservation,
} from "@guardian/contracts";
import { assertLinuxPeerHelperAvailable, LinuxPeerVerifier } from "@guardian/linux-peer-identity";
import {
  ManagedDemoAdmissionQueue,
  ManagedDemoJourneyUsageCollector,
  SqliteManagedDemoBudgetLedger,
} from "@guardian/managed-demo-budget";
import { assertLocalManagedDemoBudgetEndpoint } from "@guardian/managed-demo-budget-client";

const MAX_IPC_REQUEST_BYTES = 16 * 1_024;
const DEFAULT_IPC_TIMEOUT_MS = 180_000;

const ROLE_OPERATIONS: Readonly<
  Record<ManagedDemoBudgetCallerRole, ReadonlySet<ManagedDemoBudgetIpcOperation>>
> = {
  journey_controller: new Set(["admission.request", "journey.settle"]),
  interaction_service: new Set(["usage.record"]),
  guardian_service: new Set(["usage.record"]),
  worker_service: new Set(["usage.record"]),
  research_service: new Set(["usage.record"]),
  operator: new Set(["budget.snapshot", "policy.update", "prices.update"]),
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
        rejectOnce(new TypeError("managed-demo budget IPC frame is oversized"));
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
        rejectOnce(new TypeError("managed-demo budget IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.subarray(0, newline).toString("utf8"));
    });
    socket.once("end", () =>
      rejectOnce(new TypeError("managed-demo budget IPC frame is incomplete")),
    );
    socket.once("close", () =>
      rejectOnce(new TypeError("managed-demo budget IPC connection closed")),
    );
    socket.once("error", rejectOnce);
  });
}

function writeResponse(socket: Socket, response: unknown): void {
  const parsed = ManagedDemoBudgetIpcResponseSchema.parse(response);
  socket.end(`${JSON.stringify(parsed)}\n`);
}

function assertRoleOperations(config: ManagedDemoBudgetServiceProcessConfig): void {
  for (const binding of config.capabilities) {
    const roleOperations = ROLE_OPERATIONS[binding.callerRole];
    if (binding.allowedOperations.some((operation) => !roleOperations.has(operation))) {
      throw new TypeError("managed-demo capability grants an operation outside its caller role");
    }
  }
}

function usageMatchesRole(
  role: ManagedDemoBudgetCallerRole,
  usage: ManagedDemoUsageObservation,
): boolean {
  switch (role) {
    case "interaction_service":
      return usage.provider === "nebius_token_factory" && usage.role === "mission_dialogue";
    case "guardian_service":
      return (
        usage.provider === "nebius_token_factory" &&
        (usage.role === "contextual_risk_primary" || usage.role === "contextual_risk_escalation")
      );
    case "worker_service":
      return usage.provider === "nebius_token_factory" && usage.role === "native_worker";
    case "research_service":
      return usage.provider === "tavily";
    case "journey_controller":
    case "operator":
      return false;
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
    throw new TypeError("managed-demo budget IPC endpoint permissions could not be secured");
  }
}

interface PeerVerifier {
  verify(socket: Socket): Promise<unknown>;
}

export interface ManagedDemoBudgetServiceBoundary {
  readonly serviceInstanceId: string;
  readonly deploymentId: string;
  readonly endpoint: string;
  readonly listen: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export class LocalManagedDemoBudgetIpcServer implements ManagedDemoBudgetServiceBoundary {
  readonly #config: ManagedDemoBudgetServiceProcessConfig;
  readonly #queue: ManagedDemoAdmissionQueue;
  readonly #now: () => string;
  readonly #server: Server;
  readonly #peerVerifier: PeerVerifier | null;
  readonly #collectors = new Map<
    string,
    { readonly journeyId: string; readonly collector: ManagedDemoJourneyUsageCollector }
  >();
  #listening = false;

  constructor(
    configValue: unknown,
    options: {
      readonly now?: () => string;
      readonly randomId?: () => string;
      readonly timeoutMs?: number;
      readonly peerVerifier?: PeerVerifier;
    } = {},
  ) {
    const parsed = ManagedDemoBudgetServiceProcessConfigSchema.parse(configValue);
    this.#config = {
      ...parsed,
      endpoint: assertLocalManagedDemoBudgetEndpoint(parsed.endpoint),
    };
    assertRoleOperations(this.#config);
    this.#now = options.now ?? (() => new Date().toISOString());
    const timeoutMs = options.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 180_000) {
      throw new TypeError(
        "managed-demo budget IPC timeout must be an integer from 100 to 180000 milliseconds",
      );
    }
    if (process.platform === "linux" && options.peerVerifier === undefined) {
      assertLinuxPeerHelperAvailable();
    }
    const ledger = new SqliteManagedDemoBudgetLedger(this.#config.ledgerPath, {
      deployment: this.#config.deployment,
      policy: this.#config.policy,
      prices: this.#config.prices,
      now: this.#now,
      ...(options.randomId === undefined ? {} : { randomId: options.randomId }),
    });
    ledger.initialize();
    this.#queue = new ManagedDemoAdmissionQueue({
      ledger,
      policy: this.#config.policy,
      now: this.#now,
    });
    this.#peerVerifier =
      options.peerVerifier ??
      (process.platform === "linux"
        ? new LinuxPeerVerifier({ supervisorPid: process.ppid })
        : null);
    this.#server = createServer((socket) => {
      socket.setTimeout(timeoutMs, () => socket.destroy());
      socket.pause();
      void this.#accept(socket);
    });
  }

  get serviceInstanceId(): string {
    return this.#config.serviceInstanceId;
  }

  get deploymentId(): string {
    return this.#config.deployment.deploymentId;
  }

  get endpoint(): string {
    return this.#config.endpoint;
  }

  async listen(): Promise<void> {
    if (this.#listening) throw new TypeError("managed-demo budget IPC server is already listening");
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
            rejectListen(
              error instanceof Error ? error : new Error("managed-demo budget IPC setup failed"),
            );
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    this.#queue.close();
    if (this.#listening) {
      await new Promise<void>((resolveClose, rejectClose) => {
        this.#server.close((error) => (error ? rejectClose(error) : resolveClose()));
      });
      this.#listening = false;
    }
  }

  #bindingFor(request: ManagedDemoBudgetIpcRequest): ManagedDemoBudgetCapabilityBinding | null {
    return (
      this.#config.capabilities.find((binding) =>
        capabilitiesMatch(request.capability, binding.capability),
      ) ?? null
    );
  }

  async #accept(socket: Socket): Promise<void> {
    try {
      if (this.#peerVerifier !== null) await this.#peerVerifier.verify(socket);
      const serving = this.#serve(socket);
      socket.resume();
      await serving;
    } catch {
      socket.destroy();
    }
  }

  async #serve(socket: Socket): Promise<void> {
    let request: ManagedDemoBudgetIpcRequest;
    try {
      request = ManagedDemoBudgetIpcRequestSchema.parse(
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
        | "invalid_request"
        | "unauthorized"
        | "stale_capability"
        | "binding_mismatch"
        | "operation_not_allowed"
        | "budget_unavailable",
    ) =>
      writeResponse(socket, { schemaVersion: 1, requestId: request.requestId, ok: false, error });
    const capabilityBinding = this.#bindingFor(request);
    if (capabilityBinding === null) {
      fail("unauthorized");
      return;
    }
    if (
      capabilityBinding.callerRole !== request.callerRole ||
      capabilityBinding.callerId !== request.callerId ||
      capabilityBinding.deploymentId !== request.deploymentId ||
      request.deploymentId !== this.#config.deployment.deploymentId
    ) {
      fail("binding_mismatch");
      return;
    }
    let evaluatedAt: string;
    try {
      evaluatedAt = TimestampSchema.parse(this.#now());
    } catch {
      fail("budget_unavailable");
      return;
    }
    if (
      Date.parse(evaluatedAt) < Date.parse(capabilityBinding.issuedAt) ||
      Date.parse(evaluatedAt) >= Date.parse(capabilityBinding.expiresAt)
    ) {
      fail("stale_capability");
      return;
    }
    if (
      !capabilityBinding.allowedOperations.includes(request.operation) ||
      !ROLE_OPERATIONS[capabilityBinding.callerRole].has(request.operation)
    ) {
      fail("operation_not_allowed");
      return;
    }
    if (
      (request.operation === "policy.update" || request.operation === "prices.update") &&
      (Date.parse(request.update.updatedAt) < Date.parse(capabilityBinding.issuedAt) ||
        Date.parse(request.update.updatedAt) >= Date.parse(capabilityBinding.expiresAt) ||
        Date.parse(request.update.updatedAt) > Date.parse(evaluatedAt))
    ) {
      fail("invalid_request");
      return;
    }

    try {
      const base = { schemaVersion: 1, requestId: request.requestId, ok: true as const };
      switch (request.operation) {
        case "admission.request": {
          const result = await this.#queue.admit(request.admission);
          if (result.state === "admitted") {
            this.#collectors.set(result.reservationId, {
              journeyId: result.journeyId,
              collector: new ManagedDemoJourneyUsageCollector({
                reservationId: result.reservationId,
                journeyId: result.journeyId,
              }),
            });
          }
          writeResponse(socket, { ...base, operation: request.operation, result });
          return;
        }
        case "usage.record": {
          if (!usageMatchesRole(capabilityBinding.callerRole, request.usage)) {
            fail("operation_not_allowed");
            return;
          }
          const collectorBinding = this.#collectors.get(request.reservationId);
          if (collectorBinding === undefined || collectorBinding.journeyId !== request.journeyId) {
            fail("binding_mismatch");
            return;
          }
          collectorBinding.collector.record(request.usage);
          writeResponse(socket, { ...base, operation: request.operation, result: "recorded" });
          return;
        }
        case "journey.settle": {
          const collectorBinding = this.#collectors.get(request.reservationId);
          if (collectorBinding === undefined || collectorBinding.journeyId !== request.journeyId) {
            fail("binding_mismatch");
            return;
          }
          const settlement = collectorBinding.collector.settlement(
            request.outcome,
            request.settledAt,
          );
          const result = this.#queue.settle(settlement);
          this.#collectors.delete(request.reservationId);
          writeResponse(socket, { ...base, operation: request.operation, result });
          return;
        }
        case "budget.snapshot":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#queue.snapshot(),
          });
          return;
        case "policy.update":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#queue.updatePolicy(request.update, evaluatedAt),
          });
          return;
        case "prices.update":
          writeResponse(socket, {
            ...base,
            operation: request.operation,
            result: this.#queue.updatePrices(request.update, evaluatedAt),
          });
          return;
      }
    } catch {
      fail("budget_unavailable");
    }
  }
}

export async function startManagedDemoBudgetService(
  config: unknown,
  options: {
    readonly now?: () => string;
    readonly randomId?: () => string;
    readonly timeoutMs?: number;
    readonly peerVerifier?: PeerVerifier;
  } = {},
): Promise<ManagedDemoBudgetServiceBoundary> {
  const server = new LocalManagedDemoBudgetIpcServer(config, options);
  try {
    await server.listen();
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
}
