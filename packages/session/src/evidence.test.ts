import { describe, expect, it } from "vitest";

import { resolveAssuranceLevel } from "./assurance.js";
import { createReferenceAssuranceEvidence } from "./evidence.js";

const profile = {
  schemaVersion: 1,
  profileId: "11111111-1111-4111-8111-111111111111",
  version: 1,
  missionId: "22222222-2222-4222-8222-222222222222",
  missionVersion: 1,
  policyVersion: 1,
  permissions: {
    tools: ["guardian.local_command"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: { mode: "none", destinations: [] },
    sideEffects: ["write_workspace"],
    time: { maxDurationSeconds: 300 },
    volume: {
      maxToolCalls: 5,
      maxResearchRequests: 0,
      maxResearchResults: 0,
      maxLocalCommands: 5,
      maxPrivilegedActions: 0,
    },
  },
  assurance: { level: "unknown", evidence: [] },
} as const;

const probe = {
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
} as const;

describe("reference assurance evidence", () => {
  it("binds all four evidence classes to the exact profile", () => {
    const evidence = createReferenceAssuranceEvidence(profile, probe, "2026-08-30T08:35:00.000Z");
    expect(evidence.map((item) => item.kind).sort()).toEqual([
      "credential",
      "filesystem",
      "network",
      "tool_catalog",
    ]);
    expect(new Set(evidence.map((item) => item.artifactDigest)).size).toBe(4);
    expect(
      resolveAssuranceLevel(
        { ...profile, assurance: { level: "enforced", evidence } },
        "2026-08-30T08:31:00.000Z",
      ),
    ).toBe("enforced");
  });

  it("refuses failed probes and invalid validity windows", () => {
    expect(() =>
      createReferenceAssuranceEvidence(
        profile,
        {
          ...probe,
          checks: { ...probe.checks, directPublicEgressBlocked: false },
        },
        "2026-08-30T08:35:00.000Z",
      ),
    ).toThrow();
    expect(() =>
      createReferenceAssuranceEvidence(profile, probe, "2026-08-30T08:30:00.000Z"),
    ).toThrow();
  });
});
