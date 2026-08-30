import { describe, expect, it } from "vitest";

import {
  ActionProposalSchema,
  AuditEventSchema,
  ResearchProvenanceEventSchema,
  ResearchRequestSchema,
} from "./index.js";

const binding = {
  schemaVersion: 1,
  proposalId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
  callerId: "33333333-3333-4333-8333-333333333333",
  missionId: "44444444-4444-4444-8444-444444444444",
  missionVersion: 1,
  profileId: "55555555-5555-4555-8555-555555555555",
  profileVersion: 1,
  proposedAt: "2026-08-30T00:00:00.000Z",
} as const;

describe("action and evidence contracts", () => {
  it("accepts bounded research and rejects unknown or hidden outbound data", () => {
    expect(
      ResearchRequestSchema.parse({
        query: "GitHub pull request review guidance",
        maxResults: 2,
        allowedDomains: ["docs.github.com"],
      }),
    ).toBeDefined();
    expect(() =>
      ResearchRequestSchema.parse({
        query: "hidden\u200bquery",
        maxResults: 2,
        allowedDomains: [],
      }),
    ).toThrow();
    expect(() =>
      ResearchRequestSchema.parse({
        query: "safe query",
        maxResults: 2,
        allowedDomains: [],
        includeRawContent: true,
      }),
    ).toThrow();
  });

  it("binds GitHub proposals to the exact resource version", () => {
    const proposal = {
      ...binding,
      operation: "github.pull_request.merge",
      arguments: {
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 5,
        expectedHeadCommit: "a".repeat(40),
        method: "squash",
      },
      resourceVersion: {
        kind: "github_pull_request",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 5,
        headCommit: "a".repeat(40),
      },
    };
    expect(ActionProposalSchema.parse(proposal)).toBeDefined();
    expect(() =>
      ActionProposalSchema.parse({
        ...proposal,
        arguments: { ...proposal.arguments, owner: "Loothore907" },
      }),
    ).toThrow();
    expect(() =>
      ActionProposalSchema.parse({
        ...proposal,
        resourceVersion: { ...proposal.resourceVersion, headCommit: "b".repeat(40) },
      }),
    ).toThrow();
    expect(() => ActionProposalSchema.parse({ ...proposal, operation: "http.request" })).toThrow();
  });

  it("records minimized, explicitly untrusted research provenance", () => {
    const event = {
      schemaVersion: 1,
      eventId: "66666666-6666-4666-8666-666666666666",
      sessionId: binding.sessionId,
      sequence: 1,
      operation: "guardian.research",
      queryDigest: "a".repeat(64),
      destination: { kind: "public_domain", hostname: "docs.github.com" },
      sourceUrl: "https://docs.github.com/pull-requests",
      sourceContentDigest: "b".repeat(64),
      contentTrust: "untrusted_public_content",
      retrievedAt: "2026-08-30T00:01:00.000Z",
      providerRequestId: "req_123",
    };
    expect(ResearchProvenanceEventSchema.parse(event)).toBeDefined();
    expect(() => ResearchProvenanceEventSchema.parse({ ...event, rawContent: "secret" })).toThrow();
    expect(() =>
      ResearchProvenanceEventSchema.parse({
        ...event,
        sourceUrl: "https://attacker.example/redirected",
      }),
    ).toThrow();
    expect(() =>
      ResearchProvenanceEventSchema.parse({
        ...event,
        destination: { kind: "public_domain", hostname: "docs.github.com" },
        sourceUrl: "https://user:password@docs.github.com/private",
      }),
    ).toThrow();
  });

  it("allows only sanitized, typed audit fields", () => {
    const event = {
      schemaVersion: 1,
      eventId: "77777777-7777-4777-8777-777777777777",
      sessionId: binding.sessionId,
      sequence: 1,
      occurredAt: "2026-08-30T00:02:00.000Z",
      sanitized: true,
      type: "execution.result",
      requestDigest: "c".repeat(64),
      outcome: "denied",
      resultCode: "request_mismatch",
    };
    expect(AuditEventSchema.parse(event)).toBeDefined();
    expect(() => AuditEventSchema.parse({ ...event, detail: "Bearer credential" })).toThrow();
    expect(() => AuditEventSchema.parse({ ...event, sanitized: false })).toThrow();
    expect(() =>
      AuditEventSchema.parse({
        ...event,
        outcome: "succeeded",
        resultCode: "request_mismatch",
      }),
    ).toThrow();
  });
});
