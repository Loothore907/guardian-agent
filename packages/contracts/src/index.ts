import { z } from "zod";

import { AssuranceLevelSchema } from "./assurance.js";

export * from "./assurance.js";
export * from "./common.js";
export * from "./mission.js";

export const SessionIdSchema = z.string().uuid();
export type SessionId = z.infer<typeof SessionIdSchema>;

export const AuthorizationLevelSchema = z.enum(["allow", "confirm", "step_up", "deny"]);
export type AuthorizationLevel = z.infer<typeof AuthorizationLevelSchema>;

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

export const SessionStatusSchema = z.strictObject({
  status: z.literal("foundation"),
  assurance: AssuranceLevelSchema,
});
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ResearchRequestSchema = z.strictObject({
  query: z.string().trim().min(1).max(120),
  maxResults: z.number().int().min(1).max(3),
});
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

export const ToolProposalSchema = z.strictObject({
  tool: z.literal("guardian.research"),
  arguments: ResearchRequestSchema,
});
export type ToolProposal = z.infer<typeof ToolProposalSchema>;
