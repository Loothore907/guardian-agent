import { z } from "zod";

import {
  AuthorizationLevelSchema,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
} from "./common.js";
import { WorkerDenialCauseSchema, WorkerDenialStageSchema } from "./worker-policy.js";

const AuditBaseShape = {
  schemaVersion: ContractVersionSchema,
  eventId: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  occurredAt: TimestampSchema,
  sanitized: z.literal(true),
} as const;

export const AuditEventSchema = z
  .discriminatedUnion("type", [
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("proposal.received"),
      proposalId: OpaqueIdSchema,
      boundaryId: OpaqueIdSchema.optional(),
      boundaryDigest: Sha256DigestSchema.optional(),
      operation: z.enum([
        "guardian.research",
        "guardian.local_command",
        "github.pull_request.read",
        "github.pull_request.merge",
      ]),
    }),
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("policy.decided"),
      requestDigest: Sha256DigestSchema,
      boundaryId: OpaqueIdSchema.optional(),
      boundaryDigest: Sha256DigestSchema.optional(),
      level: AuthorizationLevelSchema,
      denialCause: WorkerDenialCauseSchema.optional(),
      denialStage: WorkerDenialStageSchema.optional(),
      reasonCodes: z
        .array(
          z.enum([
            "within_scope",
            "scope_expansion",
            "assurance_insufficient",
            "guardian_escalation",
            "malformed_input",
          ]),
        )
        .min(1)
        .max(8),
    }),
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("approval.created"),
      approvalId: OpaqueIdSchema,
      requestDigest: Sha256DigestSchema,
      expiresAt: TimestampSchema,
    }),
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("execution.result"),
      requestDigest: Sha256DigestSchema,
      boundaryId: OpaqueIdSchema.optional(),
      boundaryDigest: Sha256DigestSchema.optional(),
      outcome: z.enum(["succeeded", "denied", "failed"]),
      resultCode: z.enum([
        "ok",
        "request_mismatch",
        "expired",
        "replayed",
        "resource_changed",
        "adapter_failed",
      ]),
      providerBoundary: z.enum(["not_crossed", "crossed"]).optional(),
      adapterBoundary: z.enum(["not_crossed", "crossed"]).optional(),
    }),
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("worker.feedback.returned"),
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      requestDigest: Sha256DigestSchema,
      resultDigest: Sha256DigestSchema,
      outcome: z.enum(["succeeded", "denied"]),
      denialCause: WorkerDenialCauseSchema.optional(),
      denialStage: WorkerDenialStageSchema.optional(),
    }),
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("worker.completion.returned"),
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      resultDigest: Sha256DigestSchema,
    }),
    z.strictObject({
      ...AuditBaseShape,
      type: z.literal("session.terminal"),
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      state: z.literal("completed"),
    }),
  ])
  .superRefine((event, context) => {
    if (
      event.type === "policy.decided" &&
      new Set(event.reasonCodes).size !== event.reasonCodes.length
    ) {
      context.addIssue({
        code: "custom",
        message: "duplicate reason codes are not allowed",
        path: ["reasonCodes"],
      });
    }
    if (
      (event.type === "policy.decided" || event.type === "worker.feedback.returned") &&
      (event.denialCause === undefined) !== (event.denialStage === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "audit denial cause and stage must be recorded together",
        path: ["denialCause"],
      });
    }
    if (event.type === "execution.result") {
      const valid =
        (event.outcome === "succeeded" && event.resultCode === "ok") ||
        (event.outcome === "failed" && event.resultCode === "adapter_failed") ||
        (event.outcome === "denied" && !["ok", "adapter_failed"].includes(event.resultCode));
      if (!valid) {
        context.addIssue({
          code: "custom",
          message: "outcome and resultCode are inconsistent",
          path: ["resultCode"],
        });
      }
    }
  });
export type AuditEvent = DeepReadonly<z.infer<typeof AuditEventSchema>>;

export const WorkerAuditEventInputSchema = z
  .discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("proposal.received"),
      proposalId: OpaqueIdSchema,
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      operation: z.enum([
        "guardian.research",
        "github.pull_request.read",
        "github.pull_request.merge",
      ]),
    }),
    z.strictObject({
      type: z.literal("policy.decided"),
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      requestDigest: Sha256DigestSchema,
      level: z.enum(["allow", "deny"]),
      reasonCodes: z.array(z.enum(["within_scope", "scope_expansion"])).length(1),
      denialCause: WorkerDenialCauseSchema.optional(),
      denialStage: WorkerDenialStageSchema.optional(),
    }),
    z.strictObject({
      type: z.literal("execution.result"),
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      requestDigest: Sha256DigestSchema,
      outcome: z.enum(["succeeded", "denied"]),
      resultCode: z.enum(["ok", "request_mismatch", "resource_changed"]),
      providerBoundary: z.enum(["not_crossed", "crossed"]),
      adapterBoundary: z.enum(["not_crossed", "crossed"]),
    }),
    z.strictObject({
      type: z.literal("worker.feedback.returned"),
      boundaryId: OpaqueIdSchema,
      boundaryDigest: Sha256DigestSchema,
      requestDigest: Sha256DigestSchema,
      resultDigest: Sha256DigestSchema,
      outcome: z.enum(["succeeded", "denied"]),
      denialCause: WorkerDenialCauseSchema.optional(),
      denialStage: WorkerDenialStageSchema.optional(),
    }),
  ])
  .superRefine((event, context) => {
    if (
      (event.type === "policy.decided" || event.type === "worker.feedback.returned") &&
      (event.denialCause === undefined) !== (event.denialStage === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "worker audit denial cause and stage must be recorded together",
        path: ["denialCause"],
      });
    }
    if (event.type === "policy.decided") {
      const denial = event.level === "deny";
      if (
        denial !== (event.denialCause !== undefined) ||
        denial !== event.reasonCodes.includes("scope_expansion")
      ) {
        context.addIssue({
          code: "custom",
          message: "worker policy audit outcome is inconsistent",
        });
      }
    }
    if (event.type === "proposal.received" && event.proposalId !== event.boundaryId) {
      context.addIssue({
        code: "custom",
        message: "worker proposal audit binding is inconsistent",
      });
    }
    if (
      event.type === "execution.result" &&
      (event.outcome === "succeeded") !== (event.resultCode === "ok")
    ) {
      context.addIssue({
        code: "custom",
        message: "worker execution audit outcome is inconsistent",
      });
    }
    if (
      event.type === "worker.feedback.returned" &&
      (event.outcome === "denied") !== (event.denialCause !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "worker feedback audit outcome is inconsistent",
      });
    }
  });
export type WorkerAuditEventInput = DeepReadonly<z.infer<typeof WorkerAuditEventInputSchema>>;
