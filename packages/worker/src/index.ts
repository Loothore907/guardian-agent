import { LocalServiceIpcServer, verifyLocalServiceConnection } from "@guardian/linux-peer-identity";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, type Socket } from "node:net";

import { canonicalDigest } from "@guardian/canonical";
import {
  OpaqueIdSchema,
  ProviderRequestIdSchema,
  TimestampSchema,
  WorkerOutcomeSchema,
  WorkerServiceProcessConfigSchema,
  WorkerToolExecutionEnvelopeSchema,
  WorkerToolExecutionEnvelopeWithoutDigestSchema,
  WorkerToolResultSchema,
  WorkerToolResultWithoutDigestSchema,
  WorkerRuntimeToolRequestSchema,
  WorkerTurnEnvelopeSchema,
  WorkerTurnEnvelopeWithoutDigestSchema,
  WorkerProviderDiagnosticSchema,
  WorkerTurnIpcFailureReasonSchema,
  WorkerTurnIpcRequestSchema,
  WorkerTurnIpcResponseSchema,
  WorkerTurnResultSchema,
  type WorkerOutcome,
  type WorkerServiceProcessConfig,
  type WorkerToolExecutionEnvelope,
  type WorkerToolResult,
  type WorkerTurnEnvelope,
  type WorkerProviderDiagnostic,
  type WorkerTurnIpcFailureReason,
  type WorkerTurnIpcRequest,
  type WorkerTurnResult,
} from "@guardian/contracts";

const MAXIMUM_REQUEST_BYTES = 8 * 1_024;
const MAXIMUM_RESPONSE_BYTES = 16 * 1_024;
const DEFAULT_TIMEOUT_MS = 20_000;
const ENDPOINT_PATTERN = /^guardian-worker-[0-9a-f-]{36}$/u;

function assertLocalEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("worker IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !ENDPOINT_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("worker IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !value.endsWith(".sock") ||
    !ENDPOINT_PATTERN.test(basename(value).replace(/\.sock$/u, ""))
  ) {
    throw new TypeError("worker IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export function createWorkerIpcCredentials(): {
  readonly endpoint: string;
  readonly capability: string;
} {
  const id = randomUUID();
  return {
    endpoint:
      process.platform === "win32"
        ? `\\\\.\\pipe\\guardian-worker-${id}`
        : join(tmpdir(), `guardian-worker-${id}.sock`),
    capability: randomUUID(),
  };
}

export function workerTurnDigest(turnValue: unknown): string {
  const candidate =
    typeof turnValue === "object" && turnValue !== null && !Array.isArray(turnValue)
      ? { ...(turnValue as Record<string, unknown>) }
      : turnValue;
  if (typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)) {
    Reflect.deleteProperty(candidate, "turnDigest");
  }
  const turn = WorkerTurnEnvelopeWithoutDigestSchema.parse(candidate);
  const historyProjection =
    turn.toolHistory === undefined
      ? {}
      : { toolHistory: turn.toolHistory.map(projectToolResultForDigest) };
  return canonicalDigest(
    "worker.turn",
    1,
    turn.previousToolResult === undefined
      ? turn
      : {
          ...turn,
          ...historyProjection,
          previousToolResult: projectToolResultForDigest(turn.previousToolResult),
        },
  );
}

export function createWorkerTurnEnvelope(turnValue: unknown): WorkerTurnEnvelope {
  const turn = WorkerTurnEnvelopeWithoutDigestSchema.parse(turnValue);
  turn.toolHistory?.forEach(assertExactWorkerToolResult);
  if (turn.previousToolResult !== undefined) {
    assertExactWorkerToolResult(turn.previousToolResult);
  }
  return WorkerTurnEnvelopeSchema.parse({ ...turn, turnDigest: workerTurnDigest(turn) });
}

function assertExactTurnDigest(turn: WorkerTurnEnvelope): void {
  turn.toolHistory?.forEach(assertExactWorkerToolResult);
  if (turn.previousToolResult !== undefined) {
    assertExactWorkerToolResult(turn.previousToolResult);
  }
  if (workerTurnDigest(turn) !== turn.turnDigest) {
    throw new TypeError("worker turn digest does not match its exact envelope");
  }
}

export function workerToolRequestDigest(requestValue: unknown): string {
  const request = WorkerRuntimeToolRequestSchema.parse(requestValue);
  return canonicalDigest("worker.tool_request", 1, request);
}

export function workerToolExecutionDigest(executionValue: unknown): string {
  const candidate =
    typeof executionValue === "object" && executionValue !== null && !Array.isArray(executionValue)
      ? { ...(executionValue as Record<string, unknown>) }
      : executionValue;
  if (typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)) {
    Reflect.deleteProperty(candidate, "executionDigest");
  }
  const execution = WorkerToolExecutionEnvelopeWithoutDigestSchema.parse(candidate);
  return canonicalDigest("worker.tool_execution", 1, execution);
}

