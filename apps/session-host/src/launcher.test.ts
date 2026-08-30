import { describe, expect, it, vi } from "vitest";

import { createResearchIpcCredentials } from "@guardian/research";

vi.mock("@guardian/executor", () => ({
  runReferenceIsolationProbe: vi.fn(() =>
    Promise.resolve({
      runtimeProfile: "windows_wsl2_ubuntu_22_04_namespace_v1",
      observedAt: "2026-08-30T08:30:00.000Z",
      checks: {
        localCommandSucceeded: true,
        directPublicEgressBlocked: true,
        directGitPushBlocked: true,
        hostFilesystemHidden: true,
        providerCredentialsAbsent: true,
        runtimeIdentityReduced: true,
      },
    }),
  ),
}));

import { launchReferenceSession } from "./launcher.js";

const permissions = {
  tools: ["guardian.session_status", "guardian.local_command"],
  filesystem: { mode: "workspace_write", roots: ["/workspace"] },
  network: { mode: "none", destinations: [] },
  sideEffects: ["write_workspace"],
  time: { maxDurationSeconds: 60 },
  volume: {
    maxToolCalls: 5,
    maxResearchRequests: 0,
    maxResearchResults: 0,
    maxLocalCommands: 5,
    maxPrivilegedActions: 0,
  },
} as const;

function launchInput() {
  const missionId = "11111111-1111-4111-8111-111111111111";
  return {
    sessionId: "22222222-2222-4222-8222-222222222222",
    callerId: "33333333-3333-4333-8333-333333333333",
    revocationHandle: "44444444-4444-4444-8444-444444444444",
    policyVersion: 1,
    durationSeconds: 60,
    mission: {
      schemaVersion: 1,
      missionId,
      version: 1,
      authoredBy: {
        kind: "human",
        principalId: "55555555-5555-4555-8555-555555555555",
      },
      authoredAt: "2026-08-30T08:00:00.000Z",
      objective: "Launch the narrow C4 reference runtime.",
      constraints: [],
      authority: permissions,
    },
    profile: {
      schemaVersion: 1,
      profileId: "66666666-6666-4666-8666-666666666666",
      version: 1,
      missionId,
      missionVersion: 1,
      policyVersion: 1,
      permissions,
      assurance: { level: "unknown", evidence: [] },
    },
  } as const;
}

describe("trusted reference session launcher", () => {
  it("rejects caller-supplied assurance evidence before probing", async () => {
    const input = launchInput();
    await expect(
      launchReferenceSession({
        ...input,
        profile: {
          ...input.profile,
          assurance: {
            level: "unknown",
            evidence: [
              {
                schemaVersion: 1,
                evidenceId: "77777777-7777-4777-8777-777777777777",
                kind: "network",
                profileId: input.profile.profileId,
                profileVersion: 1,
                status: "verified",
                capturedAt: "2026-08-30T08:00:00.000Z",
                validUntil: "2026-08-30T08:01:00.000Z",
                artifactDigest: "a".repeat(64),
              },
            ],
          },
        },
      }),
    ).rejects.toThrow("unverified input profile");
  });

  it("rejects a tool catalog the concrete host does not implement", async () => {
    const input = launchInput();
    const widenedPermissions = {
      ...permissions,
      tools: [...permissions.tools, "guardian.research"],
    } as const;
    await expect(
      launchReferenceSession({
        ...input,
        mission: { ...input.mission, authority: widenedPermissions },
        profile: { ...input.profile, permissions: widenedPermissions },
      }),
    ).rejects.toThrow("not enforceable");
  });

  it("binds an exact local research connection and derives its service configuration", async () => {
    const input = launchInput();
    const researchPermissions = {
      ...permissions,
      tools: [...permissions.tools, "guardian.research"],
      network: {
        mode: "guardian_only",
        destinations: [{ kind: "public_domain", hostname: "docs.github.com" }],
      },
      volume: {
        ...permissions.volume,
        maxResearchRequests: 2,
        maxResearchResults: 4,
      },
    } as const;
    const connection = createResearchIpcCredentials();

    const launched = await launchReferenceSession({
      ...input,
      mission: { ...input.mission, authority: researchPermissions },
      profile: { ...input.profile, permissions: researchPermissions },
      research: { ...connection, requiredTerms: ["pull request", "branch protection"] },
    });

    expect(launched.runtime.toolCatalog()).toContain("guardian.research");
    expect(launched.research?.scope).toMatchObject({
      allowedDomains: ["docs.github.com"],
      remainingRequests: 2,
      remainingResults: 4,
    });
    expect(launched.research?.serviceConfig).toMatchObject({
      sessionId: input.sessionId,
      callerId: input.callerId,
      missionId: input.mission.missionId,
      profileId: input.profile.profileId,
      endpoint: connection.endpoint,
      capability: connection.capability,
    });
  });

  it("rejects research authority without a bound local service connection", async () => {
    const input = launchInput();
    const widenedPermissions = {
      ...permissions,
      tools: [...permissions.tools, "guardian.research"],
      network: {
        mode: "guardian_only",
        destinations: [{ kind: "public_domain", hostname: "docs.github.com" }],
      },
      volume: {
        ...permissions.volume,
        maxResearchRequests: 1,
        maxResearchResults: 2,
      },
    } as const;
    await expect(
      launchReferenceSession({
        ...input,
        mission: { ...input.mission, authority: widenedPermissions },
        profile: { ...input.profile, permissions: widenedPermissions },
      }),
    ).rejects.toThrow("not enforceable");
  });
});
