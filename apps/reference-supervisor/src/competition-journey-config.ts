import type { AuthorityClient } from "@guardian/authority-client";
import { createBrokerIpcCredentials } from "@guardian/broker";
import { canonicalDigest } from "@guardian/canonical";
import {
  AuthorityCapabilityBindingSchema,
  CanonicalRequestSchema,
  CompetitionJourneyServiceBundleSchema,
  GitHubOAuthClientIdSchema,
  ResearchServiceProcessConfigSchema,
  TimestampSchema,
  type CompetitionJourneyServiceBundle,
  type DurableSessionRecord,
} from "@guardian/contracts";
import { createGuardianActionRiskIpcCredentials } from "@guardian/guardian";
import type { LaunchedReferenceSession } from "@guardian/session-host/launcher";

type CompetitionAuthorityRecords = Pick<AuthorityClient, "getSession" | "getSessionConnections">;

export interface ActivatedCompetitionJourneyAuthority {
  readonly endpoint: unknown;
  readonly brokerBinding: unknown;
  readonly researchBinding: unknown;
  readonly records: CompetitionAuthorityRecords;
}

export interface ActivatedCompetitionJourneyServiceInput {
  readonly launched: LaunchedReferenceSession;
  readonly legitimateRequest: unknown;
  readonly authority: ActivatedCompetitionJourneyAuthority;
  readonly githubClientId: unknown;
  readonly now?: () => string;
}

function sameSessionBinding(
  session: DurableSessionRecord,
  expected: {
    readonly sessionId: string;
    readonly callerId: string;
    readonly missionId: string;
    readonly missionVersion: number;
    readonly profileId: string;
    readonly profileVersion: number;
    readonly policyVersion: number;
    readonly startsAt: string;
    readonly expiresAt: string;
  },
): boolean {
  return (
    session.sessionId === expected.sessionId &&
    session.callerId === expected.callerId &&
    session.missionId === expected.missionId &&
    session.missionVersion === expected.missionVersion &&
    session.profileId === expected.profileId &&
    session.profileVersion === expected.profileVersion &&
    session.policyVersion === expected.policyVersion &&
    session.startsAt === expected.startsAt &&
    session.expiresAt === expected.expiresAt
  );
}

/**
 * Builds process bootstrap data only from a launched durable session and its
 * Guardian-owned authority records. The caller cannot supply a credential
 * handle, service lifetime, or action-risk envelope.
 */
export async function buildActivatedCompetitionJourneyServices(
  input: ActivatedCompetitionJourneyServiceInput,
): Promise<CompetitionJourneyServiceBundle> {
  const requestedAt = TimestampSchema.parse(input.now?.() ?? new Date().toISOString());
  const request = CanonicalRequestSchema.parse(input.legitimateRequest);
  const githubClientId = GitHubOAuthClientIdSchema.parse(input.githubClientId);
  const brokerBinding = AuthorityCapabilityBindingSchema.parse(input.authority.brokerBinding);
  const researchBinding = AuthorityCapabilityBindingSchema.parse(input.authority.researchBinding);
  const research = ResearchServiceProcessConfigSchema.parse(input.launched.research?.serviceConfig);
  const status = input.launched.runtime.status(requestedAt);

  if (!input.launched.durableAuthority || status.state !== "active") {
    throw new TypeError("competition journey requires an active durable session");
  }
  if (status.assurance !== "enforced") {
    throw new TypeError("competition journey requires enforced runtime evidence");
  }
  if (request.proposal.operation !== "github.pull_request.merge" || request.connectionId === null) {
    throw new TypeError("competition journey requires an exact GitHub merge request");
  }
  if (
    request.sessionId !== status.sessionId ||
    request.callerId !== status.callerId ||
    request.missionId !== status.missionId ||
    request.missionVersion !== status.missionVersion ||
    request.profileId !== status.profileId ||
    request.profileVersion !== status.profileVersion ||
    request.policyVersion !== status.policyVersion
  ) {
    throw new TypeError("legitimate request is not bound to the activated session");
  }
  if (
    research.sessionId !== status.sessionId ||
    research.callerId !== status.callerId ||
    research.missionId !== status.missionId ||
    research.missionVersion !== status.missionVersion ||
    research.profileId !== status.profileId ||
    research.profileVersion !== status.profileVersion ||
    research.policyVersion !== status.policyVersion ||
    research.expiresAt !== status.expiresAt
  ) {
    throw new TypeError("research service is not bound to the activated session");
  }

  const session = await input.authority.records.getSession(status.sessionId);
  if (
    session === null ||
    session.status !== "active" ||
    !sameSessionBinding(session, research) ||
    Date.parse(requestedAt) < Date.parse(session.startsAt) ||
    Date.parse(requestedAt) >= Date.parse(session.expiresAt)
  ) {
    throw new TypeError("durable session record does not match the activated session");
  }

  const connections = await input.authority.records.getSessionConnections(status.sessionId);
  const connection = connections.find(
    (candidate) => candidate.connectionId === request.connectionId,
  );
  if (
    connection === undefined ||
    connection.status !== "active" ||
    connection.owner !== request.proposal.arguments.owner ||
    connection.repository !== request.proposal.arguments.repository ||
    !connection.permissions.includes("pull_request:merge")
  ) {
    throw new TypeError("legitimate request is outside the active GitHub connection scope");
  }

  const requestDigest = canonicalDigest("canonical_request", request.schemaVersion, request);
  return CompetitionJourneyServiceBundleSchema.parse({
    schemaVersion: 1,
    broker: {
      schemaVersion: 1,
      serviceKind: "github_broker",
      broker: {
        schemaVersion: 1,
        ...createBrokerIpcCredentials(),
        sessionId: status.sessionId,
        callerId: status.callerId,
        startsAt: research.startsAt,
        expiresAt: research.expiresAt,
      },
      authority: {
        schemaVersion: 1,
        endpoint: input.authority.endpoint,
        binding: brokerBinding,
      },
      guardian: {
        schemaVersion: 1,
        serviceKind: "action_risk",
        ...createGuardianActionRiskIpcCredentials(),
        sessionId: status.sessionId,
        callerId: status.callerId,
        requestDigest,
        startsAt: research.startsAt,
        expiresAt: research.expiresAt,
        envelope: {
          proposal: {
            tool: request.proposal.operation,
            arguments: request.proposal.arguments,
          },
          deterministicFloor: "confirm",
          riskSignals: ["authority_expansion"],
          untrustedExcerpts: [],
          containsCredentials: false,
        },
      },
      credentialStoreHandle: connection.credentialStoreHandle,
      githubClientId,
    },
    research: {
      schemaVersion: 1,
      serviceKind: "tavily_research",
      research,
      authority: {
        schemaVersion: 1,
        endpoint: input.authority.endpoint,
        binding: researchBinding,
      },
    },
  });
}
