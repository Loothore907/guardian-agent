import { describe, expect, it } from "vitest";

import type { MissionDraftReviewEnvelope } from "@guardian/contracts";

import { createFakeInteractionProvider } from "./index.js";

function envelope(missing: readonly ("network" | "volume")[] = []): MissionDraftReviewEnvelope {
  return {
    schemaVersion: 1,
    draftId: "11111111-1111-4111-8111-111111111111",
    revision: 1,
    reviewTurn: 1,
    modelPolicyId: "competition-2026-09-01",
    modelPolicyVersion: 1,
    expiresAt: "2026-09-01T00:05:00.000Z",
    objective: "Research public law.",
    constraints: [],
    requestedPermissions: {
      tools: [],
      filesystem: { mode: "none", roots: [] },
      network: missing.includes("network") ? null : { mode: "none", destinations: [] },
      sideEffects: [],
      time: { maxDurationSeconds: 60 },
      volume: missing.includes("volume")
        ? null
        : {
            maxToolCalls: 1,
            maxResearchRequests: 0,
            maxResearchResults: 0,
            maxLocalCommands: 0,
            maxPrivilegedActions: 0,
          },
    },
    mechanicallyMissingFields: missing,
  } as const;
}

describe("fake mission draft reviewer", () => {
  it("returns ready without manufacturing authority fields", async () => {
    await expect(createFakeInteractionProvider().reviewDraft(envelope())).resolves.toEqual({
      requestId: "fake_review_1",
      outcome: { schemaVersion: 1, status: "ready", reasonCodes: ["no_issue"] },
    });
  });

  it("returns one bounded question per mechanically missing field", async () => {
    await expect(
      createFakeInteractionProvider().reviewDraft(envelope(["network", "volume"])),
    ).resolves.toMatchObject({
      outcome: {
        status: "needs_clarification",
        missingFields: ["network", "volume"],
        questions: [{ field: "network" }, { field: "volume" }],
      },
    });
  });
});
