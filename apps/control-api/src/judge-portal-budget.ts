import { randomUUID } from "node:crypto";
import {
  JudgePortalRunResultSchema,
  ManagedDemoJourneyUsageReportersSchema,
  ManagedDemoSettlementResultSchema,
  type ManagedDemoSettlementResult,
  type ManagedDemoJourneyUsageReporters,
} from "@guardian/contracts";
import type { JudgePortalBackend, PreparedJudgePortalSession } from "./judge-portal.js";
import type { ManagedDemoJudgeBudgetController } from "./judge-ingress.js";

/** Budget admission precedes runtime preparation; abandonment settles conservatively.
 * The runtime factory is trusted host composition, never a browser-selected adapter. */
export class BudgetedJudgePortalBackend implements JudgePortalBackend {
  constructor(
    private readonly options: {
      deploymentId: string;
      budget: ManagedDemoJudgeBudgetController;
      prepareRuntime: (
        input: Parameters<JudgePortalBackend["prepare"]>[0] & {
          journeyId: string;
          reporters: ManagedDemoJourneyUsageReporters;
        },
      ) => Promise<PreparedJudgePortalSession>;
    },
  ) {}

  async prepare(
    input: Parameters<JudgePortalBackend["prepare"]>[0],
  ): Promise<PreparedJudgePortalSession> {
    const journeyId = randomUUID();
    const admission = await this.options.budget.begin(journeyId, input.sourceFingerprint);
    if (admission.state !== "admitted") throw new TypeError("judge budget unavailable");
    let runtime: PreparedJudgePortalSession | undefined;
    let settlement: Promise<ManagedDemoSettlementResult> | undefined;
    let closed = false;
    let closePromise: Promise<void> | undefined;
    let started = false;
    const settle = (outcome: "completed" | "failed") =>
      (settlement ??= (async () => {
        const result = ManagedDemoSettlementResultSchema.parse(
          await admission.journey.settle(outcome, new Date().toISOString()),
        );
        if (
          result.journeyId !== journeyId ||
          result.reservationId !== admission.journey.reporters.interaction.reservationId ||
          (outcome === "completed" && result.status !== "settled")
        )
          throw new TypeError("judge settlement unavailable");
        return result;
      })());
    try {
      const reporters = ManagedDemoJourneyUsageReportersSchema.parse(admission.journey.reporters);
      if (
        Object.values(reporters).some(
          (r) =>
            r.journeyId !== journeyId ||
            r.budget.binding.deploymentId !== this.options.deploymentId,
        )
      )
        throw new TypeError("judge budget binding invalid");
      runtime = await this.options.prepareRuntime({ ...input, journeyId, reporters });
      const prepared = runtime;
      return {
        scope: structuredClone(prepared.scope),
        bindingDigest: prepared.bindingDigest,
        confirmAndRun: async (signal) => {
          if (closed || started || signal.aborted) throw new TypeError("judge session unavailable");
          started = true;
          try {
            const result = JudgePortalRunResultSchema.parse(await prepared.confirmAndRun(signal));
            const usage = await settle(
              result.state === "completed" && !signal.aborted ? "completed" : "failed",
            );
            if (signal.aborted || closed) throw new TypeError("judge session cancelled");
            return JudgePortalRunResultSchema.parse({
              ...result,
              cost: {
                currency: "USD",
                modelAndResearchMicroUsd: usage.chargedMicroUsd,
                status: usage.status === "settled" ? "usage_estimate" : "reservation_pending",
                providerBilledMicroUsd: null,
                infrastructure: "reported_separately",
              },
            });
          } catch {
            await settle("failed");
            throw new TypeError("judge session unavailable");
          }
        },
        close: () => {
          closed = true;
          return (closePromise ??= (async () => {
            try {
              await prepared.close();
            } finally {
              await settle("failed");
            }
          })());
        },
      };
    } catch {
      try {
        await runtime?.close();
      } finally {
        await settle("failed");
      }
      throw new TypeError("judge preparation unavailable");
    }
  }
}
