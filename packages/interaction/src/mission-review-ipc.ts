import { randomUUID, timingSafeEqual } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, createServer, type Server, type Socket } from "node:net";

import {
  MissionDraftReviewIpcFailureReasonSchema,
  MissionDraftReviewIpcRequestSchema,
  MissionDraftReviewIpcResponseSchema,
  MissionDraftReviewOutcomeSchema,
  MissionDraftReviewServiceProcessConfigSchema,
  OpaqueIdSchema,
  ProviderRequestIdSchema,
  TimestampSchema,
  type MissionDraftReviewEnvelope,
  type MissionDraftReviewIpcFailureReason,
  type MissionDraftReviewIpcRequest,
  type MissionDraftReviewOutcome,
  type MissionDraftReviewServiceProcessConfig,
} from "@guardian/contracts";

const MAXIMUM_REQUEST_BYTES = 8 * 1_024;
const MAXIMUM_RESPONSE_BYTES = 32 * 1_024;
const DEFAULT_TIMEOUT_MS = 20_000;
const ENDPOINT_PATTERN = /^guardian-mission-review-[0-9a-f-]{36}$/u;

function assertLocalEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("mission review IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !ENDPOINT_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("mission review IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !value.endsWith(".sock") ||
    !ENDPOINT_PATTERN.test(basename(value).replace(/\.sock$/u, ""))
  ) {
    throw new TypeError("mission review IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export function createMissionDraftReviewIpcCredentials(): {
  readonly endpoint: string;
  readonly capability: string;
} {
  const id = randomUUID();
  return {
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\guardian-mission-review-${id}`
        : join(tmpdir(), `guardian-mission-review-${id}.sock`),
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
        rejectOnce(new TypeError("mission review IPC frame is oversized"));
        return;
      }
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      if (buffer.slice(newline + 1).trim().length !== 0) {
        rejectOnce(new TypeError("mission review IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.slice(0, newline));
    });
    socket.once("end", () => rejectOnce(new TypeError("mission review IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("mission review IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

function writeResponse(socket: Socket, response: unknown): void {
  socket.end(`${JSON.stringify(MissionDraftReviewIpcResponseSchema.parse(response))}\n`);
}

export interface MissionDraftReviewProviderResult {
  readonly providerRequestId: string;
  readonly outcome: MissionDraftReviewOutcome;
}

export type MissionDraftReviewIpcHandler = (
  envelope: MissionDraftReviewEnvelope,
  evaluatedAt: string,
) => Promise<MissionDraftReviewProviderResult>;

export class LocalMissionDraftReviewIpcServer {
  readonly #config: MissionDraftReviewServiceProcessConfig;
  readonly #handler: MissionDraftReviewIpcHandler;
  readonly #now: () => string;
  readonly #server: Server;
  #listening = false;
  #turnConsumed = false;

  constructor(
    configValue: unknown,
    handler: MissionDraftReviewIpcHandler,
    options: { readonly now?: () => string } = {},
  ) {
    const config = MissionDraftReviewServiceProcessConfigSchema.parse(configValue);
    this.#config = { ...config, endpoint: assertLocalEndpoint(config.endpoint) };
    this.#handler = handler;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#server = createServer((socket) => void this.#serve(socket));
  }

  async listen(): Promise<void> {
    if (this.#listening) throw new TypeError("mission review IPC server is already listening");
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
    let request: MissionDraftReviewIpcRequest;
    try {
      request = MissionDraftReviewIpcRequestSchema.parse(
        JSON.parse(await readJsonLine(socket, MAXIMUM_REQUEST_BYTES)) as unknown,
      );
    } catch {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "invalid_request" });
      return;
    }
    if (
      !capabilitiesMatch(request.capability, this.#config.capability) ||
      request.draftId !== this.#config.envelope.draftId ||
      request.revision !== this.#config.envelope.revision ||
      request.reviewTurn !== this.#config.envelope.reviewTurn
    ) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "unauthorized" });
      return;
    }
    const evaluatedAt = TimestampSchema.parse(this.#now());
    if (Date.parse(evaluatedAt) < Date.parse(this.#config.startsAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "not_active" });
      return;
    }
    if (Date.parse(evaluatedAt) >= Date.parse(this.#config.expiresAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "expired" });
      return;
    }
    if (this.#turnConsumed) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "turn_consumed" });
      return;
    }
    this.#turnConsumed = true;
    try {
      const result = await this.#handler(this.#config.envelope, evaluatedAt);
      writeResponse(socket, {
        schemaVersion: 1,
        ok: true,
        providerRequestId: ProviderRequestIdSchema.parse(result.providerRequestId),
        outcome: MissionDraftReviewOutcomeSchema.parse(result.outcome),
      });
    } catch (error) {
      const parsed = MissionDraftReviewIpcFailureReasonSchema.safeParse(
        typeof error === "object" && error !== null && "reason" in error ? error.reason : undefined,
      );
      writeResponse(socket, {
        schemaVersion: 1,
        ok: false,
        error: parsed.success ? parsed.data : "provider_unavailable",
      });
    }
  }
}

export class MissionDraftReviewIpcError extends Error {
  readonly reason: MissionDraftReviewIpcFailureReason;

  constructor(reason: MissionDraftReviewIpcFailureReason) {
    super(`mission draft review service failed: ${reason}`);
    this.name = "MissionDraftReviewIpcError";
    this.reason = reason;
  }
}

export class LocalMissionDraftReviewIpcClient {
  readonly #endpoint: string;
  readonly #binding: Omit<MissionDraftReviewIpcRequest, "requestedAt">;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly endpoint: unknown;
    readonly capability: unknown;
    readonly draftId: unknown;
    readonly revision: unknown;
    readonly reviewTurn: unknown;
    readonly timeoutMs?: number;
  }) {
    this.#endpoint = assertLocalEndpoint(options.endpoint);
    this.#binding = MissionDraftReviewIpcRequestSchema.omit({ requestedAt: true }).parse({
      schemaVersion: 1,
      capability: OpaqueIdSchema.parse(options.capability),
      draftId: options.draftId,
      revision: options.revision,
      reviewTurn: options.reviewTurn,
    });
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError(
        "mission review IPC timeout must be an integer from 100 to 60000 milliseconds",
      );
    }
    this.#timeoutMs = timeoutMs;
  }

  async review(requestedAtValue: unknown): Promise<MissionDraftReviewProviderResult> {
    const frame = MissionDraftReviewIpcRequestSchema.parse({
      ...this.#binding,
      requestedAt: TimestampSchema.parse(requestedAtValue),
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () =>
      socket.destroy(new Error("mission review IPC timeout")),
    );
    try {
      const responsePromise = readJsonLine(socket, MAXIMUM_RESPONSE_BYTES);
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = MissionDraftReviewIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (!response.ok) throw new MissionDraftReviewIpcError(response.error);
      return response;
    } catch (error) {
      if (error instanceof MissionDraftReviewIpcError) throw error;
      throw new MissionDraftReviewIpcError("provider_unavailable");
    } finally {
      socket.destroy();
    }
  }
}
