import { z } from "zod";

import {
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
} from "./common.js";
import { GuardianEvaluationSchema, GuardianRiskEnvelopeSchema } from "./guardian-risk.js";

const GuardianActionRiskIpcBindingShape = {
  schemaVersion: ContractVersionSchema,
  capability: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
  requestDigest: Sha256DigestSchema,
} as const;

export const GuardianActionRiskIpcFailureReasonSchema = z.enum([
  "expired",
  "invalid_request",
  "not_active",
  "provider_unavailable",
  "turn_consumed",
  "unauthorized",
]);
export type GuardianActionRiskIpcFailureReason = z.infer<
  typeof GuardianActionRiskIpcFailureReasonSchema
>;

export const GuardianActionRiskIpcRequestSchema = z.strictObject({
  ...GuardianActionRiskIpcBindingShape,
  requestedAt: TimestampSchema,
});

export const GuardianActionRiskIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    evaluation: GuardianEvaluationSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: GuardianActionRiskIpcFailureReasonSchema,
  }),
]);

export const GuardianActionRiskServiceProcessConfigSchema = z
  .strictObject({
    ...GuardianActionRiskIpcBindingShape,
    serviceKind: z.literal("action_risk"),
    endpoint: z.string().min(1).max(260),
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    envelope: GuardianRiskEnvelopeSchema,
  })
  .superRefine((config, context) => {
    if (Date.parse(config.expiresAt) <= Date.parse(config.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "action risk service expiry must follow its start",
        path: ["expiresAt"],
      });
    }
  });
export type GuardianActionRiskServiceProcessConfig = DeepReadonly<
  z.infer<typeof GuardianActionRiskServiceProcessConfigSchema>
>;
