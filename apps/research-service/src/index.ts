import { parseResearchRequest } from "@guardian/research";

export const researchServiceBoundary = {
  credential: "TAVILY_API_KEY",
  parseRequest: parseResearchRequest,
} as const;