export function createWorkerToolExecutionEnvelope(
  executionValue: unknown,
): WorkerToolExecutionEnvelope {
  const execution = WorkerToolExecutionEnvelopeWithoutDigestSchema.parse(executionValue);
  if (workerToolRequestDigest(execution.request) !== execution.requestDigest) {
    throw new TypeError("worker tool request digest does not match the execution envelope");
  }
  return WorkerToolExecutionEnvelopeSchema.parse({
    ...execution,
    executionDigest: workerToolExecutionDigest(execution),
  });
}

export function assertExactWorkerToolExecutionEnvelope(
  executionValue: unknown,
): WorkerToolExecutionEnvelope {
  const execution = WorkerToolExecutionEnvelopeSchema.parse(executionValue);
  if (workerToolRequestDigest(execution.request) !== execution.requestDigest) {
    throw new TypeError("worker tool request digest does not match the execution envelope");
  }
  if (workerToolExecutionDigest(execution) !== execution.executionDigest) {
    throw new TypeError("worker tool execution digest does not match its exact envelope");
  }
  return execution;
}

export function workerToolResultDigest(resultValue: unknown): string {
  const candidate =
    typeof resultValue === "object" && resultValue !== null && !Array.isArray(resultValue)
      ? { ...(resultValue as Record<string, unknown>) }
      : resultValue;
  if (typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)) {
    Reflect.deleteProperty(candidate, "resultDigest");
  }
  const result = WorkerToolResultWithoutDigestSchema.parse(candidate);
  return canonicalDigest("worker.tool_result", 1, projectToolResultForDigest(result));
}

function projectToolResultForDigest(result: WorkerToolResult | Record<string, unknown>) {
  if (result.outcome !== "succeeded" || result.name !== "guardian.local_command") return result;
  const output = result.output as {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number;
    readonly timedOut: boolean;
    readonly truncated: boolean;
  };
  const bindText = (value: string) => ({
    byteLength: Buffer.byteLength(value, "utf8"),
    sha256: createHash("sha256").update(value, "utf8").digest("hex"),
  });
  return {
    ...result,
    output: {
      exitCode: output.exitCode,
      stdout: bindText(output.stdout),
      stderr: bindText(output.stderr),
      timedOut: output.timedOut,
      truncated: output.truncated,
    },
  };
}

export function createWorkerToolResult(resultValue: unknown): WorkerToolResult {
  const result = WorkerToolResultWithoutDigestSchema.parse(resultValue);
  return WorkerToolResultSchema.parse({ ...result, resultDigest: workerToolResultDigest(result) });
}

export function assertExactWorkerToolResult(resultValue: unknown): WorkerToolResult {
  const result = WorkerToolResultSchema.parse(resultValue);
  if (workerToolResultDigest(result) !== result.resultDigest) {
    throw new TypeError("worker tool result digest does not match its exact result");
  }
  return result;
}

export function workerTurnResultDigest(resultValue: unknown): string {
  const result = WorkerTurnResultSchema.parse(resultValue);
  const outcome =
    result.outcome.kind === "final_response"
      ? {
          kind: result.outcome.kind,
          response: {
            byteLength: Buffer.byteLength(result.outcome.response, "utf8"),
            sha256: createHash("sha256").update(result.outcome.response, "utf8").digest("hex"),
          },
        }
      : result.outcome;
  return canonicalDigest("worker.turn_result", 1, { ...result, outcome });
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
        rejectOnce(new TypeError("worker IPC frame is oversized"));
        return;
      }
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      if (buffer.slice(newline + 1).trim().length !== 0) {
        rejectOnce(new TypeError("worker IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.slice(0, newline));
    });
    socket.once("end", () => rejectOnce(new TypeError("worker IPC frame is incomplete")));
    socket.once("close", () => rejectOnce(new TypeError("worker IPC connection closed")));
    socket.once("error", rejectOnce);
  });
}

function writeResponse(socket: Socket, response: unknown): void {
  if (socket.destroyed || socket.writableEnded) return;
  socket.end(`${JSON.stringify(WorkerTurnIpcResponseSchema.parse(response))}\n`);
}

