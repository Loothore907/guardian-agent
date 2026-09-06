import { createHash } from "node:crypto";

import { ManagedDemoJourneyUsageReportersSchema } from "@guardian/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  canonicalizeManagedDemoSourceAddress,
  DefaultManagedDemoJudgeJourneyCoordinator,
  InMemoryManagedDemoJudgeIngressSecrets,
  type ManagedDemoJudgeBudgetJourney,
} from "./judge-ingress.js";

const IDS = {
  deployment: "11111111-1111-4111-8111-111111111111",
  otherDeployment: "22222222-2222-4222-8222-222222222222",
  caller: "33333333-3333-4333-8333-333333333333",
  reservation: "44444444-4444-4444-8444-444444444444",
  journey: "55555555-5555-4555-8555-555555555555",
  capabilities: [
    "66666666-6666-4666-8666-666666666661",
    "66666666-6666-4666-8666-666666666662",
    "66666666-6666-4666-8666-666666666663",
    "66666666-6666-4666-8666-666666666664",
  ],
} as const;
const NOW = "2026-09-04T12:00:00.000Z";
const EXPIRES = "2026-09-04T12:05:00.000Z";
const TEST_CREDENTIAL = "judge-fixture-credential-0000000001";

function reporters() {
  const reporter = (
    role: "interaction_service" | "guardian_service" | "worker_service" | "research_service",
    capability: string,
  ) => ({
    schemaVersion: 1 as const,
    budget: {
      schemaVersion: 1 as const,
      endpoint: "guardian-managed-demo-budget",
      binding: {
        schemaVersion: 1 as const,
        capability,
        callerRole: role,
        callerId: IDS.caller,
        deploymentId: IDS.deployment,
        allowedOperations: ["usage.record" as const],
        issuedAt: NOW,
        expiresAt: EXPIRES,
      },
    },
    reservationId: IDS.reservation,
    journeyId: IDS.journey,
  });
  return ManagedDemoJourneyUsageReportersSchema.parse({
    interaction: reporter("interaction_service", IDS.capabilities[0]),
    guardian: reporter("guardian_service", IDS.capabilities[1]),
    worker: reporter("worker_service", IDS.capabilities[2]),
    research: reporter("research_service", IDS.capabilities[3]),
  });
}

function secrets() {
  return new InMemoryManagedDemoJudgeIngressSecrets({
    expectedCredentialDigest: createHash("sha256").update(TEST_CREDENTIAL).digest(),
    sourceFingerprintKey: Buffer.alloc(32, 7),
  });
}

function settlementResult(status: "settled" | "forfeited" = "settled") {
  return {
    schemaVersion: 1 as const,
    reservationId: IDS.reservation,
    journeyId: IDS.journey,
    status,
    chargedMicroUsd: 1,
    budget: {
      schemaVersion: 1 as const,
      policyId: "managed-demo-competition-2026",
      policyVersion: 1,
      pool: "judge" as const,
      enabled: true,
      totalReservedMicroUsd: 1,
      totalSettledMicroUsd: 1,
      dailyReservedMicroUsd: 1,
      dailySettledMicroUsd: 1,
      totalJourneyAdmissions: 1,
      dailyJourneyAdmissions: 1,
      totalCompletedJourneys: status === "settled" ? 1 : 0,
      dailyCompletedJourneys: status === "settled" ? 1 : 0,
      activeJourneys: 0,
      capturedAt: NOW,
    },
  };
}

function admittedJourney(
  settle: ManagedDemoJudgeBudgetJourney["settle"] = vi.fn(() =>
    Promise.resolve(settlementResult()),
  ),
): ManagedDemoJudgeBudgetJourney {
  return { reporters: reporters(), settle };
}

