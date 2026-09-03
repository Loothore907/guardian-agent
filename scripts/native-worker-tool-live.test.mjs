import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_NEBIUS_WORKER_SELECTION } from "../packages/contracts/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";
import { createWorkerTurnEnvelope } from "../packages/worker/dist/index.js";
import { NebiusNativeWorkerProvider } from "../apps/worker-service/dist/index.js";

test("Nebius native worker returns the one exact permitted tool request", async () => {
  assert.equal(
    process.platform,
    "win32",
    "protected native-worker test requires Windows Credential Manager",
  );
  const credentialStore = new WindowsCredentialStore();
  const credentialStatus = await credentialStore.status({
    schemaVersion: 1,
    provider: "nebius",
    slot: "default",
  });
  assert.equal(credentialStatus.state, "available", "nebius/default must be enrolled");

  const startedAt = Date.now();
  const turn = createWorkerTurnEnvelope({
    schemaVersion: 1,
    turnId: "11111111-1111-4111-8111-111111111112",
    sessionId: "22222222-2222-4222-8222-222222222222",
    callerId: "33333333-3333-4333-8333-333333333333",
    missionId: "44444444-4444-4444-8444-444444444444",
    missionVersion: 1,
    profileId: "55555555-5555-4555-8555-555555555555",
    profileVersion: 1,
    policyVersion: 1,
    modelPolicyId: DEFAULT_NEBIUS_WORKER_SELECTION.modelPolicyId,
    modelPolicyVersion: DEFAULT_NEBIUS_WORKER_SELECTION.modelPolicyVersion,
    worker: DEFAULT_NEBIUS_WORKER_SELECTION,
    turnNumber: 1,
    startsAt: new Date(startedAt - 1_000).toISOString(),
    expiresAt: new Date(startedAt + 60_000).toISOString(),
    objective:
      "Before giving any final response, request the current Guardian session status exactly once.",
    constraints: [
      "Return only the pending typed tool request for this turn.",
      "Do not claim that the tool ran or that the session is active.",
    ],
    allowedTools: ["guardian.session_status"],
    remainingBudget: {
      remainingDurationSeconds: 60,
      remainingToolCalls: 1,
      remainingResearchRequests: 0,
      remainingResearchResults: 0,
      remainingLocalCommands: 0,
      remainingPrivilegedActions: 0,
    },
  });

  const diagnostics = [];
  const provider = new NebiusNativeWorkerProvider({
    credentialStore,
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  });
  let result;
  try {
    result = await provider.runTurn(turn);
  } catch (error) {
    console.log(JSON.stringify({ provider: "nebius", role: "native_worker", diagnostics }));
    throw error;
  }
  assert.equal(result.outcome.kind, "tool_request");
  assert.deepEqual(result.outcome.request, {
    name: "guardian.session_status",
    arguments: {},
  });
  console.log(
    JSON.stringify({
      provider: "nebius",
      role: "native_worker",
      outcome: result.outcome.kind,
      tool: result.outcome.request.name,
      latencyMs: Date.now() - startedAt,
    }),
  );
});
