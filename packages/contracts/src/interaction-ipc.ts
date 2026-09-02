import { z } from "zod";

import {
  boundedVisibleText,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import { ProviderRequestIdSchema } from "./actions.js";
import { ToolCapabilitySchema } from "./mission.js";

export const InteractionMissionContextSchema = z.strictObject({
  objective: boundedVisibleText(1_000),
  constraints: z.array(boundedVisibleText(500)).max(32),
  allowedTools: z.array(ToolCapabilitySchema).min(1).max(16),
});
export type InteractionMissionContext = DeepReadonly<
  z.infer<typeof InteractionMissionContextSchema>
>;

export const InteractionOutcomeSchema = z.strictObject({
  kind: z.literal("mission_brief"),
  summary: boundedVisibleText(2_000),
});
export type InteractionOutcome = DeepReadonly<z.infer<typeof InteractionOutcomeSchema>>;

const InteractionBindingShape = {
  schemaVersion: ContractVersionSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
  missionId: OpaqueIdSchema,
  missionVersion: VersionNumberSchema,
  profileId: OpaqueIdSchema,
  profileVersion: VersionNumberSchema,
  policyVersion: VersionNumberSchema,
} as const;

export const InteractionIpcRequestSchema = z.strictObject({
  ...InteractionBindingShape,
  capability: OpaqueIdSchema,
  requestedAt: TimestampSchema,
  turn: z.literal(1),
});
export type InteractionIpcRequest = DeepReadonly<z.infer<typeof InteractionIpcRequestSchema>>;

export const InteractionIpcFailureReasonSchema = z.enum([
  "expired",
  "invalid_request",
  "not_active",
  "provider_malformed",
  "provider_unavailable",
  "tool_not_allowed",
  "turn_consumed",
  "unauthorized",
]);
export type InteractionIpcFailureReason = z.infer<typeof InteractionIpcFailureReasonSchema>;

export const InteractionIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    providerRequestId: ProviderRequestIdSchema,
    outcome: InteractionOutcomeSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: InteractionIpcFailureReasonSchema,
  }),
]);
export type InteractionIpcResponse = DeepReadonly<z.infer<typeof InteractionIpcResponseSchema>>;

export const InteractionServiceProcessConfigSchema = z
  .strictObject({
    ...InteractionBindingShape,
    capability: OpaqueIdSchema,
    endpoint: z.string().min(1).max(260),
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    context: InteractionMissionContextSchema,
  })
  .superRefine((config, context) => {
    if (Date.parse(config.expiresAt) <= Date.parse(config.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "interaction service expiry must follow its start",
        path: ["expiresAt"],
      });
    }
  });
export type InteractionServiceProcessConfig = DeepReadonly<
  z.infer<typeof InteractionServiceProcessConfigSchema>
>;

export const InteractionRunnerStateSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("not_attached") }),
  z.strictObject({
    state: z.literal("completed"),
    providerRequestId: ProviderRequestIdSchema,
    outcome: InteractionOutcomeSchema,
  }),
]);
export type InteractionRunnerState = DeepReadonly<z.infer<typeof InteractionRunnerStateSchema>>;
