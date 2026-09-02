import { canonicalDigest } from "@guardian/canonical";
import type { AuthorityWorkerClient } from "@guardian/authority-client";
import {
  SessionWorkspaceResultSchema,
  TimestampSchema,
  type DurableSessionBudget,
  type LocalCommandResult,
  type SessionWorkspaceResult,
  type WorkerToolExecutionEnvelope,
  type WorkerToolResult,
  type WorkerTurnIpcFailureReason,
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
  readonly now?: () => string;
}

function denialReason(authorization: ToolAuthorization): WorkerTurnIpcFailureReason {
  if (authorization.allowed) throw new TypeError("allowed authorization is not a denial");
  if (authorization.reason === "expired") return "expired";
  if (authorization.reason === "not_active") return "not_active";
  return "tool_denied";
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

function exactToolResult(value: unknown): WorkerToolResult {
  try {
    return createWorkerToolResult(value);
  } catch {
    throw new WorkerToolExecutionError("tool_unavailable");
  }
}

export class TrustedWorkerToolDispatcher {
  readonly #authority: AuthorityWorkerClient;
  readonly #runtime: BoundSessionRuntime;
  readonly #workspace: SessionWorkspaceResult;
  readonly #runLocalCommand: (request: unknown) => Promise<LocalCommandResult>;
  readonly #now: () => string;

  constructor(options: TrustedWorkerToolDispatcherOptions) {
    this.#authority = options.authority;
    this.#runtime = options.runtime;
    this.#workspace = SessionWorkspaceResultSchema.parse(options.workspace);
    this.#runLocalCommand = options.runLocalCommand;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async execute(executionValue: unknown): Promise<WorkerToolResult> {
    let execution: WorkerToolExecutionEnvelope;
    try {
      execution = assertExactWorkerToolExecutionEnvelope(executionValue);
    } catch {
      throw new WorkerToolExecutionError("tool_denied");
    }
    const evaluatedAt = TimestampSchema.parse(this.#now());
    if (Date.parse(evaluatedAt) < Date.parse(execution.requestedAt)) {
      throw new WorkerToolExecutionError("not_active");
    }
    if (Date.parse(evaluatedAt) >= Date.parse(execution.expiresAt)) {
      throw new WorkerToolExecutionError("expired");
    }
    if (execution.sourceTurnNumber !== 1) {
      throw new WorkerToolExecutionError("tool_denied");
    }
    if (
      canonicalDigest("session.workspace.result", 1, execution.workspace) !==
      canonicalDigest("session.workspace.result", 1, this.#workspace)
    ) {
      throw new WorkerToolExecutionError("tool_denied");
    }
    const status = this.#runtime.status(evaluatedAt);
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
      throw new WorkerToolExecutionError("tool_denied");
    }

    const commonResult = {
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

    switch (execution.request.name) {
      case "guardian.session_status": {
        const authorization = this.#runtime.authorizeSessionStatusCall(evaluatedAt);
        if (!authorization.allowed) throw new WorkerToolExecutionError(denialReason(authorization));
        let budget: DurableSessionBudget | null;
        try {
          budget = await this.#authority.consumeWorkerToolCall(
            execution.sessionId,
            execution.executionId,
            execution.executionDigest,
          );
        } catch {
          throw new WorkerToolExecutionError("authority_unavailable");
        }
        if (budget === null) throw new WorkerToolExecutionError("tool_denied");
        const completedAt = TimestampSchema.parse(this.#now());
        return exactToolResult({
          ...commonResult,
          completedAt,
          remainingBudget: remainingBudget(budget, status.expiresAt, completedAt),
          name: execution.request.name,
          output: status,
        });
      }
      case "guardian.local_command": {
        const authorization = this.#runtime.authorizeLocalCommandCall(
          execution.request.arguments,
          evaluatedAt,
        );
        if (!authorization.allowed) throw new WorkerToolExecutionError(denialReason(authorization));
        let budget: DurableSessionBudget | null;
        try {
          budget = await this.#authority.consumeLocalCommand(
            execution.sessionId,
            execution.executionId,
            execution.executionDigest,
          );
        } catch {
          throw new WorkerToolExecutionError("authority_unavailable");
        }
        if (budget === null) throw new WorkerToolExecutionError("tool_denied");
        let output: LocalCommandResult;
        try {
          output = await this.#runLocalCommand(execution.request.arguments);
        } catch {
          throw new WorkerToolExecutionError("tool_unavailable");
        }
        const completedAt = TimestampSchema.parse(this.#now());
        return exactToolResult({
          ...commonResult,
          completedAt,
          remainingBudget: remainingBudget(budget, status.expiresAt, completedAt),
          name: execution.request.name,
          output,
        });
      }
    }
  }
}
