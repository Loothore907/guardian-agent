import {
  MissionSchema,
  LocalCommandRequestSchema,
  OpaqueIdSchema,
  BoundSessionStatusSchema,
  SessionProfileSchema,
  TimestampSchema,
  VersionNumberSchema,
  isSessionProfileWithinMission,
  type BoundSessionStatus,
  type Mission,
  type SessionProfile,
  type ToolCapability,
} from "@guardian/contracts";

import { resolveAssuranceLevel } from "./assurance.js";

export type SessionLifecycleState = "pending" | "active" | "expired" | "revoked";
export type ToolDenialReason =
  | "not_active"
  | "expired"
  | "revoked"
  | "tool_not_allowed"
  | "filesystem_not_allowed"
  | "timeout_exceeds_session"
  | "volume_exhausted";

export interface BoundSessionInput {
  readonly sessionId: unknown;
  readonly callerId: unknown;
  readonly revocationHandle: unknown;
  readonly policyVersion: unknown;
  readonly startsAt: unknown;
  readonly expiresAt: unknown;
  readonly mission: unknown;
  readonly profile: unknown;
}

export type ToolAuthorization =
  { readonly allowed: true } | { readonly allowed: false; readonly reason: ToolDenialReason };

export class BoundSessionRuntime {
  readonly #sessionId: string;
  readonly #callerId: string;
  readonly #revocationHandle: string;
  readonly #policyVersion: number;
  readonly #startsAt: string;
  readonly #expiresAt: string;
  readonly #mission: Mission;
  readonly #profile: SessionProfile;
  readonly #tools: ReadonlySet<ToolCapability>;
  #toolCalls = 0;
  #localCommands = 0;
  #revoked = false;

  private constructor(input: {
    sessionId: string;
    callerId: string;
    revocationHandle: string;
    policyVersion: number;
    startsAt: string;
    expiresAt: string;
    mission: Mission;
    profile: SessionProfile;
  }) {
    this.#sessionId = input.sessionId;
    this.#callerId = input.callerId;
    this.#revocationHandle = input.revocationHandle;
    this.#policyVersion = input.policyVersion;
    this.#startsAt = input.startsAt;
    this.#expiresAt = input.expiresAt;
    this.#mission = input.mission;
    this.#profile = input.profile;
    this.#tools = new Set(input.profile.permissions.tools);
  }

  static create(input: BoundSessionInput): BoundSessionRuntime {
    const sessionId = OpaqueIdSchema.parse(input.sessionId);
    const callerId = OpaqueIdSchema.parse(input.callerId);
    const revocationHandle = OpaqueIdSchema.parse(input.revocationHandle);
    const policyVersion = VersionNumberSchema.parse(input.policyVersion);
    const startsAt = TimestampSchema.parse(input.startsAt);
    const expiresAt = TimestampSchema.parse(input.expiresAt);
    const mission = MissionSchema.parse(input.mission);
    const profile = SessionProfileSchema.parse(input.profile);

    if (!isSessionProfileWithinMission(profile, mission)) {
      throw new TypeError("session profile exceeds or does not match the mission");
    }
    if (policyVersion !== profile.policyVersion) {
      throw new TypeError("policy version does not match the profile");
    }
    const durationSeconds = (Date.parse(expiresAt) - Date.parse(startsAt)) / 1_000;
    if (durationSeconds <= 0 || durationSeconds > profile.permissions.time.maxDurationSeconds) {
      throw new TypeError("session lifetime exceeds the bound profile");
    }

    return new BoundSessionRuntime({
      sessionId,
      callerId,
      revocationHandle,
      policyVersion,
      startsAt,
      expiresAt,
      mission,
      profile,
    });
  }

  toolCatalog(): readonly ToolCapability[] {
    return [...this.#tools].sort();
  }

  authorizeToolCall(tool: unknown, evaluatedAt: unknown): ToolAuthorization {
    const timestamp = TimestampSchema.safeParse(evaluatedAt);
    if (!timestamp.success || Date.parse(timestamp.data) < Date.parse(this.#startsAt)) {
      return { allowed: false, reason: "not_active" };
    }
    if (this.#revoked) {
      return { allowed: false, reason: "revoked" };
    }
    if (Date.parse(timestamp.data) >= Date.parse(this.#expiresAt)) {
      return { allowed: false, reason: "expired" };
    }
    if (typeof tool !== "string" || !this.#tools.has(tool as ToolCapability)) {
      return { allowed: false, reason: "tool_not_allowed" };
    }
    return { allowed: true };
  }

  authorizeLocalCommandCall(value: unknown, evaluatedAt: unknown): ToolAuthorization {
    const request = LocalCommandRequestSchema.safeParse(value);
    if (!request.success) {
      return { allowed: false, reason: "filesystem_not_allowed" };
    }
    const base = this.authorizeToolCall("guardian.local_command", evaluatedAt);
    if (!base.allowed) {
      return base;
    }
    const timestamp = TimestampSchema.parse(evaluatedAt);
    const withinRoot = this.#profile.permissions.filesystem.roots.some(
      (root) =>
        request.data.workingDirectory === root ||
        request.data.workingDirectory.startsWith(`${root}/`),
    );
    if (this.#profile.permissions.filesystem.mode !== "workspace_write" || !withinRoot) {
      return { allowed: false, reason: "filesystem_not_allowed" };
    }
    const remainingSeconds = (Date.parse(this.#expiresAt) - Date.parse(timestamp)) / 1_000;
    if (request.data.timeoutSeconds > remainingSeconds) {
      return { allowed: false, reason: "timeout_exceeds_session" };
    }
    if (
      this.#toolCalls >= this.#profile.permissions.volume.maxToolCalls ||
      this.#localCommands >= this.#profile.permissions.volume.maxLocalCommands
    ) {
      return { allowed: false, reason: "volume_exhausted" };
    }
    this.#toolCalls += 1;
    this.#localCommands += 1;
    return { allowed: true };
  }

  revoke(handle: unknown): boolean {
    if (typeof handle !== "string" || handle !== this.#revocationHandle) {
      return false;
    }
    this.#revoked = true;
    return true;
  }

  status(evaluatedAt: string): BoundSessionStatus {
    const timestamp = TimestampSchema.parse(evaluatedAt);
    const evaluationTime = Date.parse(timestamp);
    const state: SessionLifecycleState = this.#revoked
      ? "revoked"
      : evaluationTime < Date.parse(this.#startsAt)
        ? "pending"
        : evaluationTime >= Date.parse(this.#expiresAt)
          ? "expired"
          : "active";
    return BoundSessionStatusSchema.parse({
      sessionId: this.#sessionId,
      missionId: this.#mission.missionId,
      missionVersion: this.#mission.version,
      profileId: this.#profile.profileId,
      profileVersion: this.#profile.version,
      policyVersion: this.#policyVersion,
      callerId: this.#callerId,
      state,
      assurance: resolveAssuranceLevel(this.#profile, timestamp),
      expiresAt: this.#expiresAt,
      tools: this.toolCatalog(),
    });
  }
}
