import {
  AuthorityCapabilityBindingSchema,
  MissionSchema,
  OpaqueIdSchema,
  ResearchScopeSchema,
  ResearchServiceProcessConfigSchema,
  SessionProfileSchema,
  VersionNumberSchema,
  type SessionProfile,
  type ResearchScope,
  type ResearchServiceProcessConfig,
} from "@guardian/contracts";
import { LocalAuthorityIpcClient } from "@guardian/authority-client";
import { runReferenceIsolationProbe, runReferenceLocalCommand } from "@guardian/executor";
import {
  BoundSessionRuntime,
  createReferenceAssuranceEvidence,
  type BoundSessionInput,
} from "@guardian/session";
import { LocalResearchIpcClient, type ResearchServiceClient } from "@guardian/research";
import { assertPreparedSessionWorkspace, type PreparedSessionWorkspace } from "@guardian/workspace";

export interface ReferenceResearchConnectionInput {
  readonly endpoint: unknown;
  readonly capability: unknown;
  readonly requiredTerms: unknown;
}

export interface ReferenceSessionLaunchInput {
  readonly sessionId: unknown;
  readonly callerId: unknown;
  readonly revocationHandle: unknown;
  readonly policyVersion: unknown;
  readonly durationSeconds: unknown;
  readonly mission: unknown;
  readonly profile: unknown;
  readonly workspace: PreparedSessionWorkspace;
  readonly research?: ReferenceResearchConnectionInput;
  readonly authority?: {
    readonly endpoint: unknown;
    readonly binding: unknown;
    readonly connectionIds?: readonly unknown[];
  };
}

export interface LaunchedResearchBinding {
  readonly client: ResearchServiceClient;
  readonly scope: ResearchScope;
  readonly serviceConfig: ResearchServiceProcessConfig;
}

export interface LaunchedReferenceSession {
  readonly runtime: BoundSessionRuntime;
  readonly profile: SessionProfile;
  readonly research?: LaunchedResearchBinding;
  readonly durableAuthority: boolean;
  readonly workspace: PreparedSessionWorkspace["result"];
  readonly localCommand: (request: unknown) => ReturnType<typeof runReferenceLocalCommand>;
  readonly revoke: () => void;
  readonly interrupt: () => void;
}

