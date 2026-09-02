import { z } from "zod";

import {
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import {
  MissionSetupRiskEnvelopeSchema,
  MissionSetupRiskEvaluationSchema,
} from "./mission-formation.js";

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
  });
export type MissionSetupRiskServiceProcessConfig = DeepReadonly<
  z.infer<typeof MissionSetupRiskServiceProcessConfigSchema>
>;
