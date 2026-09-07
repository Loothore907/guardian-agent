import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { summarizeCostBaselines, validateCostBaselines } from "./c7-cost-baselines.mjs";

const path = new URL("../docs/development/c7-mission-cost-baselines.v1.json", import.meta.url);

async function fixture() {
  return JSON.parse(await readFile(path, "utf8"));
}

test("validates ordered mission baselines and derives bounded planning totals", async () => {
  const input = await fixture();
  const validated = validateCostBaselines(input);
  assert.deepEqual(
    validated.baselines.map((baseline) => baseline.class),
    ["R0", "R1", "R2", "R3", "R4", "R5"],
  );
  assert.equal(validated.controls.expectedCostMayIncreaseRuntimeAuthority, false);
  assert.equal(
    validated.providerPriceEvidence.every((evidence) => !evidence.usableForLiveAdmission),
    true,
  );
  const summaries = summarizeCostBaselines(input);
  assert.deepEqual(
    summaries.find((baseline) => baseline.class === "R0"),
    {
      class: "R0",
      name: "startup_health_and_cancellation",
      authorityScope: "current_development",
      expectedPlanningTotalMicroUsd: { minimum: 30000, maximum: 30000 },
      reservedPlanningTotalMicroUsd: 30000,
    },
  );
  assert.deepEqual(
    summaries.find((baseline) => baseline.class === "R4")?.expectedPlanningTotalMicroUsd,
    { minimum: 1040000, maximum: 1680000 },
  );
  assert.equal(
    summaries.find((baseline) => baseline.class === "R5")?.reservedPlanningTotalMicroUsd,
    83353291,
  );
});

test("rejects authority-like expansion, unknown fields, and under-reserved ranges", async () => {
  const input = await fixture();
  assert.throws(() =>
    validateCostBaselines({
      ...input,
      controls: { ...input.controls, expectedCostMayIncreaseRuntimeAuthority: true },
    }),
  );
  assert.throws(() =>
    validateCostBaselines({
      ...input,
      baselines: input.baselines.map((baseline) =>
        baseline.class === "R2"
          ? {
              ...baseline,
              expectedProviderCostMicroUsd: { minimum: 40000, maximum: 100001 },
            }
          : baseline,
      ),
    }),
  );
  assert.throws(() => validateCostBaselines({ ...input, credential: "forbidden" }));
});
