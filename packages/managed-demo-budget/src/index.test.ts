import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  INITIAL_JUDGE_DEMO_BUDGET_POLICY,
  INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
  type ManagedDemoBudgetPolicy,
  type ManagedDemoPriceSnapshot,
} from "@guardian/contracts";
import { afterEach, describe, expect, it } from "vitest";

import { SqliteManagedDemoBudgetLedger } from "./index.js";

const IDS = {
  deploymentPublic: "11111111-1111-4111-8111-111111111111",
  deploymentJudge: "22222222-2222-4222-8222-222222222222",
  snapshot: "33333333-3333-4333-8333-333333333333",
  reservation1: "44444444-4444-4444-8444-444444444444",
  reservation2: "55555555-5555-4555-8555-555555555555",
  reservation3: "66666666-6666-4666-8666-666666666666",
  journey1: "77777777-7777-4777-8777-777777777777",
  journey2: "88888888-8888-4888-8888-888888888888",
  journey3: "99999999-9999-4999-8999-999999999999",
} as const;

const SOURCE_A = "a".repeat(64);
const SOURCE_B = "b".repeat(64);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function databasePath(label = "ledger"): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), `guardian-demo-budget-${label}-`));
  temporaryDirectories.push(directory);
  if (process.platform !== "win32") await chmod(directory, 0o700);
  return join(directory, "budget.sqlite");
}

function prices() {
  return {
    schemaVersion: 1,
    snapshotId: IDS.snapshot,
    version: 1,
    modelPolicyId: "competition-2026-09-01",
    modelPolicyVersion: 2,
    models: [
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
    ],
    tavilyMicroUsdPerCredit: 8_000,
    evidence: {
      capturedAt: "2026-10-30T17:00:00.000Z",
      expiresAt: "2026-12-15T20:00:00.000Z",
    },
  } as const;
}

function deployment(pool: "public" | "judge", policy?: ManagedDemoBudgetPolicy) {
  const selectedPolicy =
    policy ??
    (pool === "public" ? INITIAL_PUBLIC_DEMO_BUDGET_POLICY : INITIAL_JUDGE_DEMO_BUDGET_POLICY);
  return {
    schemaVersion: 1,
    deploymentId: pool === "public" ? IDS.deploymentPublic : IDS.deploymentJudge,
    pool,
    policyId: selectedPolicy.policyId,
    policyVersion: selectedPolicy.version,
  } as const;
}

function admission(journeyId: string, now: string, sourceFingerprint = SOURCE_A) {
  return { schemaVersion: 1, journeyId, sourceFingerprint, requestedAt: now } as const;
}

function settlement(input: {
  reservationId: string;
  journeyId: string;
  now: string;
  outcome?: "completed" | "failed";
  usage?: readonly Record<string, unknown>[];
}) {
  return {
    schemaVersion: 1,
    reservationId: input.reservationId,
    journeyId: input.journeyId,
    settledAt: input.now,
    outcome: input.outcome ?? "completed",
    usage: input.usage ?? [
      {
        schemaVersion: 1,
        reservationId: input.reservationId,
        journeyId: input.journeyId,
        recordedAt: input.now,
        provider: "nebius_token_factory",
        role: "native_worker",
        modelId: "moonshotai/Kimi-K2.7-Code",
        promptTokens: 8_000,
        completionTokens: 2_048,
      },
      {
        schemaVersion: 1,
        reservationId: input.reservationId,
        journeyId: input.journeyId,
        recordedAt: input.now,
        provider: "tavily",
        operation: "basic_search",
        credits: 1,
      },
    ],
  } as const;
}

