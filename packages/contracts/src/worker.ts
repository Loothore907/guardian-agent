import { z } from "zod";

import {
  addDuplicateIssue,
  boundedCredentialSafeText,
  containsSecretLikeMaterial,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import {
  LocalCommandRequestSchema,
  ProviderRequestIdSchema,
  ResearchRequestSchema,
  ControlledPublicHttpsUrlSchema,
  ControlledContentJourneyResultSchema,
} from "./actions.js";
import { ResearchJourneyResultSchema } from "./research-ipc.js";
import { GitHubPullRequestSnapshotSchema, GitHubMergeResultSchema } from "./github.js";
import { ToolCapabilitySchema } from "./mission.js";
import { BoundSessionStatusSchema } from "./session-status.js";
import { LocalCommandResultSchema } from "./executor.js";
import { SessionWorkspaceResultSchema } from "./workspace.js";
import {
  DEFAULT_GUARDIAN_MODEL_POLICY,
  GuardianModelIdSchema,
  GuardianModelPolicyIdSchema,
} from "./model-policy.js";
import {
  DEFAULT_WORKER_VIOLATION_POLICY,
  WorkerDenialCauseSchema,
  WorkerDenialStageSchema,
} from "./worker-policy.js";
import { CredentialStoreConfigSchema } from "./credentials.js";
import { ManagedDemoWorkerUsageReporterConfigSchema } from "./managed-demo-budget-ipc.js";

const WorkerLocalCommandRequestSchema = LocalCommandRequestSchema.superRefine(
  (request, context) => {
    request.arguments.forEach((argument, index) => {
      if (/https?:\/\//iu.test(argument)) {
        context.addIssue({
          code: "custom",
          message: "worker command arguments cannot contain URLs",
          path: ["arguments", index],
        });
      }
      if (/[;&|`]/u.test(argument) || argument.includes("$(")) {
        context.addIssue({
          code: "custom",
          message: "worker command arguments cannot contain shell text",
          path: ["arguments", index],
        });
      }
    });
  },
);

export const SessionWorkerSelectionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    kind: z.literal("deterministic_reference"),
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    kind: z.literal("nebius_native"),
    provider: z.literal("nebius_token_factory"),
    role: z.literal("native_worker"),
    modelPolicyId: GuardianModelPolicyIdSchema,
    modelPolicyVersion: VersionNumberSchema,
    modelId: GuardianModelIdSchema,
  }),
]);
export type SessionWorkerSelection = DeepReadonly<z.infer<typeof SessionWorkerSelectionSchema>>;

export const DEFAULT_REFERENCE_WORKER_SELECTION = SessionWorkerSelectionSchema.parse({
  schemaVersion: 1,
  kind: "deterministic_reference",
});

export const DEFAULT_NEBIUS_WORKER_SELECTION = SessionWorkerSelectionSchema.parse({
  schemaVersion: 1,
  kind: "nebius_native",
  provider: DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker.provider,
  role: DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker.role,
  modelPolicyId: DEFAULT_GUARDIAN_MODEL_POLICY.policyId,
  modelPolicyVersion: DEFAULT_GUARDIAN_MODEL_POLICY.version,
  modelId: DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker.modelId,
});

const GitHubNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/u);
const GitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);

export const WorkerToolRequestSchema = z.discriminatedUnion("name", [
  z.strictObject({
    name: z.literal("guardian.session_status"),
    arguments: z.strictObject({}),
  }),
  z.strictObject({
    name: z.literal("guardian.research"),
    arguments: z.union([
      ResearchRequestSchema,
      z.strictObject({
        sourceUrl: ControlledPublicHttpsUrlSchema.refine(
          (v) => !v.includes("%") && !containsSecretLikeMaterial(v),
        ),
      }),
    ]),
  }),
  z.strictObject({
    name: z.literal("guardian.local_command"),
    arguments: WorkerLocalCommandRequestSchema,
  }),
  z.strictObject({
    name: z.literal("github.pull_request.read"),
    arguments: z.strictObject({
      owner: GitHubNameSchema,
      repository: GitHubNameSchema,
      pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      content: z.literal("review").optional(),
    }),
  }),
  z.strictObject({
    name: z.literal("github.pull_request.merge"),
    arguments: z.strictObject({
      owner: GitHubNameSchema,
      repository: GitHubNameSchema,
      pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      expectedHeadCommit: GitCommitSchema,
      method: z.literal("squash"),
    }),
  }),
]);
export type WorkerToolRequest = DeepReadonly<z.infer<typeof WorkerToolRequestSchema>>;

function containsCredentialLikeValue(value: unknown): boolean {
  if (typeof value === "string") {
    return !boundedCredentialSafeText(Math.max(1, value.length)).safeParse(value).success;
  }
  if (Array.isArray(value)) return value.some(containsCredentialLikeValue);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(containsCredentialLikeValue);
  }
  return false;
}

function containsArbitraryTransportValue(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      /https?:\/\//iu.test(value) ||
      /^(?:authorization|cookie|proxy-authorization|set-cookie|x-api-key)\s*:/iu.test(value)
    );
  }
  if (Array.isArray(value)) return value.some(containsArbitraryTransportValue);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(containsArbitraryTransportValue);
  }
  return false;
}

export const WorkerOutcomeSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("final_response"),
      response: boundedCredentialSafeText(8_000),
    }),
    z.strictObject({
      kind: z.literal("tool_request"),
      request: WorkerToolRequestSchema,
    }),
  ])
  .refine((outcome) => !containsCredentialLikeValue(outcome), {
    message: "worker outcome cannot contain credential-like material",
  })
  .refine(
    (outcome) =>
      !containsArbitraryTransportValue(
        outcome.kind === "tool_request" &&
          outcome.request.name === "guardian.research" &&
          "sourceUrl" in outcome.request.arguments
          ? { ...outcome, request: { ...outcome.request, arguments: {} } }
          : outcome,
      ),
    {
      message: "worker outcome cannot contain arbitrary URLs or headers",
    },
  );
export type WorkerOutcome = DeepReadonly<z.infer<typeof WorkerOutcomeSchema>>;

export const WorkerRemainingBudgetSchema = z.strictObject({
  remainingDurationSeconds: z.number().int().min(0).max(604_800),
  remainingToolCalls: z.number().int().min(0).max(10_000),
  remainingResearchRequests: z.number().int().min(0).max(1_000),
  remainingResearchResults: z.number().int().min(0).max(10_000),
  remainingLocalCommands: z.number().int().min(0).max(1_000),
  remainingPrivilegedActions: z.number().int().min(0).max(100),
});
export type WorkerRemainingBudget = DeepReadonly<z.infer<typeof WorkerRemainingBudgetSchema>>;

export const WorkerRuntimeToolRequestSchema = WorkerToolRequestSchema;
export type WorkerRuntimeToolRequest = DeepReadonly<z.infer<typeof WorkerRuntimeToolRequestSchema>>;

export const WorkerContinuationProfileSchema = z.strictObject({
  kind: z.literal("bounded_v1"),
  maxTurns: z.number().int().min(2).max(20),
  deadline: TimestampSchema,
});
export type WorkerContinuationProfile = DeepReadonly<
  z.infer<typeof WorkerContinuationProfileSchema>
>;

export const WorkerToolExecutionEnvelopeWithoutDigestSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    executionId: OpaqueIdSchema,
    sessionPlanGrantId: OpaqueIdSchema.optional(),
    continuation: WorkerContinuationProfileSchema.optional(),
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    profileId: OpaqueIdSchema,
    profileVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    worker: SessionWorkerSelectionSchema,
    sourceTurnId: OpaqueIdSchema,
    sourceTurnNumber: VersionNumberSchema,
    sourceTurnDigest: Sha256DigestSchema,
    requestDigest: Sha256DigestSchema,
    request: WorkerRuntimeToolRequestSchema,
    workspace: SessionWorkspaceResultSchema,
    requestedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .superRefine((execution, context) => {
    if (Date.parse(execution.expiresAt) <= Date.parse(execution.requestedAt)) {
      context.addIssue({
        code: "custom",
        message: "worker tool execution expiry must follow its request",
        path: ["expiresAt"],
      });
    }
  });

export const WorkerToolExecutionEnvelopeSchema =
  WorkerToolExecutionEnvelopeWithoutDigestSchema.extend({
    executionDigest: Sha256DigestSchema,
  });
export type WorkerToolExecutionEnvelope = DeepReadonly<
  z.infer<typeof WorkerToolExecutionEnvelopeSchema>
>;

const WorkerToolResultBindingShape = {
  schemaVersion: ContractVersionSchema,
  sessionPlanGrantId: OpaqueIdSchema.optional(),
  executionId: OpaqueIdSchema,
  executionDigest: Sha256DigestSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
  missionId: OpaqueIdSchema,
  missionVersion: VersionNumberSchema,
  profileId: OpaqueIdSchema,
  profileVersion: VersionNumberSchema,
  policyVersion: VersionNumberSchema,
  sourceTurnId: OpaqueIdSchema,
  sourceTurnNumber: VersionNumberSchema,
  sourceTurnDigest: Sha256DigestSchema,
  requestDigest: Sha256DigestSchema,
  completedAt: TimestampSchema,
  remainingBudget: WorkerRemainingBudgetSchema,
} as const;

function containsPrivateHostPath(value: string): boolean {
  return /(?:[A-Za-z]:\\Users\\|\/mnt\/[a-z]\/Users\/|\/(?:home|root)\/)\S*/iu.test(value);
}

function localCommandOutputIsSafe(output: { readonly stdout: string; readonly stderr: string }) {
  return [output.stdout, output.stderr].every(
    (value) => !containsSecretLikeMaterial(value) && !containsPrivateHostPath(value),
  );
}

function publicToolResultIsSafe(value: unknown): boolean {
  if (typeof value === "string")
    return (
      !containsSecretLikeMaterial(value) &&
      !containsPrivateHostPath(value) &&
      !/https?:\/\/[^\s/]*@/iu.test(value)
    );
  if (Array.isArray(value)) return value.every(publicToolResultIsSafe);
  return (
    typeof value !== "object" ||
    value === null ||
    Object.values(value).every(publicToolResultIsSafe)
  );
}

const WorkerToolSuccessResultWithoutDigestSchema = z.discriminatedUnion("name", [
  z.strictObject({
    ...WorkerToolResultBindingShape,
    outcome: z.literal("succeeded"),
    name: z.literal("guardian.research"),
    output: z.union([ResearchJourneyResultSchema, ControlledContentJourneyResultSchema]),
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    outcome: z.literal("succeeded"),
    name: z.literal("github.pull_request.read"),
    output: GitHubPullRequestSnapshotSchema,
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    outcome: z.literal("succeeded"),
    name: z.literal("github.pull_request.merge"),
    output: GitHubMergeResultSchema,
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    outcome: z.literal("succeeded"),
    name: z.literal("guardian.session_status"),
    output: BoundSessionStatusSchema,
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    outcome: z.literal("succeeded"),
    name: z.literal("guardian.local_command"),
    output: LocalCommandResultSchema,
  }),
]);

const WorkerToolDenialShape = {
  ...WorkerToolResultBindingShape,
  outcome: z.literal("denied"),
  denial: z.strictObject({
    code: z.literal("request_denied"),
    disposition: z.enum(["continue", "revoked"]),
    policyId: z.literal(DEFAULT_WORKER_VIOLATION_POLICY.policyId),
    policyVersion: z.literal(DEFAULT_WORKER_VIOLATION_POLICY.version),
    cause: WorkerDenialCauseSchema.optional(),
    stage: WorkerDenialStageSchema.optional(),
  }),
} as const;

const WorkerToolDeniedResultWithoutDigestSchema = z.discriminatedUnion("name", [
  z.strictObject({ ...WorkerToolDenialShape, name: z.literal("guardian.research") }),
  z.strictObject({ ...WorkerToolDenialShape, name: z.literal("github.pull_request.read") }),
  z.strictObject({ ...WorkerToolDenialShape, name: z.literal("github.pull_request.merge") }),
  z.strictObject({ ...WorkerToolDenialShape, name: z.literal("guardian.session_status") }),
  z.strictObject({ ...WorkerToolDenialShape, name: z.literal("guardian.local_command") }),
]);

export const WorkerToolResultWithoutDigestSchema = z
  .union([WorkerToolSuccessResultWithoutDigestSchema, WorkerToolDeniedResultWithoutDigestSchema])
  .superRefine((result, context) => {
    if (
      result.outcome === "denied" &&
      (result.denial.cause === undefined) !== (result.denial.stage === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "worker denial cause and stage must be returned together",
        path: ["denial"],
      });
    }
  })
  .refine(publicToolResultIsSafe, "unsafe worker result")
  .refine(
    (r) =>
      !["guardian.research", "github.pull_request.read", "github.pull_request.merge"].includes(
        r.name,
      ) || new TextEncoder().encode(JSON.stringify(r)).byteLength <= 24_000,
    "external result exceeds byte budget",
  )
  .refine(
    (r) =>
      r.outcome !== "succeeded" ||
      r.name !== "guardian.research" ||
      (Array.isArray(r.output.provenance) ? r.output.provenance : [r.output.provenance]).every(
        (p) => p.sessionId === r.sessionId,
      ),
    "research result session mismatch",
  )
  .refine(
    (result) =>
      result.outcome !== "succeeded" ||
      result.name !== "guardian.local_command" ||
      localCommandOutputIsSafe(result.output),
    { message: "worker tool result cannot contain secret-like material or a private host path" },
  );

const WorkerToolSuccessResultSchema = z.discriminatedUnion("name", [
  z.strictObject({
    ...WorkerToolResultBindingShape,
    resultDigest: Sha256DigestSchema,
    outcome: z.literal("succeeded"),
    name: z.literal("guardian.research"),
    output: z.union([ResearchJourneyResultSchema, ControlledContentJourneyResultSchema]),
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    resultDigest: Sha256DigestSchema,
    outcome: z.literal("succeeded"),
    name: z.literal("github.pull_request.read"),
    output: GitHubPullRequestSnapshotSchema,
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    resultDigest: Sha256DigestSchema,
    outcome: z.literal("succeeded"),
    name: z.literal("github.pull_request.merge"),
    output: GitHubMergeResultSchema,
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    resultDigest: Sha256DigestSchema,
    outcome: z.literal("succeeded"),
    name: z.literal("guardian.session_status"),
    output: BoundSessionStatusSchema,
  }),
  z.strictObject({
    ...WorkerToolResultBindingShape,
    resultDigest: Sha256DigestSchema,
    outcome: z.literal("succeeded"),
    name: z.literal("guardian.local_command"),
    output: LocalCommandResultSchema,
  }),
]);

const WorkerToolDeniedResultSchema = z.discriminatedUnion("name", [
  z.strictObject({
    ...WorkerToolDenialShape,
    resultDigest: Sha256DigestSchema,
    name: z.literal("guardian.research"),
  }),
  z.strictObject({
    ...WorkerToolDenialShape,
    resultDigest: Sha256DigestSchema,
    name: z.literal("github.pull_request.read"),
  }),
  z.strictObject({
    ...WorkerToolDenialShape,
    resultDigest: Sha256DigestSchema,
    name: z.literal("github.pull_request.merge"),
  }),
  z.strictObject({
    ...WorkerToolDenialShape,
    resultDigest: Sha256DigestSchema,
    name: z.literal("guardian.session_status"),
  }),
  z.strictObject({
    ...WorkerToolDenialShape,
    resultDigest: Sha256DigestSchema,
    name: z.literal("guardian.local_command"),
  }),
]);

export const WorkerToolResultSchema = z
  .union([WorkerToolSuccessResultSchema, WorkerToolDeniedResultSchema])
  .refine(publicToolResultIsSafe, "unsafe worker result")
  .refine(
    (r) =>
      !["guardian.research", "github.pull_request.read", "github.pull_request.merge"].includes(
        r.name,
      ) || new TextEncoder().encode(JSON.stringify(r)).byteLength <= 24_000,
    "external result exceeds byte budget",
  )
  .refine(
    (result) =>
      result.outcome !== "succeeded" ||
      result.name !== "guardian.local_command" ||
      localCommandOutputIsSafe(result.output),
    { message: "worker tool result cannot contain secret-like material or a private host path" },
  );
export type WorkerToolResult = DeepReadonly<z.infer<typeof WorkerToolResultSchema>>;

const WorkerTurnEnvelopeWithoutDigestSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    turnId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    profileId: OpaqueIdSchema,
    profileVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    modelPolicyId: GuardianModelPolicyIdSchema,
    modelPolicyVersion: VersionNumberSchema,
    worker: SessionWorkerSelectionSchema,
    turnNumber: VersionNumberSchema,
    continuation: WorkerContinuationProfileSchema.optional(),
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    objective: boundedCredentialSafeText(1_000),
    constraints: z.array(boundedCredentialSafeText(500)).min(1).max(32),
    allowedTools: z.array(ToolCapabilitySchema).max(16),
    remainingBudget: WorkerRemainingBudgetSchema,
    sessionPlanGrantId: OpaqueIdSchema.optional(),
    previousToolResult: WorkerToolResultSchema.optional(),
    toolHistory: z.array(WorkerToolResultSchema).max(3).optional(),
  })
  .superRefine((turn, context) => {
    addDuplicateIssue(turn.allowedTools, context, ["allowedTools"]);
    if (
      turn.continuation !== undefined &&
      new TextEncoder().encode(JSON.stringify(turn)).byteLength > 48_000
    )
      context.addIssue({ code: "custom", message: "worker context exceeds byte budget" });
    if (
      turn.toolHistory !== undefined &&
      (turn.continuation === undefined ||
        turn.toolHistory.some(
          (r, i, history) =>
            r.sessionPlanGrantId !== turn.sessionPlanGrantId ||
            r.sessionId !== turn.sessionId ||
            r.callerId !== turn.callerId ||
            r.missionId !== turn.missionId ||
            r.missionVersion !== turn.missionVersion ||
            r.profileId !== turn.profileId ||
            r.profileVersion !== turn.profileVersion ||
            r.policyVersion !== turn.policyVersion ||
            r.sourceTurnNumber >= turn.turnNumber - 1 ||
            (i > 0 && r.sourceTurnNumber <= history[i - 1]!.sourceTurnNumber),
        ))
    )
      context.addIssue({ code: "custom", message: "history does not bind the current turn" });
    if (
      turn.continuation !== undefined &&
      (turn.turnNumber > turn.continuation.maxTurns ||
        Date.parse(turn.expiresAt) > Date.parse(turn.continuation.deadline))
    )
      context.addIssue({ code: "custom", message: "turn exceeds continuation profile" });
    if (
      turn.previousToolResult !== undefined &&
      Object.keys(turn.remainingBudget).some(
        (key) =>
          turn.remainingBudget[key as keyof typeof turn.remainingBudget] >
          turn.previousToolResult!.remainingBudget[key as keyof typeof turn.remainingBudget],
      )
    )
      context.addIssue({ code: "custom", message: "turn budget cannot increase" });
    if (Date.parse(turn.expiresAt) <= Date.parse(turn.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "worker turn expiry must follow its start",
        path: ["expiresAt"],
      });
    }
    if (
      turn.worker.kind === "nebius_native" &&
      (turn.worker.modelPolicyId !== turn.modelPolicyId ||
        turn.worker.modelPolicyVersion !== turn.modelPolicyVersion)
    ) {
      context.addIssue({
        code: "custom",
        message: "worker assignment must match the bound model policy",
        path: ["worker"],
      });
    }
    if (turn.turnNumber === 1 && turn.previousToolResult !== undefined) {
      context.addIssue({
        code: "custom",
        message: "the first worker turn cannot contain a tool result",
        path: ["previousToolResult"],
      });
    }
    if (turn.turnNumber > 1 && turn.previousToolResult === undefined) {
      context.addIssue({
        code: "custom",
        message: "a subsequent worker turn requires the preceding tool result",
        path: ["previousToolResult"],
      });
    }
    if (
      turn.previousToolResult !== undefined &&
      (turn.previousToolResult.sessionPlanGrantId !== turn.sessionPlanGrantId ||
        turn.previousToolResult.sessionId !== turn.sessionId ||
        turn.previousToolResult.callerId !== turn.callerId ||
        turn.previousToolResult.missionId !== turn.missionId ||
        turn.previousToolResult.missionVersion !== turn.missionVersion ||
        turn.previousToolResult.profileId !== turn.profileId ||
        turn.previousToolResult.profileVersion !== turn.profileVersion ||
        turn.previousToolResult.policyVersion !== turn.policyVersion ||
        turn.previousToolResult.sourceTurnNumber + 1 !== turn.turnNumber ||
        Date.parse(turn.startsAt) < Date.parse(turn.previousToolResult.completedAt))
    ) {
      context.addIssue({
        code: "custom",
        message: "worker tool result does not bind the subsequent turn",
        path: ["previousToolResult"],
      });
    }
  });

export const WorkerTurnEnvelopeSchema = WorkerTurnEnvelopeWithoutDigestSchema.extend({
  turnDigest: Sha256DigestSchema,
});
export type WorkerTurnEnvelope = DeepReadonly<z.infer<typeof WorkerTurnEnvelopeSchema>>;

export const WorkerTurnIpcFailureReasonSchema = z.enum([
  "authority_unavailable",
  "expired",
  "invalid_request",
  "not_active",
  "provider_malformed",
  "provider_unavailable",
  "turn_consumed",
  "tool_denied",
  "tool_unavailable",
  "unauthorized",
]);
export type WorkerTurnIpcFailureReason = z.infer<typeof WorkerTurnIpcFailureReasonSchema>;

export const WorkerProviderDiagnosticSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("transport_failure") }),
  z.strictObject({
    kind: z.literal("http_error"),
    status: z.number().int().min(100).max(599),
  }),
  z.strictObject({ kind: z.literal("response_envelope_invalid") }),
  z.strictObject({ kind: z.literal("worker_output_invalid") }),
  z.strictObject({ kind: z.literal("credential_or_internal_failure") }),
]);
export type WorkerProviderDiagnostic = DeepReadonly<z.infer<typeof WorkerProviderDiagnosticSchema>>;

export const WorkerTurnIpcRequestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  capability: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
  turnId: OpaqueIdSchema,
  turnNumber: VersionNumberSchema,
  turnDigest: Sha256DigestSchema,
  requestedAt: TimestampSchema,
});
export type WorkerTurnIpcRequest = DeepReadonly<z.infer<typeof WorkerTurnIpcRequestSchema>>;

export const WorkerTurnResultSchema = z.strictObject({
  providerRequestId: ProviderRequestIdSchema,
  turnId: OpaqueIdSchema,
  turnNumber: VersionNumberSchema,
  turnDigest: Sha256DigestSchema,
  outcome: WorkerOutcomeSchema,
});
export type WorkerTurnResult = DeepReadonly<z.infer<typeof WorkerTurnResultSchema>>;

export const WorkerTurnIpcResponseSchema = z
  .discriminatedUnion("ok", [
    z.strictObject({
      schemaVersion: ContractVersionSchema,
      ok: z.literal(true),
      result: WorkerTurnResultSchema,
    }),
    z.strictObject({
      schemaVersion: ContractVersionSchema,
      ok: z.literal(false),
      error: WorkerTurnIpcFailureReasonSchema,
      providerDiagnostic: WorkerProviderDiagnosticSchema.optional(),
    }),
  ])
  .superRefine((response, context) => {
    if (
      !response.ok &&
      response.providerDiagnostic !== undefined &&
      response.error !== "provider_unavailable"
    ) {
      context.addIssue({
        code: "custom",
        path: ["providerDiagnostic"],
        message: "provider diagnostics require a provider-unavailable failure",
      });
    }
  });
export type WorkerTurnIpcResponse = DeepReadonly<z.infer<typeof WorkerTurnIpcResponseSchema>>;

export const WorkerServiceProcessConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    serviceKind: z.literal("worker_turn"),
    endpoint: z.string().min(1).max(260),
    capability: OpaqueIdSchema,
    credentialStore: CredentialStoreConfigSchema.optional(),
    managedDemoBudget: ManagedDemoWorkerUsageReporterConfigSchema.optional(),
    turn: WorkerTurnEnvelopeSchema,
  })
  .superRefine((config, context) => {
    const budgetBinding = config.managedDemoBudget?.budget.binding;
    if (
      budgetBinding !== undefined &&
      (Date.parse(config.turn.startsAt) < Date.parse(budgetBinding.issuedAt) ||
        Date.parse(config.turn.expiresAt) > Date.parse(budgetBinding.expiresAt))
    ) {
      context.addIssue({
        code: "custom",
        message: "worker lifetime must fit its managed-demo budget capability",
        path: ["managedDemoBudget", "budget", "binding"],
      });
    }
  });
export type WorkerServiceProcessConfig = DeepReadonly<
  z.infer<typeof WorkerServiceProcessConfigSchema>
>;

export const WorkerTurnBoundaryStateSchema = z
  .discriminatedUnion("state", [
    z.strictObject({ state: z.literal("not_attached") }),
    z.strictObject({
      state: z.literal("completed"),
      result: WorkerTurnResultSchema,
      toolResult: WorkerToolResultSchema.optional(),
    }),
    z.strictObject({
      state: z.literal("failed_closed"),
      error: WorkerTurnIpcFailureReasonSchema,
    }),
    z.strictObject({
      state: z.literal("revoked"),
      toolResult: WorkerToolResultSchema,
    }),
  ])
  .superRefine((boundary, context) => {
    if (boundary.state === "revoked") {
      if (
        boundary.toolResult.outcome !== "denied" ||
        boundary.toolResult.denial.disposition !== "revoked"
      ) {
        context.addIssue({
          code: "custom",
          message: "a revoked worker boundary requires an exact revocation denial",
          path: ["toolResult"],
        });
      }
      return;
    }
    if (boundary.state !== "completed") return;
    if (
      boundary.toolResult !== undefined &&
      (boundary.result.outcome.kind !== "final_response" ||
        boundary.result.turnNumber !== boundary.toolResult.sourceTurnNumber + 1)
    ) {
      context.addIssue({
        code: "custom",
        message: "a completed tool round-trip must end in the exact subsequent final turn",
        path: ["result"],
      });
    }
    if (boundary.result.turnNumber > 1 && boundary.toolResult === undefined) {
      context.addIssue({
        code: "custom",
        message: "a subsequent completed turn requires its exact tool result",
        path: ["toolResult"],
      });
    }
  });
export type WorkerTurnBoundaryState = DeepReadonly<z.infer<typeof WorkerTurnBoundaryStateSchema>>;

export { WorkerTurnEnvelopeWithoutDigestSchema };
