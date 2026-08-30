import type { AssuranceLevel } from "@guardian/contracts";

export type AuthorizationLevel = "allow" | "confirm" | "step_up" | "deny";

const AUTHORIZATION_RANK: Readonly<Record<AuthorizationLevel, number>> = {
  allow: 0,
  confirm: 1,
  step_up: 2,
  deny: 3,
};

export function stricterAuthorization(
  deterministicFloor: AuthorizationLevel,
  contextualRecommendation: AuthorizationLevel,
): AuthorizationLevel {
  return AUTHORIZATION_RANK[contextualRecommendation] > AUTHORIZATION_RANK[deterministicFloor]
    ? contextualRecommendation
    : deterministicFloor;
}

export interface PolicyContext {
  readonly assurance: AssuranceLevel;
}
