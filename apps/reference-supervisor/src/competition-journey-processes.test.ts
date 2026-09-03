import { randomUUID } from "node:crypto";

import { createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { createBrokerIpcCredentials } from "@guardian/broker";
import { CompetitionJourneyServiceBundleSchema } from "@guardian/contracts";
import { createGuardianActionRiskIpcCredentials } from "@guardian/guardian";
import { createResearchIpcCredentials } from "@guardian/research";
import { describe, expect, it } from "vitest";

import { startSupervisedControlledCompetitionJourney } from "./competition-journey-processes.js";

const sessionId = "11111111-1111-4111-8111-111111111111";
const callerId = "22222222-2222-4222-8222-222222222222";
const connectionId = "33333333-3333-4333-8333-333333333333";
const missionId = "44444444-4444-4444-8444-444444444444";
const profileId = "55555555-5555-4555-8555-555555555555";

function authorityBinding(
  role: "broker_service" | "research_service",
  operations: readonly string[],
  issuedAt: string,
  expiresAt: string,
) {
  return {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole: role,
    callerId,
    sessionId,
    allowedOperations: operations,
    issuedAt,
    expiresAt,
  };
}

function serviceBundle() {
  const now = Date.now();
  const issuedAt = new Date(now - 10_000).toISOString();
  const startsAt = new Date(now - 5_000).toISOString();
  const expiresAt = new Date(now + 60_000).toISOString();
  const authorityExpiresAt = new Date(now + 65_000).toISOString();
  const brokerAuthority = authorityBinding(
    "broker_service",
    [
      "session.get",
      "connection.list",
      "approval.get",
      "approval.state",
      "budget.consume_tool",
      "approval.consume",
      "context.append_attempt",
      "context.append_decision",
    ],
    issuedAt,
    authorityExpiresAt,
  );
  const researchAuthority = authorityBinding(
    "research_service",
    ["research.reserve", "research.settle"],
    issuedAt,
    authorityExpiresAt,
  );
  const guardian = {
    schemaVersion: 1,
    serviceKind: "action_risk",
    ...createGuardianActionRiskIpcCredentials(),
    sessionId,
    callerId,
    requestDigest: "b".repeat(64),
    startsAt,
    expiresAt,
    envelope: {
      proposal: {
        tool: "github.pull_request.merge",
        arguments: {
          owner: "loothore907",
          repository: "guardian-agent-demo",
          pullRequest: 2,
          expectedHeadCommit: "a".repeat(40),
          method: "squash",
        },
      },
      deterministicFloor: "confirm",
      riskSignals: ["authority_expansion"],
      untrustedExcerpts: [],
      containsCredentials: false,
    },
  } as const;
  return CompetitionJourneyServiceBundleSchema.parse({
    schemaVersion: 1,
    broker: {
      schemaVersion: 1,
      serviceKind: "github_broker",
      broker: {
        schemaVersion: 1,
        ...createBrokerIpcCredentials(),
        sessionId,
        callerId,
        startsAt,
        expiresAt,
      },
      authority: {
        schemaVersion: 1,
        endpoint: createAuthorityIpcEndpoint(),
        binding: brokerAuthority,
      },
      guardian,
      credentialStoreHandle: `guardian-credential://github/${connectionId}`,
      githubClientId: "Iv23liP8Sq3ZEAyeIHju",
    },
    research: {
      schemaVersion: 1,
      serviceKind: "tavily_research",
      research: {
        schemaVersion: 1,
        ...createResearchIpcCredentials(),
        sessionId,
        callerId,
        missionId,
        missionVersion: 1,
        profileId,
        profileVersion: 1,
        policyVersion: 1,
        startsAt,
        expiresAt,
        scope: {
          allowedDomains: ["docs.github.com"],
          maxResultsPerRequest: 3,
          remainingRequests: 1,
          remainingResults: 2,
          requiredTerms: ["pull request"],
        },
      },
      authority: {
        schemaVersion: 1,
        endpoint: createAuthorityIpcEndpoint(),
        binding: researchAuthority,
      },
    },
  });
}

describe("supervised controlled competition service composition", () => {
  it("starts the fixed Guardian, broker, and research children without exposing process IDs", async () => {
    const attachment = await startSupervisedControlledCompetitionJourney({
      services: serviceBundle(),
      riskProvider: "fake",
    });
    try {
      expect(attachment.state).toBe("active");
      expect(attachment).not.toHaveProperty("processId");
      await expect(
        attachment.run({
          requestedAt: "invalid",
          researchRequest: {},
          unsafeRequest: {},
          legitimateRequest: {},
          legitimateApproval: {},
        }),
      ).resolves.toEqual({ state: "stopped", stage: "input", code: "invalid_input" });
      expect(attachment.state).toBe("completed");
    } finally {
      await attachment.close();
    }
    expect(attachment.state).toBe("closed");
  });

  it("rejects cross-service session and lifetime substitutions before startup", () => {
    const services = serviceBundle();
    expect(() =>
      CompetitionJourneyServiceBundleSchema.parse({
        ...services,
        research: {
          ...services.research,
          research: {
            ...services.research.research,
            sessionId: "99999999-9999-4999-8999-999999999999",
          },
        },
      }),
    ).toThrow();
    expect(() =>
      CompetitionJourneyServiceBundleSchema.parse({
        ...services,
        research: {
          ...services.research,
          research: {
            ...services.research.research,
            startsAt: new Date(
              Date.parse(services.research.research.startsAt) + 1_000,
            ).toISOString(),
          },
        },
      }),
    ).toThrow();
  });

  it("rejects an untrusted Guardian provider selection", async () => {
    await expect(
      startSupervisedControlledCompetitionJourney({
        services: serviceBundle(),
        riskProvider: "caller-selected" as never,
      }),
    ).rejects.toThrow("provider selection");
  });
});
