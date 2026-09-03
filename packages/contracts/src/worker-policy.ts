import { z } from "zod";

import { DurableSessionBudgetSchema } from "./persistence.js";
import {
  ContractVersionSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  VersionNumberSchema,
  type DeepReadonly,
} from "./common.js";

export const WorkerViolationCodeSchema = z.enum([
  "tool_not_allowed",
  "filesystem_not_allowed",
  "timeout_exceeds_session",
  "volume_exhausted",
  "execution_replay",
  "execution_binding_mismatch",
  "workspace_binding_mismatch",
  "worker_output_malformed",
]);
export type WorkerViolationCode = z.infer<typeof WorkerViolationCodeSchema>;

export const WorkerViolationSeveritySchema = z.enum(["ordinary", "critical"]);
export type WorkerViolationSeverity = z.infer<typeof WorkerViolationSeveritySchema>;

export const WorkerBoundaryFailureCodeSchema = z.enum([
  "authority_unavailable",
  "provider_unavailable",
  "tool_unavailable",
  "result_invalid",
]);
export type WorkerBoundaryFailureCode = z.infer<typeof WorkerBoundaryFailureCodeSchema>;

export const DEFAULT_WORKER_VIOLATION_POLICY = {
  schemaVersion: 1,
  policyId: "reference-worker-violations-2026-09-02",
  version: 1,
  windowSeconds: 300,
  repeatThreshold: 3,
  ordinaryCodes: [
    "tool_not_allowed",
    "filesystem_not_allowed",
    "timeout_exceeds_session",
    "volume_exhausted",
  ],
  criticalCodes: [
    "execution_replay",
    "execution_binding_mismatch",
    "workspace_binding_mismatch",
    "worker_output_malformed",
  ],
} as const;

export function workerViolationSeverity(codeValue: unknown): WorkerViolationSeverity {
  const code = WorkerViolationCodeSchema.parse(codeValue);
  const criticalCodes: readonly WorkerViolationCode[] =
    DEFAULT_WORKER_VIOLATION_POLICY.criticalCodes;
  if (criticalCodes.includes(code)) return "critical";
  const ordinaryCodes: readonly WorkerViolationCode[] =
    DEFAULT_WORKER_VIOLATION_POLICY.ordinaryCodes;
  if (ordinaryCodes.includes(code)) return "ordinary";
  throw new TypeError("worker violation code has no deterministic severity");
}

export const WorkerBoundaryBindingSchema = z.strictObject({
  boundaryId: OpaqueIdSchema,
  boundaryDigest: Sha256DigestSchema,
});
export type WorkerBoundaryBinding = DeepReadonly<z.infer<typeof WorkerBoundaryBindingSchema>>;

const WorkerPolicyBindingShape = {
  policyId: z.literal(DEFAULT_WORKER_VIOLATION_POLICY.policyId),
  policyVersion: z.literal(DEFAULT_WORKER_VIOLATION_POLICY.version),
} as const;

export const WorkerDenialDispositionSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  ...WorkerPolicyBindingShape,
  outcome: z.literal("denied"),
  disposition: z.enum(["continue", "revoked"]),
  publicCode: z.literal("request_denied"),
  budget: DurableSessionBudgetSchema,
});
export type WorkerDenialDisposition = DeepReadonly<z.infer<typeof WorkerDenialDispositionSchema>>;

export const WorkerExecutionAuthorizationSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ...WorkerPolicyBindingShape,
    outcome: z.literal("allowed"),
    budget: DurableSessionBudgetSchema,
  }),
  WorkerDenialDispositionSchema,
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ...WorkerPolicyBindingShape,
    outcome: z.literal("unavailable"),
    reason: z.enum(["not_active", "expired", "revoked"]),
    budget: DurableSessionBudgetSchema,
  }),
]);
export type WorkerExecutionAuthorization = DeepReadonly<
  z.infer<typeof WorkerExecutionAuthorizationSchema>
>;

export const WorkerBoundaryInterruptionSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  ...WorkerPolicyBindingShape,
  outcome: z.enum(["interrupted", "already_inactive"]),
});
export type WorkerBoundaryInterruption = DeepReadonly<
  z.infer<typeof WorkerBoundaryInterruptionSchema>
>;

export const WorkerViolationRecordInputSchema = z.strictObject({
  sessionId: OpaqueIdSchema,
  boundary: WorkerBoundaryBindingSchema,
  code: WorkerViolationCodeSchema,
});

export const WorkerBoundaryFailureInputSchema = z.strictObject({
  sessionId: OpaqueIdSchema,
  boundary: WorkerBoundaryBindingSchema,
  failure: WorkerBoundaryFailureCodeSchema,
});

export const WorkerViolationPolicyVersionSchema = VersionNumberSchema.refine(
  (version) => version === DEFAULT_WORKER_VIOLATION_POLICY.version,
  "worker violation policy version is unsupported",
);
