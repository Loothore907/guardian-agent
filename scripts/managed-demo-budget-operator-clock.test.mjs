import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { INITIAL_PUBLIC_DEMO_BUDGET_POLICY } from "../packages/contracts/dist/index.js";
import {
  LocalManagedDemoBudgetIpcClient,
  createManagedDemoBudgetIpcEndpoint,
} from "../packages/managed-demo-budget-client/dist/index.js";
import { startSupervisedServiceProcess } from "../apps/reference-supervisor/dist/supervised-process.js";

const DEPLOYMENT_ID = "11111111-1111-4111-8111-111111111111";
const SNAPSHOT_ID = "22222222-2222-4222-8222-222222222222";

function timestamp(milliseconds) {
  return new Date(milliseconds).toISOString();
}

function operatorBinding(now) {
  return {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole: "operator",
    callerId: randomUUID(),
    deploymentId: DEPLOYMENT_ID,
    allowedOperations: ["budget.snapshot", "policy.update", "prices.update"],
    issuedAt: timestamp(now - 60_000),
    expiresAt: timestamp(now + 60_000),
  };
}

function priceSnapshot(now, version = 1) {
  return {
    schemaVersion: 1,
    snapshotId: SNAPSHOT_ID,
    version,
    modelPolicyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.modelPolicyId,
    modelPolicyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.modelPolicyVersion,
    models: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.models.map((model) => ({
      role: model.role,
      modelId: model.modelId,
      inputMicroUsdPerMillionTokens: 1,
      outputMicroUsdPerMillionTokens: 1,
    })),
    tavilyMicroUsdPerCredit: 8_000,
    evidence: {
      capturedAt: timestamp(now - 2_000),
      expiresAt: timestamp(now + 600_000),
    },
  };
}

async function startBudgetChild({ databasePath, endpoint, binding, policy, prices }) {
  return await startSupervisedServiceProcess({
    entrypoint: fileURLToPath(
      new URL("../apps/managed-demo-budget-service/dist/main.js", import.meta.url),
    ),
    bootstrap: {
      schemaVersion: 1,
      serviceInstanceId: randomUUID(),
      endpoint,
      ledgerPath: databasePath,
      deployment: {
        schemaVersion: 1,
        deploymentId: DEPLOYMENT_ID,
        pool: "public",
        policyId: policy.policyId,
        policyVersion: policy.version,
      },
      policy,
      prices,
      capabilities: [binding],
    },
    readyLine: "guardian managed-demo budget service ready",
  });
}

test("production budget child applies delayed operator updates and preserves durable state", async () => {
  const directory = await mkdtemp(join(tmpdir(), "guardian-budget-operator-clock-"));
  if (process.platform !== "win32") await chmod(directory, 0o700);
  const databasePath = join(directory, "budget.sqlite");
  const initialNow = Date.now();
  const initialPrices = priceSnapshot(initialNow);
  const policy = { ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY, version: 2 };
  const prices = priceSnapshot(initialNow, 2);
  const binding = operatorBinding(initialNow);
  let child;
  try {
    const endpoint = createManagedDemoBudgetIpcEndpoint();
    child = await startBudgetChild({
      databasePath,
      endpoint,
      binding,
      policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
      prices: initialPrices,
    });
    const client = new LocalManagedDemoBudgetIpcClient({ endpoint, binding });
    const policyUpdate = {
      schemaVersion: 1,
      deploymentId: DEPLOYMENT_ID,
      expectedPolicyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
      expectedPolicyVersion: 1,
      replacement: policy,
      reason: "Renew the bounded campaign without changing limits.",
      updatedAt: timestamp(initialNow - 1_000),
    };
    const policyResult = await client.updatePolicy(policyUpdate);
    assert.equal(policyResult.policyVersion, 2);
    assert.equal(policyResult.totalJourneyAdmissions, 0);
    await assert.rejects(
      () => client.updatePolicy(policyUpdate),
      (error) => error?.reason === "budget_unavailable",
    );
    const priceResult = await client.updatePrices({
      schemaVersion: 1,
      deploymentId: DEPLOYMENT_ID,
      expectedSnapshotId: SNAPSHOT_ID,
      expectedSnapshotVersion: 1,
      replacement: prices,
      reason: "Apply current provider evidence captured before submission.",
      updatedAt: timestamp(initialNow - 500),
    });
    assert.equal(priceResult.totalReservedMicroUsd, 0);
    assert.equal(priceResult.totalSettledMicroUsd, 0);
    await child.close();
    child = undefined;

    const restartedAt = Date.now();
    const restartedBinding = operatorBinding(restartedAt);
    const restartedEndpoint = createManagedDemoBudgetIpcEndpoint();
    child = await startBudgetChild({
      databasePath,
      endpoint: restartedEndpoint,
      binding: restartedBinding,
      policy,
      prices,
    });
    const restarted = new LocalManagedDemoBudgetIpcClient({
      endpoint: restartedEndpoint,
      binding: restartedBinding,
    });
    const snapshot = await restarted.snapshot();
    assert.equal(snapshot.policyId, policy.policyId);
    assert.equal(snapshot.policyVersion, 2);
    assert.equal(snapshot.pool, "public");
    assert.equal(snapshot.enabled, policy.enabled);
    assert.equal(snapshot.totalReservedMicroUsd, 0);
    assert.equal(snapshot.totalSettledMicroUsd, 0);
    assert.equal(snapshot.totalJourneyAdmissions, 0);
    assert.equal(snapshot.totalCompletedJourneys, 0);
    assert.equal(snapshot.activeJourneys, 0);
    assert.equal(Number.isFinite(Date.parse(snapshot.capturedAt)), true);
  } finally {
    if (child !== undefined) await child.close();
    await rm(directory, { recursive: true, force: true });
  }
});
