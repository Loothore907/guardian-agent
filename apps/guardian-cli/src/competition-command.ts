import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import {
  CanonicalRequestSchema,
  GitHubOAuthClientIdSchema,
  GitHubPullRequestVersionSchema,
  OpaqueIdSchema,
  ResearchRequestSchema,
  ResearchScopeSchema,
  SessionBootstrapResultSchema,
  TimestampSchema,
  containsSecretLikeMaterial,
  type CanonicalRequest,
  type ResearchRequest,
  type SessionBootstrapResult,
} from "@guardian/contracts";
import type {
  CompetitionJourneyAttachmentResult,
  ReferenceAuthoritySupervisorConfig,
  ReferenceCompetitionSessionConfig,
} from "@guardian/reference-supervisor";

import {
  parseGuardianCompetitionCliArguments,
  runGuardianAssistedCli,
  runGuardianCompetitionCli,
  type GuardianCliAssistedBootstrap,
  type GuardianCliIo,
  type GuardianCompetitionCliRunner,
} from "./index.js";

const SESSION_DURATION_MS = 10 * 60 * 1_000;
const COMPETITION_OBJECTIVE =
  "Validate Guardian's controlled public-research, scope-denial, and exact GitHub authorization journey.";

export interface GuardianCompetitionDeployment {
  readonly githubClientId: string;
  readonly researchRequest: ResearchRequest;
  readonly researchRequiredTerms: readonly string[];
  readonly unsafeTarget: ReturnType<typeof GitHubPullRequestVersionSchema.parse>;
  readonly legitimateTarget: ReturnType<typeof GitHubPullRequestVersionSchema.parse>;
}

export interface GuardianCompetitionCommandSupervisor extends GuardianCompetitionCliRunner {
  readonly bootstrap: GuardianCliAssistedBootstrap;
  readonly close: () => Promise<void>;
}

export type GuardianCompetitionSupervisorFactory = (
  config: ReferenceAuthoritySupervisorConfig,
  options: {
    readonly interactionProcess: "fake";
    readonly riskProcess: "fake";
    readonly workerMode: "deterministic_reference";
    readonly competition: ReferenceCompetitionSessionConfig;
  },
) => Promise<GuardianCompetitionCommandSupervisor>;

function required(environment: Readonly<Record<string, string | undefined>>, name: string): string {
  const value = environment[name];
  if (value === undefined || value.length === 0) {
    throw new TypeError(`competition deployment requires ${name}`);
  }
  return value;
}

function positiveInteger(value: string, name: string): number {
  if (!/^[1-9][0-9]*$/u.test(value)) {
    throw new TypeError(`competition deployment ${name} is invalid`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new TypeError(`competition deployment ${name} is invalid`);
  }
  return parsed;
}

function list(value: string, name: string): string[] {
  const values = value.split(",").map((item) => item.trim());
  if (values.length === 0 || values.some((item) => item.length === 0)) {
    throw new TypeError(`competition deployment ${name} is invalid`);
  }
  return values;
}

export function parseGuardianCompetitionDeploymentEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): GuardianCompetitionDeployment {
  const researchQuery = required(environment, "GUARDIAN_COMPETITION_RESEARCH_QUERY");
  if (containsSecretLikeMaterial(researchQuery)) {
    throw new TypeError("competition research query contains secret-like material");
  }
  const allowedDomains = list(
    required(environment, "GUARDIAN_COMPETITION_RESEARCH_DOMAINS"),
    "research domains",
  );
  const researchRequiredTerms = list(
    required(environment, "GUARDIAN_COMPETITION_RESEARCH_REQUIRED_TERMS"),
    "research required terms",
  );
  if (researchRequiredTerms.some((term) => containsSecretLikeMaterial(term))) {
    throw new TypeError("competition research terms contain secret-like material");
  }
  const researchRequest = ResearchRequestSchema.parse({
    query: researchQuery,
    maxResults: 2,
    allowedDomains,
  });
  ResearchScopeSchema.parse({
    allowedDomains,
    maxResultsPerRequest: 2,
    remainingRequests: 1,
    remainingResults: 2,
    requiredTerms: researchRequiredTerms,
  });
  const unsafeTarget = GitHubPullRequestVersionSchema.parse({
    kind: "github_pull_request",
    owner: required(environment, "GUARDIAN_COMPETITION_UNSAFE_OWNER"),
    repository: required(environment, "GUARDIAN_COMPETITION_UNSAFE_REPOSITORY"),
    pullRequest: positiveInteger(
      required(environment, "GUARDIAN_COMPETITION_UNSAFE_PULL_REQUEST"),
      "unsafe pull request",
    ),
    headCommit: required(environment, "GUARDIAN_COMPETITION_UNSAFE_EXPECTED_HEAD"),
  });
  const legitimateTarget = GitHubPullRequestVersionSchema.parse({
    kind: "github_pull_request",
    owner: required(environment, "GUARDIAN_COMPETITION_OWNER"),
    repository: required(environment, "GUARDIAN_COMPETITION_REPOSITORY"),
    pullRequest: positiveInteger(
      required(environment, "GUARDIAN_COMPETITION_PULL_REQUEST"),
      "pull request",
    ),
    headCommit: required(environment, "GUARDIAN_COMPETITION_EXPECTED_HEAD"),
  });
  if (
    unsafeTarget.owner === legitimateTarget.owner &&
    unsafeTarget.repository === legitimateTarget.repository
  ) {
    throw new TypeError(
      "competition unsafe and legitimate targets must use different repositories",
    );
  }
  return {
    githubClientId: GitHubOAuthClientIdSchema.parse(
      required(environment, "GUARDIAN_GITHUB_APP_CLIENT_ID"),
    ),
    researchRequest,
    researchRequiredTerms,
    unsafeTarget,
    legitimateTarget,
  };
}

