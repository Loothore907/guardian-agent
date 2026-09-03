import { z } from "zod";

import {
  AuthorizationLevelSchema,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
} from "./common.js";

const GitHubNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/u);

export const CredentialStoreHandleSchema = z
  .string()
  .regex(
    /^guardian-credential:\/\/github\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
  );

export const DurableConnectionRecordSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    connectionId: OpaqueIdSchema,
    provider: z.literal("github"),
    credentialStoreHandle: CredentialStoreHandleSchema,
    owner: GitHubNameSchema,
    repository: GitHubNameSchema,
    permissions: z
      .array(z.enum(["pull_request:read", "pull_request:merge"]))
      .min(1)
      .max(2),
    status: z.enum(["active", "revoked"]),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .superRefine((connection, context) => {
    if (new Set(connection.permissions).size !== connection.permissions.length) {
      context.addIssue({ code: "custom", message: "duplicate permissions are not allowed" });
    }
    if (Date.parse(connection.updatedAt) < Date.parse(connection.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "connection update cannot precede creation",
        path: ["updatedAt"],
      });
    }
  });
export type DurableConnectionRecord = DeepReadonly<z.infer<typeof DurableConnectionRecordSchema>>;

export const EvidenceSignalSchema = z.enum([
  "instruction_like_content",
  "claimed_authority",
  "mission_override",
  "credential_or_private_data_request",
  "external_upload",
  "unexpected_tool_use",
  "side_effect_request",
  "obfuscation",
  "hidden_text",
  "redirect_behavior",
]);

export const EvidenceExposureRecordSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    exposureId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    provenanceEventIds: z.array(OpaqueIdSchema).min(1).max(16),
    sourceContentDigest: Sha256DigestSchema,
    sourceDomain: z.hostname(),
    contentTrust: z.literal("untrusted_public_content"),
    signals: z.array(EvidenceSignalSchema).max(10),
    retrievedAt: TimestampSchema,
  })
  .superRefine((exposure, context) => {
    if (new Set(exposure.provenanceEventIds).size !== exposure.provenanceEventIds.length) {
      context.addIssue({ code: "custom", message: "duplicate provenance events are not allowed" });
    }
    if (new Set(exposure.signals).size !== exposure.signals.length) {
      context.addIssue({ code: "custom", message: "duplicate signals are not allowed" });
    }
  });
export type EvidenceExposureRecord = DeepReadonly<z.infer<typeof EvidenceExposureRecordSchema>>;

export const AuthorityAttemptRecordSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    attemptId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    connectionId: OpaqueIdSchema.nullable(),
    operation: z.enum([
      "guardian.research",
      "guardian.local_command",
      "github.pull_request.read",
      "github.pull_request.merge",
    ]),
    effectClass: z.enum(["read_public", "write_workspace", "read_authenticated", "merge"]),
    destinationClass: z.enum(["public_research", "workspace", "github_connection"]),
    requestDigest: Sha256DigestSchema.nullable(),
    evidenceExposureIds: z.array(OpaqueIdSchema).max(16),
    attemptedAt: TimestampSchema,
  })
  .superRefine((attempt, context) => {
    const authenticated = attempt.operation.startsWith("github.");
    if (authenticated !== (attempt.connectionId !== null)) {
      context.addIssue({
        code: "custom",
        message: "connection binding does not match the attempted operation",
        path: ["connectionId"],
      });
    }
    if (new Set(attempt.evidenceExposureIds).size !== attempt.evidenceExposureIds.length) {
      context.addIssue({ code: "custom", message: "duplicate evidence exposures are not allowed" });
    }
    const expectedClasses = {
      "guardian.research": ["read_public", "public_research"],
      "guardian.local_command": ["write_workspace", "workspace"],
      "github.pull_request.read": ["read_authenticated", "github_connection"],
      "github.pull_request.merge": ["merge", "github_connection"],
    } as const;
    const [effectClass, destinationClass] = expectedClasses[attempt.operation];
    if (attempt.effectClass !== effectClass || attempt.destinationClass !== destinationClass) {
      context.addIssue({ code: "custom", message: "attempt classes do not match the operation" });
    }
  });
export type AuthorityAttemptRecord = DeepReadonly<z.infer<typeof AuthorityAttemptRecordSchema>>;

export const AuthorityDecisionRecordSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    decisionId: OpaqueIdSchema,
    attemptId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    deterministicReasons: z
      .array(
        z.enum([
          "within_scope",
          "scope_expansion",
          "assurance_insufficient",
          "malformed_input",
          "secret_like_content",
          "private_destination",
          "encoded_or_opaque_content",
          "volume_exhausted",
          "resource_changed",
          "approval_mismatch",
          "approval_expired",
          "approval_replayed",
          "connection_unavailable",
          "not_mergeable",
          "external_failure",
        ]),
      )
      .min(1)
      .max(8),
    authorizationFloor: AuthorizationLevelSchema,
    guardianOutcome: z.enum(["not_assessed", "preserved", "escalated", "uncertain", "unavailable"]),
    providerBoundary: z.enum(["not_crossed", "crossed"]),
    adapterBoundary: z.enum(["not_crossed", "crossed"]),
    toolConsumption: z.enum(["none", "reserved", "consumed", "not_consumed"]),
    approvalConsumption: z.enum(["not_applicable", "not_consumed", "consumed"]),
    controlOutcome: z.enum(["allowed", "denied", "step_up", "failed"]),
    decidedAt: TimestampSchema,
  })
  .superRefine((decision, context) => {
    if (new Set(decision.deterministicReasons).size !== decision.deterministicReasons.length) {
      context.addIssue({ code: "custom", message: "duplicate decision reasons are not allowed" });
    }
  });
export type AuthorityDecisionRecord = DeepReadonly<z.infer<typeof AuthorityDecisionRecordSchema>>;
