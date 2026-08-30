import { describe, expect, it, vi } from "vitest";
import { LocalResearchIpcClient, createResearchIpcCredentials } from "@guardian/research";

import {
  CredentialHoldingResearchService,
  TavilySearchProvider,
  createResearchServiceFromEnvironment,
  startCredentialHoldingResearchIpcServer,
  type TavilyProviderError,
  type TavilyTransport,
} from "./index.js";

const sessionId = "11111111-1111-4111-8111-111111111111";
const retrievedAt = "2026-08-30T09:00:00.000Z";
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
const rawResponse = {
  request_id: "tavily_req_1",
  query: request.query,
  response_time: 0.2,
  results: [
    {
      url: "https://docs.github.com/pull-requests",
      title: "Pull request guidance",
      content: "Branch protection rules can require reviews before merging.",
      score: 0.99,
      raw_content: "must not cross the adapter boundary",
    },
  ],
};

function capturedTransport(response: { readonly status: number; readonly body: string }) {
  return vi.fn<TavilyTransport>(() => Promise.resolve(response));
}

describe("Tavily Search adapter", () => {
  it("calls only the fixed Search endpoint with bounded explicit parameters", async () => {
    const transport = capturedTransport({ status: 200, body: JSON.stringify(rawResponse) });
    const provider = new TavilySearchProvider({ apiKey: "test-provider-credential", transport });

    await expect(provider.search(request)).resolves.toEqual({
      requestId: "tavily_req_1",
      results: [
        {
          url: "https://docs.github.com/pull-requests",
          title: "Pull request guidance",
          content: "Branch protection rules can require reviews before merging.",
        },
      ],
    });

    const invocation = transport.mock.calls[0]?.[0];
    expect(invocation?.endpoint).toBe("https://api.tavily.com/search");
    expect(invocation?.authorization).toBe("Bearer test-provider-credential");
    expect(JSON.parse(invocation?.body ?? "{}")).toEqual({
      query: request.query,
      max_results: 2,
      include_domains: ["docs.github.com"],
      topic: "general",
      search_depth: "basic",
      auto_parameters: false,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    });
  });

  it.each([
    ["invalid JSON", "not-json"],
    ["missing request id", JSON.stringify({ results: rawResponse.results })],
    ["wrong result shape", JSON.stringify({ request_id: "req_bad", results: [{ title: 42 }] })],
  ])("fails closed on %s", async (_label, body) => {
    const provider = new TavilySearchProvider({
      apiKey: "test-provider-credential",
      transport: capturedTransport({ status: 200, body }),
    });
    await expect(provider.search(request)).rejects.toMatchObject({ reason: "malformed" });
  });

  it("returns fixed sanitized errors for unavailable and oversized responses", async () => {
    const credential = "credential-that-must-not-leak";
    const unavailable = new TavilySearchProvider({
      apiKey: credential,
      transport: capturedTransport({ status: 503, body: `error ${credential}` }),
    });
    const oversized = new TavilySearchProvider({
      apiKey: credential,
      transport: capturedTransport({ status: 200, body: "x".repeat(256 * 1_024 + 1) }),
    });

    await expect(unavailable.search(request)).rejects.toEqual(
      expect.objectContaining({
        reason: "unavailable",
        message: "Tavily provider failed: unavailable",
      }),
    );
    await expect(oversized.search(request)).rejects.toEqual(
      expect.objectContaining({
        reason: "oversized",
        message: "Tavily provider failed: oversized",
      }),
    );
  });

  it("turns an aborted provider invocation into a fixed timeout error", async () => {
    const transport: TavilyTransport = ({ signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("transport aborted")), {
          once: true,
        });
      });
    const provider = new TavilySearchProvider({
      apiKey: "test-provider-credential",
      transport,
      timeoutMs: 100,
    });

    await expect(provider.search(request)).rejects.toEqual(
      expect.objectContaining({ reason: "timeout", message: "Tavily provider failed: timeout" }),
    );
  });
});

