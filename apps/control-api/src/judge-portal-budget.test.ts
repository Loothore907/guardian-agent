import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import {
  ManagedDemoJourneyUsageReportersSchema,
  JudgePortalRunResultSchema,
} from "@guardian/contracts";
import { BudgetedJudgePortalBackend } from "./judge-portal-budget.js";
const deploymentId = randomUUID();
const scope = {
  objective: "Summarize the update",
  researchUrls: ["https://example.com/update"],
  githubTarget: null,
  durationSeconds: 300 as const,
};
const input = {
  mode: "piloted" as const,
  scenarioId: null,
  scope,
  sourceFingerprint: "a".repeat(64),
};
function setup(mode: "allow" | "deny" | "wrong_binding" = "allow", failSettlement = false) {
  const order: string[] = [];
  const reservationId = randomUUID();
  const settle = vi.fn((outcome: string) => {
    order.push(`settle:${outcome}`);
    return Promise.resolve({
      schemaVersion: 1,
      reservationId,
      journeyId: lastId,
      status: failSettlement ? "forfeited" : "settled",
      chargedMicroUsd: 1,
      budget: {
        schemaVersion: 1,
        policyId: "managed-demo-competition-2026",
        policyVersion: 1,
        pool: "judge",
        enabled: true,
        totalReservedMicroUsd: 1,
        totalSettledMicroUsd: 1,
        dailyReservedMicroUsd: 1,
        dailySettledMicroUsd: 1,
        totalJourneyAdmissions: 1,
        dailyJourneyAdmissions: 1,
        totalCompletedJourneys: 1,
        dailyCompletedJourneys: 1,
        activeJourneys: 0,
        capturedAt: new Date().toISOString(),
      },
    });
  });
  let lastId = "";
  const prepareRuntime = vi.fn(() => {
    order.push("prepare");
    return Promise.resolve({
      scope,
      bindingDigest: "b".repeat(64),
      confirmAndRun: () => {
        order.push("run");
        return Promise.resolve({
          schemaVersion: 1,
          state: "completed",
          assurance: "observed",
          evidence: [],
        });
      },
      close: () => Promise.resolve(),
    });
  });
  const backend = new BudgetedJudgePortalBackend({
    deploymentId,
    prepareRuntime,
    budget: {
      begin: (id: unknown) => {
        order.push("budget");
        lastId = String(id);
        if (mode === "deny") return Promise.resolve({ state: "denied" as const });
        const reporter = (role: string) => ({
          schemaVersion: 1,
          budget: {
            schemaVersion: 1,
            endpoint: "guardian-managed-demo-budget",
            binding: {
              schemaVersion: 1,
              capability: randomUUID(),
              callerRole: role,
              callerId: randomUUID(),
              deploymentId: mode === "wrong_binding" ? randomUUID() : deploymentId,
              allowedOperations: ["usage.record"],
              issuedAt: "2026-09-05T12:00:00.000Z",
              expiresAt: "2026-09-05T12:10:00.000Z",
            },
          },
          reservationId,
          journeyId: lastId,
        });
        return Promise.resolve({
          state: "admitted" as const,
          journey: {
            reporters: ManagedDemoJourneyUsageReportersSchema.parse({
              interaction: reporter("interaction_service"),
              guardian: reporter("guardian_service"),
              worker: reporter("worker_service"),
              research: reporter("research_service"),
            }),
            settle,
          },
        });
      },
    },
  });
  return { backend, order, prepareRuntime, settle };
}
it("admits before preparation and settles once after the confirmed run", async () => {
  const { backend, order, settle } = setup();
  const session = await backend.prepare(input);
  expect(order).toEqual(["budget", "prepare"]);
  const result = JudgePortalRunResultSchema.parse(
    await session.confirmAndRun(new AbortController().signal),
  );
  expect(result.cost).toEqual({
    currency: "USD",
    modelAndResearchMicroUsd: 1,
    status: "usage_estimate",
    providerBilledMicroUsd: null,
    infrastructure: "reported_separately",
  });
  expect(JSON.stringify(result.cost)).not.toContain("totalSettled");
  await session.close();
  await session.close();
  expect(order).toEqual(["budget", "prepare", "run", "settle:completed"]);
  expect(settle).toHaveBeenCalledTimes(1);
});
it.each(["deny", "wrong_binding"] as const)("does not prepare a runtime for %s", async (mode) => {
  const { backend, prepareRuntime } = setup(mode);
  await expect(backend.prepare(input)).rejects.toThrow();
  expect(prepareRuntime).not.toHaveBeenCalled();
});
it("settles abandoned previews as failed and refuses later execution", async () => {
  const { backend, settle } = setup();
  const session = await backend.prepare(input);
  await session.close();
  expect(settle).toHaveBeenCalledWith("failed", expect.any(String));
  await expect(session.confirmAndRun(new AbortController().signal)).rejects.toThrow();
});
it("never reports completion after failed settlement", async () => {
  const { backend } = setup("allow", true);
  const session = await backend.prepare(input);
  await expect(session.confirmAndRun(new AbortController().signal)).rejects.toThrow();
  await expect(session.close()).rejects.toThrow();
});