describe("managed-demo source identity", () => {
  it("canonicalizes equivalent IPv4, IPv4-mapped IPv6, and IPv6 representations", () => {
    expect(canonicalizeManagedDemoSourceAddress("192.0.2.128")).toBe("192.0.2.128");
    expect(canonicalizeManagedDemoSourceAddress("::ffff:192.0.2.128")).toBe("192.0.2.128");
    expect(canonicalizeManagedDemoSourceAddress("2001:0db8:0:0:0:0:0:1")).toBe("2001:db8::1");
    expect(canonicalizeManagedDemoSourceAddress("2001:db8::1")).toBe("2001:db8::1");
  });

  it.each(["192.0.2.1:443", "192.0.2.1, 198.51.100.1", "fe80::1%eth0", "example.test"])(
    "rejects ambiguous or non-address source %s",
    (value) => {
      expect(() => canonicalizeManagedDemoSourceAddress(value)).toThrow("source address");
    },
  );

  it("verifies the credential, separates deployments, and zeroes on close", () => {
    const material = secrets();
    expect(material.verifyBearerCredential(TEST_CREDENTIAL)).toBe(true);
    expect(material.verifyBearerCredential("wrong-fixture-credential-00000000000")).toBe(false);

    const direct = material.deriveSourceFingerprint(IDS.deployment, "192.0.2.128");
    expect(material.deriveSourceFingerprint(IDS.deployment, "::ffff:192.0.2.128")).toBe(direct);
    expect(material.deriveSourceFingerprint(IDS.otherDeployment, "192.0.2.128")).not.toBe(direct);
    expect(direct).toMatch(/^[a-f0-9]{64}$/u);

    material.close();
    expect(material.verifyBearerCredential(TEST_CREDENTIAL)).toBe(false);
    expect(() => material.deriveSourceFingerprint(IDS.deployment, "192.0.2.128")).toThrow(
      "unavailable",
    );
  });
});

