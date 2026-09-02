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
} from "./actions.js";
import { ToolCapabilitySchema } from "./mission.js";
import { BoundSessionStatusSchema } from "./session-status.js";
import { LocalCommandResultSchema } from "./executor.js";
import { SessionWorkspaceResultSchema } from "./workspace.js";
import {
  DEFAULT_GUARDIAN_MODEL_POLICY,
  GuardianModelIdSchema,
  GuardianModelPolicyIdSchema,
} from "./model-policy.js";

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
    arguments: ResearchRequestSchema,
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
  .refine((outcome) => !containsArbitraryTransportValue(outcome), {
    message: "worker outcome cannot contain arbitrary URLs or headers",
  });
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

export const WorkerRuntimeToolRequestSchema = z.discriminatedUnion("name", [
  z.strictObject({
    name: z.literal("guardian.session_status"),
    arguments: z.strictObject({}),
  }),
  z.strictObject({
    name: z.literal("guardian.local_command"),
    arguments: WorkerLocalCommandRequestSchema,
  }),
]);
export type WorkerRuntimeToolRequest = DeepReadonly<z.infer<typeof WorkerRuntimeToolRequestSchema>>;

export const WorkerToolExecutionEnvelopeWithoutDigestSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    executionId: OpaqueIdSchema,
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

export const WorkerToolResultWithoutDigestSchema = z
  .discriminatedUnion("name", [
    z.strictObject({
      ...WorkerToolResultBindingShape,
      name: z.literal("guardian.session_status"),
      output: BoundSessionStatusSchema,
    }),
    z.strictObject({
      ...WorkerToolResultBindingShape,
      name: z.literal("guardian.local_command"),
      output: LocalCommandResultSchema,
    }),
  ])
  .refine(
    (result) => result.name !== "guardian.local_command" || localCommandOutputIsSafe(result.output),
    { message: "worker tool result cannot contain secret-like material or a private host path" },
  );

export const WorkerToolResultSchema = z
  .discriminatedUnion("name", [
    z.strictObject({
      ...WorkerToolResultBindingShape,
      resultDigest: Sha256DigestSchema,
      name: z.literal("guardian.session_status"),
      output: BoundSessionStatusSchema,
    }),
    z.strictObject({
      ...WorkerToolResultBindingShape,
      resultDigest: Sha256DigestSchema,
      name: z.literal("guardian.local_command"),
      output: LocalCommandResultSchema,
    }),
  ])
  .refine(
    (result) => result.name !== "guardian.local_command" || localCommandOutputIsSafe(result.output),
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
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    objective: boundedCredentialSafeText(1_000),
    constraints: z.array(boundedCredentialSafeText(500)).min(1).max(32),
    allowedTools: z.array(ToolCapabilitySchema).max(16),
    remainingBudget: WorkerRemainingBudgetSchema,
    previousToolResult: WorkerToolResultSchema.optional(),
  })
  .superRefine((turn, context) => {
    addDuplicateIssue(turn.allowedTools, context, ["allowedTools"]);
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
      (turn.previousToolResult.sessionId !== turn.sessionId ||
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

export const WorkerTurnIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    result: WorkerTurnResultSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: WorkerTurnIpcFailureReasonSchema,
  }),
]);
export type WorkerTurnIpcResponse = DeepReadonly<z.infer<typeof WorkerTurnIpcResponseSchema>>;

export const WorkerServiceProcessConfigSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  serviceKind: z.literal("worker_turn"),
  endpoint: z.string().min(1).max(260),
  capability: OpaqueIdSchema,
  turn: WorkerTurnEnvelopeSchema,
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
  ])
  .superRefine((boundary, context) => {
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
