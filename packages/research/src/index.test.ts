import { describe, expect, it, vi } from "vitest";

import { guardResearchRequest, invokeBoundedResearch } from "./index.js";
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
