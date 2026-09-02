import { z } from "zod";

import {
  AuthorityAttemptRecordSchema,
  AuthorityDecisionRecordSchema,
} from "./authority-context.js";
import {
  ContractVersionSchema,
  OpaqueIdSchema,
  TimestampSchema,
  type DeepReadonly,
} from "./common.js";
import { ExactApprovalSchema } from "./authorization.js";
import {
  ApprovalConsumptionRequestSchema,
  DurableSessionBudgetSchema,
  DurableSessionRecordSchema,
} from "./persistence.js";
import { DurableConnectionRecordSchema } from "./authority-context.js";

export const AuthorityIpcOperationSchema = z.enum([
  "connection.create",
  "session.create",
  "approval.store",
  "research.reserve",
  "research.settle",
  "session.get",
  "connection.list",
  "approval.get",
  "approval.state",
  "budget.consume_tool",
  "budget.consume_worker_tool",
  "budget.consume_local_command",
  "approval.consume",
  "context.append_attempt",
  "context.append_decision",
]);
export type AuthorityIpcOperation = z.infer<typeof AuthorityIpcOperationSchema>;

export const AuthorityCallerRoleSchema = z.enum([
  "launcher",
  "research_service",
  "authorization_service",
  "broker_service",
  "worker_dispatcher",
]);
export type AuthorityCallerRole = z.infer<typeof AuthorityCallerRoleSchema>;

const AuthorityRequestBindingShape = {
  schemaVersion: ContractVersionSchema,
  requestId: OpaqueIdSchema,
  capability: OpaqueIdSchema,
  callerRole: AuthorityCallerRoleSchema,
  callerId: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
} as const;

export const AuthorityIpcRequestSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("connection.create"),
    connection: DurableConnectionRecordSchema,
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("session.create"),
    session: DurableSessionRecordSchema,
    budget: DurableSessionBudgetSchema,
    connectionIds: z.array(OpaqueIdSchema).max(16),
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("approval.store"),
    approval: ExactApprovalSchema,
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("research.reserve"),
    requestedResults: z.number().int().min(1).max(3),
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("research.settle"),
    reservationId: OpaqueIdSchema,
    acceptedResults: z.number().int().min(0).max(3),
  }),
  z.strictObject({ ...AuthorityRequestBindingShape, operation: z.literal("session.get") }),
  z.strictObject({ ...AuthorityRequestBindingShape, operation: z.literal("connection.list") }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("approval.get"),
    approvalId: OpaqueIdSchema,
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("approval.state"),
    approvalId: OpaqueIdSchema,
  }),
  z.strictObject({ ...AuthorityRequestBindingShape, operation: z.literal("budget.consume_tool") }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("budget.consume_worker_tool"),
    executionId: OpaqueIdSchema,
    executionDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("budget.consume_local_command"),
    executionId: OpaqueIdSchema,
    executionDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("approval.consume"),
    consumption: ApprovalConsumptionRequestSchema,
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("context.append_attempt"),
    attempt: AuthorityAttemptRecordSchema,
  }),
  z.strictObject({
    ...AuthorityRequestBindingShape,
    operation: z.literal("context.append_decision"),
    decision: AuthorityDecisionRecordSchema,
  }),
]);
export type AuthorityIpcRequest = DeepReadonly<z.infer<typeof AuthorityIpcRequestSchema>>;

const AuthorityResponseBindingShape = {
  schemaVersion: ContractVersionSchema,
  requestId: OpaqueIdSchema,
} as const;

const ApprovalStateSchema = z.enum(["available", "consumed"]);
const ApprovalConsumptionResultSchema = z.enum([
  "consumed",
  "replayed",
  "not_found",
  "request_mismatch",
  "not_active",
  "expired",
]);

export const AuthorityIpcSuccessResponseSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("connection.create"),
    result: z.literal("created"),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("session.create"),
    result: z.literal("created"),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("approval.store"),
    result: z.literal("stored"),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("research.reserve"),
    result: z
      .strictObject({
        reservationId: OpaqueIdSchema,
        sessionId: OpaqueIdSchema,
        reservedResults: z.number().int().min(1).max(3),
        budget: DurableSessionBudgetSchema,
      })
      .nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("research.settle"),
    result: DurableSessionBudgetSchema,
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("session.get"),
    result: DurableSessionRecordSchema.nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("connection.list"),
    result: z.array(DurableConnectionRecordSchema).max(16),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("approval.get"),
    result: ExactApprovalSchema.nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("approval.state"),
    result: ApprovalStateSchema.nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("budget.consume_tool"),
    result: DurableSessionBudgetSchema.nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("budget.consume_worker_tool"),
    result: DurableSessionBudgetSchema.nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("budget.consume_local_command"),
    result: DurableSessionBudgetSchema.nullable(),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("approval.consume"),
    result: ApprovalConsumptionResultSchema,
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("context.append_attempt"),
    result: z.literal("recorded"),
  }),
  z.strictObject({
    ...AuthorityResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("context.append_decision"),
    result: z.literal("recorded"),
  }),
]);

export const AuthorityIpcFailureReasonSchema = z.enum([
  "invalid_request",
  "unauthorized",
  "stale_capability",
  "binding_mismatch",
  "operation_not_allowed",
  "authority_unavailable",
]);
export type AuthorityIpcFailureReason = z.infer<typeof AuthorityIpcFailureReasonSchema>;

export const AuthorityIpcFailureResponseSchema = z.strictObject({
  ...AuthorityResponseBindingShape,
  ok: z.literal(false),
  error: AuthorityIpcFailureReasonSchema,
});

export const AuthorityIpcResponseSchema = z.union([
  AuthorityIpcSuccessResponseSchema,
  AuthorityIpcFailureResponseSchema,
]);
export type AuthorityIpcResponse = DeepReadonly<z.infer<typeof AuthorityIpcResponseSchema>>;

export const AuthorityCapabilityBindingSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    capability: OpaqueIdSchema,
    callerRole: AuthorityCallerRoleSchema,
    callerId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    allowedOperations: z.array(AuthorityIpcOperationSchema).min(1).max(12),
    issuedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .superRefine((binding, context) => {
    if (Date.parse(binding.expiresAt) <= Date.parse(binding.issuedAt)) {
      context.addIssue({
        code: "custom",
        message: "authority capability expiry must follow issuance",
        path: ["expiresAt"],
      });
    }
    if (new Set(binding.allowedOperations).size !== binding.allowedOperations.length) {
      context.addIssue({
        code: "custom",
        message: "duplicate authority operations are not allowed",
      });
    }
  });
export type AuthorityCapabilityBinding = DeepReadonly<
  z.infer<typeof AuthorityCapabilityBindingSchema>
>;

export const AuthorityClientProcessConfigSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  endpoint: z.string().min(1).max(260),
  binding: AuthorityCapabilityBindingSchema,
});
export type AuthorityClientProcessConfig = DeepReadonly<
  z.infer<typeof AuthorityClientProcessConfigSchema>
>;

export const AuthorityServiceProcessConfigSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  serviceInstanceId: OpaqueIdSchema,
  endpoint: z.string().min(1).max(260),
  authorityStorePath: z.string().min(1).max(4_096),
  workspaceRoots: z.array(z.string().min(1).max(4_096)).max(16),
  capabilities: z.array(AuthorityCapabilityBindingSchema).min(1).max(128),
});
export type AuthorityServiceProcessConfig = DeepReadonly<
  z.infer<typeof AuthorityServiceProcessConfigSchema>
>;
