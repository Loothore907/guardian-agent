import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, type Socket } from "node:net";

import {
  ApprovalConsumptionRequestSchema,
  AuthorityAttemptRecordSchema,
  AuthorityCapabilityBindingSchema,
  AuthorityDecisionRecordSchema,
  AuthorityIpcFailureReasonSchema,
  AuthorityIpcRequestSchema,
  AuthorityIpcResponseSchema,
  DurableConnectionRecordSchema,
  DurableSessionBudgetSchema,
  DurableSessionRecordSchema,
  EvidenceExposureRecordSchema,
  ExactApprovalSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  type ApprovalConsumptionRequest,
  type AuthorityAttemptRecord,
  type AuthorityCapabilityBinding,
  type AuthorityDecisionRecord,
  type AuthorityIpcFailureReason,
  type AuthorityIpcOperation,
  type DurableConnectionRecord,
  type DurableSessionBudget,
  type DurableSessionRecord,
  type EvidenceExposureRecord,
  type ExactApproval,
  type WorkerBoundaryFailureCode,
  type WorkerBoundaryInterruption,
  type WorkerExecutionAuthorization,
  type WorkerViolationCode,
} from "@guardian/contracts";

const MAX_IPC_RESPONSE_BYTES = 64 * 1_024;
const DEFAULT_IPC_TIMEOUT_MS = 15_000;
const PIPE_NAME_PATTERN = /^guardian-authority-[0-9a-f-]{36}$/u;

export function assertLocalAuthorityEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("authority IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !PIPE_NAME_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("authority IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !PIPE_NAME_PATTERN.test(basename(value).replace(/\.sock$/u, "")) ||
    !value.endsWith(".sock")
  ) {
    throw new TypeError("authority IPC endpoint must be a Guardian temporary Unix socket");
  }
  return value;
}

