import { z } from "zod";

export const AssuranceLevelSchema = z.enum(["enforced", "observed", "unknown"]);
export type AssuranceLevel = z.infer<typeof AssuranceLevelSchema>;

export const SessionIdSchema = z.string().uuid();
export type SessionId = z.infer<typeof SessionIdSchema>;

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