describe("credential-holding research service", () => {
  it("integrates request gating, exact-domain evidence, provenance, and budget consumption", async () => {
    const transport = capturedTransport({ status: 200, body: JSON.stringify(rawResponse) });
    const service = new CredentialHoldingResearchService({
      sessionId,
      scope,
      apiKey: "test-provider-credential",
      transport,
    });

    const journey = await service.search(request, retrievedAt);

    expect(journey.evidence).toHaveLength(1);
    expect(journey.evidence[0]).toMatchObject({
      sourceUrl: "https://docs.github.com/pull-requests",
      contentTrust: "untrusted_public_content",
    });
    expect(journey.provenance[0]).not.toHaveProperty("query");
    expect(journey.provenance[0]).not.toHaveProperty("rawContent");
    expect(service.budget).toEqual({ sessionId, remainingRequests: 1, remainingResults: 3 });
  });

  it("does not invoke or charge the provider for a deterministic denial", async () => {
    const transport = capturedTransport({ status: 200, body: JSON.stringify(rawResponse) });
    const service = new CredentialHoldingResearchService({
      sessionId,
      scope,
      apiKey: "test-provider-credential",
      transport,
    });

    await expect(
      service.search({ ...request, query: "api_key=private-provider-value" }, retrievedAt),
    ).rejects.toMatchObject({ reason: "unsafe_outbound_content" });
    expect(transport).not.toHaveBeenCalled();
    expect(service.budget).toEqual({ sessionId, remainingRequests: 2, remainingResults: 4 });
  });

  it("rejects off-domain provider sources without consuming result budget", async () => {
    const transport = capturedTransport({
      status: 200,
      body: JSON.stringify({
        request_id: "req_bad_sources",
        results: [
          rawResponse.results[0],
          { ...rawResponse.results[0], url: "https://attacker.example/redirected" },
        ],
      }),
    });
    const service = new CredentialHoldingResearchService({
      sessionId,
      scope,
      apiKey: "test-provider-credential",
      transport,
    });

    await expect(service.search(request, retrievedAt)).rejects.toThrow(
      "outside the approved domains",
    );
    expect(service.budget).toEqual({ sessionId, remainingRequests: 1, remainingResults: 4 });
  });

  it("fails before session creation when the credential is unavailable", () => {
    expect(() =>
      createResearchServiceFromEnvironment({ sessionId, scope, environment: {} }),
    ).toThrowError(
      expect.objectContaining<Partial<TavilyProviderError>>({ reason: "unavailable" }),
    );
  });

  it("serves bounded research over a session-bound local pipe without exposing the credential", async () => {
    const credentials = createResearchIpcCredentials();
    const config = {
      schemaVersion: 1,
      sessionId,
      callerId: "22222222-2222-4222-8222-222222222222",
      missionId: "33333333-3333-4333-8333-333333333333",
      missionVersion: 1,
      profileId: "44444444-4444-4444-8444-444444444444",
      profileVersion: 1,
      policyVersion: 1,
      ...credentials,
      startsAt: "2026-08-30T09:00:00.000Z",
      expiresAt: "2026-08-30T09:05:00.000Z",
      scope,
    } as const;
    const transport = capturedTransport({ status: 200, body: JSON.stringify(rawResponse) });
    const server = await startCredentialHoldingResearchIpcServer({
      config,
      environment: { TAVILY_API_KEY: "credential-that-stays-in-the-service" },
      transport,
      now: () => retrievedAt,
    });
    try {
      const client = new LocalResearchIpcClient(config);
      const response = await client.search(request, retrievedAt);

      expect(response.result.evidence).toHaveLength(1);
      expect(response.budget).toEqual({
        sessionId,
        remainingRequests: 1,
        remainingResults: 3,
      });
      expect(JSON.stringify(response)).not.toContain("credential-that-stays-in-the-service");
    } finally {
      await server.close();
    }
  });

  it("rejects unsafe content before the pipe service invokes Tavily", async () => {
    const credentials = createResearchIpcCredentials();
    const config = {
      schemaVersion: 1,
      sessionId,
      callerId: "22222222-2222-4222-8222-222222222222",
      missionId: "33333333-3333-4333-8333-333333333333",
      missionVersion: 1,
      profileId: "44444444-4444-4444-8444-444444444444",
      profileVersion: 1,
      policyVersion: 1,
      ...credentials,
      startsAt: "2026-08-30T09:00:00.000Z",
      expiresAt: "2026-08-30T09:05:00.000Z",
      scope,
    } as const;
    const transport = capturedTransport({ status: 200, body: JSON.stringify(rawResponse) });
    const server = await startCredentialHoldingResearchIpcServer({
      config,
      environment: { TAVILY_API_KEY: "credential-that-stays-in-the-service" },
      transport,
      now: () => retrievedAt,
    });
    try {
      const client = new LocalResearchIpcClient(config);
      await expect(
        client.search({ ...request, query: "api_key=private-provider-value" }, retrievedAt),
      ).rejects.toMatchObject({ reason: "unsafe_outbound_content" });
      expect(transport).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});
