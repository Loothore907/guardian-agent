import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const { z } = createRequire(new URL("../packages/contracts/package.json", import.meta.url))("zod");

const money = z.number().int().min(0).max(1_000_000_000_000);
export const CampaignCosts = z
  .strictObject({
    schemaVersion: z.literal(1),
    campaignId: z.string().uuid(),
    capturedAt: z.iso.datetime(),
    allowanceMicroUsd: z.literal(25_000_000),
    apiBudgetCeilingMicroUsd: money,
    infrastructureReserveMicroUsd: money,
    infrastructureEstimateMicroUsd: money.nullable(),
    infrastructureBilledMicroUsd: money.nullable(),
    apiBilledMicroUsd: money.nullable(),
    prepaidCashMicroUsd: money,
    appliedCreditsMicroUsd: money,
  })
  .superRefine((value, context) => {
    if (
      value.apiBudgetCeilingMicroUsd + value.infrastructureReserveMicroUsd >
      value.allowanceMicroUsd
    )
      context.addIssue({
        code: "custom",
        message: "Campaign allocations exceed the approved allowance",
      });
  });

export function readApiTotals(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const row = db
      .prepare(
        `SELECT
      COALESCE(SUM(CASE WHEN state = 'reserved' THEN preauthorized_micro_usd ELSE 0 END), 0) AS reserved,
      COALESCE(SUM(CASE WHEN state = 'settled' THEN charged_micro_usd ELSE 0 END), 0) AS estimated,
      COALESCE(SUM(CASE WHEN state = 'forfeited' THEN charged_micro_usd ELSE 0 END), 0) AS pending
      FROM journey_reservations`,
      )
      .get();
    const config = db
      .prepare("SELECT policy_json FROM ledger_configuration WHERE singleton = 1")
      .get();
    return z
      .strictObject({ reserved: money, estimated: money, pending: money, ceiling: money })
      .parse({
        ...row,
        ceiling: JSON.parse(config.policy_json).limits.totalMicroUsd,
      });
  } finally {
    db.close();
  }
}

export function summarizeCampaign(input, api = null) {
  const costs = CampaignCosts.parse(input);
  if (api !== null)
    api = z
      .strictObject({ reserved: money, estimated: money, pending: money, ceiling: money })
      .parse(api);
  if (api !== null && api.ceiling > costs.apiBudgetCeilingMicroUsd)
    throw Error("Runtime ledger exceeds its campaign allocation");
  const apiCommitted = api === null ? null : api.reserved + api.estimated + api.pending;
  const infra = costs.infrastructureBilledMicroUsd ?? costs.infrastructureEstimateMicroUsd;
  const currentEstimate =
    apiCommitted === null || infra === null
      ? null
      : Math.max(costs.apiBilledMicroUsd ?? 0, apiCommitted) + infra;
  const committedWithInfrastructureReserve =
    apiCommitted === null
      ? null
      : Math.max(costs.apiBilledMicroUsd ?? 0, apiCommitted) +
        Math.max(infra ?? 0, costs.infrastructureReserveMicroUsd);
  const grossBilled =
    costs.infrastructureBilledMicroUsd === null || costs.apiBilledMicroUsd === null
      ? null
      : costs.infrastructureBilledMicroUsd + costs.apiBilledMicroUsd;
  return {
    ...costs,
    api,
    currentEstimateMicroUsd: currentEstimate,
    committedWithInfrastructureReserveMicroUsd: committedWithInfrastructureReserve,
    netBilledMicroUsd:
      grossBilled === null ? null : Math.max(0, grossBilled - costs.appliedCreditsMicroUsd),
    remainingAfterReservationsMicroUsd:
      committedWithInfrastructureReserve === null
        ? null
        : Math.max(0, costs.allowanceMicroUsd - committedWithInfrastructureReserve),
    status:
      committedWithInfrastructureReserve === null
        ? "pending"
        : committedWithInfrastructureReserve > costs.allowanceMicroUsd
          ? "stop"
          : committedWithInfrastructureReserve >= 20_000_000
            ? "notice"
            : "within_allowance",
  };
}

export function renderCostReport(report) {
  const usd = (value) => (value === null ? "Pending" : `$${(value / 1_000_000).toFixed(4)}`);
  const rows = [
    ["Approved service-cost allowance", report.allowanceMicroUsd],
    ["Prepaid cash (not consumed service cost)", report.prepaidCashMicroUsd],
    ["API usage estimate", report.api?.estimated ?? null],
    ["API in-flight reservations", report.api?.reserved ?? null],
    ["API usage awaiting reconciliation", report.api?.pending ?? null],
    ["API provider-billed charge", report.apiBilledMicroUsd],
    ["Infrastructure estimate", report.infrastructureEstimateMicroUsd],
    ["Infrastructure provider-billed charge", report.infrastructureBilledMicroUsd],
    ["Infrastructure planning reserve", report.infrastructureReserveMicroUsd],
    ["Applied provider credits", report.appliedCreditsMicroUsd],
    ["Net billed service cost", report.netBilledMicroUsd],
    ["Remaining after reservations", report.remainingAfterReservationsMicroUsd],
  ];
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guardian operator costs</title><style>body{max-width:52rem;margin:3rem auto;padding:0 1rem;font:17px/1.6 system-ui;color:#172330}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:.6rem;border-bottom:1px solid #ccd4dc}td{text-align:right}small{color:#526374}</style><main><h1>Development campaign costs</h1><p>Status: ${report.status}</p><table>${rows.map(([label, value]) => `<tr><th>${label}</th><td>${usd(value)}</td></tr>`).join("")}</table><p><small>Snapshot ${report.capturedAt}. Prepayments and credits do not increase the $25 service-cost allowance. Pending usage is never assumed free. Reserve infrastructure before admitting API work. Billing may arrive later.</small></p></main></html>\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , inputPath, outputPath, ledgerPath] = process.argv;
  if (!inputPath || !outputPath || process.argv.length > 5)
    throw Error("Usage: node scripts/c7-cost-report.mjs CAMPAIGN_JSON OUTPUT_HTML [BUDGET_SQLITE]");
  const report = summarizeCampaign(
    JSON.parse(await readFile(inputPath, "utf8")),
    ledgerPath ? readApiTotals(ledgerPath) : null,
  );
  await writeFile(outputPath, renderCostReport(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
}
