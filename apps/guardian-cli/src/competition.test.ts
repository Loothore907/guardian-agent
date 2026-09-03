import { canonicalDigest } from "@guardian/canonical";
import { describe, expect, it, vi } from "vitest";

import {
  parseGuardianCompetitionCliArguments,
  runGuardianCompetitionCli,
  type GuardianCliIo,
} from "./index.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  connection: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  profile: "55555555-5555-4555-8555-555555555555",
  principal: "66666666-6666-4666-8666-666666666666",
} as const;
const NOW = "2026-09-02T20:00:00.000Z";

function mergeRequest(options: {
  requestId: string;
  proposalId: string;
  repository: string;
  pullRequest: number;
}) {
  const resourceVersion = {
    kind: "github_pull_request" as const,
    owner: "loothore907",
    repository: options.repository,
    pullRequest: options.pullRequest,
    headCommit: "a".repeat(40),
  };
  return {
    schemaVersion: 1,
    requestId: options.requestId,
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
      proposalId: options.proposalId,
      sessionId: IDS.session,
      callerId: IDS.caller,
      missionId: IDS.mission,
      missionVersion: 1,
      profileId: IDS.profile,
      profileVersion: 1,
      proposedAt: NOW,
      operation: "github.pull_request.merge",
      arguments: {
        owner: "loothore907",
        repository: options.repository,
        pullRequest: options.pullRequest,
        expectedHeadCommit: "a".repeat(40),
        method: "squash",
      },
      resourceVersion,
    },
    resourceVersion,
  } as const;
}

const unsafeRequest = mergeRequest({
  requestId: "77777777-7777-4777-8777-777777777777",
  proposalId: "88888888-8888-4888-8888-888888888888",
  repository: "guardian-agent",
  pullRequest: 13,
});
const legitimateRequest = mergeRequest({
  requestId: "99999999-9999-4999-8999-999999999999",
  proposalId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  repository: "guardian-agent-demo",
  pullRequest: 2,
});
const researchRequest = {
  query: "GitHub pull request merge safety",
  maxResults: 2,
  allowedDomains: ["docs.github.com"],
} as const;

function io(response: string, interactive = true) {
  const output: string[] = [];
  const value: GuardianCliIo = {
    interactive,
    write: (text) => output.push(text),
    readConfirmation: vi.fn(() => Promise.resolve(response)),
  };
  return { output, value };
}

function completedResult() {
  return {
    state: "completed",
    research: {
      evidence: [
        {
          schemaVersion: 1,
          title: "GitHub Docs",
          excerpt: "Merge safety documentation.",
          sourceUrl: "https://docs.github.com/pulls",
          sourceContentDigest: "b".repeat(64),
          contentTrust: "untrusted_public_content",
          retrievedAt: NOW,
        },
      ],
      provenance: [
        {
          schemaVersion: 1,
          eventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          sessionId: IDS.session,
          sequence: 1,
          operation: "guardian.research",
          queryDigest: "c".repeat(64),
          destination: { kind: "public_domain", hostname: "docs.github.com" },
          sourceUrl: "https://docs.github.com/pulls",
          sourceContentDigest: "b".repeat(64),
          contentTrust: "untrusted_public_content",
          retrievedAt: NOW,
          providerRequestId: "provider_1",
        },
      ],
    },
    researchBudget: { sessionId: IDS.session, remainingRequests: 0, remainingResults: 1 },
    unsafeAttempt: { outcome: "denied", code: "scope_mismatch" },
    legitimateAttempt: {
      outcome: "succeeded",
      result: {
        status: "merged",
        owner: "loothore907",
        repository: "guardian-agent-demo",
        pullRequest: 2,
        headCommit: "a".repeat(40),
        mergeCommit: "d".repeat(40),
      },
    },
  } as const;
}

describe("Guardian controlled competition CLI", () => {
  it("accepts only the explicit fixed command", () => {
    expect(parseGuardianCompetitionCliArguments(["competition"])).toBeUndefined();
    expect(() => parseGuardianCompetitionCliArguments(["competition", "anything"])).toThrow(
      "usage",
    );
  });

  it("does not invoke the runner without exact interactive authorization", async () => {
    const runner = { runCompetitionJourney: vi.fn(() => Promise.resolve(completedResult())) };
    await expect(
      runGuardianCompetitionCli({
        principalId: IDS.principal,
        runner,
        researchRequest,
        unsafeRequest,
        legitimateRequest,
        githubClientId: "Iv23liP8Sq3ZEAyeIHju",
        io: io("", false).value,
        now: () => NOW,
      }),
    ).rejects.toThrow("interactive competition authorization is required");
    await expect(
      runGuardianCompetitionCli({
        principalId: IDS.principal,
        runner,
        researchRequest,
        unsafeRequest,
        legitimateRequest,
        githubClientId: "Iv23liP8Sq3ZEAyeIHju",
        io: io("AUTHORIZE wrong").value,
        now: () => NOW,
      }),
    ).rejects.toThrow("not authorized");
    expect(runner.runCompetitionJourney).not.toHaveBeenCalled();
  });

  it("shows the exact merge digest and forwards only a fresh confirmation", async () => {
    const digest = canonicalDigest("canonical_request", 1, legitimateRequest);
    const terminal = io(`AUTHORIZE ${digest.slice(0, 12)}`);
    const runner = { runCompetitionJourney: vi.fn(() => Promise.resolve(completedResult())) };

    await expect(
      runGuardianCompetitionCli({
        principalId: IDS.principal,
        runner,
        researchRequest,
        unsafeRequest,
        legitimateRequest,
        githubClientId: "Iv23liP8Sq3ZEAyeIHju",
        io: terminal.value,
        now: () => NOW,
      }),
    ).resolves.toMatchObject({ state: "completed" });

    expect(runner.runCompetitionJourney).toHaveBeenCalledWith({
      researchRequest,
      unsafeRequest,
      legitimateRequest,
      githubClientId: "Iv23liP8Sq3ZEAyeIHju",
      confirmation: { principalId: IDS.principal, confirmedAt: NOW },
    });
    const output = terminal.output.join("\n");
    expect(output).toContain(digest);
    expect(output).toContain("loothore907/guardian-agent-demo#2");
    expect(output).toContain("Unsafe attempt: denied (scope_mismatch)");
    expect(output).not.toContain("guardian-credential://");
  });

  it("rejects a same-target unsafe request before confirmation", async () => {
    const runner = { runCompetitionJourney: vi.fn(() => Promise.resolve(completedResult())) };
    await expect(
      runGuardianCompetitionCli({
        principalId: IDS.principal,
        runner,
        researchRequest,
        unsafeRequest: legitimateRequest,
        legitimateRequest,
        githubClientId: "Iv23liP8Sq3ZEAyeIHju",
        io: io("").value,
        now: () => NOW,
      }),
    ).rejects.toThrow("input is invalid");
    expect(runner.runCompetitionJourney).not.toHaveBeenCalled();
  });
});
