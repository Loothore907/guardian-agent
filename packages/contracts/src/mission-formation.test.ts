import { describe, expect, it } from "vitest";

import {
  mechanicallyMissingMissionFields,
  MissionDraftReviewOutcomeSchema,
  UntrustedMissionDraftInputSchema,
} from "./mission-formation.js";

function completeDraft() {
  return {
    schemaVersion: 1,
    objective: "Research public state cannabis laws and community discussion patterns.",
    constraints: ["Use public sources only."],
    requestedPermissions: {
      tools: ["guardian.research"],
      filesystem: { mode: "none", roots: [] },
      network: {
        mode: "guardian_only",
        destinations: [{ kind: "public_domain", hostname: "example.gov" }],
      },
      sideEffects: [],
      time: { maxDurationSeconds: 3_600 },
      volume: {
        maxToolCalls: 100,
        maxResearchRequests: 60,
        maxResearchResults: 180,
        maxLocalCommands: 0,
        maxPrivilegedActions: 0,
      },
    },
    requestedRoute: "qwen_assisted",
  } as const;
}

describe("mission formation contracts", () => {
  it("identifies missing fields mechanically without granting model authority", () => {
    const draft = UntrustedMissionDraftInputSchema.parse({
      ...completeDraft(),
      constraints: null,
      requestedPermissions: { ...completeDraft().requestedPermissions, network: null },
    });

    expect(mechanicallyMissingMissionFields(draft)).toEqual(["constraints", "network"]);
  });

  it("rejects secret-like material before provider review", () => {
    expect(() =>
      UntrustedMissionDraftInputSchema.parse({
        ...completeDraft(),
        objective: "Research this token=ghp_123456789012345678901234567890",
      }),
    ).toThrow(/secret-like material/u);
  });

  it("limits model review output to ready or bounded clarification", () => {
    expect(
      MissionDraftReviewOutcomeSchema.parse({
        schemaVersion: 1,
        status: "needs_clarification",
        missingFields: ["network"],
        reasonCodes: ["destination_ambiguity"],
        questions: [{ field: "network", question: "Which public domains may be queried?" }],
      }).status,
    ).toBe("needs_clarification");

    expect(() =>
      MissionDraftReviewOutcomeSchema.parse({
        schemaVersion: 1,
        status: "ready",
        reasonCodes: ["no_issue"],
        permissions: completeDraft().requestedPermissions,
      }),
    ).toThrow();
  });
});
