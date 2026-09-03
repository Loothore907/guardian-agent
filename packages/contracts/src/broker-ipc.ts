import { z } from "zod";

import { CanonicalRequestSchema, ExactApprovalSchema } from "./authorization.js";
import {
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  TimestampSchema,
} from "./common.js";
import { GitHubMergeResultSchema, GitHubPullRequestSnapshotSchema } from "./github.js";

export const BrokerDenialCodeSchema = z.enum([
  "malformed",
  "not_active",
  "connection_unavailable",
  "scope_mismatch",
  "volume_exhausted",
  "resource_changed",
  "approval_mismatch",
  "approval_expired",
  "approval_replayed",
  "guardian_confirmation_required",
  "guardian_step_up",
  "guardian_denied",
  "guardian_unavailable",
  "not_mergeable",
  "audit_unavailable",
  "provider_failed",
]);
export type BrokerDenialCode = z.infer<typeof BrokerDenialCodeSchema>;

export const BrokerExecutionRequestSchema = z
  .strictObject({
    request: CanonicalRequestSchema,
    approval: ExactApprovalSchema.optional(),
    evidenceExposureIds: z.array(OpaqueIdSchema).max(16).default([]),
  })
  .superRefine((execution, context) => {
    if (new Set(execution.evidenceExposureIds).size !== execution.evidenceExposureIds.length) {
      context.addIssue({
        code: "custom",
        message: "broker evidence exposure identifiers must be unique",
        path: ["evidenceExposureIds"],
      });
    }
    if (
      execution.approval !== undefined &&
      execution.request.proposal.operation !== "github.pull_request.merge"
    ) {
      context.addIssue({
        code: "custom",
        message: "broker approval is accepted only for a merge request",
        path: ["approval"],
      });
    }
  });
export type BrokerExecutionRequest = DeepReadonly<z.infer<typeof BrokerExecutionRequestSchema>>;

export const BrokerExecutionResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    ok: z.literal(true),
    result: z.union([GitHubPullRequestSnapshotSchema, GitHubMergeResultSchema]),
  }),
  z.strictObject({
    ok: z.literal(false),
    code: BrokerDenialCodeSchema,
  }),
]);
export type BrokerExecutionResult = DeepReadonly<z.infer<typeof BrokerExecutionResultSchema>>;

const BrokerIpcBindingShape = {
  schemaVersion: ContractVersionSchema,
  capability: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
} as const;

export const BrokerIpcRequestSchema = z.strictObject({
  ...BrokerIpcBindingShape,
  requestedAt: TimestampSchema,
  execution: BrokerExecutionRequestSchema,
});
export type BrokerIpcRequest = DeepReadonly<z.infer<typeof BrokerIpcRequestSchema>>;

export const BrokerIpcFailureReasonSchema = z.enum([
  "expired",
  "invalid_request",
  "not_active",
  "service_unavailable",
  "unauthorized",
]);
export type BrokerIpcFailureReason = z.infer<typeof BrokerIpcFailureReasonSchema>;

export const BrokerIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    result: BrokerExecutionResultSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: BrokerIpcFailureReasonSchema,
  }),
]);
export type BrokerIpcResponse = DeepReadonly<z.infer<typeof BrokerIpcResponseSchema>>;

export const BrokerIpcServiceConfigSchema = z
  .strictObject({
    ...BrokerIpcBindingShape,
    endpoint: z.string().min(1).max(260),
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .superRefine((config, context) => {
    if (Date.parse(config.expiresAt) <= Date.parse(config.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "broker IPC service expiry must follow its start",
        path: ["expiresAt"],
      });
    }
  });
export type BrokerIpcServiceConfig = DeepReadonly<z.infer<typeof BrokerIpcServiceConfigSchema>>;
