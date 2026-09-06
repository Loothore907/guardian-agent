import { z } from "zod";

import {
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import { CredentialStoreConfigSchema } from "./credentials.js";
import {
  MissionSetupRiskEnvelopeSchema,
  MissionSetupRiskEvaluationSchema,
} from "./mission-formation.js";
import { ManagedDemoGuardianUsageReporterConfigSchema } from "./managed-demo-budget-ipc.js";

export const MissionSetupRiskIpcFailureReasonSchema = z.enum([
  "expired",
  "invalid_request",
  "not_active",
  "provider_unavailable",
  "turn_consumed",
  "unauthorized",
]);
export type MissionSetupRiskIpcFailureReason = z.infer<
  typeof MissionSetupRiskIpcFailureReasonSchema
>;

export const MissionSetupRiskIpcRequestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  capability: OpaqueIdSchema,
  draftId: OpaqueIdSchema,
  revision: VersionNumberSchema,
  requestDigest: Sha256DigestSchema,
  requestedAt: TimestampSchema,
});

export const MissionSetupRiskIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    evaluation: MissionSetupRiskEvaluationSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: MissionSetupRiskIpcFailureReasonSchema,
  }),
]);

export const MissionSetupRiskServiceProcessConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    serviceKind: z.literal("mission_setup_risk"),
    credentialStore: CredentialStoreConfigSchema.optional(),
    managedDemoBudget: ManagedDemoGuardianUsageReporterConfigSchema.optional(),
    endpoint: z.string().min(1).max(260),
    capability: OpaqueIdSchema,
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    envelope: MissionSetupRiskEnvelopeSchema,
  })
  .superRefine((config, context) => {
    if (Date.parse(config.expiresAt) <= Date.parse(config.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "mission setup risk service expiry must follow its start",
        path: ["expiresAt"],
      });
    }
    const budgetBinding = config.managedDemoBudget?.budget.binding;
    if (
      budgetBinding !== undefined &&
      (Date.parse(config.startsAt) < Date.parse(budgetBinding.issuedAt) ||
        Date.parse(config.expiresAt) > Date.parse(budgetBinding.expiresAt))
    ) {
      context.addIssue({
        code: "custom",
        message: "setup risk lifetime must fit its managed-demo budget capability",
        path: ["managedDemoBudget", "budget", "binding"],
      });
    }
  });
export type MissionSetupRiskServiceProcessConfig = DeepReadonly<
  z.infer<typeof MissionSetupRiskServiceProcessConfigSchema>
>;
