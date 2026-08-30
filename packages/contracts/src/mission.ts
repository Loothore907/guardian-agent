import { z } from "zod";

import { AssuranceStateSchema } from "./assurance.js";
import {
  addDuplicateIssue,
  boundedVisibleText,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";

export const ToolCapabilitySchema = z.enum([
  "guardian.research",
  "guardian.local_command",
  "github.pull_request.read",
  "github.pull_request.merge",
]);
export type ToolCapability = z.infer<typeof ToolCapabilitySchema>;

export const SideEffectPermissionSchema = z.enum(["write_workspace", "merge_pull_request"]);
export type SideEffectPermission = z.infer<typeof SideEffectPermissionSchema>;

export const WorkspacePathSchema = z
  .string()
  .min(1)
  .max(260)
  .regex(/^\/(?:[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)?$/u)
  .refine(
    (value) => !value.split("/").some((segment) => segment === "." || segment === ".."),
    "dot path segments are not allowed",
  );

export const FilesystemScopeSchema = z
  .strictObject({
    mode: z.enum(["none", "read_only", "workspace_write"]),
    roots: z.array(WorkspacePathSchema).max(16),
  })
  .superRefine((scope, context) => {
    addDuplicateIssue(scope.roots, context, ["roots"]);
    if (scope.mode === "none" && scope.roots.length !== 0) {
      context.addIssue({
        code: "custom",
        message: "filesystem mode none cannot include roots",
        path: ["roots"],
      });
    }
    if (scope.mode !== "none" && scope.roots.length === 0) {
      context.addIssue({
        code: "custom",
        message: "an enabled filesystem mode requires at least one root",
        path: ["roots"],
      });
    }
  });
export type FilesystemScope = DeepReadonly<z.infer<typeof FilesystemScopeSchema>>;

const GitHubNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/u);

export const PublicDomainDestinationSchema = z.strictObject({
  kind: z.literal("public_domain"),
  hostname: z.hostname(),
});
export const GitHubRepositoryDestinationSchema = z.strictObject({
  kind: z.literal("github_repository"),
  owner: GitHubNameSchema,
  repository: GitHubNameSchema,
});
export const DestinationSchema = z.discriminatedUnion("kind", [
  PublicDomainDestinationSchema,
  GitHubRepositoryDestinationSchema,
]);
export type Destination = DeepReadonly<z.infer<typeof DestinationSchema>>;

function destinationKey(destination: z.infer<typeof DestinationSchema>): string {
  return destination.kind === "public_domain"
    ? `public_domain:${destination.hostname.toLowerCase()}`
    : `github_repository:${destination.owner.toLowerCase()}/${destination.repository.toLowerCase()}`;
}

export const NetworkScopeSchema = z
  .strictObject({
    mode: z.enum(["none", "guardian_only"]),
    destinations: z.array(DestinationSchema).max(32),
  })
  .superRefine((scope, context) => {
    addDuplicateIssue(scope.destinations.map(destinationKey), context, ["destinations"]);
    if (scope.mode === "none" && scope.destinations.length !== 0) {
      context.addIssue({
        code: "custom",
        message: "network mode none cannot include destinations",
        path: ["destinations"],
      });
    }
  });
export type NetworkScope = DeepReadonly<z.infer<typeof NetworkScopeSchema>>;

export const VolumeBudgetSchema = z.strictObject({
  maxToolCalls: z.number().int().min(1).max(10_000),
  maxResearchRequests: z.number().int().min(0).max(1_000),
  maxResearchResults: z.number().int().min(0).max(10_000),
  maxLocalCommands: z.number().int().min(0).max(1_000),
  maxPrivilegedActions: z.number().int().min(0).max(100),
});
export type VolumeBudget = DeepReadonly<z.infer<typeof VolumeBudgetSchema>>;

export const TimeBudgetSchema = z.strictObject({
  maxDurationSeconds: z.number().int().min(1).max(604_800),
});
export type TimeBudget = DeepReadonly<z.infer<typeof TimeBudgetSchema>>;

export const PermissionEnvelopeSchema = z
  .strictObject({
    tools: z.array(ToolCapabilitySchema).max(16),
    filesystem: FilesystemScopeSchema,
    network: NetworkScopeSchema,
    sideEffects: z.array(SideEffectPermissionSchema).max(8),
    time: TimeBudgetSchema,
    volume: VolumeBudgetSchema,
  })
  .superRefine((permissions, context) => {
    addDuplicateIssue(permissions.tools, context, ["tools"]);
    addDuplicateIssue(permissions.sideEffects, context, ["sideEffects"]);

    if (
      permissions.sideEffects.includes("write_workspace") &&
      permissions.filesystem.mode !== "workspace_write"
    ) {
      context.addIssue({
        code: "custom",
        message: "write_workspace requires workspace_write filesystem scope",
        path: ["sideEffects"],
      });
    }
    if (
      permissions.sideEffects.includes("merge_pull_request") &&
      !permissions.tools.includes("github.pull_request.merge")
    ) {
      context.addIssue({
        code: "custom",
        message: "merge_pull_request requires the typed merge capability",
        path: ["sideEffects"],
      });
    }
  });
export type PermissionEnvelope = DeepReadonly<z.infer<typeof PermissionEnvelopeSchema>>;

export const MissionSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    missionId: OpaqueIdSchema,
    version: VersionNumberSchema,
    authoredBy: z.strictObject({ kind: z.literal("human"), principalId: OpaqueIdSchema }),
    authoredAt: TimestampSchema,
    objective: boundedVisibleText(1_000),
    constraints: z.array(boundedVisibleText(500)).max(32),
    authority: PermissionEnvelopeSchema,
  })
  .superRefine((mission, context) => {
    addDuplicateIssue(mission.constraints, context, ["constraints"]);
  });
