import { randomUUID, timingSafeEqual } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, createServer, type Server, type Socket } from "node:net";

import {
  BrokerExecutionRequestSchema,
  BrokerExecutionResultSchema,
  BrokerIpcRequestSchema,
  BrokerIpcResponseSchema,
  BrokerIpcServiceConfigSchema,
  TimestampSchema,
  type BrokerExecutionRequest,
  type BrokerExecutionResult,
  type BrokerIpcFailureReason,
  type BrokerIpcRequest,
  type BrokerIpcServiceConfig,
} from "@guardian/contracts";

const MAX_IPC_REQUEST_BYTES = 64 * 1_024;
const MAX_IPC_RESPONSE_BYTES = 64 * 1_024;
export const brokerIpcBoundary = {
  timeoutMs: 55_000,
} as const;
const DEFAULT_IPC_TIMEOUT_MS = brokerIpcBoundary.timeoutMs;
const PIPE_NAME_PATTERN = /^guardian-broker-[0-9a-f-]{36}$/u;

function assertLocalBrokerEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("broker IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !PIPE_NAME_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("broker IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !PIPE_NAME_PATTERN.test(basename(value).replace(/\.sock$/u, "")) ||
    !value.endsWith(".sock")
  ) {
    throw new TypeError("broker IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export function createBrokerIpcCredentials() {
  const id = randomUUID();
  return {
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\guardian-broker-${id}`
        : join(tmpdir(), `guardian-broker-${id}.sock`),
    capability: randomUUID(),
  };
}

function capabilitiesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
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
        rejectOnce(new TypeError("broker IPC frame is oversized"));
        return;
      }
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      if (buffer.slice(newline + 1).trim().length !== 0) {
        rejectOnce(new TypeError("broker IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.slice(0, newline));
    });
    socket.once("end", () => rejectOnce(new TypeError("broker IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("broker IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

function writeResponse(socket: Socket, response: unknown): void {
  const parsed = BrokerIpcResponseSchema.parse(response);
  socket.end(`${JSON.stringify(parsed)}\n`);
}

function successfulResultMatchesRequest(
  result: BrokerExecutionResult,
  execution: BrokerExecutionRequest,
): boolean {
  if (!result.ok) return true;
  const proposal = execution.request.proposal;
  if (proposal.operation === "github.pull_request.read") {
    if (!("state" in result.result)) return false;
    return (
      result.result.owner === proposal.arguments.owner &&
      result.result.repository === proposal.arguments.repository &&
      result.result.pullRequest === proposal.arguments.pullRequest &&
      result.result.headCommit === proposal.resourceVersion.headCommit
    );
  }
  if (proposal.operation === "github.pull_request.merge") {
    if (!("status" in result.result)) return false;
    return (
      result.result.owner === proposal.arguments.owner &&
      result.result.repository === proposal.arguments.repository &&
      result.result.pullRequest === proposal.arguments.pullRequest &&
      result.result.headCommit === proposal.arguments.expectedHeadCommit
    );
  }
  return false;
}

export type BrokerIpcHandler = (
  execution: BrokerExecutionRequest,
  evaluatedAt: string,
) => Promise<BrokerExecutionResult>;

export class LocalBrokerIpcServer {
  readonly #config: BrokerIpcServiceConfig;
  readonly #handler: BrokerIpcHandler;
  readonly #now: () => string;
  readonly #server: Server;
  #listening = false;

  constructor(
    configValue: unknown,
    handler: BrokerIpcHandler,
    options: { readonly now?: () => string } = {},
  ) {
    const config = BrokerIpcServiceConfigSchema.parse(configValue);
    this.#config = { ...config, endpoint: assertLocalBrokerEndpoint(config.endpoint) };
    this.#handler = handler;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#server = createServer((socket) => void this.#serve(socket));
  }

  async listen(): Promise<void> {
    if (this.#listening) throw new TypeError("broker IPC server is already listening");
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
      this.#server.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
    this.#listening = false;
  }

  async #serve(socket: Socket): Promise<void> {
    socket.setTimeout(DEFAULT_IPC_TIMEOUT_MS, () => socket.destroy());
    let request: BrokerIpcRequest;
    try {
      request = BrokerIpcRequestSchema.parse(
        JSON.parse(await readJsonLine(socket, MAX_IPC_REQUEST_BYTES)) as unknown,
      );
    } catch {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "invalid_request" });
      return;
    }
    if (
      !capabilitiesMatch(request.capability, this.#config.capability) ||
      request.sessionId !== this.#config.sessionId ||
      request.callerId !== this.#config.callerId ||
      request.execution.request.sessionId !== this.#config.sessionId ||
      request.execution.request.callerId !== this.#config.callerId
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
    if (
      Date.parse(evaluatedAt) < Date.parse(this.#config.startsAt) ||
      Date.parse(request.requestedAt) < Date.parse(this.#config.startsAt)
    ) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "not_active" });
      return;
    }
    if (
      Date.parse(evaluatedAt) >= Date.parse(this.#config.expiresAt) ||
      Date.parse(request.requestedAt) >= Date.parse(this.#config.expiresAt)
    ) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "expired" });
      return;
    }
    if (Date.parse(request.requestedAt) > Date.parse(evaluatedAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "invalid_request" });
      return;
    }
    try {
      const result = BrokerExecutionResultSchema.parse(
        await this.#handler(request.execution, evaluatedAt),
      );
      if (!successfulResultMatchesRequest(result, request.execution)) {
        throw new TypeError("broker result does not bind the request");
      }
      writeResponse(socket, { schemaVersion: 1, ok: true, result });
    } catch {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "service_unavailable" });
    }
  }
}

export class BrokerIpcError extends Error {
  readonly reason: BrokerIpcFailureReason;

  constructor(reason: BrokerIpcFailureReason) {
    super(`broker IPC failed: ${reason}`);
    this.name = "BrokerIpcError";
    this.reason = reason;
  }
}

export class LocalBrokerIpcClient {
  readonly #endpoint: string;
  readonly #binding: Omit<BrokerIpcRequest, "requestedAt" | "execution">;
  readonly #now: () => string;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly endpoint: unknown;
    readonly capability: unknown;
    readonly sessionId: unknown;
    readonly callerId: unknown;
    readonly now?: () => string;
    readonly timeoutMs?: number;
  }) {
    this.#endpoint = assertLocalBrokerEndpoint(options.endpoint);
    this.#binding = BrokerIpcRequestSchema.omit({ requestedAt: true, execution: true }).parse({
      schemaVersion: 1,
      capability: options.capability,
      sessionId: options.sessionId,
      callerId: options.callerId,
    });
    this.#now = options.now ?? (() => new Date().toISOString());
    const timeoutMs = options.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError("broker IPC timeout must be an integer from 100 to 60000 milliseconds");
    }
    this.#timeoutMs = timeoutMs;
  }

  async execute(value: unknown): Promise<BrokerExecutionResult> {
    const execution = BrokerExecutionRequestSchema.parse(value);
    if (
      execution.request.sessionId !== this.#binding.sessionId ||
      execution.request.callerId !== this.#binding.callerId
    ) {
      throw new BrokerIpcError("unauthorized");
    }
    const frame = BrokerIpcRequestSchema.parse({
      ...this.#binding,
      requestedAt: TimestampSchema.parse(this.#now()),
      execution,
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () => socket.destroy(new Error("broker IPC timeout")));
    try {
      const responsePromise = readJsonLine(socket, MAX_IPC_RESPONSE_BYTES);
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = BrokerIpcResponseSchema.parse(JSON.parse(await responsePromise) as unknown);
      if (!response.ok) throw new BrokerIpcError(response.error);
      if (!successfulResultMatchesRequest(response.result, execution)) {
        throw new BrokerIpcError("service_unavailable");
      }
      return response.result;
    } catch (error) {
      if (error instanceof BrokerIpcError) throw error;
      throw new BrokerIpcError("service_unavailable");
    } finally {
      socket.destroy();
    }
  }
}
