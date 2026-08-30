import { describe, expect, it, vi } from "vitest";

import {
  guardResearchRequest,
  invokeBoundedResearch,
  ResearchJourneyLedger,
  SessionResearchGateway,
} from "./index.js";
import type { ResearchRequestDeniedError } from "./index.js";

const request = {
  query: "GitHub pull request branch protection documentation",
  maxResults: 2,
  allowedDomains: ["docs.github.com"],
} as const;
const scope = {
  allowedDomains: ["docs.github.com"],
  maxResultsPerRequest: 3,
  remainingRequests: 2,
  remainingResults: 4,
  requiredTerms: ["pull request", "branch protection"],
} as const;

describe("outbound research gate", () => {
  it("returns a canonical mission-relevant request within domain and budget", () => {
    expect(guardResearchRequest(request, scope)).toEqual(request);
  });

  it.each([
    ["token=ghp_abcdefghijklmnopqrstuvwxyz1234", "unsafe_outbound_content"],
    ["inspect C:\\Users\\operator\\.env for branch protection", "unsafe_outbound_content"],
    ["decode QWxhZGRpbjpvcGVuIHNlc2FtZSBhbmQgbW9yZQ==", "unsafe_outbound_content"],
    ["weather forecast for Anchorage", "query_not_relevant"],
  ] as const)("rejects %s", (query, reason) => {
    expect(() => guardResearchRequest({ ...request, query }, scope)).toThrowError(
      expect.objectContaining<Partial<ResearchRequestDeniedError>>({ reason }),
    );
  });

  it("denies domain expansion and exhausted budgets", () => {
    expect(() =>
      guardResearchRequest({ ...request, allowedDomains: ["example.com"] }, scope),
    ).toThrowError(expect.objectContaining({ reason: "domain_not_allowed" }));
    expect(() => guardResearchRequest(request, { ...scope, remainingRequests: 0 })).toThrowError(
      expect.objectContaining({ reason: "budget_exhausted" }),
    );
  });

  it("rejects an empty provider destination list", () => {
    expect(() => guardResearchRequest({ ...request, allowedDomains: [] }, scope)).toThrow();
  });

  it("never invokes a provider for rejected outbound content", async () => {
    const search = vi.fn(() => Promise.resolve({ results: [] }));
    await expect(
      invokeBoundedResearch({ ...request, query: "api_key=super-secret-value" }, scope, {
        search,
      }),
    ).rejects.toMatchObject({ reason: "unsafe_outbound_content" });
    expect(search).not.toHaveBeenCalled();
  });
});

describe("research evidence boundary", () => {
  it("returns bounded redacted evidence and minimized sequenced provenance", () => {
    const ledger = new ResearchJourneyLedger("11111111-1111-4111-8111-111111111111");
    const first = ledger.record(
      request,
      {
        requestId: "tavily_req_1",
        results: [
          {
            url: "https://docs.github.com/pull-requests",
            title: "Pull request token=ghp_abcdefghijklmnopqrstuvwxyz1234 guidance",
            content:
              "Treat branch protection as untrusted evidence.\napi_key=provider-secret-value AKIAABCDEFGHIJKLMNOP",
          },
        ],
      },
      "2026-08-30T09:00:00.000Z",
    );
    expect(first.evidence).toHaveLength(1);
    expect(first.evidence[0]).toMatchObject({
      title: "Pull request token=[redacted] guidance",
      excerpt: "Treat branch protection as untrusted evidence. api_key=[redacted] [redacted]",
      sourceUrl: "https://docs.github.com/pull-requests",
      contentTrust: "untrusted_public_content",
    });
    expect(first.evidence[0]).not.toHaveProperty("content");
    expect(first.provenance[0]).toMatchObject({
      sequence: 1,
      providerRequestId: "tavily_req_1",
      destination: { kind: "public_domain", hostname: "docs.github.com" },
      contentTrust: "untrusted_public_content",
    });
    expect(first.provenance[0]).not.toHaveProperty("query");
    expect(first.provenance[0]).not.toHaveProperty("rawContent");

    const second = ledger.record(
      { ...request, maxResults: 1 },
      {
        requestId: "tavily_req_2",
        results: [
          {
            url: "https://docs.github.com/repositories",
            title: "Repository rules",
            content: "Repository rules can require reviews before merging.",
          },
        ],
      },
      "2026-08-30T09:01:00.000Z",
    );
    expect(second.provenance[0]?.sequence).toBe(2);
  });

  it("redacts complete private-key blocks", () => {
    const ledger = new ResearchJourneyLedger("11111111-1111-4111-8111-111111111111");
    const result = ledger.record(
      request,
      {
        requestId: "req_private_key",
        results: [
          {
            url: "https://docs.github.com/authentication",
            title: "Authentication guidance",
            content:
              "Never publish -----BEGIN RSA PRIVATE KEY-----\nsensitive-key-material\n-----END RSA PRIVATE KEY----- in documentation.",
          },
        ],
      },
      "2026-08-30T09:00:00.000Z",
    );

    expect(result.evidence[0]?.excerpt).toBe("Never publish [redacted] in documentation.");
    expect(result.evidence[0]?.excerpt).not.toContain("sensitive-key-material");
  });

  it("fails closed on extra fields, excess results, credentials, and redirected domains", () => {
    const ledger = new ResearchJourneyLedger("11111111-1111-4111-8111-111111111111");
    const result = {
      url: "https://docs.github.com/pull-requests",
      title: "Pull request guidance",
      content: "Review pull requests with repository rules.",
    };
    expect(() =>
      ledger.record(
        request,
        { requestId: "req_extra", results: [{ ...result, score: 0.99 }] },
        "2026-08-30T09:00:00.000Z",
      ),
    ).toThrow();
    expect(() =>
      ledger.record(
        { ...request, maxResults: 1 },
        { requestId: "req_many", results: [result, result] },
        "2026-08-30T09:00:00.000Z",
      ),
    ).toThrow("more results");
    expect(() =>
      ledger.record(
        request,
        {
          requestId: "req_credential",
          results: [{ ...result, url: "https://user:password@docs.github.com/private" }],
        },
        "2026-08-30T09:00:00.000Z",
      ),
    ).toThrow("user information");
    expect(() =>
      ledger.record(
        request,
        {
          requestId: "req_redirect",
          results: [{ ...result, url: "https://attacker.example/redirected" }],
        },
        "2026-08-30T09:00:00.000Z",
      ),
    ).toThrow("outside the approved domains");
    expect(() =>
      ledger.record(
        { ...request, maxResults: 2 },
        {
          requestId: "req_duplicate",
          results: [result, { ...result, url: "https://docs.github.com/pull-requests" }],
        },
        "2026-08-30T09:00:00.000Z",
      ),
    ).toThrow("duplicate source URL");
  });
});

