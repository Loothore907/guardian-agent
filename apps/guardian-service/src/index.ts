import type { GuardianRiskEnvelope } from "@guardian/guardian";

export interface GuardianServiceBoundary {
  readonly credential: "NEBIUS_API_KEY";
  readonly evaluate: (envelope: GuardianRiskEnvelope) => Promise<unknown>;
}
