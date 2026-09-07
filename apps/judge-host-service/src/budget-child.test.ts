import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { INITIAL_JUDGE_DEMO_BUDGET_POLICY } from "@guardian/contracts";
import {
  LocalManagedDemoBudgetIpcClient,
  createManagedDemoBudgetIpcEndpoint,
} from "@guardian/managed-demo-budget-client";
import { afterEach, describe, expect, it } from "vitest";

import { startManagedDemoBudgetChild, type ManagedDemoBudgetChild } from "./budget-child.js";

const roots: string[] = [];
const children: ManagedDemoBudgetChild[] = [];

afterEach(async () => {
  await Promise.allSettled(children.splice(0).map(async (child) => await child.close()));
  await Promise.allSettled(
    roots.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })),
  );
});

async function budgetConfig(ledgerParent = true) {
  const root = await mkdtemp(join(tmpdir(), "guardian-judge-budget-child-"));
  roots.push(root);
  const deploymentId = randomUUID();
  const binding = {
    schemaVersion: 1 as const,
    capability: randomUUID(),
    callerRole: "operator" as const,
    callerId: randomUUID(),
    deploymentId,
    allowedOperations: ["budget.snapshot"] as const,
    issuedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-15T20:00:00.000Z",
  };
  return {
    root,
    binding,
    config: {
      schemaVersion: 1 as const,
      serviceInstanceId: randomUUID(),
      endpoint: createManagedDemoBudgetIpcEndpoint(),
      ledgerPath: ledgerParent
        ? join(root, "campaign.sqlite")
        : join(root, "missing", "campaign.sqlite"),
      deployment: {
        schemaVersion: 1 as const,
        deploymentId,
        pool: "judge" as const,
        policyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.policyId,
        policyVersion: INITIAL_JUDGE_DEMO_BUDGET_POLICY.version,
      },
      policy: INITIAL_JUDGE_DEMO_BUDGET_POLICY,
      prices: {
        schemaVersion: 1 as const,
        snapshotId: randomUUID(),
        version: 1,
        modelPolicyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.modelPolicyId,
        modelPolicyVersion: INITIAL_JUDGE_DEMO_BUDGET_POLICY.modelPolicyVersion,
        models: INITIAL_JUDGE_DEMO_BUDGET_POLICY.models.map((model) => ({
          role: model.role,
          modelId: model.modelId,
          inputMicroUsdPerMillionTokens: 1,
          outputMicroUsdPerMillionTokens: 1,
        })),
        tavilyMicroUsdPerCredit: 8_000,
        evidence: {
          capturedAt: "2026-11-01T00:00:00.000Z",
          expiresAt: "2026-12-15T20:00:00.000Z",
        },
      },
      capabilities: [binding],
    },
  };
}

describe("protected judge budget child", () => {
  it("starts the fixed production child, serves one bound snapshot, and closes", async () => {
    const { config, binding } = await budgetConfig();
    const child = await startManagedDemoBudgetChild(config);
    children.push(child);
    const client = new LocalManagedDemoBudgetIpcClient({ endpoint: config.endpoint, binding });

    await expect(client.snapshot()).resolves.toMatchObject({
      pool: "judge",
      totalSettledMicroUsd: 0,
      totalJourneyAdmissions: 0,
    });
    await child.close();
    await expect(child.exited).resolves.toBeUndefined();
  });

  it("sanitizes child startup failure and leaves no running process", async () => {
    const { config } = await budgetConfig(false);
    await expect(startManagedDemoBudgetChild(config)).rejects.toThrow(
      "managed-demo budget child failed to start",
    );
  });
});
