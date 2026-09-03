import { describe, expect, it } from "vitest";

import { ResearchServiceProcessConfigSchema, ToolProposalSchema } from "./index.js";

describe("ToolProposalSchema", () => {
  it("accepts the one scaffolded capability", () => {
    expect(
      ToolProposalSchema.parse({
        tool: "guardian.research",
        arguments: { query: "pull request review guidance", maxResults: 2 },
      }),
    ).toEqual({
      tool: "guardian.research",
      arguments: { query: "pull request review guidance", maxResults: 2 },
    });
  });

  it("accepts a minimized exact GitHub merge proposal", () => {
    expect(
      ToolProposalSchema.parse({
        tool: "github.pull_request.merge",
        arguments: {
          owner: "loothore907",
          repository: "guardian-agent-demo",
          pullRequest: 2,
          expectedHeadCommit: "a".repeat(40),
          method: "squash",
        },
      }),
    ).toMatchObject({ tool: "github.pull_request.merge" });
  });

  it("rejects unknown authority instead of stripping it", () => {
    expect(() =>
      ToolProposalSchema.parse({
        tool: "guardian.research",
        arguments: { query: "pull request review guidance", maxResults: 2 },
        approval: true,
      }),
    ).toThrow();
  });
});

describe("ResearchServiceProcessConfigSchema", () => {
  it("rejects a controlled-content domain outside the bound research scope", () => {
    expect(() =>
      ResearchServiceProcessConfigSchema.parse({
        schemaVersion: 1,
        sessionId: "11111111-1111-4111-8111-111111111111",
        callerId: "22222222-2222-4222-8222-222222222222",
        missionId: "33333333-3333-4333-8333-333333333333",
        missionVersion: 1,
        profileId: "44444444-4444-4444-8444-444444444444",
        profileVersion: 1,
        policyVersion: 1,
        capability: "55555555-5555-4555-8555-555555555555",
        endpoint: "guardian-research-test",
        startsAt: "2026-09-03T08:00:00.000Z",
        expiresAt: "2026-09-03T08:05:00.000Z",
        scope: {
          allowedDomains: ["docs.github.com"],
          maxResultsPerRequest: 2,
          remainingRequests: 1,
          remainingResults: 2,
          requiredTerms: ["pull request"],
        },
        controlledContent: {
          allowedUrls: ["https://fixture.example/guardian/indirect-instruction.txt"],
          allowedDomains: ["fixture.example"],
          maxContentCharacters: 1_000,
          remainingRequests: 1,
        },
      }),
    ).toThrow("controlled content domain must remain inside the research scope");
  });
});
