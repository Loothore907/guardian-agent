import { canonicalDigest } from "@guardian/canonical";
import type { AuthorityWorkerClient } from "@guardian/authority-client";
import {
  SessionWorkspaceResultSchema,
  TimestampSchema,
  WorkerToolExecutionEnvelopeSchema,
  type DurableSessionBudget,
  type LocalCommandResult,
  type SessionWorkspaceResult,
  type WorkerBoundaryFailureCode,
  type WorkerExecutionAuthorization,
  type WorkerToolExecutionEnvelope,
  type WorkerToolResult,
  type WorkerTurnIpcFailureReason,
  type WorkerViolationCode,
} from "@guardian/contracts";
import type { BoundSessionRuntime, ToolAuthorization } from "@guardian/session";
import { assertExactWorkerToolExecutionEnvelope, createWorkerToolResult } from "@guardian/worker";

export class WorkerToolExecutionError extends Error {
  readonly reason: WorkerTurnIpcFailureReason;

  constructor(reason: WorkerTurnIpcFailureReason) {
    super(`worker tool execution failed: ${reason}`);
    this.name = "WorkerToolExecutionError";
    this.reason = reason;
  }
}

export interface TrustedWorkerToolDispatcherOptions {
  readonly authority: AuthorityWorkerClient;
  readonly runtime: BoundSessionRuntime;
  readonly workspace: SessionWorkspaceResult;
  readonly runLocalCommand: (request: unknown) => Promise<LocalCommandResult>;
  readonly revokeRuntime: () => void;
  readonly interruptRuntime: () => void;
  readonly now?: () => string;
}

function denialClassification(
  authorization: ToolAuthorization,
):
  | { readonly kind: "failure"; readonly reason: "expired" | "not_active" }
  | { readonly kind: "violation"; readonly code: WorkerViolationCode } {
  if (authorization.allowed) throw new TypeError("allowed authorization is not a denial");
  switch (authorization.reason) {
    case "expired":
      return { kind: "failure", reason: "expired" };
    case "not_active":
    case "revoked":
      return { kind: "failure", reason: "not_active" };
    case "tool_not_allowed":
    case "filesystem_not_allowed":
    case "timeout_exceeds_session":
    case "volume_exhausted":
      return { kind: "violation", code: authorization.reason };
    case "destination_not_allowed":
      return { kind: "violation", code: "tool_not_allowed" };
  }
}

function remainingBudget(budget: DurableSessionBudget, expiresAt: string, evaluatedAt: string) {
  return {
    remainingDurationSeconds: Math.max(
      0,
      Math.floor((Date.parse(expiresAt) - Date.parse(evaluatedAt)) / 1_000),
    ),
    remainingToolCalls: budget.remainingToolCalls,
    remainingResearchRequests: budget.remainingResearchRequests,
    remainingResearchResults: budget.remainingResearchResults,
    remainingLocalCommands: budget.remainingLocalCommands,
    remainingPrivilegedActions: 0,
  } as const;
}

export class TrustedWorkerToolDispatcher {
  readonly #authority: AuthorityWorkerClient;
  readonly #runtime: BoundSessionRuntime;
  readonly #workspace: SessionWorkspaceResult;
  readonly #runLocalCommand: (request: unknown) => Promise<LocalCommandResult>;
  readonly #revokeRuntime: () => void;
  readonly #interruptRuntime: () => void;
  readonly #now: () => string;

