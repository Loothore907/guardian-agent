import { z } from "zod";

import { boundedCredentialSafeText, type DeepReadonly } from "./common.js";

export const GitHubOwnerSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/u);
export const GitHubRepositorySchema = GitHubOwnerSchema;
export const GitCommitShaSchema = z.string().regex(/^[a-f0-9]{40}$/u);

const PullRequestTargetShape = {
  owner: GitHubOwnerSchema,
  repository: GitHubRepositorySchema,
  pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
} as const;

export const GitHubPullRequestReadOperationSchema = z.strictObject({
  type: z.literal("github.pull_request.read"),
  ...PullRequestTargetShape,
  content: z.literal("review").optional(),
});
export type GitHubPullRequestReadOperation = DeepReadonly<
  z.infer<typeof GitHubPullRequestReadOperationSchema>
>;

export const GitHubPullRequestMergeOperationSchema = z.strictObject({
  type: z.literal("github.pull_request.merge"),
  ...PullRequestTargetShape,
  expectedHeadSha: GitCommitShaSchema,
  method: z.literal("squash"),
});
export type GitHubPullRequestMergeOperation = DeepReadonly<
  z.infer<typeof GitHubPullRequestMergeOperationSchema>
>;

function publicReviewText(max: number) {
  return boundedCredentialSafeText(max).refine(
    (v) =>
      !/https?:\/\/[^\s/]*@/iu.test(v) && !/(?:[A-Za-z]:\\Users\\|\/(?:home|root)\/)/iu.test(v),
  );
}

// Fixed small review profile. Missing patches are explicit, never an implicit full diff.
export const GitHubReviewContentSchema = z
  .strictObject({
    contentTrust: z.literal("untrusted_public_content"),
    body: publicReviewText(2_000).or(z.literal("")),
    baseCommit: GitCommitShaSchema,
    files: z
      .array(
        z.strictObject({
          path: boundedCredentialSafeText(256).refine(
            (p) => !p.startsWith("/") && !p.includes("\\") && !p.split("/").includes(".."),
          ),
          status: z.enum([
            "added",
            "removed",
            "modified",
            "renamed",
            "copied",
            "changed",
            "unchanged",
          ]),
          patch: publicReviewText(2_000).nullable(),
        }),
      )
      .max(8),
    complete: z.boolean(),
  })
  .superRefine((review, ctx) => {
    if (
      new Set(review.files.map((f) => f.path)).size !== review.files.length ||
      (review.complete && review.files.some((f) => f.patch === null))
    )
      ctx.addIssue({ code: "custom", message: "invalid review completeness" });
  });

export const GitHubPullRequestSnapshotSchema = z.strictObject({
  owner: GitHubOwnerSchema,
  repository: GitHubRepositorySchema,
  pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  headCommit: GitCommitShaSchema,
  state: z.enum(["open", "closed"]),
  draft: z.boolean(),
  title: boundedCredentialSafeText(200),
  baseBranch: boundedCredentialSafeText(255),
  review: GitHubReviewContentSchema.optional(),
});
export type GitHubPullRequestSnapshot = DeepReadonly<
  z.infer<typeof GitHubPullRequestSnapshotSchema>
>;

export const GitHubMergeResultSchema = z.strictObject({
  status: z.literal("merged"),
  owner: GitHubOwnerSchema,
  repository: GitHubRepositorySchema,
  pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  headCommit: GitCommitShaSchema,
  mergeCommit: GitCommitShaSchema,
});
export type GitHubMergeResult = DeepReadonly<z.infer<typeof GitHubMergeResultSchema>>;
