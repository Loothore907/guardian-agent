import { z } from "zod";

import {
  addDuplicateIssue,
  AuthorizationLevelSchema,
  boundedCredentialSafeText,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import { GuardianModelPolicyIdSchema } from "./model-policy.js";
import {
  FilesystemScopeSchema,
  NetworkScopeSchema,
  PermissionEnvelopeSchema,
  SideEffectPermissionSchema,
  TimeBudgetSchema,
  ToolCapabilitySchema,
  VolumeBudgetSchema,
} from "./mission.js";

export const MissionFormationRequestedRouteSchema = z.enum(["qwen_assisted", "structured"]);

export const MissionDraftFieldSchema = z.enum([
  "constraints",
  "tools",
  "filesystem",
  "network",
  "side_effects",
  "time",
  "volume",
]);
export type MissionDraftField = z.infer<typeof MissionDraftFieldSchema>;

export const MissionPolicyDraftSchema = z.strictObject({
  tools: z.array(ToolCapabilitySchema).max(16).nullable(),
  filesystem: FilesystemScopeSchema.nullable(),
  network: NetworkScopeSchema.nullable(),
  sideEffects: z.array(SideEffectPermissionSchema).max(8).nullable(),
  time: TimeBudgetSchema.nullable(),
  volume: VolumeBudgetSchema.nullable(),
});

export const UntrustedMissionDraftInputSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  objective: boundedCredentialSafeText(1_000),
  constraints: z.array(boundedCredentialSafeText(500)).max(32).nullable(),
  requestedPermissions: MissionPolicyDraftSchema,
  requestedRoute: MissionFormationRequestedRouteSchema,
});
export type UntrustedMissionDraftInput = DeepReadonly<
  z.infer<typeof UntrustedMissionDraftInputSchema>
>;

export function mechanicallyMissingMissionFields(
  value: UntrustedMissionDraftInput,
): MissionDraftField[] {
  const fields: MissionDraftField[] = [];
  if (value.constraints === null) fields.push("constraints");
  if (value.requestedPermissions.tools === null) fields.push("tools");
  if (value.requestedPermissions.filesystem === null) fields.push("filesystem");
  if (value.requestedPermissions.network === null) fields.push("network");
  if (value.requestedPermissions.sideEffects === null) fields.push("side_effects");
  if (value.requestedPermissions.time === null) fields.push("time");
  if (value.requestedPermissions.volume === null) fields.push("volume");
  return fields;
}

export const MissionDraftReviewEnvelopeSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    draftId: OpaqueIdSchema,
    revision: VersionNumberSchema,
    reviewTurn: VersionNumberSchema,
    modelPolicyId: GuardianModelPolicyIdSchema,
    modelPolicyVersion: VersionNumberSchema,
    expiresAt: TimestampSchema,
    objective: boundedCredentialSafeText(1_000),
    constraints: z.array(boundedCredentialSafeText(500)).max(32).nullable(),
    requestedPermissions: MissionPolicyDraftSchema,
    mechanicallyMissingFields: z.array(MissionDraftFieldSchema).max(7),
  })
  .superRefine((envelope, context) => {
    addDuplicateIssue(envelope.mechanicallyMissingFields, context, ["mechanicallyMissingFields"]);
  });
export type MissionDraftReviewEnvelope = DeepReadonly<
  z.infer<typeof MissionDraftReviewEnvelopeSchema>
>;

export const MissionDraftReviewReasonSchema = z.enum([
  "no_issue",
  "ambiguous_objective",
  "destination_ambiguity",
  "data_handling_ambiguity",
  "side_effect_ambiguity",
  "budget_ambiguity",
  "authentication_ambiguity",
  "unsupported_request",
]);

const ClarificationQuestionSchema = z.strictObject({
  field: MissionDraftFieldSchema,
  question: boundedCredentialSafeText(500),
});

export const MissionDraftReviewOutcomeSchema = z.discriminatedUnion("status", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    status: z.literal("ready"),
    reasonCodes: z.tuple([z.literal("no_issue")]),
  }),
  z
    .strictObject({
      schemaVersion: ContractVersionSchema,
      status: z.literal("needs_clarification"),
      missingFields: z.array(MissionDraftFieldSchema).max(7),
      reasonCodes: z.array(MissionDraftReviewReasonSchema).min(1).max(8),
      questions: z.array(ClarificationQuestionSchema).min(1).max(8),
    })
    .superRefine((outcome, context) => {
      addDuplicateIssue(outcome.missingFields, context, ["missingFields"]);
      addDuplicateIssue(outcome.reasonCodes, context, ["reasonCodes"]);
    }),
]);
export type MissionDraftReviewOutcome = DeepReadonly<
  z.infer<typeof MissionDraftReviewOutcomeSchema>
