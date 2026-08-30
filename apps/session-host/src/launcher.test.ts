import { describe, expect, it } from "vitest";

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
});
