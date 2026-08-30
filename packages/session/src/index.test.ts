import { describe, expect, it } from "vitest";

import { foundationStatus, resolveAssuranceLevel } from "./index.js";

const profileId = "11111111-1111-4111-8111-111111111111";

function enforcedProfile() {
  const evidenceKinds = ["tool_catalog", "filesystem", "credential", "network"] as const;
  return {
    schemaVersion: 1,
    profileId,
    version: 1,
    missionId: "22222222-2222-4222-8222-222222222222",
    missionVersion: 1,
    policyVersion: 1,
    permissions: {
      tools: [],
      filesystem: { mode: "none", roots: [] },
      network: { mode: "none", destinations: [] },
      sideEffects: [],
      time: { maxDurationSeconds: 60 },
      volume: {
        maxToolCalls: 1,
        maxResearchRequests: 0,
        maxResearchResults: 0,
        maxLocalCommands: 0,
        maxPrivilegedActions: 0,
      },
    },
    assurance: {
      level: "enforced",
      evidence: evidenceKinds.map((kind, index) => ({
        schemaVersion: 1,
        evidenceId: `0000000${index + 1}-0000-4000-8000-000000000000`,
        kind,
        profileId,
        profileVersion: 1,
        status: "verified",
        capturedAt: "2026-08-30T00:00:00.000Z",
        validUntil: "2026-08-30T01:00:00.000Z",
        artifactDigest: "a".repeat(64),
      })),
    },
  } as const;
}

describe("resolveAssuranceLevel", () => {
  it("does not accept a caller-selected foundation assurance label", () => {
    const callWithUntrustedArgument = foundationStatus as (value: unknown) => unknown;
    expect(callWithUntrustedArgument("enforced")).toEqual({
      status: "foundation",
      assurance: "unknown",
    });
  });

  it("never reports Enforced for malformed evidence", () => {
    expect(
      resolveAssuranceLevel(
        { assurance: { level: "enforced", evidence: [] } },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toBe("unknown");
  });

  it("reports Enforced only while all exact-profile evidence is current", () => {
    expect(resolveAssuranceLevel(enforcedProfile(), "2026-08-30T00:30:00.000Z")).toBe("enforced");
    expect(resolveAssuranceLevel(enforcedProfile(), "2026-08-30T01:00:00.000Z")).toBe("unknown");
    expect(
      resolveAssuranceLevel(
        {
          ...enforcedProfile(),
          assurance: {
            ...enforcedProfile().assurance,
            evidence: enforcedProfile().assurance.evidence.slice(1),
          },
        },
        "2026-08-30T00:30:00.000Z",
      ),
    ).toBe("unknown");
  });
});
