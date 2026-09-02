import { z } from "zod";

import { AuthorizationLevelSchema } from "./common.js";

export * from "./actions.js";
export * from "./assurance.js";
export * from "./audit.js";
export * from "./authorization.js";
export * from "./bootstrap.js";
export * from "./authority-context.js";
export * from "./authority-ipc.js";
export * from "./common.js";
export * from "./credentials.js";
export * from "./executor.js";
export * from "./github.js";
export * from "./guardian-setup-ipc.js";
export * from "./interaction-ipc.js";
export * from "./mission.js";
export * from "./mission-formation.js";
export * from "./mission-dialogue-ipc.js";
export * from "./model-policy.js";
export * from "./worker.js";
export * from "./worker-policy.js";
export * from "./workspace.js";
export * from "./persistence.js";
export * from "./research-ipc.js";
export * from "./session-status.js";

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

export { ResearchRequestSchema as ToolArgumentsSchema } from "./actions.js";
const GuardianGitHubNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/u);
const GuardianGitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const GuardianPullRequestArgumentsShape = {
  owner: GuardianGitHubNameSchema,
  repository: GuardianGitHubNameSchema,
  pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
} as const;
export const ToolProposalSchema = z.discriminatedUnion("tool", [
  z.strictObject({
    tool: z.literal("guardian.research"),
    arguments: z.strictObject({
      query: z.string().min(1).max(120),
      maxResults: z.number().int().min(1).max(3),
    }),
  }),
  z.strictObject({
    tool: z.literal("github.pull_request.read"),
    arguments: z.strictObject(GuardianPullRequestArgumentsShape),
  }),
  z.strictObject({
    tool: z.literal("github.pull_request.merge"),
    arguments: z.strictObject({
      ...GuardianPullRequestArgumentsShape,
      expectedHeadCommit: GuardianGitCommitSchema,
      method: z.literal("squash"),
    }),
  }),
]);
export type ToolProposal = z.infer<typeof ToolProposalSchema>;