describe("managed-demo judge journey coordinator", () => {
  it("admits before execution, passes exact reporters, and settles completion once", async () => {
    const order: string[] = [];
    const settle = vi.fn(() => {
      order.push("settle");
      return Promise.resolve(settlementResult());
    });
    const journey = admittedJourney(settle);
    const begin = vi.fn(() => {
      order.push("admit");
      return Promise.resolve({ state: "admitted" as const, journey });
    });
    const run = vi.fn((input: { readonly reporters: unknown }) => {
      order.push("execute");
      expect(input.reporters).toEqual(journey.reporters);
      return Promise.resolve({ state: "completed" });
    });
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: { begin },
      executor: { run },
      now: () => NOW,
      createJourneyId: () => IDS.journey,
    });

    await expect(coordinator.run("Review the bounded repository", "a".repeat(64))).resolves.toEqual(
      { schemaVersion: 1, state: "completed" },
    );
    expect(order).toEqual(["admit", "execute", "settle"]);
    expect(begin).toHaveBeenCalledWith(IDS.journey, "a".repeat(64));
    expect(settle).toHaveBeenCalledWith("completed", NOW);
  });

  it("does not execute or settle a denied admission", async () => {
    const run = vi.fn();
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: { begin: vi.fn(() => Promise.resolve({ state: "denied" as const })) },
      executor: { run },
      createJourneyId: () => IDS.journey,
    });

    await expect(coordinator.run("Review the bounded repository", "a".repeat(64))).resolves.toEqual(
      { schemaVersion: 1, state: "denied", code: "capacity_unavailable" },
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("does not execute when admission is unavailable", async () => {
    const run = vi.fn();
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: { begin: vi.fn(() => Promise.reject(new Error("ipc detail"))) },
      executor: { run },
      createJourneyId: () => IDS.journey,
    });

    await expect(coordinator.run("Review the bounded repository", "a".repeat(64))).resolves.toEqual(
      { schemaVersion: 1, state: "stopped", code: "service_unavailable" },
    );
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    ["stopped result", () => Promise.resolve({ state: "stopped" })],
    ["malformed result", () => Promise.resolve({ state: "completed", providerBody: "not public" })],
    ["execution failure", () => Promise.reject(new Error("provider detail"))],
  ])("settles %s as failed and returns one sanitized result", async (_name, run) => {
    const settle = vi.fn(() => Promise.resolve(settlementResult()));
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: {
        begin: vi.fn(() =>
          Promise.resolve({
            state: "admitted" as const,
            journey: admittedJourney(settle),
          }),
        ),
      },
      executor: { run },
      now: () => NOW,
      createJourneyId: () => IDS.journey,
    });

    await expect(coordinator.run("Review the bounded repository", "a".repeat(64))).resolves.toEqual(
      { schemaVersion: 1, state: "stopped", code: "journey_failed" },
    );
    expect(settle).toHaveBeenCalledOnce();
    expect(settle).toHaveBeenCalledWith("failed", NOW);
  });

  it("settles an already aborted request without starting execution", async () => {
    const settle = vi.fn(() => Promise.resolve(settlementResult()));
    const run = vi.fn();
    const abort = new AbortController();
    abort.abort();
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: {
        begin: vi.fn(() =>
          Promise.resolve({
            state: "admitted" as const,
            journey: admittedJourney(settle),
          }),
        ),
      },
      executor: { run },
      now: () => NOW,
      createJourneyId: () => IDS.journey,
    });

    await expect(
      coordinator.run("Review the bounded repository", "a".repeat(64), abort.signal),
    ).resolves.toEqual({ schemaVersion: 1, state: "stopped", code: "journey_failed" });
    expect(run).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledWith("failed", NOW);
  });

  it("settles a disconnect reported during execution", async () => {
    const settle = vi.fn(() => Promise.resolve(settlementResult()));
    const abort = new AbortController();
    const started = Promise.withResolvers<void>();
    const run = vi.fn(
      async (input: { readonly signal: AbortSignal }): Promise<{ readonly state: "stopped" }> => {
        started.resolve();
        await new Promise<void>((resolve) =>
          input.signal.addEventListener("abort", () => resolve()),
        );
        return { state: "stopped" };
      },
    );
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: {
        begin: vi.fn(() =>
          Promise.resolve({
            state: "admitted" as const,
            journey: admittedJourney(settle),
          }),
        ),
      },
      executor: { run },
      now: () => NOW,
      createJourneyId: () => IDS.journey,
    });

    const result = coordinator.run("Review the bounded repository", "a".repeat(64), abort.signal);
    await started.promise;
    abort.abort();
    await expect(result).resolves.toEqual({
      schemaVersion: 1,
      state: "stopped",
      code: "journey_failed",
    });
    expect(settle).toHaveBeenCalledWith("failed", NOW);
  });

  it("overrides apparent success when settlement is unavailable", async () => {
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: {
        begin: vi.fn(() =>
          Promise.resolve({
            state: "admitted" as const,
            journey: admittedJourney(vi.fn(() => Promise.reject(new Error("ipc detail")))),
          }),
        ),
      },
      executor: { run: vi.fn(() => Promise.resolve({ state: "completed" })) },
      now: () => NOW,
      createJourneyId: () => IDS.journey,
    });

    await expect(coordinator.run("Review the bounded repository", "a".repeat(64))).resolves.toEqual(
      { schemaVersion: 1, state: "stopped", code: "service_unavailable" },
    );
  });

  it.each([
    [
      "wrong journey",
      {
        ...settlementResult(),
        journeyId: "99999999-9999-4999-8999-999999999999",
      },
    ],
    ["forfeited completion", settlementResult("forfeited")],
  ])("rejects %s as unconfirmed settlement", async (_name, settlement) => {
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({
      budget: {
        begin: vi.fn(() =>
          Promise.resolve({
            state: "admitted" as const,
            journey: admittedJourney(vi.fn(() => Promise.resolve(settlement))),
          }),
        ),
      },
      executor: { run: vi.fn(() => Promise.resolve({ state: "completed" })) },
      now: () => NOW,
      createJourneyId: () => IDS.journey,
    });

    await expect(coordinator.run("Review the bounded repository", "a".repeat(64))).resolves.toEqual(
      { schemaVersion: 1, state: "stopped", code: "service_unavailable" },
    );
  });
});
