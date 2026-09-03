import { z } from "zod";

import {
  ControlledContentJourneyResultSchema,
  ControlledContentRequestSchema,
  ControlledContentScopeSchema,
  ResearchEvidenceSchema,
  ResearchProvenanceEventSchema,
  ResearchRequestSchema,
  ResearchScopeSchema,
} from "./actions.js";
import {
  ContractVersionSchema,
  OpaqueIdSchema,
  TimestampSchema,
  VersionNumberSchema,
  type DeepReadonly,
} from "./common.js";

export const ResearchBudgetSnapshotSchema = z.strictObject({
  sessionId: OpaqueIdSchema,
  remainingRequests: z.number().int().min(0).max(1_000),
  remainingResults: z.number().int().min(0).max(10_000),
});
export type ResearchBudgetSnapshot = DeepReadonly<z.infer<typeof ResearchBudgetSnapshotSchema>>;

export const ResearchJourneyResultSchema = z
  .strictObject({
    evidence: z.array(ResearchEvidenceSchema).max(3),
    provenance: z.array(ResearchProvenanceEventSchema).max(3),
  })
  .superRefine((journey, context) => {
    if (journey.evidence.length !== journey.provenance.length) {
      context.addIssue({
        code: "custom",
        message: "research evidence and provenance counts must match",
        path: ["provenance"],
      });
    }
    for (const [index, evidence] of journey.evidence.entries()) {
      const event = journey.provenance[index];
      if (
        event !== undefined &&
        (event.sourceUrl !== evidence.sourceUrl ||
          event.sourceContentDigest !== evidence.sourceContentDigest)
      ) {
        context.addIssue({
          code: "custom",
          message: "research evidence must match its provenance event",
          path: ["provenance", index],
        });
      }
    }
    for (let index = 1; index < journey.provenance.length; index += 1) {
      const previous = journey.provenance[index - 1];
      const current = journey.provenance[index];
      if (
        previous !== undefined &&
        current !== undefined &&
        current.sequence <= previous.sequence
      ) {
        context.addIssue({
          code: "custom",
          message: "research provenance sequence must increase monotonically",
          path: ["provenance", index, "sequence"],
        });
      }
    }
  });
export type ResearchJourneyResult = DeepReadonly<z.infer<typeof ResearchJourneyResultSchema>>;

const ResearchBindingShape = {
  schemaVersion: ContractVersionSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
  missionId: OpaqueIdSchema,
  missionVersion: VersionNumberSchema,
  profileId: OpaqueIdSchema,
  profileVersion: VersionNumberSchema,
  policyVersion: VersionNumberSchema,
} as const;

export const ResearchIpcRequestSchema = z.strictObject({
  ...ResearchBindingShape,
  capability: OpaqueIdSchema,
  requestedAt: TimestampSchema,
  request: ResearchRequestSchema,
});
export type ResearchIpcRequest = DeepReadonly<z.infer<typeof ResearchIpcRequestSchema>>;

export const ControlledContentIpcRequestSchema = z.strictObject({
  ...ResearchBindingShape,
  capability: OpaqueIdSchema,
  requestedAt: TimestampSchema,
  operation: z.literal("controlled_extract"),
  request: ControlledContentRequestSchema,
});
export type ControlledContentIpcRequest = DeepReadonly<
  z.infer<typeof ControlledContentIpcRequestSchema>
>;

export const ResearchIpcFailureReasonSchema = z.enum([
  "budget_exhausted",
  "domain_not_allowed",
  "expired",
  "invalid_request",
  "not_active",
  "query_not_relevant",
  "service_unavailable",
  "unauthorized",
  "unsafe_outbound_content",
  "url_not_allowed",
]);
export type ResearchIpcFailureReason = z.infer<typeof ResearchIpcFailureReasonSchema>;

export const ResearchIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    result: ResearchJourneyResultSchema,
    budget: ResearchBudgetSnapshotSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: ResearchIpcFailureReasonSchema,
  }),
]);
export type ResearchIpcResponse = DeepReadonly<z.infer<typeof ResearchIpcResponseSchema>>;

export const ControlledContentIpcResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(true),
    result: ControlledContentJourneyResultSchema,
    budget: ResearchBudgetSnapshotSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    ok: z.literal(false),
    error: ResearchIpcFailureReasonSchema,
  }),
]);
export type ControlledContentIpcResponse = DeepReadonly<
  z.infer<typeof ControlledContentIpcResponseSchema>
>;

export const ResearchServiceProcessConfigSchema = z
  .strictObject({
    ...ResearchBindingShape,
    capability: OpaqueIdSchema,
    endpoint: z.string().min(1).max(260),
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    scope: ResearchScopeSchema,
    controlledContent: ControlledContentScopeSchema.optional(),
  })
  .superRefine((config, context) => {
    if (Date.parse(config.expiresAt) <= Date.parse(config.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "research service expiry must follow its start",
        path: ["expiresAt"],
      });
    }
    if (config.controlledContent !== undefined) {
      const researchDomains = new Set(
        config.scope.allowedDomains.map((domain) => domain.toLowerCase()),
      );
      for (const [index, domain] of config.controlledContent.allowedDomains.entries()) {
        if (!researchDomains.has(domain.toLowerCase())) {
          context.addIssue({
            code: "custom",
            message: "controlled content domain must remain inside the research scope",
            path: ["controlledContent", "allowedDomains", index],
          });
        }
      }
    }
  });
export type ResearchServiceProcessConfig = DeepReadonly<
  z.infer<typeof ResearchServiceProcessConfigSchema>
>;