  constructor(options: TrustedWorkerToolDispatcherOptions) {
    this.#authority = options.authority;
    this.#runtime = options.runtime;
    this.#workspace = SessionWorkspaceResultSchema.parse(options.workspace);
    this.#runLocalCommand = options.runLocalCommand;
    this.#revokeRuntime = options.revokeRuntime;
    this.#interruptRuntime = options.interruptRuntime;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async #interrupt(
    execution: WorkerToolExecutionEnvelope,
    failure: WorkerBoundaryFailureCode,
    reason: WorkerTurnIpcFailureReason,
  ): Promise<never> {
    this.#interruptRuntime();
    try {
      await this.#authority.interruptWorkerSession(
        execution.sessionId,
        execution.executionId,
        execution.executionDigest,
        failure,
      );
    } catch {
      throw new WorkerToolExecutionError("authority_unavailable");
    }
    throw new WorkerToolExecutionError(reason);
  }

  async #result(value: unknown, execution: WorkerToolExecutionEnvelope): Promise<WorkerToolResult> {
    try {
      return createWorkerToolResult(value);
    } catch {
      return await this.#interrupt(execution, "result_invalid", "tool_unavailable");
    }
  }

  async #denialResult(
    execution: WorkerToolExecutionEnvelope,
    authorization: WorkerExecutionAuthorization,
    expiresAt: string,
    commonResult: Record<string, unknown>,
  ): Promise<WorkerToolResult> {
    if (authorization.outcome === "unavailable") {
      if (authorization.reason === "revoked") this.#revokeRuntime();
      if (authorization.reason === "not_active") this.#interruptRuntime();
      throw new WorkerToolExecutionError(
        authorization.reason === "expired" ? "expired" : "not_active",
      );
    }
    if (authorization.outcome === "allowed") {
      return await this.#interrupt(execution, "result_invalid", "tool_unavailable");
    }
    if (authorization.disposition === "revoked") this.#revokeRuntime();
    const completedAt = TimestampSchema.parse(this.#now());
    return await this.#result(
      {
        ...commonResult,
        completedAt,
        remainingBudget: remainingBudget(authorization.budget, expiresAt, completedAt),
        outcome: "denied",
        name: execution.request.name,
        denial: {
          code: authorization.publicCode,
          disposition: authorization.disposition,
          policyId: authorization.policyId,
          policyVersion: authorization.policyVersion,
        },
      },
      execution,
    );
  }

  async #recordViolation(
    execution: WorkerToolExecutionEnvelope,
    code: WorkerViolationCode,
    expiresAt: string,
    commonResult: Record<string, unknown>,
  ): Promise<WorkerToolResult> {
    let authorization: WorkerExecutionAuthorization;
    try {
      authorization = await this.#authority.recordWorkerViolation(
        this.#runtime.status(TimestampSchema.parse(this.#now())).sessionId,
        execution.executionId,
        execution.executionDigest,
        code,
      );
    } catch {
      this.#interruptRuntime();
      throw new WorkerToolExecutionError("authority_unavailable");
    }
    return await this.#denialResult(execution, authorization, expiresAt, commonResult);
  }

  async execute(executionValue: unknown): Promise<WorkerToolResult> {
    const claimed = WorkerToolExecutionEnvelopeSchema.safeParse(executionValue);
    let execution: WorkerToolExecutionEnvelope;
    try {
      execution = assertExactWorkerToolExecutionEnvelope(executionValue);
    } catch {
      if (claimed.success) {
        const status = this.#runtime.status(TimestampSchema.parse(this.#now()));
        return await this.#recordViolation(
          claimed.data,
          "execution_binding_mismatch",
          status.expiresAt,
          this.#commonResult(claimed.data),
        );
      }
      throw new WorkerToolExecutionError("tool_denied");
    }
    const evaluatedAt = TimestampSchema.parse(this.#now());
    if (Date.parse(evaluatedAt) < Date.parse(execution.requestedAt)) {
      throw new WorkerToolExecutionError("not_active");
    }
    if (Date.parse(evaluatedAt) >= Date.parse(execution.expiresAt)) {
      throw new WorkerToolExecutionError("expired");
    }
    const status = this.#runtime.status(evaluatedAt);
    const commonResult = this.#commonResult(execution);
    if (execution.sourceTurnNumber !== 1) {
      return await this.#recordViolation(
        execution,
        "execution_binding_mismatch",
        status.expiresAt,
        commonResult,
      );
    }
    if (
      canonicalDigest("session.workspace.result", 1, execution.workspace) !==
      canonicalDigest("session.workspace.result", 1, this.#workspace)
    ) {
      return await this.#recordViolation(
        execution,
        "workspace_binding_mismatch",
        status.expiresAt,
        commonResult,
      );
    }
    if (
      status.state !== "active" ||
      status.sessionId !== execution.sessionId ||
      status.callerId !== execution.callerId ||
      status.missionId !== execution.missionId ||
      status.missionVersion !== execution.missionVersion ||
      status.profileId !== execution.profileId ||
      status.profileVersion !== execution.profileVersion ||
      status.policyVersion !== execution.policyVersion
    ) {
      if (status.state !== "active") {
        throw new WorkerToolExecutionError(status.state === "expired" ? "expired" : "not_active");
      }
      return await this.#recordViolation(
        execution,
        "execution_binding_mismatch",
        status.expiresAt,
        commonResult,
      );
    }

    switch (execution.request.name) {
      case "guardian.session_status": {
        const authorization = this.#runtime.authorizeSessionStatusCall(evaluatedAt);
        if (!authorization.allowed) {
          const reason = denialClassification(authorization);
          if (reason.kind === "failure") {
            throw new WorkerToolExecutionError(reason.reason);
          }
          return await this.#recordViolation(
            execution,
            reason.code,
            status.expiresAt,
            commonResult,
          );
        }
        let durable: WorkerExecutionAuthorization;
        try {
          durable = await this.#authority.consumeWorkerToolCall(
            execution.sessionId,
            execution.executionId,
            execution.executionDigest,
          );
        } catch {
          this.#interruptRuntime();
          throw new WorkerToolExecutionError("authority_unavailable");
        }
        if (durable.outcome !== "allowed") {
          return await this.#denialResult(execution, durable, status.expiresAt, commonResult);
        }
        const completedAt = TimestampSchema.parse(this.#now());
        return await this.#result(
          {
            ...commonResult,
            completedAt,
            remainingBudget: remainingBudget(durable.budget, status.expiresAt, completedAt),
            outcome: "succeeded",
            name: execution.request.name,
            output: status,
          },
          execution,
        );
      }
      case "guardian.local_command": {
        const authorization = this.#runtime.authorizeLocalCommandCall(
          execution.request.arguments,
          evaluatedAt,
        );
        if (!authorization.allowed) {
          const reason = denialClassification(authorization);
          if (reason.kind === "failure") {
            throw new WorkerToolExecutionError(reason.reason);
          }
          return await this.#recordViolation(
            execution,
            reason.code,
            status.expiresAt,
            commonResult,
          );
        }
        let durable: WorkerExecutionAuthorization;
        try {
          durable = await this.#authority.consumeLocalCommand(
            execution.sessionId,
            execution.executionId,
            execution.executionDigest,
          );
        } catch {
          this.#interruptRuntime();
          throw new WorkerToolExecutionError("authority_unavailable");
        }
        if (durable.outcome !== "allowed") {
          return await this.#denialResult(execution, durable, status.expiresAt, commonResult);
        }
        let output: LocalCommandResult;
        try {
          output = await this.#runLocalCommand(execution.request.arguments);
        } catch {
          return await this.#interrupt(execution, "tool_unavailable", "tool_unavailable");
        }
        const completedAt = TimestampSchema.parse(this.#now());
        return await this.#result(
          {
            ...commonResult,
            completedAt,
            remainingBudget: remainingBudget(durable.budget, status.expiresAt, completedAt),
            outcome: "succeeded",
            name: execution.request.name,
            output,
          },
          execution,
        );
      }
    }
  }

  #commonResult(execution: WorkerToolExecutionEnvelope) {
    return {
      schemaVersion: 1 as const,
      executionId: execution.executionId,
      executionDigest: execution.executionDigest,
      sessionId: execution.sessionId,
      callerId: execution.callerId,
      missionId: execution.missionId,
      missionVersion: execution.missionVersion,
      profileId: execution.profileId,
      profileVersion: execution.profileVersion,
      policyVersion: execution.policyVersion,
      sourceTurnId: execution.sourceTurnId,
      sourceTurnNumber: execution.sourceTurnNumber,
      sourceTurnDigest: execution.sourceTurnDigest,
      requestDigest: execution.requestDigest,
    };
  }
}
