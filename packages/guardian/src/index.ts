import {
  GuardianEvaluationSchema,
  GuardianRiskEnvelopeSchema,
  type GuardianEvaluation,
  type GuardianRiskEnvelope,
} from "@guardian/contracts";

export * from "./action-ipc.js";
export * from "./setup-ipc.js";
export type {
  GuardianEvaluation,
  GuardianRiskEnvelope,
  GuardianRiskSignal,
} from "@guardian/contracts";

export function parseGuardianRiskEnvelope(value: unknown): GuardianRiskEnvelope {
  return GuardianRiskEnvelopeSchema.parse(value);
}

export function parseGuardianEvaluation(value: unknown): GuardianEvaluation {
  return GuardianEvaluationSchema.parse(value);
}
