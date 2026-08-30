import { ResearchRequestSchema, type ResearchRequest } from "@guardian/contracts";

export function parseResearchRequest(value: unknown): ResearchRequest {
  return ResearchRequestSchema.parse(value);
}
