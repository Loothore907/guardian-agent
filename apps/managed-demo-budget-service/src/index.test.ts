import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
  type ManagedDemoBudgetCallerRole,
  type ManagedDemoBudgetIpcOperation,
} from "@guardian/contracts";
import {
  LocalManagedDemoBudgetIpcClient,
  ManagedDemoJourneyBudgetController,
  createManagedDemoBudgetIpcEndpoint,
} from "@guardian/managed-demo-budget-client";
import type { ManagedDemoBudgetIpcError } from "@guardian/managed-demo-budget-client";
import { afterEach, describe, expect, it } from "vitest";

import { startManagedDemoBudgetService } from "./index.js";

const temporaryDirectories: string[] = [];
const DEPLOYMENT = "11111111-1111-4111-8111-111111111111";
const JOURNEY = "22222222-2222-4222-8222-222222222222";
const RESERVATION = "33333333-3333-4333-8333-333333333333";
const SNAPSHOT = "44444444-4444-4444-8444-444444444444";
const START = "2026-10-30T17:00:00.000Z";
const EXPIRY = "2026-12-15T20:00:00.000Z";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function location() {
  const directory = await mkdtemp(join(tmpdir(), "guardian-managed-demo-budget-service-"));
  temporaryDirectories.push(directory);
  if (process.platform !== "win32") await chmod(directory, 0o700);
  return { databasePath: join(directory, "budget.sqlite") };
}

function binding(
  callerRole: ManagedDemoBudgetCallerRole,
  allowedOperations: readonly ManagedDemoBudgetIpcOperation[],
) {
  return {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole,
    callerId: randomUUID(),
    deploymentId: DEPLOYMENT,
    allowedOperations,
    issuedAt: START,
    expiresAt: EXPIRY,
  } as const;
}

function prices() {
  return {
    schemaVersion: 1,
    snapshotId: SNAPSHOT,
    version: 1,
    modelPolicyId: "competition-2026-09-01",
    modelPolicyVersion: 2,
    models: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.models.map((model) => ({
      role: model.role,
      modelId: model.modelId,
      inputMicroUsdPerMillionTokens: 1,
      outputMicroUsdPerMillionTokens: 1,
    })),
    tavilyMicroUsdPerCredit: 8_000,
    evidence: { capturedAt: START, expiresAt: EXPIRY },
  } as const;
}

