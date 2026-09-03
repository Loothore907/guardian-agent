import { describe, expect, it } from "vitest";

import { createWorkerTurnEnvelope } from "@guardian/worker";

import { createFakeWorkerProvider } from "./index.js";

describe("deterministic worker provider", () => {
  it("exercises one local-command round-trip and then finishes", async () => {
    const provider = createFakeWorkerProvider();
    const firstTurn = createWorkerTurnEnvelope({
      schemaVersion: 1,
      turnId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      callerId: "33333333-3333-4333-8333-333333333333",
      missionId: "44444444-4444-4444-8444-444444444444",
      missionVersion: 1,
      profileId: "55555555-5555-4555-8555-555555555555",
      profileVersion: 1,
      policyVersion: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: 1,
      worker: { schemaVersion: 1, kind: "deterministic_reference" },
      turnNumber: 1,
      startsAt: "2026-09-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:01:00.000Z",
      objective: "Read the prepared workspace.",
      constraints: ["Use one tool result."],
      allowedTools: ["guardian.local_command"],
      remainingBudget: {
        remainingDurationSeconds: 60,
        remainingToolCalls: 2,
        remainingResearchRequests: 0,
        remainingResearchResults: 0,
        remainingLocalCommands: 1,
        remainingPrivilegedActions: 0,
      },
    });
    await expect(provider.runTurn(firstTurn)).resolves.toMatchObject({
      requestId: "fake_worker_1",
      outcome: { kind: "tool_request", request: { name: "guardian.local_command" } },
    });
  });

  it("implements the same narrow turn interface without a credential", async () => {
    const provider = createFakeWorkerProvider({
      outcome: { kind: "final_response", response: "Deterministic completion." },
    });
    const turn = createWorkerTurnEnvelope({
      schemaVersion: 1,
      turnId: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      callerId: "33333333-3333-4333-8333-333333333333",
      missionId: "44444444-4444-4444-8444-444444444444",
      missionVersion: 1,
      profileId: "55555555-5555-4555-8555-555555555555",
      profileVersion: 1,
      policyVersion: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: 1,
      worker: { schemaVersion: 1, kind: "deterministic_reference" },
      turnNumber: 1,
      startsAt: "2026-09-01T00:00:00.000Z",
      expiresAt: "2026-09-01T00:01:00.000Z",
      objective: "Complete a deterministic boundary check.",
      constraints: ["Do not execute tools."],
      allowedTools: [],
      remainingBudget: {
        remainingDurationSeconds: 60,
        remainingToolCalls: 0,
        remainingResearchRequests: 0,
        remainingResearchResults: 0,
        remainingLocalCommands: 0,
        remainingPrivilegedActions: 0,
      },
    });
    await expect(provider.runTurn(turn)).resolves.toEqual({
      requestId: "fake_worker_1",
      outcome: { kind: "final_response", response: "Deterministic completion." },
    });
  });
});
