import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const { z } = createRequire(new URL("../packages/contracts/package.json", import.meta.url))("zod");

const microUsd = z.number().int().min(0).max(1_000_000_000_000);
const positiveInteger = z.number().int().positive();
const range = z.strictObject({ minimum: microUsd, maximum: microUsd });
const minuteRange = z.strictObject({
  minimum: positiveInteger,
  maximum: positiveInteger,
});

const HostProfile = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/u),
  kind: z.enum(["current_acceptance", "sizing_candidate"]),
  vcpu: positiveInteger,
  memoryGiB: positiveInteger,
  diskGiB: positiveInteger,
  planningMicroUsdPerHour: positiveInteger,
  evidence: z.enum(["operator_recorded_console_estimate", "public_component_prices_rounded_up"]),
});

const ProviderPriceEvidence = z.strictObject({
  provider: z.enum(["tavily", "nebius_token_factory"]),
  kind: z.enum(["public_list_price_only", "authenticated_snapshot_required"]),
  source: z.url(),
  capturedAt: z.iso.datetime(),
  usableForLiveAdmission: z.literal(false),
  planningMicroUsdPerCredit: microUsd.nullable(),
});

const CallCaps = z.strictObject({
  missionDialogue: z.number().int().min(0).max(1),
  guardianRisk: z.number().int().min(0).max(2),
  worker: z.number().int().min(0).max(2),
  tavilySearch: z.number().int().min(0).max(1),
  tavilyExtract: z.number().int().min(0).max(1),
});

const Baseline = z.strictObject({
  class: z.enum(["R0", "R1", "R2", "R3", "R4", "R5"]),
  name: z.string().regex(/^[a-z0-9][a-z0-9_]*$/u),
  authorityScope: z.enum(["current_development", "future_separately_funded_judge"]),
  journeyCount: z.number().int().min(0).max(10_000),
  hostProfileId: z.string(),
  hostWindowMinutes: minuteRange,
  callCapsPerJourney: CallCaps,
  expectedProviderCostMicroUsd: range,
  perJourneyAdmissionEnvelopeMicroUsd: microUsd,
  totalPreauthorizationMicroUsd: microUsd,
});

export const CostBaselines = z
  .strictObject({
    schemaVersion: z.literal(1),
    status: z.literal("planning_only"),
    currency: z.literal("USD"),
    capturedAt: z.iso.datetime(),
    controls: z.strictObject({
      expectedCostMayIncreaseRuntimeAuthority: z.literal(false),
      authenticatedPriceEvidenceRequiredBeforeLiveAdmission: z.literal(true),
      freeCreditsIncreaseApprovedAllowance: z.literal(false),
      unknownOrStalePriceEvidenceFailsClosed: z.literal(true),
    }),
    hostProfiles: z.array(HostProfile).min(1),
    providerPriceEvidence: z.array(ProviderPriceEvidence).length(2),
    tokenCeilingsPerCall: z.strictObject({
      missionDialoguePrompt: positiveInteger,
      missionDialogueOutput: positiveInteger,
      guardianRiskPrompt: positiveInteger,
      guardianRiskOutput: positiveInteger,
      workerPrompt: positiveInteger,
      workerOutput: positiveInteger,
    }),
    baselines: z.array(Baseline).length(6),
  })
  .superRefine((value, context) => {
    const duplicate = (items) => items.find((item, index) => items.indexOf(item) !== index);
    if (duplicate(value.hostProfiles.map((profile) => profile.id)))
      context.addIssue({ code: "custom", message: "Host profile IDs must be unique" });
    if (duplicate(value.providerPriceEvidence.map((evidence) => evidence.provider)))
      context.addIssue({ code: "custom", message: "Provider evidence must be unique" });
    const classes = value.baselines.map((baseline) => baseline.class);
    if (classes.join(",") !== "R0,R1,R2,R3,R4,R5")
      context.addIssue({
        code: "custom",
        message: "Baseline classes must be ordered R0 through R5",
      });
    const hostIds = new Set(value.hostProfiles.map((profile) => profile.id));
    for (const baseline of value.baselines) {
      if (!hostIds.has(baseline.hostProfileId))
        context.addIssue({
          code: "custom",
          message: `${baseline.class} references an unknown host`,
        });
      if (baseline.hostWindowMinutes.minimum > baseline.hostWindowMinutes.maximum)
        context.addIssue({
          code: "custom",
          message: `${baseline.class} has an inverted host window`,
        });
      if (
        baseline.expectedProviderCostMicroUsd.minimum >
        baseline.expectedProviderCostMicroUsd.maximum
      )
        context.addIssue({
          code: "custom",
          message: `${baseline.class} has an inverted cost range`,
        });
      if (
        baseline.totalPreauthorizationMicroUsd !==
        baseline.journeyCount * baseline.perJourneyAdmissionEnvelopeMicroUsd
      )
        context.addIssue({
          code: "custom",
          message: `${baseline.class} preauthorization does not match journey count`,
        });
      if (baseline.expectedProviderCostMicroUsd.maximum > baseline.totalPreauthorizationMicroUsd)
        context.addIssue({
          code: "custom",
          message: `${baseline.class} expected cost exceeds its preauthorization`,
        });
      const calls = Object.values(baseline.callCapsPerJourney).reduce(
        (total, count) => total + count,
        0,
      );
      if (
        baseline.journeyCount === 0 &&
        (calls !== 0 || baseline.totalPreauthorizationMicroUsd !== 0)
      )
        context.addIssue({
          code: "custom",
          message: `${baseline.class} zero-journey scope has paid calls`,
        });
      if (baseline.class === "R5" && baseline.authorityScope !== "future_separately_funded_judge")
        context.addIssue({
          code: "custom",
          message: "R5 must remain outside development authority",
        });
      if (baseline.class !== "R5" && baseline.authorityScope !== "current_development")
        context.addIssue({
          code: "custom",
          message: `${baseline.class} has the wrong authority scope`,
        });
    }
  });

export function validateCostBaselines(input) {
  return CostBaselines.parse(input);
}

export function summarizeCostBaselines(input) {
  const value = validateCostBaselines(input);
  const hosts = new Map(value.hostProfiles.map((profile) => [profile.id, profile]));
  return value.baselines.map((baseline) => {
    const host = hosts.get(baseline.hostProfileId);
    const hostMinimumMicroUsd = Math.ceil(
      (host.planningMicroUsdPerHour * baseline.hostWindowMinutes.minimum) / 60,
    );
    const hostMaximumMicroUsd = Math.ceil(
      (host.planningMicroUsdPerHour * baseline.hostWindowMinutes.maximum) / 60,
    );
    return {
      class: baseline.class,
      name: baseline.name,
      authorityScope: baseline.authorityScope,
      expectedPlanningTotalMicroUsd: {
        minimum: hostMinimumMicroUsd + baseline.expectedProviderCostMicroUsd.minimum,
        maximum: hostMaximumMicroUsd + baseline.expectedProviderCostMicroUsd.maximum,
      },
      reservedPlanningTotalMicroUsd: hostMaximumMicroUsd + baseline.totalPreauthorizationMicroUsd,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const inputPath = resolve(
    process.argv[2] ?? "docs/development/c7-mission-cost-baselines.v1.json",
  );
  if (process.argv.length > 3)
    throw Error("Usage: node scripts/c7-cost-baselines.mjs [BASELINES_JSON]");
  const value = JSON.parse(await readFile(inputPath, "utf8"));
  console.log(JSON.stringify(summarizeCostBaselines(value), null, 2));
}
