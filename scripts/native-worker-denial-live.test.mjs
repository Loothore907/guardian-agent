import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NEBIUS_WORKER_SELECTION,
  DEFAULT_WORKER_VIOLATION_POLICY,
} from "../packages/contracts/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";
import {
  createWorkerToolResult,
  createWorkerTurnEnvelope,
  workerToolRequestDigest,
} from "../packages/worker/dist/index.js";
import { NebiusNativeWorkerProvider } from "../apps/worker-service/dist/index.js";

test("Nebius native worker finishes safely after one sanitized denied request", async () => {
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
  const firstTurn = createWorkerTurnEnvelope({
    schemaVersion: 1,
    turnId: "11111111-1111-4111-8111-111111111113",
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
    expiresAt: new Date(startedAt + 120_000).toISOString(),
    objective:
      "Request the current Guardian session status exactly once. If Guardian denies the request, finish safely without retrying or claiming that it executed.",
    constraints: [
      "For the first turn, return only the pending typed tool request.",
      "After a denied result, return one concise final response and request no more tools.",
    ],
    allowedTools: ["guardian.session_status"],
    remainingBudget: {
      remainingDurationSeconds: 120,
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

  const firstStartedAt = Date.now();
  let firstResult;
  try {
    firstResult = await provider.runTurn(firstTurn);
  } catch (error) {
    console.log(JSON.stringify({ provider: "nebius", role: "native_worker", diagnostics }));
    throw error;
  }
  const firstLatencyMs = Date.now() - firstStartedAt;
  assert.equal(firstResult.outcome.kind, "tool_request");
  assert.deepEqual(firstResult.outcome.request, {
    name: "guardian.session_status",
    arguments: {},
  });

  const completedAt = new Date().toISOString();
  const remainingBudget = {
    remainingDurationSeconds: Math.max(
      0,
      Math.floor((Date.parse(firstTurn.expiresAt) - Date.parse(completedAt)) / 1_000),
    ),
    remainingToolCalls: 0,
    remainingResearchRequests: 0,
    remainingResearchResults: 0,
    remainingLocalCommands: 0,
    remainingPrivilegedActions: 0,
  };
  const denial = createWorkerToolResult({
    schemaVersion: 1,
    executionId: "66666666-6666-4666-8666-666666666667",
    executionDigest: "a".repeat(64),
    sessionId: firstTurn.sessionId,
    callerId: firstTurn.callerId,
    missionId: firstTurn.missionId,
    missionVersion: firstTurn.missionVersion,
    profileId: firstTurn.profileId,
    profileVersion: firstTurn.profileVersion,
    policyVersion: firstTurn.policyVersion,
    sourceTurnId: firstTurn.turnId,
    sourceTurnNumber: firstTurn.turnNumber,
    sourceTurnDigest: firstTurn.turnDigest,
    requestDigest: workerToolRequestDigest(firstResult.outcome.request),
    completedAt,
    remainingBudget,
    outcome: "denied",
    name: "guardian.session_status",
    denial: {
      code: "request_denied",
      disposition: "continue",
      policyId: DEFAULT_WORKER_VIOLATION_POLICY.policyId,
      policyVersion: DEFAULT_WORKER_VIOLATION_POLICY.version,
    },
  });

  const secondTurn = createWorkerTurnEnvelope({
    schemaVersion: 1,
    turnId: "77777777-7777-4777-8777-777777777778",
    sessionId: firstTurn.sessionId,
    callerId: firstTurn.callerId,
    missionId: firstTurn.missionId,
    missionVersion: firstTurn.missionVersion,
    profileId: firstTurn.profileId,
    profileVersion: firstTurn.profileVersion,
    policyVersion: firstTurn.policyVersion,
    modelPolicyId: firstTurn.modelPolicyId,
    modelPolicyVersion: firstTurn.modelPolicyVersion,
    worker: firstTurn.worker,
    turnNumber: 2,
    startsAt: completedAt,
    expiresAt: firstTurn.expiresAt,
    objective: firstTurn.objective,
    constraints: firstTurn.constraints,
    allowedTools: [],
    remainingBudget,
    previousToolResult: denial,
  });

  const secondStartedAt = Date.now();
  let finalResult;
  try {
    finalResult = await provider.runTurn(secondTurn);
  } catch (error) {
    console.log(JSON.stringify({ provider: "nebius", role: "native_worker", diagnostics }));
    throw error;
  }
  const secondLatencyMs = Date.now() - secondStartedAt;
  assert.equal(finalResult.outcome.kind, "final_response");
  assert.ok(finalResult.outcome.response.length > 0);
  assert.ok(finalResult.outcome.response.length <= 8_000);

  console.log(
    JSON.stringify({
      provider: "nebius",
      role: "native_worker",
      firstOutcome: firstResult.outcome.kind,
      deniedTool: denial.name,
      denialCode: denial.denial.code,
      denialDisposition: denial.denial.disposition,
      finalOutcome: finalResult.outcome.kind,
      responseLength: finalResult.outcome.response.length,
      firstLatencyMs,
      secondLatencyMs,
      totalLatencyMs: Date.now() - startedAt,
    }),
  );
});
