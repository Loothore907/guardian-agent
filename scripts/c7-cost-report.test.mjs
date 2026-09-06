import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCampaign, renderCostReport } from "./c7-cost-report.mjs";
const costs = {
  schemaVersion: 1,
  campaignId: "3bc9c918-a94c-4ea7-971c-a28389aeac33",
  capturedAt: "2026-09-06T01:30:00.000Z",
  allowanceMicroUsd: 25_000_000,
  apiBudgetCeilingMicroUsd: 20_000_000,
  infrastructureReserveMicroUsd: 5_000_000,
  infrastructureEstimateMicroUsd: 0,
  infrastructureBilledMicroUsd: null,
  apiBilledMicroUsd: null,
  prepaidCashMicroUsd: 25_000_000,
  appliedCreditsMicroUsd: 0,
};
test("keeps prepayments, consumed usage, pending usage and reservations distinct", () => {
  const result = summarizeCampaign(costs, {
    ceiling: 20_000_000,
    reserved: 1_000_000,
    estimated: 2_000_000,
    pending: 500_000,
  });
  assert.equal(result.currentEstimateMicroUsd, 3_500_000);
  assert.equal(result.remainingAfterReservationsMicroUsd, 16_500_000);
  assert.equal(result.netBilledMicroUsd, null);
  assert.match(renderCostReport(result), /Pending/);
  assert.equal(summarizeCampaign(costs).status, "pending");
});
test("fails closed on allocation expansion and preserves the gross cost floor despite credits", () => {
  assert.throws(() => summarizeCampaign({ ...costs, apiBudgetCeilingMicroUsd: 25_000_000 }));
  assert.throws(() =>
    summarizeCampaign(costs, { ceiling: 25_000_000, reserved: 0, estimated: 0, pending: 0 }),
  );
  assert.throws(() => summarizeCampaign({ ...costs, credential: "private" }));
  const result = summarizeCampaign(
    {
      ...costs,
      apiBilledMicroUsd: 21_000_000,
      infrastructureBilledMicroUsd: 1_000_000,
      appliedCreditsMicroUsd: 22_000_000,
    },
    { ceiling: 20_000_000, reserved: 0, estimated: 20_000_000, pending: 0 },
  );
  assert.equal(result.netBilledMicroUsd, 0);
  assert.equal(result.status, "stop");
});
