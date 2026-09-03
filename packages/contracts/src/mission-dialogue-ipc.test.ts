import { describe, expect, it } from "vitest";

import {
  MissionDraftReviewIpcResponseSchema,
  MissionDraftReviewServiceProcessConfigSchema,
} from "./mission-dialogue-ipc.js";

const envelope = {
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
  mechanicallyMissingFields: [],
} as const;

describe("mission draft review IPC contracts", () => {
  it("binds the service to one exact review envelope", () => {
    expect(
      MissionDraftReviewServiceProcessConfigSchema.parse({
        schemaVersion: 1,
        serviceKind: "mission_draft_review",
        endpoint: "guardian-test-endpoint",
        capability: "22222222-2222-4222-8222-222222222222",
        startsAt: "2026-09-01T00:00:00.000Z",
        expiresAt: "2026-09-01T00:01:00.000Z",
        envelope,
      }).envelope,
    ).toEqual(envelope);
  });

  it("rejects provider output outside ready or bounded clarification", () => {
    expect(() =>
      MissionDraftReviewIpcResponseSchema.parse({
        schemaVersion: 1,
        ok: true,
        providerRequestId: "review_1",
        outcome: { status: "approved", permissions: {} },
      }),
    ).toThrow();
  });
});