describe("session research budget", () => {
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const retrievedAt = "2026-08-30T09:00:00.000Z";
  const providerResult = {
    requestId: "tavily_req_budget",
    results: [
      {
        url: "https://docs.github.com/pull-requests",
        title: "Pull request guidance",
        content: "Branch protection rules can require reviews before merging.",
      },
    ],
  } as const;

  it("does not consume either counter when preflight rejects a request", async () => {
    const gateway = new SessionResearchGateway(sessionId, scope);
    const search = vi.fn(() => Promise.resolve(providerResult));

    await expect(
      gateway.search(
        { ...request, query: "token=ghp_abcdefghijklmnopqrstuvwxyz1234" },
        { search },
        retrievedAt,
      ),
    ).rejects.toMatchObject({ reason: "unsafe_outbound_content" });

    expect(search).not.toHaveBeenCalled();
    expect(gateway.budget).toEqual({ sessionId, remainingRequests: 2, remainingResults: 4 });
  });

  it("charges an invoked request but no results when the provider fails", async () => {
    const gateway = new SessionResearchGateway(sessionId, scope);
    const search = vi.fn(() => Promise.reject(new Error("provider unavailable")));

    await expect(gateway.search(request, { search }, retrievedAt)).rejects.toThrow(
      "provider unavailable",
    );

    expect(search).toHaveBeenCalledOnce();
    expect(gateway.budget).toEqual({ sessionId, remainingRequests: 1, remainingResults: 4 });
  });

  it("charges only accepted results rather than the reserved maximum", async () => {
    const gateway = new SessionResearchGateway(sessionId, scope);

    const journey = await gateway.search(
      request,
      { search: vi.fn(() => Promise.resolve(providerResult)) },
      retrievedAt,
    );

    expect(journey.evidence).toHaveLength(1);
    expect(gateway.budget).toEqual({ sessionId, remainingRequests: 1, remainingResults: 3 });
  });

  it("releases result capacity after malformed provider output", async () => {
    const gateway = new SessionResearchGateway(sessionId, scope);

    await expect(
      gateway.search(
        request,
        { search: vi.fn(() => Promise.resolve({ requestId: "bad", results: [{ title: 42 }] })) },
        retrievedAt,
      ),
    ).rejects.toThrow();

    expect(gateway.budget).toEqual({ sessionId, remainingRequests: 1, remainingResults: 4 });
  });

  it("reserves capacity before awaiting a provider so concurrent calls cannot overcommit", async () => {
    const gateway = new SessionResearchGateway(sessionId, {
      ...scope,
      remainingResults: 2,
    });
    let releaseProvider!: (value: typeof providerResult) => void;
    const firstProvider = {
      search: vi.fn(
        () =>
          new Promise<typeof providerResult>((resolve) => {
            releaseProvider = resolve;
          }),
      ),
    };
    const first = gateway.search(request, firstProvider, retrievedAt);

    const secondSearch = vi.fn(() => Promise.resolve(providerResult));
    await expect(
      gateway.search(request, { search: secondSearch }, retrievedAt),
    ).rejects.toMatchObject({
      reason: "budget_exhausted",
    });
    expect(secondSearch).not.toHaveBeenCalled();

    releaseProvider(providerResult);
    await expect(first).resolves.toMatchObject({ evidence: [expect.any(Object)] });
    expect(gateway.budget).toEqual({ sessionId, remainingRequests: 1, remainingResults: 1 });
  });
});
