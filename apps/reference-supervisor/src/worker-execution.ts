import type { WorkerExternalTools } from "./worker-external-tools.js";
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
  type WorkerAuditEventInput,
  type WorkerDenialCause,
  type WorkerDenialStage,
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
  readonly workerMaxTurns?: number;
  readonly remainingPrivilegedActions?: () => Promise<number>;
  readonly externalTools?: Pick<WorkerExternalTools, "execute">;
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
  readonly #privilegedBudget: TrustedWorkerToolDispatcherOptions["remainingPrivilegedActions"];
  readonly #externalTools: TrustedWorkerToolDispatcherOptions["externalTools"];
  readonly #workerMaxTurns: number | undefined;
  readonly #runtime: BoundSessionRuntime;
  readonly #workspace: SessionWorkspaceResult;
  readonly #runLocalCommand: (request: unknown) => Promise<LocalCommandResult>;
  readonly #revokeRuntime: () => void;
  readonly #interruptRuntime: () => void;
  readonly #now: () => string;

  constructor(options: TrustedWorkerToolDispatcherOptions) {
    this.#authority = options.authority;
    this.#privilegedBudget = options.remainingPrivilegedActions;
    this.#externalTools = options.externalTools;
    this.#workerMaxTurns = options.workerMaxTurns;
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
      const result = createWorkerToolResult(value);
      if (this.#privilegedBudget === undefined) return result;
      const body = { ...result };
      Reflect.deleteProperty(body, "resultDigest");
      return createWorkerToolResult({
        ...body,
        remainingBudget: {
          ...body.remainingBudget,
          remainingPrivilegedActions: await this.#privilegedBudget(),
        },
      });
    } catch {
      return await this.#interrupt(execution, "result_invalid", "tool_unavailable");
    }
  }

  async #audit(
    execution: WorkerToolExecutionEnvelope,
    event: WorkerAuditEventInput,
  ): Promise<void> {
    if (this.#authority.recordWorkerAuditEvent === undefined) {
      if (execution.continuation === undefined) return;
      return await this.#interrupt(execution, "authority_unavailable", "authority_unavailable");
    }
    try {
      await this.#authority.recordWorkerAuditEvent(execution.sessionId, event);
    } catch {
      return await this.#interrupt(execution, "authority_unavailable", "authority_unavailable");
    }
  }

  async #denialResult(
    execution: WorkerToolExecutionEnvelope,
    authorization: WorkerExecutionAuthorization,
    expiresAt: string,
    commonResult: Record<string, unknown>,
    classification?: {
      readonly cause: WorkerDenialCause;
      readonly stage: WorkerDenialStage;
    },
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
          ...(classification === undefined ? {} : classification),
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
    classification?: {
      readonly cause: WorkerDenialCause;
      readonly stage: WorkerDenialStage;
    },
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
    return await this.#denialResult(
      execution,
      authorization,
      expiresAt,
      commonResult,
      classification,
    );
  }

  async #auditExternalDenial(
    execution: WorkerToolExecutionEnvelope,
    result: WorkerToolResult,
    classification: { readonly cause: WorkerDenialCause; readonly stage: WorkerDenialStage },
    includeProposal: boolean,
  ): Promise<void> {
    if (includeProposal) {
      await this.#audit(execution, {
        type: "proposal.received",
        proposalId: execution.executionId,
        boundaryId: execution.executionId,
        boundaryDigest: execution.executionDigest,
        operation: execution.request.name as
          "guardian.research" | "github.pull_request.read" | "github.pull_request.merge",
      });
    }
    await this.#audit(execution, {
      type: "policy.decided",
      boundaryId: execution.executionId,
      boundaryDigest: execution.executionDigest,
      requestDigest: execution.requestDigest,
      level: "deny",
      reasonCodes: ["scope_expansion"],
      denialCause: classification.cause,
      denialStage: classification.stage,
    });
    await this.#audit(execution, {
      type: "execution.result",
      boundaryId: execution.executionId,
      boundaryDigest: execution.executionDigest,
      requestDigest: execution.requestDigest,
      outcome: "denied",
      resultCode:
        classification.cause === "resource_changed" ? "resource_changed" : "request_mismatch",
      providerBoundary: "not_crossed",
      adapterBoundary: "not_crossed",
    });
    await this.#audit(execution, {
      type: "worker.feedback.returned",
      boundaryId: execution.executionId,
      boundaryDigest: execution.executionDigest,
      requestDigest: execution.requestDigest,
      resultDigest: result.resultDigest,
      outcome: "denied",
      denialCause: classification.cause,
      denialStage: classification.stage,
    });
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
    if (
      execution.continuation === undefined
        ? execution.sourceTurnNumber !== 1
        : this.#workerMaxTurns !== execution.continuation.maxTurns ||
          execution.sourceTurnNumber >= execution.continuation.maxTurns ||
          execution.continuation.deadline !== status.expiresAt
    ) {
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
      case "guardian.research":
      case "github.pull_request.read":
      case "github.pull_request.merge": {
        if (
          !this.#externalTools ||
          !this.#authority.claimExternalExecution ||
          !this.#authority.getWorkerBudget
        )
          return await this.#interrupt(execution, "tool_unavailable", "tool_unavailable");
        const permission = this.#runtime.authorizeToolCall(execution.request.name, evaluatedAt);
        if (!permission.allowed) {
          const denial = denialClassification(permission);
          if (denial.kind === "failure") throw new WorkerToolExecutionError(denial.reason);
          const classification = {
            cause: "destination_not_allowed" as const,
            stage: "session_plan_policy" as const,
          };
          const denied = await this.#recordViolation(
            execution,
            denial.code,
            status.expiresAt,
            commonResult,
            classification,
          );
          await this.#auditExternalDenial(execution, denied, classification, true);
          return denied;
        }
        let claim: WorkerExecutionAuthorization;
        try {
          claim = await this.#authority.claimExternalExecution(
            execution.sessionId,
            execution.executionId,
            execution.executionDigest,
          );
        } catch {
          return await this.#interrupt(execution, "authority_unavailable", "authority_unavailable");
        }
        if (claim.outcome !== "allowed")
          return await this.#denialResult(execution, claim, status.expiresAt, commonResult);
        await this.#audit(execution, {
          type: "proposal.received",
          proposalId: execution.executionId,
          boundaryId: execution.executionId,
          boundaryDigest: execution.executionDigest,
          operation: execution.request.name,
        });
        let result: Awaited<ReturnType<WorkerExternalTools["execute"]>>;
        try {
          result = await this.#externalTools.execute(execution);
        } catch {
          return await this.#interrupt(execution, "tool_unavailable", "tool_unavailable");
        }
        if (result.outcome === "denied") {
          const denied = await this.#recordViolation(
            execution,
            "tool_not_allowed",
            status.expiresAt,
            commonResult,
            { cause: result.cause, stage: result.stage },
          );
          await this.#auditExternalDenial(
            execution,
            denied,
            {
              cause: result.cause,
              stage: result.stage,
            },
            false,
          );
          return denied;
        }
        if (result.name !== execution.request.name)
          return await this.#interrupt(execution, "result_invalid", "tool_unavailable");
        let budget: DurableSessionBudget | null;
        try {
          budget = await this.#authority.getWorkerBudget(execution.sessionId);
        } catch {
          return await this.#interrupt(execution, "authority_unavailable", "authority_unavailable");
        }
        if (budget === null || budget.sessionId !== execution.sessionId)
          return await this.#interrupt(execution, "authority_unavailable", "authority_unavailable");
        const completedAt = TimestampSchema.parse(this.#now());
        if (
          Date.parse(completedAt) >= Date.parse(execution.expiresAt) ||
          this.#runtime.status(completedAt).state !== "active"
        )
          return await this.#interrupt(execution, "tool_unavailable", "expired");
        await this.#audit(execution, {
          type: "policy.decided",
          boundaryId: execution.executionId,
          boundaryDigest: execution.executionDigest,
          requestDigest: execution.requestDigest,
          level: "allow",
          reasonCodes: ["within_scope"],
        });
        await this.#audit(execution, {
          type: "execution.result",
          boundaryId: execution.executionId,
          boundaryDigest: execution.executionDigest,
          requestDigest: execution.requestDigest,
          outcome: "succeeded",
          resultCode: "ok",
          providerBoundary: "crossed",
          adapterBoundary: "crossed",
        });
        const workerResult = await this.#result(
          {
            ...commonResult,
            outcome: result.outcome,
            name: result.name,
            output: result.output,
            completedAt,
            remainingBudget: {
              ...remainingBudget(budget, status.expiresAt, completedAt),
              remainingPrivilegedActions: result.remainingPrivilegedActions,
            },
          },
          execution,
        );
        await this.#audit(execution, {
          type: "worker.feedback.returned",
          boundaryId: execution.executionId,
          boundaryDigest: execution.executionDigest,
          requestDigest: execution.requestDigest,
          resultDigest: workerResult.resultDigest,
          outcome: "succeeded",
        });
        return workerResult;
      }
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
      ...(execution.sessionPlanGrantId === undefined
        ? {}
        : { sessionPlanGrantId: execution.sessionPlanGrantId }),
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
