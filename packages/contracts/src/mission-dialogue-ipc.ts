import { z } from "zod";

import { ProviderRequestIdSchema } from "./actions.js";
import {
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import {
  MissionDraftReviewEnvelopeSchema,
  MissionDraftReviewOutcomeSchema,
} from "./mission-formation.js";

export const MissionDraftReviewIpcFailureReasonSchema = z.enum([
  "expired",
  "invalid_request",
  "not_active",
  "provider_malformed",
  "provider_unavailable",
  "turn_consumed",
  "unauthorized",
]);
export type MissionDraftReviewIpcFailureReason = z.infer<
  typeof MissionDraftReviewIpcFailureReasonSchema
>;

export const MissionDraftReviewIpcRequestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  capability: OpaqueIdSchema,
  draftId: OpaqueIdSchema,
  revision: VersionNumberSchema,
  reviewTurn: VersionNumberSchema,
  requestedAt: TimestampSchema,
});
export type MissionDraftReviewIpcRequest = DeepReadonly<
  z.infer<typeof MissionDraftReviewIpcRequestSchema>
>;

export const MissionDraftReviewIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    providerRequestId: ProviderRequestIdSchema,
    outcome: MissionDraftReviewOutcomeSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: MissionDraftReviewIpcFailureReasonSchema,
  }),
]);
export type MissionDraftReviewIpcResponse = DeepReadonly<
  z.infer<typeof MissionDraftReviewIpcResponseSchema>
>;

export const MissionDraftReviewServiceProcessConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    serviceKind: z.literal("mission_draft_review"),
    endpoint: z.string().min(1).max(260),
    capability: OpaqueIdSchema,
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    envelope: MissionDraftReviewEnvelopeSchema,
  })
  .superRefine((config, context) => {
    if (Date.parse(config.expiresAt) <= Date.parse(config.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "mission draft review service expiry must follow its start",
        path: ["expiresAt"],
      });
    }
  });
export type MissionDraftReviewServiceProcessConfig = DeepReadonly<
  z.infer<typeof MissionDraftReviewServiceProcessConfigSchema>
>;
