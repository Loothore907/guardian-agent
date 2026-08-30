import { randomUUID } from "node:crypto";

import { canonicalDigest } from "@guardian/canonical";
import {
  IsolationProbeResultSchema,
  SessionProfileSchema,
  TimestampSchema,
  type AssuranceEvidenceKind,
  type AssuranceEvidenceReference,
} from "@guardian/contracts";

export function createReferenceAssuranceEvidence(
  profileValue: unknown,
  probeValue: unknown,
  validUntilValue: unknown,
): readonly AssuranceEvidenceReference[] {
  const profile = SessionProfileSchema.parse(profileValue);
  const probe = IsolationProbeResultSchema.parse(probeValue);
  const validUntil = TimestampSchema.parse(validUntilValue);
  if (Date.parse(validUntil) <= Date.parse(probe.observedAt)) {
    throw new TypeError("assurance evidence must expire after observation");
  }
  if (!Object.values(probe.checks).every(Boolean)) {
    throw new TypeError("failed isolation probes cannot produce assurance evidence");
  }

  const artifacts: Readonly<Record<AssuranceEvidenceKind, unknown>> = {
    tool_catalog: { tools: [...profile.permissions.tools].sort() },
    filesystem: {
      localCommandSucceeded: probe.checks.localCommandSucceeded,
      hostFilesystemHidden: probe.checks.hostFilesystemHidden,
      runtimeIdentityReduced: probe.checks.runtimeIdentityReduced,
    },
    credential: { providerCredentialsAbsent: probe.checks.providerCredentialsAbsent },
    network: {
      directPublicEgressBlocked: probe.checks.directPublicEgressBlocked,
      directGitPushBlocked: probe.checks.directGitPushBlocked,
    },
  };

  return (Object.keys(artifacts) as AssuranceEvidenceKind[]).map((kind) => ({
    schemaVersion: 1,
    evidenceId: randomUUID(),
    kind,
    profileId: profile.profileId,
    profileVersion: profile.version,
    status: "verified",
    capturedAt: probe.observedAt,
    validUntil,
    artifactDigest: canonicalDigest("assurance_evidence", 1, {
      profileId: profile.profileId,
      profileVersion: profile.version,
      runtimeProfile: probe.runtimeProfile,
      kind,
      artifact: artifacts[kind],
    }),
  }));
}