function assertOutcomeWithinTurn(outcomeValue: unknown, turn: WorkerTurnEnvelope): WorkerOutcome {
  const outcome = WorkerOutcomeSchema.parse(outcomeValue);
  if (outcome.kind === "final_response") return outcome;
  if (
    (turn.previousToolResult !== undefined && turn.continuation === undefined) ||
    (turn.continuation !== undefined && turn.turnNumber >= turn.continuation.maxTurns)
  ) {
    throw Object.assign(
      new TypeError(
        "the bounded worker loop permits only one tool request or its bound continuation limit",
      ),
      {
        reason: "provider_malformed" as const,
      },
    );
  }
  if (
    !turn.allowedTools.includes(outcome.request.name) &&
    (turn.continuation === undefined || turn.allowedTools.length === 0)
  ) {
    throw Object.assign(new TypeError("worker requested a tool outside the bound catalog"), {
      reason: "provider_malformed" as const,
    });
  }
  const budget = turn.remainingBudget;
  if (budget.remainingToolCalls < 1) {
    throw Object.assign(new TypeError("worker requested a tool after budget exhaustion"), {
      reason: "provider_malformed" as const,
    });
  }
  if (outcome.request.name === "guardian.research" && budget.remainingResearchRequests < 1) {
    throw Object.assign(new TypeError("worker requested research after budget exhaustion"), {
      reason: "provider_malformed" as const,
    });
  }
  if (outcome.request.name === "guardian.local_command" && budget.remainingLocalCommands < 1) {
    throw Object.assign(new TypeError("worker requested a command after budget exhaustion"), {
      reason: "provider_malformed" as const,
    });
  }
  if (
    outcome.request.name === "github.pull_request.merge" &&
    budget.remainingPrivilegedActions < 1 &&
    turn.continuation === undefined
  ) {
    throw Object.assign(new TypeError("worker requested an action after budget exhaustion"), {
      reason: "provider_malformed" as const,
    });
  }
  return outcome;
}

export function assertWorkerTurnResultForTurn(
  resultValue: unknown,
  turnValue: unknown,
): WorkerTurnResult {
  try {
    const turn = WorkerTurnEnvelopeSchema.parse(turnValue);
    assertExactTurnDigest(turn);
    const result = WorkerTurnResultSchema.parse(resultValue);
    if (
      result.turnId !== turn.turnId ||
      result.turnNumber !== turn.turnNumber ||
      result.turnDigest !== turn.turnDigest
    ) {
      throw new TypeError("worker result does not bind the exact requested turn");
    }
    return WorkerTurnResultSchema.parse({
      ...result,
      outcome: assertOutcomeWithinTurn(result.outcome, turn),
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "reason" in error) throw error;
    throw Object.assign(new TypeError("worker returned a malformed exact-turn result"), {
      reason: "provider_malformed" as const,
    });
  }
}

export interface WorkerProviderResult {
  readonly providerRequestId: string;
  readonly outcome: WorkerOutcome;
}

export type WorkerTurnHandler = (
  turn: WorkerTurnEnvelope,
  evaluatedAt: string,
) => Promise<WorkerProviderResult>;

export class LocalWorkerIpcServer {
  readonly #config: WorkerServiceProcessConfig;
  readonly #handler: WorkerTurnHandler;
  readonly #now: () => string;
  readonly #server: LocalServiceIpcServer;

  #turnConsumed = false;

  constructor(
    configValue: unknown,
    handler: WorkerTurnHandler,
    options: { readonly now?: () => string } = {},
  ) {
    const config = WorkerServiceProcessConfigSchema.parse(configValue);
    assertExactTurnDigest(config.turn);
    this.#config = { ...config, endpoint: assertLocalEndpoint(config.endpoint) };
    this.#handler = handler;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#server = new LocalServiceIpcServer((socket) => this.#serve(socket));
  }

  async listen(): Promise<void> {
    await this.#server.listen(this.#config.endpoint);
  }

  async close(): Promise<void> {
    await this.#server.close();
  }

  async #serve(socket: Socket): Promise<void> {
    const turn = this.#config.turn;
    // Request framing and provider execution have different bounds. An idle
    // socket timeout must not cut off an authenticated in-flight provider call.
    const requestTimeout = setTimeout(() => socket.destroy(), DEFAULT_TIMEOUT_MS);
    const deadline = setTimeout(
      () => writeResponse(socket, { schemaVersion: 1, ok: false, error: "expired" }),
      Math.max(1, Date.parse(turn.expiresAt) - Date.parse(TimestampSchema.parse(this.#now()))),
    );
    const clearTimers = () => {
      clearTimeout(requestTimeout);
      clearTimeout(deadline);
    };
    socket.once("close", clearTimers);
    let request: WorkerTurnIpcRequest;
    try {
      request = WorkerTurnIpcRequestSchema.parse(
        JSON.parse(await readJsonLine(socket, MAXIMUM_REQUEST_BYTES)) as unknown,
      );
    } catch {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "invalid_request" });
      return;
    }
    if (socket.destroyed || socket.writableEnded) return;
    if (
      !capabilitiesMatch(request.capability, this.#config.capability) ||
      request.sessionId !== turn.sessionId ||
      request.turnId !== turn.turnId ||
      request.turnNumber !== turn.turnNumber ||
      request.turnDigest !== turn.turnDigest
    ) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "unauthorized" });
      return;
    }
    const evaluatedAt = TimestampSchema.parse(this.#now());
    if (Date.parse(evaluatedAt) < Date.parse(turn.startsAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "not_active" });
      return;
    }
    if (Date.parse(evaluatedAt) >= Date.parse(turn.expiresAt)) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "expired" });
      return;
    }
    if (this.#turnConsumed) {
      writeResponse(socket, { schemaVersion: 1, ok: false, error: "turn_consumed" });
      return;
    }
    this.#turnConsumed = true;
    clearTimeout(requestTimeout);
    const responseUnavailable = () => {
      if (socket.destroyed || socket.writableEnded) return true;
      if (Date.parse(TimestampSchema.parse(this.#now())) >= Date.parse(turn.expiresAt)) {
        writeResponse(socket, { schemaVersion: 1, ok: false, error: "expired" });
        return true;
      }
      return false;
    };
    let result: WorkerProviderResult;
    try {
      result = await this.#handler(turn, evaluatedAt);
    } catch (error) {
      if (responseUnavailable()) return;
      const parsed = WorkerTurnIpcFailureReasonSchema.safeParse(
        typeof error === "object" && error !== null && "reason" in error ? error.reason : undefined,
      );
      const providerDiagnostic = WorkerProviderDiagnosticSchema.safeParse(
        typeof error === "object" && error !== null && "providerDiagnostic" in error
          ? error.providerDiagnostic
          : undefined,
      );
      const failure = parsed.success ? parsed.data : "provider_unavailable";
      writeResponse(socket, {
        schemaVersion: 1,
        ok: false,
        error: failure,
        ...(failure === "provider_unavailable" && providerDiagnostic.success
          ? { providerDiagnostic: providerDiagnostic.data }
          : {}),
      });
      return;
    }
    if (responseUnavailable()) return;
    try {
      const exactResult = WorkerTurnResultSchema.parse({
        providerRequestId: ProviderRequestIdSchema.parse(result.providerRequestId),
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
        outcome: assertOutcomeWithinTurn(result.outcome, turn),
      });
      writeResponse(socket, { schemaVersion: 1, ok: true, result: exactResult });
    } catch {
      writeResponse(socket, {
        schemaVersion: 1,
        ok: false,
        error: "provider_malformed",
      });
    }
  }
}