function mergeRequest(input: {
  readonly activation: SessionBootstrapResult;
  readonly callerId: string;
  readonly connectionId: string;
  readonly target: GuardianCompetitionDeployment["legitimateTarget"];
  readonly proposedAt: string;
  readonly randomId: () => string;
}): CanonicalRequest {
  const requestId = OpaqueIdSchema.parse(input.randomId());
  const proposalId = OpaqueIdSchema.parse(input.randomId());
  const proposal = {
    schemaVersion: 1 as const,
    proposalId,
    sessionId: input.activation.sessionId,
    callerId: input.callerId,
    missionId: input.activation.missionId,
    missionVersion: input.activation.missionVersion,
    profileId: input.activation.profileId,
    profileVersion: input.activation.profileVersion,
    proposedAt: input.proposedAt,
    operation: "github.pull_request.merge" as const,
    arguments: {
      owner: input.target.owner,
      repository: input.target.repository,
      pullRequest: input.target.pullRequest,
      expectedHeadCommit: input.target.headCommit,
      method: "squash" as const,
    },
    resourceVersion: input.target,
  };
  return CanonicalRequestSchema.parse({
    schemaVersion: 1,
    requestId,
    sessionId: input.activation.sessionId,
    callerId: input.callerId,
    connectionId: input.connectionId,
    missionId: input.activation.missionId,
    missionVersion: input.activation.missionVersion,
    profileId: input.activation.profileId,
    profileVersion: input.activation.profileVersion,
    policyVersion: input.activation.policyVersion,
    proposal,
    resourceVersion: input.target,
  });
}

export function buildGuardianCompetitionRequests(input: {
  readonly deployment: GuardianCompetitionDeployment;
  readonly activation: unknown;
  readonly callerId: unknown;
  readonly connectionId: unknown;
  readonly proposedAt: unknown;
  readonly randomId?: () => string;
}) {
  const activation = SessionBootstrapResultSchema.parse(input.activation);
  if (activation.state !== "active" || activation.assurance !== "enforced") {
    throw new TypeError("competition request construction requires an active enforced session");
  }
  const callerId = OpaqueIdSchema.parse(input.callerId);
  const connectionId = OpaqueIdSchema.parse(input.connectionId);
  const proposedAt = TimestampSchema.parse(input.proposedAt);
  const randomId = input.randomId ?? randomUUID;
  return {
    researchRequest: input.deployment.researchRequest,
    unsafeRequest: mergeRequest({
      activation,
      callerId,
      connectionId,
      target: input.deployment.unsafeTarget,
      proposedAt,
      randomId,
    }),
    legitimateRequest: mergeRequest({
      activation,
      callerId,
      connectionId,
      target: input.deployment.legitimateTarget,
      proposedAt,
      randomId,
    }),
  };
}

export async function runGuardianCompetitionCommand(options: {
  readonly arguments: readonly string[];
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly projectRoot: string;
  readonly io: GuardianCliIo;
  readonly startSupervisor: GuardianCompetitionSupervisorFactory;
  readonly now?: () => string;
  readonly randomId?: () => string;
}): Promise<CompetitionJourneyAttachmentResult> {
  parseGuardianCompetitionCliArguments(options.arguments);
  const deployment = parseGuardianCompetitionDeploymentEnvironment(options.environment);
  const randomId = options.randomId ?? randomUUID;
  const now = options.now ?? (() => new Date().toISOString());
  const issuedAt = TimestampSchema.parse(now());
  const sessionId = OpaqueIdSchema.parse(randomId());
  const callerId = OpaqueIdSchema.parse(randomId());
  const principalId = OpaqueIdSchema.parse(randomId());
  const connectionId = OpaqueIdSchema.parse(randomId());
  const stateDirectory = resolve(options.projectRoot, ".guardian");
  const supervisor = await options.startSupervisor(
    {
      sessionId,
      callerId,
      authorityStorePath: resolve(stateDirectory, "authority.sqlite"),
      projectRoot: options.projectRoot,
      workspaceRoots: [resolve(stateDirectory, "workspaces")],
      issuedAt,
      expiresAt: new Date(Date.parse(issuedAt) + SESSION_DURATION_MS).toISOString(),
    },
    {
      interactionProcess: "fake",
      riskProcess: "fake",
      workerMode: "deterministic_reference",
      competition: {
        connectionId,
        owner: deployment.legitimateTarget.owner,
        repository: deployment.legitimateTarget.repository,
        researchDomains: deployment.researchRequest.allowedDomains,
        researchRequiredTerms: deployment.researchRequiredTerms,
      },
    },
  );
  try {
    const activation = await runGuardianAssistedCli({
      objective: COMPETITION_OBJECTIVE,
      principalId,
      bootstrap: supervisor.bootstrap,
      io: options.io,
      now,
    });
    const requests = buildGuardianCompetitionRequests({
      deployment,
      activation,
      callerId,
      connectionId,
      proposedAt: now(),
      randomId,
    });
    return await runGuardianCompetitionCli({
      principalId,
      runner: supervisor,
      ...requests,
      githubClientId: deployment.githubClientId,
      io: options.io,
      now,
    });
  } finally {
    await supervisor.close();
  }
}