>;

export const MissionFormationEffectiveRouteSchema = z.discriminatedUnion("effective", [
  z.strictObject({
    requested: z.literal("qwen_assisted"),
    effective: z.literal("qwen_assisted"),
  }),
  z.strictObject({
    requested: z.literal("qwen_assisted"),
    effective: z.literal("deterministic_fallback"),
    fallbackReason: z.enum(["provider_unavailable", "provider_malformed"]),
  }),
  z.strictObject({
    requested: z.literal("structured"),
    effective: z.literal("structured"),
  }),
]);
export type MissionFormationEffectiveRoute = DeepReadonly<
  z.infer<typeof MissionFormationEffectiveRouteSchema>
>;

export const MissionSetupRiskResultSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("not_required"), authorizationFloor: z.literal("allow") }),
  z.strictObject({
    status: z.enum(["preserved", "escalated", "uncertain"]),
    authorizationFloor: AuthorizationLevelSchema,
    requestDigest: Sha256DigestSchema,
    providerRequestId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/u),
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    authorizationFloor: z.literal("deny"),
    requestDigest: Sha256DigestSchema,
  }),
]);

export const MissionSetupRiskSignalSchema = z.enum([
  "broad_network_scope",
  "privileged_side_effects",
  "large_volume",
  "long_duration",
  "clean_scope",
]);

export const MissionSetupRiskEnvelopeSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    draftId: OpaqueIdSchema,
    revision: VersionNumberSchema,
    modelPolicyId: GuardianModelPolicyIdSchema,
    modelPolicyVersion: VersionNumberSchema,
    requestDigest: Sha256DigestSchema,
    expiresAt: TimestampSchema,
    route: MissionFormationEffectiveRouteSchema,
    deterministicFloor: AuthorizationLevelSchema,
    objective: boundedCredentialSafeText(1_000),
    constraints: z.array(boundedCredentialSafeText(500)).max(32),
    permissions: PermissionEnvelopeSchema,
    riskSignals: z.array(MissionSetupRiskSignalSchema).min(1).max(5),
    containsCredentials: z.literal(false),
  })
  .superRefine((envelope, context) => {
    addDuplicateIssue(envelope.riskSignals, context, ["riskSignals"]);
  });
export type MissionSetupRiskEnvelope = DeepReadonly<z.infer<typeof MissionSetupRiskEnvelopeSchema>>;

export const MissionSetupRiskEvaluationSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("evaluated"),
    providerRequestId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/u),
    authorizationLevel: AuthorizationLevelSchema,
    certainty: z.enum(["certain", "uncertain"]),
  }),
  z.strictObject({ status: z.literal("unavailable"), authorizationLevel: z.literal("deny") }),
]);
export type MissionSetupRiskEvaluation = DeepReadonly<
  z.infer<typeof MissionSetupRiskEvaluationSchema>
>;

export const CompiledMissionCandidateSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  draftId: OpaqueIdSchema,
  revision: VersionNumberSchema,
  state: z.literal("awaiting_confirmation"),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  policyVersion: VersionNumberSchema,
  modelPolicyId: GuardianModelPolicyIdSchema,
  modelPolicyVersion: VersionNumberSchema,
  route: MissionFormationEffectiveRouteSchema,
  objective: boundedCredentialSafeText(1_000),
  constraints: z.array(boundedCredentialSafeText(500)).max(32),
  permissions: PermissionEnvelopeSchema,
  setupRisk: MissionSetupRiskResultSchema,
  previewDigest: Sha256DigestSchema,
});
export type CompiledMissionCandidate = DeepReadonly<z.infer<typeof CompiledMissionCandidateSchema>>;

export const MissionFormationDraftSnapshotSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  draftId: OpaqueIdSchema,
  revision: VersionNumberSchema,
  state: z.enum(["awaiting_review", "review_in_progress", "needs_clarification"]),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  modelPolicyId: GuardianModelPolicyIdSchema,
  modelPolicyVersion: VersionNumberSchema,
  draft: UntrustedMissionDraftInputSchema,
  mechanicallyMissingFields: z.array(MissionDraftFieldSchema).max(7),
});
export type MissionFormationDraftSnapshot = DeepReadonly<
  z.infer<typeof MissionFormationDraftSnapshotSchema>
>;

export const MissionFormationStateSchema = z.enum([
  "awaiting_review",
  "review_in_progress",
  "needs_clarification",
  "ready_for_compilation",
  "setup_risk_in_progress",
  "setup_risk_complete",
  "awaiting_confirmation",
  "consumed",
]);
export type MissionFormationState = z.infer<typeof MissionFormationStateSchema>;