describe("managed-demo budget service", () => {
  it.skipIf(process.platform === "win32")(
    "creates current-user-only Unix socket and SQLite boundaries",
    async () => {
      const { databasePath } = await location();
      const endpoint = createManagedDemoBudgetIpcEndpoint();
      const controllerBinding = binding("journey_controller", ["admission.request"]);
      const service = await startManagedDemoBudgetService(
        {
          schemaVersion: 1,
          serviceInstanceId: randomUUID(),
          endpoint,
          ledgerPath: databasePath,
          deployment: {
            schemaVersion: 1,
            deploymentId: DEPLOYMENT,
            pool: "public",
            policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
            policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
          },
          policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
          prices: prices(),
          capabilities: [controllerBinding],
        },
        { peerVerifier: { verify: () => Promise.resolve(undefined) } },
      );
      try {
        const endpointStat = await stat(endpoint);
        expect(endpointStat.isSocket()).toBe(true);
        expect(endpointStat.uid).toBe(process.getuid?.());
        expect(endpointStat.mode & 0o777).toBe(0o600);
        const databaseStat = await stat(databasePath);
        expect(databaseStat.isFile()).toBe(true);
        expect(databaseStat.uid).toBe(process.getuid?.());
        expect(databaseStat.mode & 0o777).toBe(0o600);
      } finally {
        await service.close();
      }
    },
  );

  it("binds admission, role-scoped usage, settlement, and snapshots to one deployment", async () => {
    const { databasePath } = await location();
    const endpoint = createManagedDemoBudgetIpcEndpoint();
    const controllerBinding = binding("journey_controller", [
      "admission.request",
      "journey.settle",
    ]);
    const interactionBinding = binding("interaction_service", ["usage.record"]);
    const guardianBinding = binding("guardian_service", ["usage.record"]);
    const workerBinding = binding("worker_service", ["usage.record"]);
    const researchBinding = binding("research_service", ["usage.record"]);
    const operatorBinding = binding("operator", ["budget.snapshot"]);
    let now = "2026-11-01T12:00:00.000Z";
    const service = await startManagedDemoBudgetService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        ledgerPath: databasePath,
        deployment: {
          schemaVersion: 1,
          deploymentId: DEPLOYMENT,
          pool: "public",
          policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
          policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
        },
        policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
        prices: prices(),
        capabilities: [
          controllerBinding,
          interactionBinding,
          guardianBinding,
          workerBinding,
          researchBinding,
          operatorBinding,
        ],
      },
      {
        now: () => now,
        randomId: () => RESERVATION,
        peerVerifier: { verify: () => Promise.resolve(undefined) },
      },
    );
    try {
      const controller = new ManagedDemoJourneyBudgetController(
        {
          schemaVersion: 1,
          controller: { schemaVersion: 1, endpoint, binding: controllerBinding },
          usage: {
            interaction: { schemaVersion: 1, endpoint, binding: interactionBinding },
            guardian: { schemaVersion: 1, endpoint, binding: guardianBinding },
            worker: { schemaVersion: 1, endpoint, binding: workerBinding },
            research: { schemaVersion: 1, endpoint, binding: researchBinding },
          },
        },
        { now: () => now },
      );
      const begun = await controller.begin(JOURNEY, "a".repeat(64));
      expect(begun).toMatchObject({
        state: "admitted",
        journey: { reservationId: RESERVATION, journeyId: JOURNEY },
      });
      if (begun.state !== "admitted") throw new TypeError("test journey was not admitted");

      now = "2026-11-01T12:00:30.000Z";
      const workerUsage = {
        schemaVersion: 1,
        provider: "nebius_token_factory",
        providerRequestId: "worker_request_1",
        role: "native_worker",
        modelId: "moonshotai/Kimi-K2.7-Code",
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        observedAt: now,
      } as const;
      const interaction = new LocalManagedDemoBudgetIpcClient({
        endpoint: begun.journey.reporters.interaction.budget.endpoint,
        binding: begun.journey.reporters.interaction.budget.binding,
      });
      await expect(
        interaction.recordUsage(RESERVATION, JOURNEY, workerUsage),
      ).rejects.toMatchObject({ reason: "operation_not_allowed" });
      const worker = new LocalManagedDemoBudgetIpcClient({
        endpoint: begun.journey.reporters.worker.budget.endpoint,
        binding: begun.journey.reporters.worker.budget.binding,
      });
      await expect(
        worker.recordUsage(RESERVATION, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", workerUsage),
      ).rejects.toMatchObject({ reason: "binding_mismatch" });
      await expect(worker.recordUsage(RESERVATION, JOURNEY, workerUsage)).resolves.toBeUndefined();

      now = "2026-11-01T12:01:00.000Z";
      await expect(begun.journey.settle("completed", now)).resolves.toMatchObject({
        status: "settled",
        chargedMicroUsd: 2,
        budget: { pool: "public", totalCompletedJourneys: 1 },
      });
      await expect(begun.journey.settle("completed", now)).rejects.toThrow(/already started/u);
      const operator = new LocalManagedDemoBudgetIpcClient({ endpoint, binding: operatorBinding });
      await expect(operator.snapshot()).resolves.toMatchObject({
        pool: "public",
        totalSettledMicroUsd: 2,
        totalReservedMicroUsd: 0,
      });
    } finally {
      await service.close();
    }
  });

  it("executes delayed operator proposals at one trusted IPC time without restamping evidence", async () => {
    const { databasePath } = await location();
    const endpoint = createManagedDemoBudgetIpcEndpoint();
    const operatorBinding = binding("operator", [
      "budget.snapshot",
      "policy.update",
      "prices.update",
    ]);
    const snapshotOnlyBinding = binding("operator", ["budget.snapshot"]);
    let tick = Date.parse("2026-11-01T12:00:00.000Z");
    const now = () => new Date(tick++).toISOString();
    const service = await startManagedDemoBudgetService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        ledgerPath: databasePath,
        deployment: {
          schemaVersion: 1,
          deploymentId: DEPLOYMENT,
          pool: "public",
          policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
          policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
        },
        policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
        prices: prices(),
        capabilities: [operatorBinding, snapshotOnlyBinding],
      },
      {
        now,
        peerVerifier: { verify: () => Promise.resolve(undefined) },
      },
    );
    try {
      const client = new LocalManagedDemoBudgetIpcClient({ endpoint, binding: operatorBinding });
      const replacementPolicy = { ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY, version: 2 } as const;
      const policyUpdate = {
        schemaVersion: 1,
        deploymentId: DEPLOYMENT,
        expectedPolicyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
        expectedPolicyVersion: 1,
        replacement: replacementPolicy,
        reason: "Renew the bounded campaign without changing its limits.",
        updatedAt: "2026-11-01T11:59:59.000Z",
      } as const;
      await expect(client.updatePolicy(policyUpdate)).resolves.toMatchObject({
        policyVersion: 2,
        totalJourneyAdmissions: 0,
        totalReservedMicroUsd: 0,
        totalSettledMicroUsd: 0,
      });
      await expect(client.updatePolicy(policyUpdate)).rejects.toMatchObject({
        reason: "budget_unavailable",
      });
      for (const updatedAt of ["2026-10-30T16:59:59.999Z", "2026-11-01T12:01:00.000Z"]) {
        await expect(
          client.updatePolicy({
            ...policyUpdate,
            expectedPolicyVersion: 2,
            replacement: { ...replacementPolicy, version: 3 },
            reason: "Attempt a proposal outside its capability-bound time.",
            updatedAt,
          }),
        ).rejects.toMatchObject({ reason: "invalid_request" });
      }

      const replacementPrices = {
        ...prices(),
        version: 2,
        evidence: {
          capturedAt: "2026-11-01T11:59:58.000Z",
          expiresAt: "2026-11-01T12:05:00.000Z",
        },
      } as const;
      await expect(
        client.updatePrices({
          schemaVersion: 1,
          deploymentId: DEPLOYMENT,
          expectedSnapshotId: SNAPSHOT,
          expectedSnapshotVersion: 1,
          replacement: replacementPrices,
          reason: "Apply provider evidence captured immediately before submission.",
          updatedAt: "2026-11-01T11:59:59.500Z",
        }),
      ).resolves.toMatchObject({ policyVersion: 2 });

      await expect(
        client.updatePrices({
          schemaVersion: 1,
          deploymentId: DEPLOYMENT,
          expectedSnapshotId: SNAPSHOT,
          expectedSnapshotVersion: 2,
          replacement: {
            ...replacementPrices,
            version: 3,
            evidence: {
              capturedAt: "2026-11-01T12:01:00.000Z",
              expiresAt: "2026-11-01T12:05:00.000Z",
            },
          },
          reason: "Attempt to attach future provider evidence.",
          updatedAt: "2026-11-01T12:00:00.000Z",
        }),
      ).rejects.toMatchObject({ reason: "budget_unavailable" });

      const forgedExpansion = new LocalManagedDemoBudgetIpcClient({
        endpoint,
        binding: {
          ...snapshotOnlyBinding,
          allowedOperations: ["budget.snapshot", "policy.update"],
        },
      });
      await expect(
        forgedExpansion.updatePolicy({
          ...policyUpdate,
          expectedPolicyVersion: 2,
          replacement: {
            ...replacementPolicy,
            version: 3,
            limits: {
              ...replacementPolicy.limits,
              totalMicroUsd: replacementPolicy.limits.totalMicroUsd + 1,
            },
          },
          reason: "Attempt to expand limits without update authority.",
        }),
      ).rejects.toMatchObject({ reason: "operation_not_allowed" });
      await expect(client.snapshot()).resolves.toMatchObject({
        policyVersion: 2,
        totalJourneyAdmissions: 0,
        totalReservedMicroUsd: 0,
        totalSettledMicroUsd: 0,
      });
    } finally {
      await service.close();
    }
  });

  it("rejects cross-deployment client bindings even when a capability value is copied", async () => {
    const { databasePath } = await location();
    const endpoint = createManagedDemoBudgetIpcEndpoint();
    const controllerBinding = binding("journey_controller", ["admission.request"]);
    const service = await startManagedDemoBudgetService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        ledgerPath: databasePath,
        deployment: {
          schemaVersion: 1,
          deploymentId: DEPLOYMENT,
          pool: "public",
          policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
          policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
        },
        policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
        prices: prices(),
        capabilities: [controllerBinding],
      },
      {
        now: () => "2026-11-01T12:00:00.000Z",
        peerVerifier: { verify: () => Promise.resolve(undefined) },
      },
    );
    try {
      const copied = new LocalManagedDemoBudgetIpcClient({
        endpoint,
        binding: {
          ...controllerBinding,
          deploymentId: "99999999-9999-4999-8999-999999999999",
        },
      });
      await expect(
        copied.admit({
          schemaVersion: 1,
          journeyId: JOURNEY,
          sourceFingerprint: "a".repeat(64),
          requestedAt: "2026-11-01T12:00:00.000Z",
        }),
      ).rejects.toEqual(
        expect.objectContaining<Partial<ManagedDemoBudgetIpcError>>({
          reason: "binding_mismatch",
        }),
      );
    } finally {
      await service.close();
    }
  });

  it("rejects role configurations that widen a provider capability", async () => {
    const { databasePath } = await location();
    const endpoint = createManagedDemoBudgetIpcEndpoint();
    const widened = binding("interaction_service", ["usage.record", "admission.request"]);
    await expect(
      startManagedDemoBudgetService(
        {
          schemaVersion: 1,
          serviceInstanceId: randomUUID(),
          endpoint,
          ledgerPath: databasePath,
          deployment: {
            schemaVersion: 1,
            deploymentId: DEPLOYMENT,
            pool: "public",
            policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
            policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
          },
          policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
          prices: prices(),
          capabilities: [widened],
        },
        { peerVerifier: { verify: () => Promise.resolve(undefined) } },
      ),
    ).rejects.toThrow(/outside its caller role/u);
  });

  it("rejects an expired exact capability before admission", async () => {
    const { databasePath } = await location();
    const endpoint = createManagedDemoBudgetIpcEndpoint();
    const expiredBinding = {
      ...binding("journey_controller", ["admission.request"]),
      expiresAt: "2026-10-31T00:00:00.000Z",
    } as const;
    const service = await startManagedDemoBudgetService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        ledgerPath: databasePath,
        deployment: {
          schemaVersion: 1,
          deploymentId: DEPLOYMENT,
          pool: "public",
          policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
          policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
        },
        policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
        prices: prices(),
        capabilities: [expiredBinding],
      },
      {
        now: () => "2026-11-01T12:00:00.000Z",
        peerVerifier: { verify: () => Promise.resolve(undefined) },
      },
    );
    try {
      const client = new LocalManagedDemoBudgetIpcClient({
        endpoint,
        binding: expiredBinding,
      });
      await expect(
        client.admit({
          schemaVersion: 1,
          journeyId: JOURNEY,
          sourceFingerprint: "a".repeat(64),
          requestedAt: "2026-11-01T12:00:00.000Z",
        }),
      ).rejects.toMatchObject({ reason: "stale_capability" });
    } finally {
      await service.close();
    }
  });
});
