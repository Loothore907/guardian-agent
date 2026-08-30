import { z } from "zod";

import {
  AuthorizationLevelSchema,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
} from "./common.js";

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
      level: AuthorizationLevelSchema,
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
      outcome: z.enum(["succeeded", "denied", "failed"]),
      resultCode: z.enum([
        "ok",
        "request_mismatch",
        "expired",
        "replayed",
        "resource_changed",
        "adapter_failed",
      ]),
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
