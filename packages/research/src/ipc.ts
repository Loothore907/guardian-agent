import { randomUUID, timingSafeEqual } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, createServer, type Server, type Socket } from "node:net";

import {
  ControlledContentIpcRequestSchema,
  ControlledContentIpcResponseSchema,
  ControlledContentJourneyResultSchema,
  ControlledContentRequestSchema,
  OpaqueIdSchema,
  ResearchBudgetSnapshotSchema,
  ResearchIpcRequestSchema,
  ResearchIpcFailureReasonSchema,
  ResearchIpcResponseSchema,
  ResearchJourneyResultSchema,
  ResearchRequestSchema,
  ResearchServiceProcessConfigSchema,
  TimestampSchema,
  type ControlledContentIpcRequest,
  type ControlledContentJourneyResult,
  type ControlledContentRequest,
  type ResearchBudgetSnapshot,
  type ResearchIpcFailureReason,
  type ResearchIpcRequest,
  type ResearchJourneyResult,
  type ResearchRequest,
  type ResearchServiceProcessConfig,
} from "@guardian/contracts";

const MAX_IPC_REQUEST_BYTES = 16 * 1_024;
const MAX_IPC_RESPONSE_BYTES = 64 * 1_024;
const DEFAULT_IPC_TIMEOUT_MS = 15_000;
const PIPE_NAME_PATTERN = /^guardian-research-[0-9a-f-]{36}$/u;

function assertLocalResearchEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("research IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !PIPE_NAME_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("research IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !PIPE_NAME_PATTERN.test(basename(value).replace(/\.sock$/u, "")) ||
    !value.endsWith(".sock")
  ) {
    throw new TypeError("research IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export interface ResearchIpcCredentials {
  readonly endpoint: string;
  readonly capability: string;
}

export function createResearchIpcCredentials(): ResearchIpcCredentials {
  const id = randomUUID();
  return {
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\guardian-research-${id}`
        : join(tmpdir(), `guardian-research-${id}.sock`),
    capability: randomUUID(),
  };
}

function capabilitiesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function writeResponse(socket: Socket, response: unknown): void {
  const research = ResearchIpcResponseSchema.safeParse(response);
  const parsed = research.success
    ? research.data
    : ControlledContentIpcResponseSchema.parse(response);
  socket.end(`${JSON.stringify(parsed)}\n`);
}

function readJsonLine(socket: Socket, maximumBytes: number): Promise<string> {
  return new Promise((resolveLine, rejectLine) => {
    let buffer = "";
    let bytes = 0;
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      rejectLine(error);
    };
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      if (settled) return;
      bytes += Buffer.byteLength(chunk, "utf8");
      if (bytes > maximumBytes) {
        rejectOnce(new TypeError("research IPC frame is oversized"));
        return;
      }
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      if (buffer.slice(newline + 1).trim().length !== 0) {
        rejectOnce(new TypeError("research IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.slice(0, newline));
    });
    socket.once("end", () => rejectOnce(new TypeError("research IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("research IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

export interface ResearchIpcHandlerResult {
  readonly result: ResearchJourneyResult;
  readonly budget: ResearchBudgetSnapshot;
}

export type ResearchIpcHandler = (
  request: ResearchRequest,
  requestedAt: string,
) => Promise<ResearchIpcHandlerResult>;

export interface ControlledContentIpcHandlerResult {
  readonly result: ControlledContentJourneyResult;
  readonly budget: ResearchBudgetSnapshot;
}

export type ControlledContentIpcHandler = (
  request: ControlledContentRequest,
  requestedAt: string,
) => Promise<ControlledContentIpcHandlerResult>;

export class LocalResearchIpcServer {
  readonly #config: ResearchServiceProcessConfig;
  readonly #handler: ResearchIpcHandler;
  readonly #controlledContentHandler: ControlledContentIpcHandler | undefined;
  readonly #now: () => string;
  readonly #server: Server;
  #listening = false;

  constructor(
    configValue: unknown,
    handler: ResearchIpcHandler,
    options: {
      readonly now?: () => string;
      readonly controlledContentHandler?: ControlledContentIpcHandler;
    } = {},
  ) {
    const config = ResearchServiceProcessConfigSchema.parse(configValue);
    this.#config = { ...config, endpoint: assertLocalResearchEndpoint(config.endpoint) };
    this.#handler = handler;
    this.#controlledContentHandler = options.controlledContentHandler;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#server = createServer((socket) => void this.#serve(socket));
  }

  async listen(): Promise<void> {
    if (this.#listening) throw new TypeError("research IPC server is already listening");
    await new Promise<void>((resolveListen, rejectListen) => {
      const onError = (error: Error) => rejectListen(error);
      this.#server.once("error", onError);
      this.#server.listen(this.#config.endpoint, () => {
        this.#server.off("error", onError);
        this.#listening = true;
        resolveListen();
      });
    });
  }

  async close(): Promise<void> {
    if (!this.#listening) return;
    await new Promise<void>((resolveClose, rejectClose) => {
      this.#server.close((error) => {
        if (error) rejectClose(error);
        else resolveClose();
      });
    });
    this.#listening = false;
  }

  async #serve(socket: Socket): Promise<void> {
    socket.setTimeout(DEFAULT_IPC_TIMEOUT_MS, () => socket.destroy());
    let request: ResearchIpcRequest | ControlledContentIpcRequest;
    try {
      const frame = await readJsonLine(socket, MAX_IPC_REQUEST_BYTES);
      const value = JSON.parse(frame) as unknown;
      const search = ResearchIpcRequestSchema.safeParse(value);
      request = search.success ? search.data : ControlledContentIpcRequestSchema.parse(value);
    } catch {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "invalid_request" });
      return;
    }

    if (
      !capabilitiesMatch(request.capability, this.#config.capability) ||
      request.sessionId !== this.#config.sessionId ||
      request.callerId !== this.#config.callerId ||
      request.missionId !== this.#config.missionId ||
      request.missionVersion !== this.#config.missionVersion ||
      request.profileId !== this.#config.profileId ||
      request.profileVersion !== this.#config.profileVersion ||
      request.policyVersion !== this.#config.policyVersion
    ) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "unauthorized" });
      return;
    }
    let evaluatedAt: string;
    try {
      evaluatedAt = TimestampSchema.parse(this.#now());
    } catch {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "service_unavailable" });
      return;
    }
    const evaluationTime = Date.parse(evaluatedAt);
    if (evaluationTime < Date.parse(this.#config.startsAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "not_active" });
      return;
    }
    if (evaluationTime >= Date.parse(this.#config.expiresAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "expired" });
      return;
    }

    try {
      if ("operation" in request) {
        if (
          this.#config.controlledContent === undefined ||
          this.#controlledContentHandler === undefined
        ) {
          throw new ResearchIpcError("url_not_allowed");
        }
        const handled = await this.#controlledContentHandler(request.request, evaluatedAt);
        const result = ControlledContentJourneyResultSchema.parse(handled.result);
        const budget = ResearchBudgetSnapshotSchema.parse(handled.budget);
        if (
          budget.sessionId !== this.#config.sessionId ||
          result.provenance.sessionId !== this.#config.sessionId
        ) {
          throw new TypeError("controlled content service returned a mismatched session binding");
        }
        writeResponse(socket, { schemaVersion: 1, ok: true, result, budget });
        return;
      }
      const handled = await this.#handler(request.request, evaluatedAt);
      const result = ResearchJourneyResultSchema.parse(handled.result);
      const budget = ResearchBudgetSnapshotSchema.parse(handled.budget);
      if (
        budget.sessionId !== this.#config.sessionId ||
        result.provenance.some((event) => event.sessionId !== this.#config.sessionId)
      ) {
        throw new TypeError("research service returned a mismatched session binding");
      }
      writeResponse(socket, { schemaVersion: 1, ok: true, result, budget });
    } catch (error) {
      const parsedReason = ResearchIpcFailureReasonSchema.safeParse(
        typeof error === "object" && error !== null && "reason" in error ? error.reason : undefined,
      );
      const reason: ResearchIpcFailureReason = parsedReason.success
        ? parsedReason.data
        : "service_unavailable";
      writeResponse(socket, { schemaVersion: 1, ok: false, error: reason });
    }
  }
}

export class ResearchIpcError extends Error {
  readonly reason: ResearchIpcFailureReason;

  constructor(reason: ResearchIpcFailureReason) {
    super(`research service failed: ${reason}`);
    this.name = "ResearchIpcError";
    this.reason = reason;
  }
}

export interface ResearchServiceClient {
  search(request: ResearchRequest, requestedAt: string): Promise<ResearchIpcHandlerResult>;
}

export interface ControlledContentServiceClient {
  extract(
    request: ControlledContentRequest,
    requestedAt: string,
  ): Promise<ControlledContentIpcHandlerResult>;
}

export class LocalResearchIpcClient
  implements ResearchServiceClient, ControlledContentServiceClient
{
  readonly #endpoint: string;
  readonly #binding: Omit<ResearchIpcRequest, "request" | "requestedAt">;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly endpoint: unknown;
    readonly capability: unknown;
    readonly sessionId: unknown;
    readonly callerId: unknown;
    readonly missionId: unknown;
    readonly missionVersion: unknown;
    readonly profileId: unknown;
    readonly profileVersion: unknown;
    readonly policyVersion: unknown;
    readonly timeoutMs?: number;
  }) {
    this.#endpoint = assertLocalResearchEndpoint(options.endpoint);
    this.#binding = ResearchIpcRequestSchema.omit({ request: true, requestedAt: true }).parse({
      schemaVersion: 1,
      capability: OpaqueIdSchema.parse(options.capability),
      sessionId: options.sessionId,
      callerId: options.callerId,
      missionId: options.missionId,
      missionVersion: options.missionVersion,
      profileId: options.profileId,
      profileVersion: options.profileVersion,
      policyVersion: options.policyVersion,
    });
    const timeoutMs = options.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError("research IPC timeout must be an integer from 100 to 60000 milliseconds");
    }
    this.#timeoutMs = timeoutMs;
  }

  async search(
    requestValue: ResearchRequest,
    requestedAtValue: string,
  ): Promise<ResearchIpcHandlerResult> {
    const request = ResearchRequestSchema.parse(requestValue);
    const requestedAt = TimestampSchema.parse(requestedAtValue);
    const frame = ResearchIpcRequestSchema.parse({
      ...this.#binding,
      requestedAt,
      request,
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () => socket.destroy(new Error("research IPC timeout")));
    try {
      const responsePromise = readJsonLine(socket, MAX_IPC_RESPONSE_BYTES);
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = ResearchIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (!response.ok) throw new ResearchIpcError(response.error);
      if (
        response.budget.sessionId !== this.#binding.sessionId ||
        response.result.provenance.some((event) => event.sessionId !== this.#binding.sessionId)
      ) {
        throw new ResearchIpcError("service_unavailable");
      }
      return response;
    } catch (error) {
      if (error instanceof ResearchIpcError) throw error;
      throw new ResearchIpcError("service_unavailable");
    } finally {
      socket.destroy();
    }
  }

  async extract(
    requestValue: ControlledContentRequest,
    requestedAtValue: string,
  ): Promise<ControlledContentIpcHandlerResult> {
    const request = ControlledContentRequestSchema.parse(requestValue);
    const requestedAt = TimestampSchema.parse(requestedAtValue);
    const frame = ControlledContentIpcRequestSchema.parse({
      ...this.#binding,
      requestedAt,
      operation: "controlled_extract",
      request,
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () => socket.destroy(new Error("research IPC timeout")));
    try {
      const responsePromise = readJsonLine(socket, MAX_IPC_RESPONSE_BYTES);
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = ControlledContentIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (!response.ok) throw new ResearchIpcError(response.error);
      if (
        response.budget.sessionId !== this.#binding.sessionId ||
        response.result.provenance.sessionId !== this.#binding.sessionId
      ) {
        throw new ResearchIpcError("service_unavailable");
      }
      return response;
    } catch (error) {
      if (error instanceof ResearchIpcError) throw error;
      throw new ResearchIpcError("service_unavailable");
    } finally {
      socket.destroy();
    }
  }
}
