import { z } from "zod";

import { AssuranceLevelSchema } from "./assurance.js";
import { AuthorizationLevelSchema } from "./common.js";
import { ToolCapabilitySchema } from "./mission.js";

export * from "./actions.js";
export * from "./assurance.js";
export * from "./audit.js";
export * from "./authorization.js";
export * from "./common.js";
export * from "./executor.js";
export * from "./mission.js";

export const SessionIdSchema = z.string().uuid();
export type SessionId = z.infer<typeof SessionIdSchema>;

export const GuardianRecommendationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  recommendation: AuthorizationLevelSchema,
  certainty: z.enum(["certain", "uncertain"]),
  reasonCodes: z
    .array(
      z.enum([
        "intent_mismatch",
        "untrusted_instruction",
        "authority_expansion",
        "ambiguous_evidence",
        "clean_context",
      ]),
    )
    .min(1)
    .max(8),
});
export type GuardianRecommendation = z.infer<typeof GuardianRecommendationSchema>;

export const FoundationSessionStatusSchema = z.strictObject({
  status: z.literal("foundation"),
  assurance: AssuranceLevelSchema,
});
export const BoundSessionStatusSchema = z.strictObject({
  sessionId: SessionIdSchema,
  missionId: z.uuid(),
  missionVersion: z.number().int().positive(),
  profileId: z.uuid(),
  profileVersion: z.number().int().positive(),
  policyVersion: z.number().int().positive(),
  callerId: z.uuid(),
  state: z.enum(["pending", "active", "expired", "revoked"]),
  assurance: AssuranceLevelSchema,
  expiresAt: z.iso.datetime({ offset: false, precision: 3 }),
  tools: z.array(ToolCapabilitySchema),
});
export type BoundSessionStatus = z.infer<typeof BoundSessionStatusSchema>;
export const SessionStatusSchema = z.union([
  FoundationSessionStatusSchema,
  BoundSessionStatusSchema,
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export { ResearchRequestSchema as ToolArgumentsSchema } from "./actions.js";
export const ToolProposalSchema = z.strictObject({
  tool: z.literal("guardian.research"),
  arguments: z.strictObject({
    query: z.string().min(1).max(120),
    maxResults: z.number().int().min(1).max(3),
  }),
});
export type ToolProposal = z.infer<typeof ToolProposalSchema>;
