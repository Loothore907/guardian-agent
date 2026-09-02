import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LocalMissionDraftReviewIpcClient,
  LocalMissionDraftReviewIpcServer,
  createMissionDraftReviewIpcCredentials,
} from "./mission-review-ipc.js";

const NOW = "2026-09-01T00:00:00.000Z";
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
const servers: LocalMissionDraftReviewIpcServer[] = [];

function config() {
  return {
    schemaVersion: 1,
    serviceKind: "mission_draft_review",
    ...createMissionDraftReviewIpcCredentials(),
    startsAt: NOW,
    expiresAt: "2026-09-01T00:01:00.000Z",
    envelope,
  } as const;
}

afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

describe("local mission draft review IPC", () => {
  it("delivers one fixed envelope and rejects replay", async () => {
    const value = config();
    const handler = vi.fn(() =>
      Promise.resolve({
        providerRequestId: "review_1",
        outcome: {
          schemaVersion: 1 as const,
          status: "ready" as const,
          reasonCodes: ["no_issue"] as const,
        },
      }),
    );
    const server = new LocalMissionDraftReviewIpcServer(value, handler, { now: () => NOW });
    servers.push(server);
    await server.listen();
    const client = new LocalMissionDraftReviewIpcClient({
      endpoint: value.endpoint,
      capability: value.capability,
      draftId: envelope.draftId,
      revision: 1,
      reviewTurn: 1,
    });

    await expect(client.review(NOW)).resolves.toMatchObject({
      providerRequestId: "review_1",
      outcome: { status: "ready" },
    });
    expect(handler).toHaveBeenCalledWith(envelope, NOW);
    await expect(client.review(NOW)).rejects.toMatchObject({ reason: "turn_consumed" });
  });

  it("rejects wrong revision before provider use", async () => {
    const value = config();
    const handler = vi.fn();
    const server = new LocalMissionDraftReviewIpcServer(value, handler, { now: () => NOW });
    servers.push(server);
    await server.listen();

    await expect(
      new LocalMissionDraftReviewIpcClient({
        endpoint: value.endpoint,
        capability: value.capability,
        draftId: envelope.draftId,
        revision: 2,
        reviewTurn: 1,
      }).review(NOW),
    ).rejects.toMatchObject({ reason: "unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });
});
