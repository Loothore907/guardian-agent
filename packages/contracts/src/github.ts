import { z } from "zod";

import { boundedVisibleText, type DeepReadonly } from "./common.js";

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

export const GitHubPullRequestSnapshotSchema = z.strictObject({
  owner: GitHubOwnerSchema,
  repository: GitHubRepositorySchema,
  pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  headCommit: GitCommitShaSchema,
  state: z.enum(["open", "closed"]),
  draft: z.boolean(),
  title: boundedVisibleText(200),
  baseBranch: boundedVisibleText(255),
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
