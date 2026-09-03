import { randomUUID, timingSafeEqual } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, createServer, type Server, type Socket } from "node:net";

import {
  MissionSetupRiskEvaluationSchema,
  MissionSetupRiskIpcRequestSchema,
  MissionSetupRiskIpcResponseSchema,
  MissionSetupRiskServiceProcessConfigSchema,
  OpaqueIdSchema,
  TimestampSchema,
  type MissionSetupRiskEnvelope,
  type MissionSetupRiskEvaluation,
  type MissionSetupRiskIpcFailureReason,
  type MissionSetupRiskServiceProcessConfig,
} from "@guardian/contracts";

const MAXIMUM_FRAME_BYTES = 32 * 1_024;
export const guardianSetupRiskIpcBoundary = {
  timeoutMs: 45_000,
} as const;
const DEFAULT_TIMEOUT_MS = guardianSetupRiskIpcBoundary.timeoutMs;
const ENDPOINT_PATTERN = /^guardian-setup-risk-[0-9a-f-]{36}$/u;

function assertLocalEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("setup risk IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !ENDPOINT_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("setup risk IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !value.endsWith(".sock") ||
    !ENDPOINT_PATTERN.test(basename(value).replace(/\.sock$/u, ""))
  ) {
    throw new TypeError("setup risk IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export function createMissionSetupRiskIpcCredentials() {
  const id = randomUUID();
  return {
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\guardian-setup-risk-${id}`
        : join(tmpdir(), `guardian-setup-risk-${id}.sock`),
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
        rejectOnce(new TypeError("setup risk IPC frame is oversized"));
        return;
      }
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      if (buffer.slice(newline + 1).trim().length !== 0) {
        rejectOnce(new TypeError("setup risk IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.slice(0, newline));
    });
    socket.once("end", () => rejectOnce(new TypeError("setup risk IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("setup risk IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

export class LocalMissionSetupRiskIpcServer {
  readonly #config: MissionSetupRiskServiceProcessConfig;
  readonly #handler: (envelope: MissionSetupRiskEnvelope) => Promise<MissionSetupRiskEvaluation>;
  readonly #now: () => string;
  readonly #server: Server;
  #listening = false;
  #consumed = false;

  constructor(
    configValue: unknown,
    handler: (envelope: MissionSetupRiskEnvelope) => Promise<MissionSetupRiskEvaluation>,
    options: { readonly now?: () => string } = {},
  ) {
    const config = MissionSetupRiskServiceProcessConfigSchema.parse(configValue);
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
    const fail = (error: MissionSetupRiskIpcFailureReason) =>
      socket.end(
        `${JSON.stringify(
          MissionSetupRiskIpcResponseSchema.parse({ schemaVersion: 1, ok: false, error }),
        )}\n`,
      );
    let request;
    try {
      request = MissionSetupRiskIpcRequestSchema.parse(JSON.parse(await readJsonLine(socket)));
    } catch {
      fail("invalid_request");
      return;
    }
    if (
      !capabilitiesMatch(request.capability, this.#config.capability) ||
      request.draftId !== this.#config.envelope.draftId ||
      request.revision !== this.#config.envelope.revision ||
      request.requestDigest !== this.#config.envelope.requestDigest
    ) {
      fail("unauthorized");
      return;
    }
    const now = TimestampSchema.parse(this.#now());
    if (Date.parse(now) < Date.parse(this.#config.startsAt)) {
      fail("not_active");
      return;
    }
    if (Date.parse(now) >= Date.parse(this.#config.expiresAt)) {
      fail("expired");
      return;
    }
    if (this.#consumed) {
      fail("turn_consumed");
      return;
    }
    this.#consumed = true;
    try {
      const evaluation = MissionSetupRiskEvaluationSchema.parse(
        await this.#handler(this.#config.envelope),
      );
      socket.end(
        `${JSON.stringify(
          MissionSetupRiskIpcResponseSchema.parse({ schemaVersion: 1, ok: true, evaluation }),
        )}\n`,
      );
    } catch {
      fail("provider_unavailable");
    }
  }
}

export class MissionSetupRiskIpcError extends Error {
  readonly reason: MissionSetupRiskIpcFailureReason;
  constructor(reason: MissionSetupRiskIpcFailureReason) {
    super(`mission setup risk service failed: ${reason}`);
    this.name = "MissionSetupRiskIpcError";
    this.reason = reason;
  }
}

export class LocalMissionSetupRiskIpcClient {
  readonly #endpoint: string;
  readonly #binding: {
    readonly capability: string;
    readonly draftId: string;
    readonly revision: number;
    readonly requestDigest: string;
  };

  constructor(options: {
    readonly endpoint: unknown;
    readonly capability: unknown;
    readonly draftId: unknown;
    readonly revision: unknown;
    readonly requestDigest: unknown;
  }) {
    this.#endpoint = assertLocalEndpoint(options.endpoint);
    const parsed = MissionSetupRiskIpcRequestSchema.omit({ requestedAt: true }).parse({
      schemaVersion: 1,
      capability: OpaqueIdSchema.parse(options.capability),
      draftId: options.draftId,
      revision: options.revision,
      requestDigest: options.requestDigest,
    });
    this.#binding = parsed;
  }

  async evaluate(requestedAt: unknown): Promise<MissionSetupRiskEvaluation> {
    const frame = MissionSetupRiskIpcRequestSchema.parse({
      schemaVersion: 1,
      ...this.#binding,
      requestedAt: TimestampSchema.parse(requestedAt),
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(DEFAULT_TIMEOUT_MS, () => socket.destroy());
    try {
      const responsePromise = readJsonLine(socket);
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = MissionSetupRiskIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (!response.ok) throw new MissionSetupRiskIpcError(response.error);
      return response.evaluation;
    } catch (error) {
      if (error instanceof MissionSetupRiskIpcError) throw error;
      throw new MissionSetupRiskIpcError("provider_unavailable");
    } finally {
      socket.destroy();
    }
  }
}
