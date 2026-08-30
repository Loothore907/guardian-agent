import { z } from "zod";

import {
  addDuplicateIssue,
  boundedVisibleText,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  PublicHttpUrlSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";
import { PublicDomainDestinationSchema, WorkspacePathSchema } from "./mission.js";

const GitHubNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_.-]+$/u);
const GitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const ProviderRequestIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/u);

export const ResearchRequestSchema = z
  .strictObject({
    query: boundedVisibleText(120),
    maxResults: z.number().int().min(1).max(3),
    allowedDomains: z.array(z.hostname()).max(10),
  })
  .superRefine((request, context) => {
    addDuplicateIssue(
      request.allowedDomains.map((domain) => domain.toLowerCase()),
      context,
      ["allowedDomains"],
    );
  });
export type ResearchRequest = DeepReadonly<z.infer<typeof ResearchRequestSchema>>;

export const GitHubPullRequestVersionSchema = z.strictObject({
  kind: z.literal("github_pull_request"),
  owner: GitHubNameSchema,
  repository: GitHubNameSchema,
  pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  headCommit: GitCommitSchema,
});
export const PublicContentVersionSchema = z.strictObject({
  kind: z.literal("public_content"),
  url: PublicHttpUrlSchema,
  contentDigest: Sha256DigestSchema,
});
export const WorkspaceFileVersionSchema = z.strictObject({
  kind: z.literal("workspace_file"),
  path: WorkspacePathSchema,
  contentDigest: Sha256DigestSchema,
});
export const ResourceVersionSchema = z.discriminatedUnion("kind", [
  GitHubPullRequestVersionSchema,
  PublicContentVersionSchema,
  WorkspaceFileVersionSchema,
]);
export type ResourceVersion = DeepReadonly<z.infer<typeof ResourceVersionSchema>>;

const ProposalBindingShape = {
  schemaVersion: ContractVersionSchema,
  proposalId: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
  missionId: OpaqueIdSchema,
  missionVersion: VersionNumberSchema,
  profileId: OpaqueIdSchema,
  profileVersion: VersionNumberSchema,
  proposedAt: TimestampSchema,
} as const;

export const ActionProposalSchema = z
  .discriminatedUnion("operation", [
    z.strictObject({
      ...ProposalBindingShape,
      operation: z.literal("guardian.research"),
      arguments: ResearchRequestSchema,
      resourceVersion: z.null(),
    }),
    z.strictObject({
      ...ProposalBindingShape,
      operation: z.literal("guardian.local_command"),
      arguments: z.strictObject({
        executable: z.enum(["git", "node", "pnpm", "rg"]),
        arguments: z.array(boundedVisibleText(256)).max(32),
        workingDirectory: WorkspacePathSchema,
        timeoutSeconds: z.number().int().min(1).max(300),
      }),
      resourceVersion: z.union([WorkspaceFileVersionSchema, z.null()]),
    }),
    z.strictObject({
      ...ProposalBindingShape,
      operation: z.literal("github.pull_request.read"),
      arguments: z.strictObject({
        owner: GitHubNameSchema,
        repository: GitHubNameSchema,
        pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
      }),
      resourceVersion: GitHubPullRequestVersionSchema,
    }),
    z.strictObject({
      ...ProposalBindingShape,
      operation: z.literal("github.pull_request.merge"),
      arguments: z.strictObject({
        owner: GitHubNameSchema,
        repository: GitHubNameSchema,
        pullRequest: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        expectedHeadCommit: GitCommitSchema,
        method: z.literal("squash"),
      }),
      resourceVersion: GitHubPullRequestVersionSchema,
    }),
  ])
  .superRefine((proposal, context) => {
    if (
      proposal.operation === "github.pull_request.read" ||
      proposal.operation === "github.pull_request.merge"
    ) {
      const resource = proposal.resourceVersion;
      if (
        resource.owner.toLowerCase() !== proposal.arguments.owner.toLowerCase() ||
        resource.repository.toLowerCase() !== proposal.arguments.repository.toLowerCase() ||
        resource.pullRequest !== proposal.arguments.pullRequest
      ) {
        context.addIssue({
          code: "custom",
          message: "resource version must match the proposed target",
          path: ["resourceVersion"],
        });
      }
      if (
        proposal.operation === "github.pull_request.merge" &&
        resource.headCommit !== proposal.arguments.expectedHeadCommit
      ) {
        context.addIssue({
          code: "custom",
          message: "expected head commit must match the resource version",
          path: ["resourceVersion", "headCommit"],
        });
      }
    }
  });
export type ActionProposal = DeepReadonly<z.infer<typeof ActionProposalSchema>>;

export const ResearchProvenanceEventSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    eventId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    operation: z.literal("guardian.research"),
    queryDigest: Sha256DigestSchema,
    destination: PublicDomainDestinationSchema,
    sourceUrl: PublicHttpUrlSchema,
    sourceContentDigest: Sha256DigestSchema,
    contentTrust: z.literal("untrusted_public_content"),
    retrievedAt: TimestampSchema,
    providerRequestId: ProviderRequestIdSchema,
  })
  .superRefine((event, context) => {
    if (
      new URL(event.sourceUrl).hostname.toLowerCase() !== event.destination.hostname.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        message: "source URL must match the recorded destination",
        path: ["sourceUrl"],
      });
    }
  });
export type ResearchProvenanceEvent = DeepReadonly<z.infer<typeof ResearchProvenanceEventSchema>>;