export type Mission = DeepReadonly<z.infer<typeof MissionSchema>>;

export const SessionProfileSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    profileId: OpaqueIdSchema,
    version: VersionNumberSchema,
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    permissions: PermissionEnvelopeSchema,
    assurance: AssuranceStateSchema,
  })
  .superRefine((profile, context) => {
    for (const [index, evidence] of profile.assurance.evidence.entries()) {
      if (evidence.profileId !== profile.profileId || evidence.profileVersion !== profile.version) {
        context.addIssue({
          code: "custom",
          message: "assurance evidence must bind to the exact profile version",
          path: ["assurance", "evidence", index],
        });
      }
      if (Date.parse(evidence.validUntil) <= Date.parse(evidence.capturedAt)) {
        context.addIssue({
          code: "custom",
          message: "assurance evidence validity must end after capture",
          path: ["assurance", "evidence", index, "validUntil"],
        });
      }
    }
  });
export type SessionProfile = DeepReadonly<z.infer<typeof SessionProfileSchema>>;

export const MissionExpansionRequestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  requestId: OpaqueIdSchema,
  missionId: OpaqueIdSchema,
  currentMissionVersion: VersionNumberSchema,
  requestedBy: z.literal("interaction_agent"),
  state: z.literal("requested"),
  reason: boundedVisibleText(500),
  requestedAuthority: PermissionEnvelopeSchema,
});
export type MissionExpansionRequest = DeepReadonly<z.infer<typeof MissionExpansionRequestSchema>>;

const FILESYSTEM_RANK = { none: 0, read_only: 1, workspace_write: 2 } as const;
const NETWORK_RANK = { none: 0, guardian_only: 1 } as const;

function isPathWithin(candidate: string, allowedRoot: string): boolean {
  return (
    candidate === allowedRoot || allowedRoot === "/" || candidate.startsWith(`${allowedRoot}/`)
  );
}

function isSubset<T>(candidate: readonly T[], allowed: readonly T[]): boolean {
  const allowedValues = new Set(allowed);
  return candidate.every((value) => allowedValues.has(value));
}

export function isPermissionSubset(
  candidate: PermissionEnvelope,
  allowed: PermissionEnvelope,
): boolean {
  const candidateDestinations = candidate.network.destinations.map(destinationKey);
  const allowedDestinations = allowed.network.destinations.map(destinationKey);

  return (
    isSubset(candidate.tools, allowed.tools) &&
    FILESYSTEM_RANK[candidate.filesystem.mode] <= FILESYSTEM_RANK[allowed.filesystem.mode] &&
    candidate.filesystem.roots.every((root) =>
      allowed.filesystem.roots.some((allowedRoot) => isPathWithin(root, allowedRoot)),
    ) &&
    NETWORK_RANK[candidate.network.mode] <= NETWORK_RANK[allowed.network.mode] &&
    isSubset(candidateDestinations, allowedDestinations) &&
    isSubset(candidate.sideEffects, allowed.sideEffects) &&
    candidate.time.maxDurationSeconds <= allowed.time.maxDurationSeconds &&
    candidate.volume.maxToolCalls <= allowed.volume.maxToolCalls &&
    candidate.volume.maxResearchRequests <= allowed.volume.maxResearchRequests &&
    candidate.volume.maxResearchResults <= allowed.volume.maxResearchResults &&
    candidate.volume.maxLocalCommands <= allowed.volume.maxLocalCommands &&
    candidate.volume.maxPrivilegedActions <= allowed.volume.maxPrivilegedActions
  );
}

export function isSessionProfileWithinMission(profile: SessionProfile, mission: Mission): boolean {
  return (
    profile.missionId === mission.missionId &&
    profile.missionVersion === mission.version &&
    isPermissionSubset(profile.permissions, mission.authority)
  );
}
