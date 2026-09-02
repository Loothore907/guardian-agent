import {
  AuthorizationLevelSchema,
  GuardianRecommendationSchema,
  ProviderRequestIdSchema,
  ToolProposalSchema,
  type AuthorizationLevel,
  type GuardianRecommendation,
  type ToolProposal,
} from "@guardian/contracts";

export * from "./setup-ipc.js";

export type GuardianRiskSignal =
  | "intent_action_mismatch"
  | "untrusted_imperative_content"
  | "authority_expansion"
  | "ambiguous_evidence"
  | "clean_context";

export interface GuardianRiskEnvelope {
  readonly proposal: ToolProposal;
  readonly deterministicFloor: AuthorizationLevel;
  readonly riskSignals: readonly GuardianRiskSignal[];
  readonly untrustedExcerpts: readonly string[];
  readonly containsCredentials: false;
}

export type GuardianEvaluation =
  | {
      readonly status: "evaluated";
      readonly providerRequestId: string;
      readonly recommendation: GuardianRecommendation;
      readonly authorizationLevel: AuthorizationLevel;
    }
  | { readonly status: "unavailable"; readonly authorizationLevel: "deny" };

const RISK_SIGNALS = new Set<GuardianRiskSignal>([
  "intent_action_mismatch",
  "untrusted_imperative_content",
  "authority_expansion",
  "ambiguous_evidence",
  "clean_context",
]);

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("guardian value is invalid");
  }
  return value as Record<string, unknown>;
}

function exactFields(value: Record<string, unknown>, fields: readonly string[]): void {
  const actual = Object.keys(value);
  if (actual.length !== fields.length || actual.some((field) => !fields.includes(field))) {
    throw new TypeError("guardian value is invalid");
  }
}

function boundedVisible(value: unknown, maximum: number): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximum ||
    value !== value.trim() ||
    value !== value.normalize("NFC") ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint === undefined || codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
      );
    })
  ) {
    throw new TypeError("guardian value is invalid");
  }
  return value;
}

export function parseGuardianRiskEnvelope(value: unknown): GuardianRiskEnvelope {
  const envelope = record(value);
  exactFields(envelope, [
    "proposal",
    "deterministicFloor",
    "riskSignals",
    "untrustedExcerpts",
    "containsCredentials",
  ]);
  if (
    !Array.isArray(envelope.riskSignals) ||
    envelope.riskSignals.length > 8 ||
    envelope.riskSignals.some(
      (signal) => typeof signal !== "string" || !RISK_SIGNALS.has(signal as GuardianRiskSignal),
    ) ||
    !Array.isArray(envelope.untrustedExcerpts) ||
    envelope.untrustedExcerpts.length > 4 ||
    envelope.containsCredentials !== false
  ) {
    throw new TypeError("guardian risk envelope is invalid");
  }
  return {
    proposal: ToolProposalSchema.parse(envelope.proposal),
    deterministicFloor: AuthorizationLevelSchema.parse(envelope.deterministicFloor),
    riskSignals: envelope.riskSignals as GuardianRiskSignal[],
    untrustedExcerpts: envelope.untrustedExcerpts.map((excerpt) => boundedVisible(excerpt, 500)),
    containsCredentials: false,
  };
}

export function parseGuardianEvaluation(value: unknown): GuardianEvaluation {
  const evaluation = record(value);
  if (evaluation.status === "unavailable") {
    exactFields(evaluation, ["status", "authorizationLevel"]);
    if (evaluation.authorizationLevel !== "deny") throw new TypeError("guardian value is invalid");
    return { status: "unavailable", authorizationLevel: "deny" };
  }
  exactFields(evaluation, ["status", "providerRequestId", "recommendation", "authorizationLevel"]);
  if (evaluation.status !== "evaluated") throw new TypeError("guardian value is invalid");
  return {
    status: "evaluated",
    providerRequestId: ProviderRequestIdSchema.parse(evaluation.providerRequestId),
    recommendation: GuardianRecommendationSchema.parse(evaluation.recommendation),
    authorizationLevel: AuthorizationLevelSchema.parse(evaluation.authorizationLevel),
  };
}
