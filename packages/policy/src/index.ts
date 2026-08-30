import {
  GuardianRecommendationSchema,
  type AssuranceLevel,
  type AuthorizationLevel,
} from "@guardian/contracts";

export type { AuthorizationLevel } from "@guardian/contracts";

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

export function applyGuardianRecommendation(
  deterministicFloor: AuthorizationLevel,
  untrustedOutput: unknown,
): AuthorizationLevel {
  const parsed = GuardianRecommendationSchema.safeParse(untrustedOutput);
  if (!parsed.success) {
    return "deny";
  }
  if (parsed.data.certainty === "uncertain") {
    return stricterAuthorization(deterministicFloor, "step_up");
  }
  return stricterAuthorization(deterministicFloor, parsed.data.recommendation);
}

export interface PolicyContext {
  readonly assurance: AssuranceLevel;
}
