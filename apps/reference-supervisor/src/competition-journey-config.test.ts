import { createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { canonicalDigest } from "@guardian/canonical";
import {
  ManagedDemoJourneyUsageReportersSchema,
  registeredCredentialReference,
} from "@guardian/contracts";
import { createResearchIpcCredentials } from "@guardian/research";
import type { LaunchedReferenceSession } from "@guardian/session-host/launcher";
import { describe, expect, it } from "vitest";

import { buildActivatedCompetitionJourneyServices } from "./competition-journey-config.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  connection: "33333333-3333-4333-8333-333333333333",
  credential: "44444444-4444-4444-8444-444444444444",
  mission: "55555555-5555-4555-8555-555555555555",
  profile: "66666666-6666-4666-8666-666666666666",
  request: "77777777-7777-4777-8777-777777777777",
  proposal: "88888888-8888-4888-8888-888888888888",
  brokerCapability: "99999999-9999-4999-8999-999999999999",
  researchCapability: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  deployment: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  reservation: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  journey: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const;

const STARTS_AT = "2026-09-02T18:00:00.000Z";
const REQUESTED_AT = "2026-09-02T18:01:00.000Z";
const EXPIRES_AT = "2026-09-02T18:05:00.000Z";
const AUTHORITY_EXPIRES_AT = "2026-09-02T18:06:00.000Z";

function request() {
  const resourceVersion = {
    kind: "github_pull_request",
    owner: "loothore907",
    repository: "guardian-agent-demo",
    pullRequest: 2,
    headCommit: "a".repeat(40),
  } as const;
  return {
    schemaVersion: 1,
    requestId: IDS.request,
    sessionId: IDS.session,
    callerId: IDS.caller,
    connectionId: IDS.connection,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    proposal: {
      schemaVersion: 1,
      proposalId: IDS.proposal,
      sessionId: IDS.session,
      callerId: IDS.caller,
      missionId: IDS.mission,
      missionVersion: 1,
      profileId: IDS.profile,
      profileVersion: 1,
      proposedAt: REQUESTED_AT,
      operation: "github.pull_request.merge",
      arguments: {
        owner: "loothore907",
        repository: "guardian-agent-demo",
        pullRequest: 2,
        expectedHeadCommit: "a".repeat(40),
        method: "squash",
      },
      resourceVersion,
    },
    resourceVersion,
  } as const;
}

function session(status: "active" | "revoked" = "active") {
  return {
    schemaVersion: 1,
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    startsAt: STARTS_AT,
    expiresAt: EXPIRES_AT,
    status,
    createdAt: STARTS_AT,
    updatedAt: STARTS_AT,
  } as const;
}

function connection(repository = "guardian-agent-demo") {
  return {
    schemaVersion: 1,
    connectionId: IDS.connection,
    provider: "github",
    credentialStoreHandle: `guardian-credential://github/${IDS.credential}`,
    owner: "loothore907",
    repository,
    permissions: ["pull_request:read", "pull_request:merge"],
    status: "active",
    createdAt: STARTS_AT,
    updatedAt: STARTS_AT,
  } as const;
}

function binding(
  role: "broker_service" | "research_service",
  capability: string,
  allowedOperations: readonly string[],
) {
  return {
    schemaVersion: 1,
    capability,
    callerRole: role,
    callerId: IDS.caller,
    sessionId: IDS.session,
    allowedOperations,
    issuedAt: STARTS_AT,
    expiresAt: AUTHORITY_EXPIRES_AT,
  } as const;
}

function managedDemoReporters() {
  const capabilities = [
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4",
  ] as const;
  const reporter = (
    role: "interaction_service" | "guardian_service" | "worker_service" | "research_service",
    capability: string,
  ) => ({
    schemaVersion: 1 as const,
    budget: {
      schemaVersion: 1 as const,
      endpoint: "guardian-managed-demo-budget",
      binding: {
        schemaVersion: 1 as const,
        capability,
        callerRole: role,
        callerId: IDS.caller,
        deploymentId: IDS.deployment,
        allowedOperations: ["usage.record" as const],
        issuedAt: STARTS_AT,
        expiresAt: AUTHORITY_EXPIRES_AT,
      },
    },
    reservationId: IDS.reservation,
    journeyId: IDS.journey,
  });
  return ManagedDemoJourneyUsageReportersSchema.parse({
    interaction: reporter("interaction_service", capabilities[0]),
    guardian: reporter("guardian_service", capabilities[1]),
    worker: reporter("worker_service", capabilities[2]),
    research: reporter("research_service", capabilities[3]),
  });
}

function managedDemoCredentialStore() {
  const location = {
    schemaVersion: 1 as const,
    custodyProfile: "managed_demo" as const,
    pool: "judge" as const,
    runtime: "linux" as const,
    storeTarget: "nebius_secretstash" as const,
  };
  return {
    schemaVersion: 1 as const,
    custodyProfile: "managed_demo" as const,
    pool: "judge" as const,
    resources: [
      {
        schemaVersion: 1 as const,
        location,
        reference: registeredCredentialReference("nebius", "default"),
        secretId: "mbsec-judgenebius123",
        payloadKey: "nebius_api_key",
      },
      {
        schemaVersion: 1 as const,
        location,
        reference: registeredCredentialReference("tavily", "default"),
        secretId: "mbsec-judgetavily123",
        payloadKey: "tavily_api_key",
      },
      {
        schemaVersion: 1 as const,
        location,
        reference: registeredCredentialReference("github", "default"),
        secretId: "mbsec-judgegithub123",
        payloadKey: "github_access_token",
      },
    ],
  };
}

function launched(options: { durable?: boolean; assurance?: "enforced" | "observed" } = {}) {
  const researchCredentials = createResearchIpcCredentials();
  return {
    durableAuthority: options.durable ?? true,
    runtime: {
      status: () => ({
        sessionId: IDS.session,
        missionId: IDS.mission,
        missionVersion: 1,
        profileId: IDS.profile,
        profileVersion: 1,
        policyVersion: 1,
        callerId: IDS.caller,
        state: "active",
        assurance: options.assurance ?? "enforced",
        expiresAt: EXPIRES_AT,
        tools: ["guardian.local_command", "guardian.research", "guardian.session_status"],
      }),
    },
    research: {
      serviceConfig: {
        schemaVersion: 1,
        ...researchCredentials,
        sessionId: IDS.session,
        callerId: IDS.caller,
        missionId: IDS.mission,
        missionVersion: 1,
        profileId: IDS.profile,
        profileVersion: 1,
        policyVersion: 1,
        startsAt: STARTS_AT,
        expiresAt: EXPIRES_AT,
        scope: {
          allowedDomains: ["docs.github.com"],
          maxResultsPerRequest: 2,
          remainingRequests: 1,
          remainingResults: 2,
          requiredTerms: ["pull request"],
        },
      },
    },
  } as unknown as LaunchedReferenceSession;
}

function input(
  options: {
    launched?: LaunchedReferenceSession;
    request?: unknown;
    session?: ReturnType<typeof session>;
    connection?: ReturnType<typeof connection>;
    managedDemo?: boolean;
  } = {},
) {
  const endpoint = createAuthorityIpcEndpoint();
  return {
    launched: options.launched ?? launched(),
    legitimateRequest: options.request ?? request(),
    authority: {
      endpoint,
      brokerBinding: binding("broker_service", IDS.brokerCapability, [
        "session.get",
        "connection.list",
        "approval.get",
        "approval.state",
        "budget.consume_tool",
        "approval.consume",
        "context.append_attempt",
        "context.append_decision",
      ]),
      researchBinding: binding("research_service", IDS.researchCapability, [
        "research.reserve",
        "research.settle",
        "context.append_exposures",
      ]),
      records: {
        getSession: () => Promise.resolve(options.session ?? session()),
        getSessionConnections: () => Promise.resolve([options.connection ?? connection()]),
      },
    },
    githubClientId: "Iv23liP8Sq3ZEAyeIHju",
    credentialStore:
      options.managedDemo === true
        ? managedDemoCredentialStore()
        : {
            schemaVersion: 1 as const,
            custodyProfile: "byok" as const,
            location: {
              schemaVersion: 1 as const,
              custodyProfile: "byok" as const,
              pool: "personal" as const,
              runtime: "windows" as const,
              storeTarget: "windows_credential_manager" as const,
            },
          },
    ...(options.managedDemo === true
      ? {
          managedDemoBudget: {
            guardian: managedDemoReporters().guardian,
            research: managedDemoReporters().research,
          },
        }
      : {}),
    now: () => REQUESTED_AT,
  };
}

describe("activated competition journey service configuration", () => {
  it("derives credentials, lifetime, risk, and authority from the activated session", async () => {
    const legitimateRequest = request();
    const services = await buildActivatedCompetitionJourneyServices(
      input({ request: legitimateRequest }),
    );

    expect(services.broker.credentialStoreHandle).toBe(
      `guardian-credential://github/${IDS.credential}`,
    );
    expect(services.broker.broker).toMatchObject({
      sessionId: IDS.session,
      callerId: IDS.caller,
      startsAt: STARTS_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(services.broker.guardian.requestDigest).toBe(
      canonicalDigest("canonical_request", 1, legitimateRequest),
    );
    expect(services.broker.guardian.envelope).toEqual({
      proposal: {
        tool: "github.pull_request.merge",
        arguments: legitimateRequest.proposal.arguments,
      },
      deterministicFloor: "confirm",
      riskSignals: ["authority_expansion"],
      untrustedExcerpts: [],
      containsCredentials: false,
    });
    expect(services.research.research).toMatchObject({
      sessionId: IDS.session,
      startsAt: STARTS_AT,
      expiresAt: EXPIRES_AT,
    });
  });

  it("projects exact managed-demo Guardian and research reporters", async () => {
    const expected = managedDemoReporters();
    const services = await buildActivatedCompetitionJourneyServices(input({ managedDemo: true }));

    expect(services.broker.guardian.managedDemoBudget).toEqual(expected.guardian);
    expect(services.research.managedDemoBudget).toEqual(expected.research);
    expect(services.broker).not.toHaveProperty("ledgerPath");
    expect(services.research).not.toHaveProperty("ledgerPath");
  });

  it("rejects cross-journey managed-demo reporter substitution", async () => {
    const candidate = input({ managedDemo: true });
    const expected = managedDemoReporters();
    await expect(
      buildActivatedCompetitionJourneyServices({
        ...candidate,
        managedDemoBudget: {
          guardian: expected.guardian,
          research: {
            ...expected.research,
            journeyId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          },
        },
      }),
    ).rejects.toThrow("inconsistent bindings");
  });

  it("rejects a request identity substitution", async () => {
    const substituted = request();
    const callerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await expect(
      buildActivatedCompetitionJourneyServices(
        input({
          request: {
            ...substituted,
            callerId,
            proposal: { ...substituted.proposal, callerId },
          },
        }),
      ),
    ).rejects.toThrow("not bound to the activated session");
  });

  it("rejects inactive or out-of-scope durable authority records", async () => {
    await expect(
      buildActivatedCompetitionJourneyServices(input({ session: session("revoked") })),
    ).rejects.toThrow("durable session record");
    await expect(
      buildActivatedCompetitionJourneyServices(
        input({ connection: connection("different-repository") }),
      ),
    ).rejects.toThrow("outside the active GitHub connection scope");
  });

  it("rejects non-durable or non-enforced activation evidence", async () => {
    await expect(
      buildActivatedCompetitionJourneyServices(input({ launched: launched({ durable: false }) })),
    ).rejects.toThrow("active durable session");
    await expect(
      buildActivatedCompetitionJourneyServices(
        input({ launched: launched({ assurance: "observed" }) }),
      ),
    ).rejects.toThrow("enforced runtime evidence");
  });
});
