import { describe, expect, it } from "vitest";

import {
  INITIAL_JUDGE_DEMO_BUDGET_POLICY,
  INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
  ManagedDemoAdmissionRequestSchema,
  ManagedDemoBudgetPolicySchema,
  ManagedDemoPriceSnapshotSchema,
  ManagedDemoSettlementRequestSchema,
} from "./managed-demo-budget.js";

const IDS = {
  snapshot: "36f42f35-2583-4cf4-b867-ccce58270258",
  reservation: "99a25452-12db-4e37-98c1-723adfacb2ba",
  journey: "4cae9150-8eba-47eb-96f7-66527a34c430",
} as const;

const prices = [
  {
    role: "mission_dialogue",
    modelId: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    inputMicroUsdPerMillionTokens: 200_000,
    outputMicroUsdPerMillionTokens: 600_000,
  },
  {
    role: "native_worker",
    modelId: "moonshotai/Kimi-K2.7-Code",
    inputMicroUsdPerMillionTokens: 950_000,
    outputMicroUsdPerMillionTokens: 4_000_000,
  },
  {
    role: "contextual_risk_primary",
    modelId: "nvidia/nemotron-3-super-120b-a12b",
    inputMicroUsdPerMillionTokens: 1,
    outputMicroUsdPerMillionTokens: 1,
  },
  {
    role: "contextual_risk_escalation",
    modelId: "nvidia/Nemotron-3-Ultra-550b-a55b",
    inputMicroUsdPerMillionTokens: 1,
    outputMicroUsdPerMillionTokens: 1,
  },
] as const;

describe("managed-demo budget contracts", () => {
  it("publishes separate bounded initial judge and public policies", () => {
    expect(INITIAL_JUDGE_DEMO_BUDGET_POLICY).toMatchObject({
      pool: "judge",
      limits: {
        totalMicroUsd: 25_000_000,
        totalCompletedJourneys: 250,
        perJourneyPreauthorizationMicroUsd: 100_000,
      },
    });
    expect(INITIAL_PUBLIC_DEMO_BUDGET_POLICY).toMatchObject({
      pool: "public",
      limits: {
        totalMicroUsd: 25_000_000,
        totalCompletedJourneys: 250,
        perSourceDailyCompletedJourneys: 2,
      },
    });
    expect(INITIAL_PUBLIC_DEMO_BUDGET_POLICY).not.toBe(INITIAL_JUDGE_DEMO_BUDGET_POLICY);
  });

  it("binds every price to the exact built-in model policy", () => {
    expect(
      ManagedDemoPriceSnapshotSchema.parse({
        schemaVersion: 1,
        snapshotId: IDS.snapshot,
        version: 1,
        modelPolicyId: "competition-2026-09-01",
        modelPolicyVersion: 2,
        models: prices,
        tavilyMicroUsdPerCredit: 8_000,
        evidence: {
          capturedAt: "2026-09-04T12:00:00.000Z",
          expiresAt: "2026-09-11T12:00:00.000Z",
        },
      }),
    ).toMatchObject({ tavilyMicroUsdPerCredit: 8_000 });
  });

  it.each([
    { models: prices.slice(0, 3) },
    { models: [prices[0], prices[0], prices[2], prices[3]] },
    {
      models: prices.map((price, index) =>
        index === 1 ? { ...price, modelId: "caller/selected-model" } : price,
      ),
    },
    { modelPolicyVersion: 999 },
    {
      evidence: {
        capturedAt: "2026-09-04T12:00:00.000Z",
        expiresAt: "2026-09-04T12:00:00.000Z",
      },
    },
  ])("rejects incomplete, substituted, unknown, or expired price evidence", (change) => {
    expect(() =>
      ManagedDemoPriceSnapshotSchema.parse({
        schemaVersion: 1,
        snapshotId: IDS.snapshot,
        version: 1,
        modelPolicyId: "competition-2026-09-01",
        modelPolicyVersion: 2,
        models: prices,
        tavilyMicroUsdPerCredit: 8_000,
        evidence: {
          capturedAt: "2026-09-04T12:00:00.000Z",
          expiresAt: "2026-09-11T12:00:00.000Z",
        },
        ...change,
      }),
    ).toThrow();
  });

  it.each([
    {
      limits: {
        ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY.limits,
        dailyMicroUsd: 25_000_001,
      },
    },
    {
      limits: {
        ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY.limits,
        perJourneyPreauthorizationMicroUsd: 5_000_001,
      },
    },
    {
      models: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.models.map((model, index) =>
        index === 0 ? { ...model, modelId: "substituted/model" } : model,
      ),
    },
    { pool: "personal" },
    { anonymousCredentialedMutations: 1 },
  ])("rejects widened, inconsistent, or cross-pool policies", (change) => {
    expect(() =>
      ManagedDemoBudgetPolicySchema.parse({
        ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
        ...change,
      }),
    ).toThrow();
  });

  it("keeps pool, model, price, and money out of the inbound admission request", () => {
    const request = {
      schemaVersion: 1,
      journeyId: IDS.journey,
      sourceFingerprint: "a".repeat(64),
      requestedAt: "2026-11-01T12:00:00.000Z",
    };
    expect(ManagedDemoAdmissionRequestSchema.parse(request)).toEqual(request);
    expect(() => ManagedDemoAdmissionRequestSchema.parse({ ...request, pool: "judge" })).toThrow();
    expect(() =>
      ManagedDemoAdmissionRequestSchema.parse({ ...request, requestedMicroUsd: 1 }),
    ).toThrow();
  });

  it("accepts only bounded provider usage bound to one reservation and journey", () => {
    const request = {
      schemaVersion: 1,
      reservationId: IDS.reservation,
      journeyId: IDS.journey,
      settledAt: "2026-11-01T12:01:00.000Z",
      outcome: "completed",
      usage: [
        {
          schemaVersion: 1,
          reservationId: IDS.reservation,
          journeyId: IDS.journey,
          recordedAt: "2026-11-01T12:00:30.000Z",
          provider: "nebius_token_factory",
          role: "native_worker",
          modelId: "moonshotai/Kimi-K2.7-Code",
          promptTokens: 8_000,
          completionTokens: 2_048,
        },
        {
          schemaVersion: 1,
          reservationId: IDS.reservation,
          journeyId: IDS.journey,
          recordedAt: "2026-11-01T12:00:40.000Z",
          provider: "tavily",
          operation: "basic_search",
          credits: 1,
        },
      ],
    } as const;
    expect(ManagedDemoSettlementRequestSchema.parse(request)).toEqual(request);
    expect(() =>
      ManagedDemoSettlementRequestSchema.parse({
        ...request,
        usage: [{ ...request.usage[0], completionTokens: 10_000_001 }],
      }),
    ).toThrow();
    expect(() =>
      ManagedDemoSettlementRequestSchema.parse({
        ...request,
        usage: [{ ...request.usage[0], journeyId: "917ca670-03cb-4e17-915d-bce69335cdbb" }],
      }),
    ).toThrow();
    expect(() =>
      ManagedDemoSettlementRequestSchema.parse({
        ...request,
        usage: [{ ...request.usage[0], recordedAt: "2026-11-01T12:02:00.000Z" }],
      }),
    ).toThrow();
    expect(() => ManagedDemoSettlementRequestSchema.parse({ ...request, usage: [] })).toThrow();
  });
});
