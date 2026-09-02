import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  LocalWorkerIpcClient,
  createWorkerIpcCredentials,
  createWorkerTurnEnvelope,
} from "@guardian/worker";

import { startSupervisedServiceProcess } from "./supervised-process.js";

describe("supervised worker service child", () => {
  it("runs the deterministic worker through bounded bootstrap and one-use IPC", async () => {
    const credentials = createWorkerIpcCredentials();
    const now = new Date();
    const startsAt = new Date(now.getTime() - 1_000).toISOString();
    const expiresAt = new Date(now.getTime() + 60_000).toISOString();
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
      startsAt,
      expiresAt,
      objective: "Verify the deterministic worker child boundary.",
      constraints: ["Treat the request as pending until Guardian executes it."],
      allowedTools: ["guardian.local_command"],
      remainingBudget: {
        remainingDurationSeconds: 60,
        remainingToolCalls: 1,
        remainingResearchRequests: 0,
        remainingResearchResults: 0,
        remainingLocalCommands: 1,
        remainingPrivilegedActions: 0,
      },
    });
    const child = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../worker-service/dist/main.js", import.meta.url)),
      bootstrap: {
        schemaVersion: 1,
        serviceKind: "worker_turn",
        ...credentials,
        turn,
      },
      readyLine: "guardian worker service ready",
      environment: { GUARDIAN_WORKER_PROVIDER: "fake" },
    });
    try {
      const result = await new LocalWorkerIpcClient({
        ...credentials,
        sessionId: turn.sessionId,
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
      }).run(now.toISOString());
      expect(result).toMatchObject({
        turnId: turn.turnId,
        turnDigest: turn.turnDigest,
        outcome: { kind: "tool_request", request: { name: "guardian.local_command" } },
      });
    } finally {
      await child.close();
    }
  });
});