async function openLedger(
  options: {
    path?: string;
    pool?: "public" | "judge";
    policy?: ManagedDemoBudgetPolicy;
    priceSnapshot?: ManagedDemoPriceSnapshot;
    now?: string;
    ids?: readonly string[];
  } = {},
) {
  const path = options.path ?? (await databasePath());
  const pool = options.pool ?? "public";
  const policy =
    options.policy ??
    (pool === "public" ? INITIAL_PUBLIC_DEMO_BUDGET_POLICY : INITIAL_JUDGE_DEMO_BUDGET_POLICY);
  let now = options.now ?? "2026-11-01T12:00:00.000Z";
  const ids = [...(options.ids ?? [IDS.reservation1, IDS.reservation2, IDS.reservation3])];
  const ledger = new SqliteManagedDemoBudgetLedger(path, {
    deployment: deployment(pool, policy),
    policy,
    prices: options.priceSnapshot ?? prices(),
    now: () => now,
    randomId: () => {
      const id = ids.shift();
      if (id === undefined) throw new Error("test reservation identifiers exhausted");
      return id;
    },
  });
  ledger.initialize();
  return { path, ledger, setNow: (value: string) => (now = value) };
}

describe("managed-demo SQLite budget ledger", () => {
  it("atomically reserves, settles actual numeric usage, and survives restart", async () => {
    const { path, ledger, setNow } = await openLedger();
    const admitted = ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    expect(admitted).toMatchObject({
      state: "admitted",
      reservationId: IDS.reservation1,
      preauthorizedMicroUsd: 100_000,
      budget: { totalReservedMicroUsd: 100_000, activeJourneys: 1 },
    });
    setNow("2026-11-01T12:01:00.000Z");
    const request = settlement({
      reservationId: IDS.reservation1,
      journeyId: IDS.journey1,
      now: "2026-11-01T12:01:00.000Z",
    });
    expect(ledger.settle(request)).toMatchObject({
      status: "settled",
      chargedMicroUsd: 23_792,
      budget: {
        totalReservedMicroUsd: 0,
        totalSettledMicroUsd: 23_792,
        totalCompletedJourneys: 1,
      },
    });
    expect(ledger.settle(request)).toMatchObject({ chargedMicroUsd: 23_792 });
    expect(() => ledger.settle({ ...request, outcome: "failed" })).toThrow(/replay/u);
    ledger.close();

    const restarted = await openLedger({
      path,
      now: "2026-11-01T12:01:00.000Z",
      ids: [IDS.reservation2],
    });
    expect(restarted.ledger.snapshot()).toMatchObject({
      totalSettledMicroUsd: 23_792,
      totalCompletedJourneys: 1,
      activeJourneys: 0,
    });
    restarted.ledger.close();
  });

  it("retains the full preauthorization when failed usage is unavailable", async () => {
    const { ledger, setNow } = await openLedger();
    ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    setNow("2026-11-01T12:01:00.000Z");
    expect(
      ledger.settle(
        settlement({
          reservationId: IDS.reservation1,
          journeyId: IDS.journey1,
          now: "2026-11-01T12:01:00.000Z",
          outcome: "failed",
          usage: [],
        }),
      ),
    ).toMatchObject({ status: "forfeited", chargedMicroUsd: 100_000 });
    ledger.close();
  });

  it("forfeits expired reservations before granting new admission", async () => {
    const { ledger, setNow } = await openLedger();
    ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    setNow("2026-11-01T12:10:00.000Z");
    expect(ledger.expireReservations()).toBe(1);
    expect(ledger.snapshot()).toMatchObject({
      totalReservedMicroUsd: 0,
      totalSettledMicroUsd: 100_000,
      activeJourneys: 0,
    });
    ledger.close();
  });

  it("denies cooldown, source exhaustion, concurrency, and journey replay", async () => {
    const { ledger, setNow } = await openLedger();
    expect(ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"))).toMatchObject({
      state: "admitted",
    });
    expect(ledger.admit(admission(IDS.journey2, "2026-11-01T12:00:00.000Z"))).toMatchObject({
      state: "denied",
      reason: "cooldown_active",
    });
    setNow("2026-11-01T12:00:30.000Z");
    expect(ledger.admit(admission(IDS.journey2, "2026-11-01T12:00:30.000Z"))).toMatchObject({
      state: "admitted",
    });
    expect(
      ledger.admit(admission(IDS.journey3, "2026-11-01T12:00:30.000Z", SOURCE_B)),
    ).toMatchObject({ state: "denied", reason: "concurrency_exhausted" });
    expect(
      ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:30.000Z", SOURCE_B)),
    ).toMatchObject({ state: "denied", reason: "journey_replayed" });
    setNow("2026-11-01T12:01:00.000Z");
    expect(ledger.admit(admission(IDS.journey3, "2026-11-01T12:01:00.000Z"))).toMatchObject({
      state: "denied",
      reason: "source_limit_exhausted",
    });
    ledger.close();
  });

  it("rejects model substitution and token ceiling expansion without settling", async () => {
    const { ledger, setNow } = await openLedger();
    ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    setNow("2026-11-01T12:01:00.000Z");
    const request = settlement({
      reservationId: IDS.reservation1,
      journeyId: IDS.journey1,
      now: "2026-11-01T12:01:00.000Z",
    });
    expect(() =>
      ledger.settle({
        ...request,
        usage: [{ ...request.usage[0], modelId: "caller/substitution" }],
      }),
    ).toThrow(/fixed model ceiling/u);
    expect(() =>
      ledger.settle({
        ...request,
        usage: [{ ...request.usage[0], promptTokens: 8_001 }],
      }),
    ).toThrow(/fixed model ceiling/u);
    expect(ledger.snapshot()).toMatchObject({ totalReservedMicroUsd: 100_000 });
    ledger.close();
  });

  it("denies stale prices and out-of-window or disabled policies", async () => {
    const stale = await openLedger({
      now: "2026-11-01T12:00:00.000Z",
      priceSnapshot: {
        ...prices(),
        evidence: {
          capturedAt: "2026-10-30T17:00:00.000Z",
          expiresAt: "2026-11-01T11:59:59.000Z",
        },
      },
    });
    expect(stale.ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"))).toMatchObject({
      state: "denied",
      reason: "stale_price_evidence",
    });
    stale.ledger.close();

    const outside = await openLedger({ now: "2026-12-15T20:00:00.000Z" });
    expect(outside.ledger.admit(admission(IDS.journey1, "2026-12-15T20:00:00.000Z"))).toMatchObject(
      {
        state: "denied",
        reason: "outside_window",
      },
    );
    outside.ledger.close();

    const policy = {
      ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
      enabled: false,
    } as const;
    const disabled = await openLedger({ policy });
    expect(
      disabled.ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z")),
    ).toMatchObject({ state: "denied", reason: "disabled" });
    disabled.ledger.close();
  });

  it("applies exact-version operator policy updates and rejects active judge reductions", async () => {
    const publicLedger = await openLedger();
    const replacement = {
      ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
      version: 2,
      limits: {
        ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY.limits,
        totalMicroUsd: 50_000_000,
        totalJourneyAdmissions: 500,
      },
    } as const;
    expect(
      publicLedger.ledger.updatePolicy({
        schemaVersion: 1,
        deploymentId: IDS.deploymentPublic,
        expectedPolicyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
        expectedPolicyVersion: 1,
        replacement,
        reason: "Fund the next bounded public pilot increment.",
        updatedAt: "2026-11-01T12:00:00.000Z",
      }),
    ).toMatchObject({ policyVersion: 2, pool: "public" });
    expect(() =>
      publicLedger.ledger.updatePolicy({
        schemaVersion: 1,
        deploymentId: IDS.deploymentPublic,
        expectedPolicyId: INITIAL_PUBLIC_DEMO_BUDGET_POLICY.policyId,
        expectedPolicyVersion: 1,
        replacement,
        reason: "Replay a stale operator update.",
        updatedAt: "2026-11-01T12:00:00.000Z",
      }),
    ).toThrow(/durable deployment state/u);
    publicLedger.ledger.close();

    const judgeLedger = await openLedger({ pool: "judge" });
    expect(() =>
      judgeLedger.ledger.updatePolicy({
        schemaVersion: 1,
        deploymentId: IDS.deploymentJudge,
        expectedPolicyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.policyId,
        expectedPolicyVersion: 1,
        replacement: {
          ...INITIAL_JUDGE_DEMO_BUDGET_POLICY,
          version: 2,
          limits: {
            ...INITIAL_JUDGE_DEMO_BUDGET_POLICY.limits,
            totalMicroUsd: 24_000_000,
          },
        },
        reason: "Attempt to reduce the active judge reserve.",
        updatedAt: "2026-11-01T12:00:00.000Z",
      }),
    ).toThrow(/cannot be reduced/u);
    expect(
      judgeLedger.ledger.updatePolicy({
        schemaVersion: 1,
        deploymentId: IDS.deploymentJudge,
        expectedPolicyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.policyId,
        expectedPolicyVersion: 1,
        replacement: {
          ...INITIAL_JUDGE_DEMO_BUDGET_POLICY,
          version: 2,
          enabled: false,
        },
        reason: "Activate the incident kill switch.",
        updatedAt: "2026-11-01T12:00:00.000Z",
      }),
    ).toMatchObject({ enabled: false, policyVersion: 2 });
    judgeLedger.ledger.close();
  });

  it("updates price evidence without changing an existing reservation binding", async () => {
    const { ledger, setNow } = await openLedger();
    ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    setNow("2026-11-01T12:00:30.000Z");
    expect(
      ledger.updatePrices({
        schemaVersion: 1,
        deploymentId: IDS.deploymentPublic,
        expectedSnapshotId: IDS.snapshot,
        expectedSnapshotVersion: 1,
        replacement: {
          ...prices(),
          version: 2,
          tavilyMicroUsdPerCredit: 9_000,
          evidence: {
            capturedAt: "2026-11-01T12:00:30.000Z",
            expiresAt: "2026-12-15T20:00:00.000Z",
          },
        },
        reason: "Capture the current provider price catalog.",
        updatedAt: "2026-11-01T12:00:30.000Z",
      }),
    ).toMatchObject({ pool: "public" });
    setNow("2026-11-01T12:01:00.000Z");
    expect(
      ledger.settle(
        settlement({
          reservationId: IDS.reservation1,
          journeyId: IDS.journey1,
          now: "2026-11-01T12:01:00.000Z",
        }),
      ),
    ).toMatchObject({ chargedMicroUsd: 23_792 });
    ledger.close();
  });

  it("denies new work when committed cost reaches the total limit", async () => {
    const policy = {
      ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
      limits: {
        ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY.limits,
        totalMicroUsd: 100_000,
        dailyMicroUsd: 100_000,
      },
    } as const;
    const { ledger, setNow } = await openLedger({ policy });
    ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    setNow("2026-11-01T12:01:00.000Z");
    ledger.settle(
      settlement({
        reservationId: IDS.reservation1,
        journeyId: IDS.journey1,
        now: "2026-11-01T12:01:00.000Z",
      }),
    );
    setNow("2026-11-01T12:01:30.000Z");
    expect(
      ledger.admit(admission(IDS.journey2, "2026-11-01T12:01:30.000Z", SOURCE_B)),
    ).toMatchObject({ state: "denied", reason: "total_budget_exhausted" });
    ledger.close();
  });

  it("rechecks durable capacity across independent ledger connections", async () => {
    const path = await databasePath("connections");
    const policy = {
      ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY,
      limits: {
        ...INITIAL_PUBLIC_DEMO_BUDGET_POLICY.limits,
        maxConcurrentJourneys: 1,
      },
    } as const;
    const first = await openLedger({ path, policy, ids: [IDS.reservation1] });
    const second = await openLedger({ path, policy, ids: [IDS.reservation2] });
    expect(first.ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"))).toMatchObject({
      state: "admitted",
    });
    expect(
      second.ledger.admit(admission(IDS.journey2, "2026-11-01T12:00:00.000Z", SOURCE_B)),
    ).toMatchObject({ state: "denied", reason: "concurrency_exhausted" });
    first.ledger.close();
    second.ledger.close();
  });

  it("keeps public and judge ledgers physically and logically independent", async () => {
    const publicLedger = await openLedger({ pool: "public" });
    const judgeLedger = await openLedger({ pool: "judge" });
    publicLedger.ledger.admit(admission(IDS.journey1, "2026-11-01T12:00:00.000Z"));
    expect(publicLedger.ledger.snapshot()).toMatchObject({
      pool: "public",
      totalReservedMicroUsd: 100_000,
    });
    expect(judgeLedger.ledger.snapshot()).toMatchObject({
      pool: "judge",
      totalReservedMicroUsd: 0,
    });
    publicLedger.ledger.close();
    judgeLedger.ledger.close();
  });
});
