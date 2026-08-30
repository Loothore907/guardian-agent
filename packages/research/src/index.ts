import {
  ResearchProvenanceEventSchema,
  ResearchRequestSchema,
  type ResearchProvenanceEvent,
  type ResearchRequest,
} from "@guardian/contracts";

export function parseResearchRequest(value: unknown): ResearchRequest {
  return ResearchRequestSchema.parse(value);
}

export function parseResearchProvenanceEvent(value: unknown): ResearchProvenanceEvent {
  return ResearchProvenanceEventSchema.parse(value);
}
