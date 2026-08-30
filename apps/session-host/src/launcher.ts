import {
  MissionSchema,
  SessionProfileSchema,
  VersionNumberSchema,
  type SessionProfile,
} from "@guardian/contracts";
import { runReferenceIsolationProbe } from "@guardian/executor";
import {
  BoundSessionRuntime,
  createReferenceAssuranceEvidence,
  type BoundSessionInput,
} from "@guardian/session";

export interface ReferenceSessionLaunchInput {
  readonly sessionId: unknown;
  readonly callerId: unknown;
  readonly revocationHandle: unknown;
  readonly policyVersion: unknown;
  readonly durationSeconds: unknown;
  readonly mission: unknown;
  readonly profile: unknown;
}

export interface LaunchedReferenceSession {
  readonly runtime: BoundSessionRuntime;
  readonly profile: SessionProfile;
}

export async function launchReferenceSession(
  input: ReferenceSessionLaunchInput,
): Promise<LaunchedReferenceSession> {
  const mission = MissionSchema.parse(input.mission);
  const requestedProfile = SessionProfileSchema.parse(input.profile);
  const policyVersion = VersionNumberSchema.parse(input.policyVersion);
  const durationSeconds = VersionNumberSchema.max(604_800).parse(input.durationSeconds);

  if (
    requestedProfile.assurance.level !== "unknown" ||
    requestedProfile.assurance.evidence.length !== 0
  ) {
    throw new TypeError("the trusted launcher requires an unverified input profile");
  }
  if (policyVersion !== requestedProfile.policyVersion) {
    throw new TypeError("policy version does not match the requested profile");
  }
  if (durationSeconds > requestedProfile.permissions.time.maxDurationSeconds) {
    throw new TypeError("requested duration exceeds the profile time budget");
  }
  const supportedTools = new Set(["guardian.session_status", "guardian.local_command"]);
  if (
    requestedProfile.permissions.tools.length !== supportedTools.size ||
    !requestedProfile.permissions.tools.every((tool) => supportedTools.has(tool)) ||
    requestedProfile.permissions.filesystem.mode !== "workspace_write" ||
    requestedProfile.permissions.filesystem.roots.length !== 1 ||
    requestedProfile.permissions.filesystem.roots[0] !== "/workspace" ||
    requestedProfile.permissions.network.mode !== "none" ||
    requestedProfile.permissions.network.destinations.length !== 0 ||
    !requestedProfile.permissions.sideEffects.includes("write_workspace")
  ) {
    throw new TypeError("profile is not enforceable by the C4 reference runtime");
  }

  const probe = await runReferenceIsolationProbe(new Date().toISOString());
  const startsAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(startsAt) + durationSeconds * 1_000).toISOString();
  const evidence = createReferenceAssuranceEvidence(requestedProfile, probe, expiresAt);
  const profile = SessionProfileSchema.parse({
    ...requestedProfile,
    assurance: { level: "enforced", evidence },
  });
  const runtimeInput: BoundSessionInput = {
    sessionId: input.sessionId,
    callerId: input.callerId,
    revocationHandle: input.revocationHandle,
    policyVersion,
    startsAt,
    expiresAt,
    mission,
    profile,
  };

  return { profile, runtime: BoundSessionRuntime.create(runtimeInput) };
}