export class WorkerIpcError extends Error {
  readonly reason: WorkerTurnIpcFailureReason;
  readonly providerDiagnostic: WorkerProviderDiagnostic | undefined;

  constructor(reason: WorkerTurnIpcFailureReason, providerDiagnostic?: WorkerProviderDiagnostic) {
    super(`worker service failed: ${reason}`);
    this.name = "WorkerIpcError";
    this.reason = reason;
    this.providerDiagnostic = providerDiagnostic;
  }
}

export class LocalWorkerIpcClient {
  readonly #endpoint: string;
  readonly #binding: Omit<WorkerTurnIpcRequest, "requestedAt">;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly endpoint: unknown;
    readonly capability: unknown;
    readonly sessionId: unknown;
    readonly turnId: unknown;
    readonly turnNumber: unknown;
    readonly turnDigest: unknown;
    readonly timeoutMs?: number;
  }) {
    this.#endpoint = assertLocalEndpoint(options.endpoint);
    this.#binding = WorkerTurnIpcRequestSchema.omit({ requestedAt: true }).parse({
      schemaVersion: 1,
      capability: OpaqueIdSchema.parse(options.capability),
      sessionId: options.sessionId,
      turnId: options.turnId,
      turnNumber: options.turnNumber,
      turnDigest: options.turnDigest,
    });
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError("worker IPC timeout must be an integer from 100 to 60000 milliseconds");
    }
    this.#timeoutMs = timeoutMs;
  }

  async run(requestedAtValue: unknown): Promise<WorkerTurnResult> {
    const frame = WorkerTurnIpcRequestSchema.parse({
      ...this.#binding,
      requestedAt: TimestampSchema.parse(requestedAtValue),
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () => socket.destroy(new Error("worker IPC timeout")));
    try {
      await verifyLocalServiceConnection(socket, this.#endpoint);
      const responsePromise = readJsonLine(socket, MAXIMUM_RESPONSE_BYTES);
      socket.resume();
      socket.write(`${JSON.stringify(frame)}\n`);
      const response = WorkerTurnIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (!response.ok) throw new WorkerIpcError(response.error, response.providerDiagnostic);
      return response.result;
    } catch (error) {
      if (error instanceof WorkerIpcError) throw error;
      throw new WorkerIpcError("provider_unavailable", { kind: "transport_failure" });
    } finally {
      socket.destroy();
    }
  }
}
