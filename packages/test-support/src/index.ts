import type { ResearchRequest } from "@guardian/contracts";

export function fakeResearchProvider(request: ResearchRequest) {
  return {
    provider: "fake" as const,
    query: request.query,
    results: [] as const,
  };
}