export function createAuthorityIpcEndpoint(): string {
  const id = randomUUID();
  return process.platform === "win32"
    ? `\\\\.\\pipe\\guardian-authority-${id}`
    : join(tmpdir(), `guardian-authority-${id}.sock`);
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

export class AuthorityIpcError extends Error {
  readonly reason: AuthorityIpcFailureReason;

  constructor(reason: AuthorityIpcFailureReason) {
    super(`authority service failed: ${reason}`);
    this.name = "AuthorityIpcError";
    this.reason = reason;
  }
}

export interface AuthorityClient {
  getSession(sessionId: unknown): Promise<DurableSessionRecord | null>;
  getSessionConnections(sessionId: unknown): Promise<readonly DurableConnectionRecord[]>;
  getApproval(sessionId: unknown, approvalId: unknown): Promise<ExactApproval | null>;
  getApprovalState(
    sessionId: unknown,
    approvalId: unknown,
  ): Promise<"available" | "consumed" | null>;
  consumeToolCall(sessionId: unknown): Promise<DurableSessionBudget | null>;
  consumeApproval(
    value: unknown,
  ): Promise<"consumed" | "replayed" | "not_found" | "request_mismatch" | "not_active" | "expired">;
  appendAuthorityAttempt(value: unknown): Promise<void>;
  appendAuthorityDecision(value: unknown): Promise<void>;
}

export interface AuthorityControlClient {
  createConnection(value: unknown): Promise<void>;
  createSession(
    session: unknown,
    budget: unknown,
    connectionIds?: readonly unknown[],
  ): Promise<void>;
  storeApproval(value: unknown): Promise<void>;
  reserveResearch(
    sessionId: unknown,
    requestedResults: unknown,
  ): Promise<{
    readonly reservationId: string;
    readonly sessionId: string;
    readonly reservedResults: number;
    readonly budget: DurableSessionBudget;
  } | null>;
  settleResearchResults(
    reservationId: unknown,
    sessionId: unknown,
    acceptedResults: unknown,
  ): Promise<DurableSessionBudget>;
  appendEvidenceExposures(values: readonly unknown[]): Promise<void>;
}

export interface AuthorityWorkerClient {
  consumeWorkerToolCall(
    sessionId: unknown,
    executionId: unknown,
    executionDigest: unknown,
  ): Promise<WorkerExecutionAuthorization>;
  consumeLocalCommand(
    sessionId: unknown,
    executionId: unknown,
    executionDigest: unknown,
  ): Promise<WorkerExecutionAuthorization>;
  recordWorkerViolation(
    sessionId: unknown,
    boundaryId: unknown,
    boundaryDigest: unknown,
    code: WorkerViolationCode,
  ): Promise<WorkerExecutionAuthorization>;
  interruptWorkerSession(
    sessionId: unknown,
    boundaryId: unknown,
    boundaryDigest: unknown,
    failure: WorkerBoundaryFailureCode,
  ): Promise<WorkerBoundaryInterruption>;
}

export class LocalAuthorityIpcClient
  implements AuthorityClient, AuthorityControlClient, AuthorityWorkerClient
{
  readonly #endpoint: string;
  readonly #binding: AuthorityCapabilityBinding;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly endpoint: unknown;
    readonly binding: unknown;
    readonly timeoutMs?: number;
  }) {
    this.#endpoint = assertLocalAuthorityEndpoint(options.endpoint);
    this.#binding = AuthorityCapabilityBindingSchema.parse(options.binding);
    const timeoutMs = options.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError(
        "authority IPC timeout must be an integer from 100 to 60000 milliseconds",
      );
    }
    this.#timeoutMs = timeoutMs;
  }

  async #call(operation: AuthorityIpcOperation, fields: Record<string, unknown> = {}) {
    if (!this.#binding.allowedOperations.includes(operation)) {
      throw new AuthorityIpcError("operation_not_allowed");
    }
    const requestId = randomUUID();
    const request = AuthorityIpcRequestSchema.parse({
      schemaVersion: 1,
      requestId,
      capability: this.#binding.capability,
      callerRole: this.#binding.callerRole,
      callerId: this.#binding.callerId,
      sessionId: this.#binding.sessionId,
      operation,
      ...fields,
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () => socket.destroy(new Error("authority IPC timeout")));
    try {
      const responsePromise = readJsonLine(socket, MAX_IPC_RESPONSE_BYTES);
      socket.write(`${JSON.stringify(request)}\n`);
      const response = AuthorityIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (response.requestId !== requestId) throw new AuthorityIpcError("authority_unavailable");
      if (!response.ok) throw new AuthorityIpcError(response.error);
      if (response.operation !== operation) throw new AuthorityIpcError("authority_unavailable");
      return response;
    } catch (error) {
      if (error instanceof AuthorityIpcError) throw error;
      throw new AuthorityIpcError("authority_unavailable");
    } finally {
      socket.destroy();
    }
  }

  async getSession(sessionIdValue: unknown): Promise<DurableSessionRecord | null> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("session.get");
    if (response.operation !== "session.get") throw new AuthorityIpcError("authority_unavailable");
    return response.result;
  }

  async createConnection(value: unknown): Promise<void> {
    const connection = DurableConnectionRecordSchema.parse(value);
    const response = await this.#call("connection.create", { connection });
    if (response.operation !== "connection.create" || response.result !== "created") {
      throw new AuthorityIpcError("authority_unavailable");
    }
  }

  async createSession(
    sessionValue: unknown,
    budgetValue: unknown,
    connectionIdsValue: readonly unknown[] = [],
  ): Promise<void> {
    const session = DurableSessionRecordSchema.parse(sessionValue);
    const budget = DurableSessionBudgetSchema.parse(budgetValue);
    const connectionIds = connectionIdsValue.map((value) => OpaqueIdSchema.parse(value));
    if (session.sessionId !== this.#binding.sessionId || budget.sessionId !== session.sessionId) {
      throw new AuthorityIpcError("binding_mismatch");
    }
    const response = await this.#call("session.create", { session, budget, connectionIds });
    if (response.operation !== "session.create" || response.result !== "created") {
      throw new AuthorityIpcError("authority_unavailable");
    }
  }

  async storeApproval(value: unknown): Promise<void> {
    const approval = ExactApprovalSchema.parse(value);
    if (approval.sessionId !== this.#binding.sessionId) {
      throw new AuthorityIpcError("binding_mismatch");
    }
    const response = await this.#call("approval.store", { approval });
    if (response.operation !== "approval.store" || response.result !== "stored") {
      throw new AuthorityIpcError("authority_unavailable");
    }
  }

  async reserveResearch(sessionIdValue: unknown, requestedResultsValue: unknown) {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const requestedResults = Number(requestedResultsValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("research.reserve", { requestedResults });
    if (response.operation !== "research.reserve") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async settleResearchResults(
    reservationIdValue: unknown,
    sessionIdValue: unknown,
    acceptedResultsValue: unknown,
  ): Promise<DurableSessionBudget> {
    const reservationId = OpaqueIdSchema.parse(reservationIdValue);
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const acceptedResults = Number(acceptedResultsValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("research.settle", { reservationId, acceptedResults });
    if (response.operation !== "research.settle") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async appendEvidenceExposures(values: readonly unknown[]): Promise<void> {
    const exposures: readonly EvidenceExposureRecord[] = values.map((value) =>
      EvidenceExposureRecordSchema.parse(value),
    );
    const response = await this.#call("context.append_exposures", { exposures });
    if (response.operation !== "context.append_exposures" || response.result !== "recorded") {
      throw new AuthorityIpcError("authority_unavailable");
    }
  }

  async getSessionConnections(
    sessionIdValue: unknown,
  ): Promise<readonly DurableConnectionRecord[]> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("connection.list");
    if (response.operation !== "connection.list")
      throw new AuthorityIpcError("authority_unavailable");
    return response.result;
  }

  async getApproval(
    sessionIdValue: unknown,
    approvalIdValue: unknown,
  ): Promise<ExactApproval | null> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const approvalId = OpaqueIdSchema.parse(approvalIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("approval.get", { approvalId });
    if (response.operation !== "approval.get") throw new AuthorityIpcError("authority_unavailable");
    return response.result;
  }

  async getApprovalState(
    sessionIdValue: unknown,
    approvalIdValue: unknown,
  ): Promise<"available" | "consumed" | null> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const approvalId = OpaqueIdSchema.parse(approvalIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("approval.state", { approvalId });
    if (response.operation !== "approval.state")
      throw new AuthorityIpcError("authority_unavailable");
    return response.result;
  }

  async consumeToolCall(sessionIdValue: unknown): Promise<DurableSessionBudget | null> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const response = await this.#call("budget.consume_tool");
    if (response.operation !== "budget.consume_tool") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async consumeWorkerToolCall(
    sessionIdValue: unknown,
    executionIdValue: unknown,
    executionDigestValue: unknown,
  ): Promise<WorkerExecutionAuthorization> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const executionId = OpaqueIdSchema.parse(executionIdValue);
    const executionDigest = Sha256DigestSchema.parse(executionDigestValue);
    const response = await this.#call("budget.consume_worker_tool", {
      executionId,
      executionDigest,
    });
    if (response.operation !== "budget.consume_worker_tool") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async consumeLocalCommand(
    sessionIdValue: unknown,
    executionIdValue: unknown,
    executionDigestValue: unknown,
  ): Promise<WorkerExecutionAuthorization> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const executionId = OpaqueIdSchema.parse(executionIdValue);
    const executionDigest = Sha256DigestSchema.parse(executionDigestValue);
    const response = await this.#call("budget.consume_local_command", {
      executionId,
      executionDigest,
    });
    if (response.operation !== "budget.consume_local_command") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async recordWorkerViolation(
    sessionIdValue: unknown,
    boundaryIdValue: unknown,
    boundaryDigestValue: unknown,
    code: WorkerViolationCode,
  ): Promise<WorkerExecutionAuthorization> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const boundaryId = OpaqueIdSchema.parse(boundaryIdValue);
    const boundaryDigest = Sha256DigestSchema.parse(boundaryDigestValue);
    const response = await this.#call("worker.record_violation", {
      boundaryId,
      boundaryDigest,
      code,
    });
    if (response.operation !== "worker.record_violation") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async interruptWorkerSession(
    sessionIdValue: unknown,
    boundaryIdValue: unknown,
    boundaryDigestValue: unknown,
    failure: WorkerBoundaryFailureCode,
  ): Promise<WorkerBoundaryInterruption> {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    if (sessionId !== this.#binding.sessionId) throw new AuthorityIpcError("binding_mismatch");
    const boundaryId = OpaqueIdSchema.parse(boundaryIdValue);
    const boundaryDigest = Sha256DigestSchema.parse(boundaryDigestValue);
    const response = await this.#call("worker.interrupt", {
      boundaryId,
      boundaryDigest,
      failure,
    });
    if (response.operation !== "worker.interrupt") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async consumeApproval(value: unknown) {
    const consumption: ApprovalConsumptionRequest = ApprovalConsumptionRequestSchema.parse(value);
    if (consumption.sessionId !== this.#binding.sessionId) {
      throw new AuthorityIpcError("binding_mismatch");
    }
    const response = await this.#call("approval.consume", { consumption });
    if (response.operation !== "approval.consume") {
      throw new AuthorityIpcError("authority_unavailable");
    }
    return response.result;
  }

  async appendAuthorityAttempt(value: unknown): Promise<void> {
    const attempt: AuthorityAttemptRecord = AuthorityAttemptRecordSchema.parse(value);
    if (
      attempt.sessionId !== this.#binding.sessionId ||
      attempt.callerId !== this.#binding.callerId
    ) {
      throw new AuthorityIpcError("binding_mismatch");
    }
    const response = await this.#call("context.append_attempt", { attempt });
    if (response.operation !== "context.append_attempt" || response.result !== "recorded") {
      throw new AuthorityIpcError("authority_unavailable");
    }
  }

  async appendAuthorityDecision(value: unknown): Promise<void> {
    const decision: AuthorityDecisionRecord = AuthorityDecisionRecordSchema.parse(value);
    if (decision.sessionId !== this.#binding.sessionId) {
      throw new AuthorityIpcError("binding_mismatch");
    }
    const response = await this.#call("context.append_decision", { decision });
    if (response.operation !== "context.append_decision" || response.result !== "recorded") {
      throw new AuthorityIpcError("authority_unavailable");
    }
  }
}

export function parseAuthorityIpcFailureReason(value: unknown): AuthorityIpcFailureReason {
  return AuthorityIpcFailureReasonSchema.parse(value);
}