export async function launchReferenceSession(
  input: ReferenceSessionLaunchInput,
): Promise<LaunchedReferenceSession> {
  const mission = MissionSchema.parse(input.mission);
  const sessionId = OpaqueIdSchema.parse(input.sessionId);
  const callerId = OpaqueIdSchema.parse(input.callerId);
  const revocationHandle = OpaqueIdSchema.parse(input.revocationHandle);
  const requestedProfile = SessionProfileSchema.parse(input.profile);
  const policyVersion = VersionNumberSchema.parse(input.policyVersion);
  const durationSeconds = VersionNumberSchema.max(604_800).parse(input.durationSeconds);
  const workspace = assertPreparedSessionWorkspace(input.workspace);
  if (workspace.sessionId !== sessionId) {
    throw new TypeError("prepared workspace is bound to a different session");
  }

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
  const expectedTools = ["guardian.session_status", "guardian.local_command"];
  if (input.research !== undefined) expectedTools.push("guardian.research");
  const supportedTools = new Set(expectedTools);
  const publicDestinations = requestedProfile.permissions.network.destinations.filter(
    (destination) => destination.kind === "public_domain",
  );
  const researchNetworkIsEnforceable =
    input.research === undefined
      ? requestedProfile.permissions.network.mode === "none" &&
        requestedProfile.permissions.network.destinations.length === 0 &&
        requestedProfile.permissions.volume.maxResearchRequests === 0 &&
        requestedProfile.permissions.volume.maxResearchResults === 0
      : requestedProfile.permissions.network.mode === "guardian_only" &&
        publicDestinations.length === requestedProfile.permissions.network.destinations.length &&
        publicDestinations.length > 0 &&
        requestedProfile.permissions.volume.maxResearchRequests > 0 &&
        requestedProfile.permissions.volume.maxResearchResults > 0;
  if (
    requestedProfile.permissions.tools.length !== supportedTools.size ||
    !requestedProfile.permissions.tools.every((tool) => supportedTools.has(tool)) ||
    requestedProfile.permissions.filesystem.mode !== "workspace_write" ||
    requestedProfile.permissions.filesystem.roots.length !== 1 ||
    requestedProfile.permissions.filesystem.roots[0] !== "/workspace" ||
    !researchNetworkIsEnforceable ||
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
    sessionId,
    callerId,
    revocationHandle,
    policyVersion,
    startsAt,
    expiresAt,
    mission,
    profile,
  };

  const runtime = BoundSessionRuntime.create(runtimeInput);
  const revoke = () => {
    if (!runtime.revoke(revocationHandle)) throw new TypeError("trusted runtime revocation failed");
  };
  const interrupt = () => {
    if (!runtime.interrupt(revocationHandle)) {
      throw new TypeError("trusted runtime interruption failed");
    }
  };
  if (input.authority !== undefined) {
    const binding = AuthorityCapabilityBindingSchema.parse(input.authority.binding);
    if (
      binding.callerRole !== "launcher" ||
      binding.sessionId !== sessionId ||
      binding.callerId !== callerId
    ) {
      throw new TypeError("launcher authority capability binding is invalid");
    }
    const authority = new LocalAuthorityIpcClient({
      endpoint: input.authority.endpoint,
      binding,
    });
    await authority.createSession(
      {
        schemaVersion: 1,
        sessionId,
        callerId,
        missionId: mission.missionId,
        missionVersion: mission.version,
        profileId: profile.profileId,
        profileVersion: profile.version,
        policyVersion,
        startsAt,
        expiresAt,
        status: "active",
        createdAt: startsAt,
        updatedAt: startsAt,
      },
      {
        sessionId,
        remainingToolCalls: profile.permissions.volume.maxToolCalls,
        remainingLocalCommands: profile.permissions.volume.maxLocalCommands,
        remainingResearchRequests: profile.permissions.volume.maxResearchRequests,
        remainingResearchResults: profile.permissions.volume.maxResearchResults,
      },
      input.authority.connectionIds ?? [],
    );
  }
  if (input.research === undefined) {
    return {
      profile,
      runtime,
      durableAuthority: input.authority !== undefined,
      workspace: workspace.result,
      localCommand: (request) =>
        runReferenceLocalCommand(request, { workspaceHostPath: workspace.hostPath }),
      revoke,
      interrupt,
    };
  }

  const scope = ResearchScopeSchema.parse({
    allowedDomains: publicDestinations.map((destination) => destination.hostname),
    maxResultsPerRequest: Math.min(3, requestedProfile.permissions.volume.maxResearchResults),
    remainingRequests: requestedProfile.permissions.volume.maxResearchRequests,
    remainingResults: requestedProfile.permissions.volume.maxResearchResults,
    requiredTerms: input.research.requiredTerms,
  });
  const serviceConfig: ResearchServiceProcessConfig = ResearchServiceProcessConfigSchema.parse({
    schemaVersion: 1,
    sessionId,
    callerId,
    missionId: mission.missionId,
    missionVersion: mission.version,
    profileId: profile.profileId,
    profileVersion: profile.version,
    policyVersion,
    capability: input.research.capability,
    endpoint: input.research.endpoint,
    startsAt,
    expiresAt,
    scope,
  });
  const client = new LocalResearchIpcClient({
    endpoint: serviceConfig.endpoint,
    capability: serviceConfig.capability,
    sessionId: serviceConfig.sessionId,
    callerId: serviceConfig.callerId,
    missionId: mission.missionId,
    missionVersion: mission.version,
    profileId: profile.profileId,
    profileVersion: profile.version,
    policyVersion,
  });

  return {
    profile,
    runtime,
    research: { client, scope, serviceConfig },
    durableAuthority: input.authority !== undefined,
    workspace: workspace.result,
    localCommand: (request) =>
      runReferenceLocalCommand(request, { workspaceHostPath: workspace.hostPath }),
    revoke,
    interrupt,
  };
}
