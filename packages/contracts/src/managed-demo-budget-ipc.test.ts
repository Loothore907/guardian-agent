import { describe, expect, it } from "vitest";

import {
  INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
  ManagedDemoBudgetIpcRequestSchema,
  ManagedDemoBudgetServiceProcessConfigSchema,
  ManagedDemoWorkerUsageReporterConfigSchema,
} from "./index.js";

const IDS = {
  request: "11111111-1111-4111-8111-111111111111",
  capability: "22222222-2222-4222-8222-222222222222",
  caller: "33333333-3333-4333-8333-333333333333",
  deployment: "44444444-4444-4444-8444-444444444444",
  journey: "55555555-5555-4555-8555-555555555555",
  service: "66666666-6666-4666-8666-666666666666",
  snapshot: "77777777-7777-4777-8777-777777777777",
} as const;

const capability = {
  schemaVersion: 1,
  capability: IDS.capability,
  callerRole: "journey_controller",
  callerId: IDS.caller,
  deploymentId: IDS.deployment,
  allowedOperations: ["admission.request", "journey.settle"],
  issuedAt: "2026-10-30T17:00:00.000Z",
  expiresAt: "2026-12-15T20:00:00.000Z",
} as const;

const prices = {
  schemaVersion: 1,
  snapshotId: IDS.snapshot,
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
  evidence: {
    capturedAt: "2026-10-30T17:00:00.000Z",
    expiresAt: "2026-12-15T20:00:00.000Z",
  },
} as const;

describe("managed-demo budget IPC contracts", () => {
  it("keeps deployment authority out of admission operation fields", () => {
    const request = {
      schemaVersion: 1,
      requestId: IDS.request,
      capability: IDS.capability,
      callerRole: "journey_controller",
      callerId: IDS.caller,
      deploymentId: IDS.deployment,
      operation: "admission.request",
      admission: {
        schemaVersion: 1,
        journeyId: IDS.journey,
        sourceFingerprint: "a".repeat(64),
        requestedAt: "2026-11-01T12:00:00.000Z",
      },
    } as const;
    expect(ManagedDemoBudgetIpcRequestSchema.parse(request)).toEqual(request);
    expect(() => ManagedDemoBudgetIpcRequestSchema.parse({ ...request, pool: "judge" })).toThrow();
    expect(() =>
      ManagedDemoBudgetIpcRequestSchema.parse({
        ...request,
        admission: { ...request.admission, requestedMicroUsd: 1 },
      }),
    ).toThrow();
  });

  it("rejects cross-deployment capabilities and inconsistent service policy", () => {
    const config = {
      schemaVersion: 1,
      serviceInstanceId: IDS.service,
      endpoint: "managed-demo-endpoint",
      ledgerPath: "managed-demo.sqlite",
      deployment: {
        schemaVersion: 1,
        deploymentId: IDS.deployment,
        pool: "public",
        policyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
        policyVersion: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.version,
      },
      policy: INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
      prices,
      capabilities: [capability],
    } as const;
    expect(ManagedDemoBudgetServiceProcessConfigSchema.parse(config)).toEqual(config);
    expect(() =>
      ManagedDemoBudgetServiceProcessConfigSchema.parse({
        ...config,
        capabilities: [{ ...capability, deploymentId: "88888888-8888-4888-8888-888888888888" }],
      }),
    ).toThrow();
    expect(() =>
      ManagedDemoBudgetServiceProcessConfigSchema.parse({
        ...config,
        deployment: { ...config.deployment, pool: "judge" },
      }),
    ).toThrow();
  });

  it("binds provider usage reporters to one role, operation, reservation, and journey", () => {
    const reporter = {
      schemaVersion: 1,
      budget: {
        schemaVersion: 1,
        endpoint: "managed-demo-endpoint",
        binding: {
          ...capability,
          callerRole: "worker_service",
          allowedOperations: ["usage.record"],
        },
      },
      reservationId: "88888888-8888-4888-8888-888888888888",
      journeyId: IDS.journey,
    } as const;
    expect(ManagedDemoWorkerUsageReporterConfigSchema.parse(reporter)).toEqual(reporter);
    expect(() =>
      ManagedDemoWorkerUsageReporterConfigSchema.parse({
        ...reporter,
        budget: {
          ...reporter.budget,
          binding: { ...reporter.budget.binding, callerRole: "interaction_service" },
        },
      }),
    ).toThrow();
    expect(() =>
      ManagedDemoWorkerUsageReporterConfigSchema.parse({
        ...reporter,
        budget: {
          ...reporter.budget,
          binding: {
            ...reporter.budget.binding,
            allowedOperations: ["usage.record", "admission.request"],
          },
        },
      }),
    ).toThrow();
  });
});
