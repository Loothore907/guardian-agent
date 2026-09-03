import { randomUUID, timingSafeEqual } from "node:crypto";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import {
  GuardianActionRiskIpcRequestSchema,
  GuardianActionRiskIpcResponseSchema,
  GuardianActionRiskServiceProcessConfigSchema,
  GuardianEvaluationSchema,
  GuardianRiskEnvelopeSchema,
  TimestampSchema,
  type GuardianActionRiskIpcFailureReason,
  type GuardianActionRiskServiceProcessConfig,
  type GuardianEvaluation,
  type GuardianRiskEnvelope,
} from "@guardian/contracts";

const MAXIMUM_FRAME_BYTES = 32 * 1_024;
const DEFAULT_TIMEOUT_MS = 20_000;
const ENDPOINT_PATTERN = /^guardian-action-risk-[0-9a-f-]{36}$/u;

function assertLocalEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("action risk IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !ENDPOINT_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("action risk IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !value.endsWith(".sock") ||
    !ENDPOINT_PATTERN.test(basename(value).replace(/\.sock$/u, ""))
  ) {
    throw new TypeError("action risk IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export function createGuardianActionRiskIpcCredentials() {
  const id = randomUUID();
  return {
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\guardian-action-risk-${id}`
        : join(tmpdir(), `guardian-action-risk-${id}.sock`),
    capability: randomUUID(),
  };
}

function capabilitiesMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function readJsonLine(socket: Socket): Promise<string> {
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
      if (bytes > MAXIMUM_FRAME_BYTES) {
        rejectOnce(new TypeError("action risk IPC frame is oversized"));
        return;
      }
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      if (buffer.slice(newline + 1).trim().length !== 0) {
        rejectOnce(new TypeError("action risk IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.slice(0, newline));
    });
    socket.once("end", () => rejectOnce(new TypeError("action risk IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("action risk IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

function writeFailure(socket: Socket, error: GuardianActionRiskIpcFailureReason): void {
  socket.end(
    `${JSON.stringify(
      GuardianActionRiskIpcResponseSchema.parse({ schemaVersion: 1, ok: false, error }),
    )}\n`,
  );
}

export class LocalGuardianActionRiskIpcServer {
  readonly #config: GuardianActionRiskServiceProcessConfig;
  readonly #handler: (envelope: GuardianRiskEnvelope) => Promise<GuardianEvaluation>;
  readonly #now: () => string;
  readonly #server: Server;
  #listening = false;
  #consumed = false;

  constructor(
    configValue: unknown,
    handler: (envelope: GuardianRiskEnvelope) => Promise<GuardianEvaluation>,
    options: { readonly now?: () => string } = {},
  ) {
    const config = GuardianActionRiskServiceProcessConfigSchema.parse(configValue);
    this.#config = { ...config, endpoint: assertLocalEndpoint(config.endpoint) };
    this.#handler = handler;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#server = createServer((socket) => void this.#serve(socket));
  }

  async listen(): Promise<void> {
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
    socket.setTimeout(DEFAULT_TIMEOUT_MS, () => socket.destroy());
    let request;
    try {
      request = GuardianActionRiskIpcRequestSchema.parse(JSON.parse(await readJsonLine(socket)));
    } catch {
      writeFailure(socket, "invalid_request");
      return;
    }
    if (
      !capabilitiesMatch(request.capability, this.#config.capability) ||
      request.sessionId !== this.#config.sessionId ||
      request.callerId !== this.#config.callerId ||
      request.requestDigest !== this.#config.requestDigest
    ) {
      writeFailure(socket, "unauthorized");
      return;
    }
    let now: string;
    try {
      now = TimestampSchema.parse(this.#now());
    } catch {
      writeFailure(socket, "provider_unavailable");
      return;
    }
    if (
      Date.parse(now) < Date.parse(this.#config.startsAt) ||
      Date.parse(request.requestedAt) < Date.parse(this.#config.startsAt)
    ) {
      writeFailure(socket, "not_active");
      return;
    }
    if (
      Date.parse(now) >= Date.parse(this.#config.expiresAt) ||
      Date.parse(request.requestedAt) >= Date.parse(this.#config.expiresAt)
    ) {
      writeFailure(socket, "expired");
      return;
    }
    if (Date.parse(request.requestedAt) > Date.parse(now)) {
      writeFailure(socket, "invalid_request");
      return;
    }
    if (this.#consumed) {
      writeFailure(socket, "turn_consumed");
      return;
    }
    this.#consumed = true;
    try {
      const evaluation = GuardianEvaluationSchema.parse(await this.#handler(this.#config.envelope));
      socket.end(
        `${JSON.stringify(
          GuardianActionRiskIpcResponseSchema.parse({ schemaVersion: 1, ok: true, evaluation }),
        )}\n`,
      );
    } catch {
      writeFailure(socket, "provider_unavailable");
    }
  }
}

export class GuardianActionRiskIpcError extends Error {
  readonly reason: GuardianActionRiskIpcFailureReason;

  constructor(reason: GuardianActionRiskIpcFailureReason) {
    super(`guardian action risk service failed: ${reason}`);
    this.name = "GuardianActionRiskIpcError";
    this.reason = reason;
  }
}

export class LocalGuardianActionRiskIpcClient {
  readonly #endpoint: string;
  readonly #config: GuardianActionRiskServiceProcessConfig;
  readonly #now: () => string;

  constructor(configValue: unknown, options: { readonly now?: () => string } = {}) {
    const config = GuardianActionRiskServiceProcessConfigSchema.parse(configValue);
    this.#config = config;
    this.#endpoint = assertLocalEndpoint(config.endpoint);
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async evaluate(envelopeValue: GuardianRiskEnvelope): Promise<GuardianEvaluation> {
    let envelope: GuardianRiskEnvelope;
    try {
      envelope = GuardianRiskEnvelopeSchema.parse(envelopeValue);
    } catch {
      throw new GuardianActionRiskIpcError("invalid_request");
    }
    if (JSON.stringify(envelope) !== JSON.stringify(this.#config.envelope)) {
      throw new GuardianActionRiskIpcError("unauthorized");
    }
    const frame = GuardianActionRiskIpcRequestSchema.parse({
      schemaVersion: 1,
      capability: this.#config.capability,
      sessionId: this.#config.sessionId,
      callerId: this.#config.callerId,
      requestDigest: this.#config.requestDigest,
      requestedAt: TimestampSchema.parse(this.#now()),
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(DEFAULT_TIMEOUT_MS, () => socket.destroy());
    try {
      const responsePromise = readJsonLine(socket);
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = GuardianActionRiskIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (!response.ok) throw new GuardianActionRiskIpcError(response.error);
      return response.evaluation;
    } catch (error) {
      if (error instanceof GuardianActionRiskIpcError) throw error;
      throw new GuardianActionRiskIpcError("provider_unavailable");
    } finally {
      socket.destroy();
    }
  }
}
