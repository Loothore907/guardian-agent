import {
  SessionProfileSchema,
  TimestampSchema,
  type AssuranceLevel,
  type SessionStatus,
} from "@guardian/contracts";

export function foundationStatus(): SessionStatus {
  return { status: "foundation", assurance: "unknown" };
}

export function resolveAssuranceLevel(value: unknown, evaluatedAt: string): AssuranceLevel {
  const profile = SessionProfileSchema.safeParse(value);
  const timestamp = TimestampSchema.safeParse(evaluatedAt);
  if (!profile.success || !timestamp.success) {
    return "unknown";
  }

  const evaluationTime = Date.parse(timestamp.data);
  const currentEvidence = profile.data.assurance.evidence.filter(
    (evidence) =>
      Date.parse(evidence.capturedAt) <= evaluationTime &&
      evaluationTime < Date.parse(evidence.validUntil),
  );

  if (profile.data.assurance.level === "enforced") {
    const kinds = new Set(currentEvidence.map((evidence) => evidence.kind));
    const requiredKinds = ["tool_catalog", "filesystem", "credential", "network"] as const;
    return requiredKinds.every((kind) => kinds.has(kind)) ? "enforced" : "unknown";
  }
  if (profile.data.assurance.level === "observed") {
    return currentEvidence.length > 0 ? "observed" : "unknown";
  }
  return "unknown";
}
