import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { digestCanonicalRequest, validateExactApproval } from "./index.js";

const IDS = {
  request: "11111111-1111-4111-8111-111111111111",
  proposal: "22222222-2222-4222-8222-222222222222",
  session: "33333333-3333-4333-8333-333333333333",
  caller: "44444444-4444-4444-8444-444444444444",
  mission: "55555555-5555-4555-8555-555555555555",
  profile: "66666666-6666-4666-8666-666666666666",
  connection: "77777777-7777-4777-8777-777777777777",
  approval: "88888888-8888-4888-8888-888888888888",
  nonce: "99999999-9999-4999-8999-999999999999",
  human: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const;
const scopeDigest = "d".repeat(64);

function request(pullRequest = 5) {
  const resourceVersion = {
    kind: "github_pull_request",
    owner: "loothore907",
    repository: "guardian-agent",
    pullRequest,
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
      proposedAt: "2026-08-30T00:00:00.000Z",
      operation: "github.pull_request.merge",
      arguments: {
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest,
        expectedHeadCommit: "a".repeat(40),
        method: "squash",
      },
      resourceVersion,
    },
    resourceVersion,
  } as const;
}

function approval(boundRequest = request()) {
  return {
    schemaVersion: 1,
    approvalId: IDS.approval,
    requestId: boundRequest.requestId,
    requestDigest: digestCanonicalRequest(boundRequest),
    sessionId: boundRequest.sessionId,
    callerId: boundRequest.callerId,
    connectionId: IDS.connection,
    missionId: boundRequest.missionId,
    missionVersion: boundRequest.missionVersion,
    profileId: boundRequest.profileId,
    profileVersion: boundRequest.profileVersion,
    policyVersion: boundRequest.policyVersion,
    resourceVersion: boundRequest.resourceVersion,
    scopeDigest,
    nonce: IDS.nonce,
    maxUses: 1,
    approvedBy: { kind: "human", principalId: IDS.human },
    approvedAt: "2026-08-30T00:01:00.000Z",
    expiresAt: "2026-08-30T00:06:00.000Z",
  } as const;
}

describe("exact approval validation", () => {
  it("accepts only the exact live request binding", () => {
    const boundRequest = request();
    expect(
      validateExactApproval(
        approval(boundRequest),
        boundRequest,
        scopeDigest,
        "2026-08-30T00:02:00.000Z",
      ).ok,
    ).toBe(true);
  });

  it("rejects caller, policy, scope, and expiry mismatches", () => {
    const boundRequest = request();
    const exactApproval = approval(boundRequest);
    expect(
      validateExactApproval(
        exactApproval,
        { ...boundRequest, callerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        scopeDigest,
        "2026-08-30T00:02:00.000Z",
      ),
    ).toEqual({ ok: false, reason: "malformed" });
    expect(
      validateExactApproval(
        exactApproval,
        { ...boundRequest, policyVersion: 2 },
        scopeDigest,
        "2026-08-30T00:02:00.000Z",
      ),
    ).toEqual({ ok: false, reason: "request_mismatch" });
    expect(
      validateExactApproval(
        exactApproval,
        boundRequest,
        "e".repeat(64),
        "2026-08-30T00:02:00.000Z",
      ),
    ).toEqual({ ok: false, reason: "request_mismatch" });
    expect(
      validateExactApproval(exactApproval, boundRequest, scopeDigest, "2026-08-30T00:06:00.000Z"),
    ).toEqual({ ok: false, reason: "expired" });
    expect(
      validateExactApproval(exactApproval, boundRequest, scopeDigest, "2026-08-30T00:00:00.000Z"),
    ).toEqual({ ok: false, reason: "not_active" });
  });

  it("property: changing the bound pull request invalidates approval", () => {
    const boundRequest = request(5);
    const exactApproval = approval(boundRequest);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }).filter((value) => value !== 5),
        (pullRequest) => {
          expect(
            validateExactApproval(
              exactApproval,
              request(pullRequest),
              scopeDigest,
              "2026-08-30T00:02:00.000Z",
            ),
          ).toEqual({ ok: false, reason: "request_mismatch" });
        },
      ),
    );
  });
});
