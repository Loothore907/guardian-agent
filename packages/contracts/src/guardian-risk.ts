import { z } from "zod";

import { ProviderRequestIdSchema } from "./actions.js";
import {
  AuthorizationLevelSchema,
  boundedCredentialSafeText,
  ContractVersionSchema,
  type DeepReadonly,
} from "./common.js";

export const GuardianRecommendationSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
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
export type GuardianRecommendation = DeepReadonly<z.infer<typeof GuardianRecommendationSchema>>;

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
      query: boundedCredentialSafeText(120),
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
export type ToolProposal = DeepReadonly<z.infer<typeof ToolProposalSchema>>;

export const GuardianRiskSignalSchema = z.enum([
  "intent_action_mismatch",
  "untrusted_imperative_content",
  "authority_expansion",
  "ambiguous_evidence",
  "clean_context",
]);
export type GuardianRiskSignal = z.infer<typeof GuardianRiskSignalSchema>;

export const GuardianRiskEnvelopeSchema = z
  .strictObject({
    proposal: ToolProposalSchema,
    deterministicFloor: AuthorizationLevelSchema,
    riskSignals: z.array(GuardianRiskSignalSchema).min(1).max(8),
    untrustedExcerpts: z.array(boundedCredentialSafeText(500)).max(4),
    containsCredentials: z.literal(false),
  })
  .superRefine((envelope, context) => {
    if (new Set(envelope.riskSignals).size !== envelope.riskSignals.length) {
      context.addIssue({
        code: "custom",
        message: "guardian risk signals must be unique",
        path: ["riskSignals"],
      });
    }
  });
export type GuardianRiskEnvelope = DeepReadonly<z.infer<typeof GuardianRiskEnvelopeSchema>>;

export const GuardianEvaluationSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("evaluated"),
    providerRequestId: ProviderRequestIdSchema,
    recommendation: GuardianRecommendationSchema,
    authorizationLevel: AuthorizationLevelSchema,
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    authorizationLevel: z.literal("deny"),
  }),
]);
export type GuardianEvaluation = DeepReadonly<z.infer<typeof GuardianEvaluationSchema>>;
