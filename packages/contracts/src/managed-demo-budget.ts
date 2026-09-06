import { z } from "zod";

import {
  boundedVisibleText,
  ContractVersionSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
  addDuplicateIssue,
  type DeepReadonly,
} from "./common.js";
import { ProviderRequestIdSchema } from "./actions.js";
import {
  GuardianModelIdSchema,
  GuardianModelPolicyIdSchema,
  resolveBuiltInGuardianModelPolicy,
} from "./model-policy.js";

const MAX_MONEY_MICRO_USD = 1_000_000_000_000;
const MAX_TOKEN_COUNT = 10_000_000;
export const MAX_MANAGED_DEMO_USAGE_ENTRIES = 34;

export const ManagedDemoPoolSchema = z.enum(["public", "judge"]);
export type ManagedDemoPool = z.infer<typeof ManagedDemoPoolSchema>;

export const MicroUsdSchema = z.number().int().nonnegative().max(MAX_MONEY_MICRO_USD);
export type MicroUsd = z.infer<typeof MicroUsdSchema>;

export const ManagedDemoModelRoleSchema = z.enum([
  "mission_dialogue",
  "native_worker",
  "contextual_risk_primary",
  "contextual_risk_escalation",
]);
export type ManagedDemoModelRole = z.infer<typeof ManagedDemoModelRoleSchema>;

const TokenCountSchema = z.number().int().nonnegative().max(MAX_TOKEN_COUNT);
const PositiveTokenCountSchema = TokenCountSchema.min(1);
const PositiveCountSchema = z.number().int().positive().max(1_000_000);

function modelIdForRole(
  policy: ReturnType<typeof resolveBuiltInGuardianModelPolicy>,
  role: ManagedDemoModelRole,
): string {
  switch (role) {
    case "mission_dialogue":
      return policy.missionDialogue.modelId;
    case "native_worker":
      return policy.nativeWorker.modelId;
    case "contextual_risk_primary":
      return policy.contextualRiskPrimary.modelId;
    case "contextual_risk_escalation":
      return policy.contextualRiskEscalation.modelId;
  }
}

function validateModelRoleBindings(
  value: {
    readonly modelPolicyId: string;
    readonly modelPolicyVersion: number;
    readonly models: readonly { readonly role: ManagedDemoModelRole; readonly modelId: string }[];
  },
  context: z.RefinementCtx,
): void {
  let modelPolicy: ReturnType<typeof resolveBuiltInGuardianModelPolicy>;
  try {
    modelPolicy = resolveBuiltInGuardianModelPolicy(value.modelPolicyId, value.modelPolicyVersion);
  } catch {
    context.addIssue({
      code: "custom",
      message: "managed-demo budget requires a built-in model policy",
      path: ["modelPolicyVersion"],
    });
    return;
  }

  addDuplicateIssue(
    value.models.map((model) => model.role),
    context,
    ["models"],
  );
  if (value.models.length !== ManagedDemoModelRoleSchema.options.length) {
    context.addIssue({
      code: "custom",
      message: "managed-demo budget requires every model role exactly once",
      path: ["models"],
    });
  }
  value.models.forEach((model, index) => {
    if (model.modelId !== modelIdForRole(modelPolicy, model.role)) {
      context.addIssue({
        code: "custom",
        message: "managed-demo model does not match the bound model policy",
        path: ["models", index, "modelId"],
      });
    }
  });
}

const PriceEvidenceWindowSchema = z
  .strictObject({
    capturedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .superRefine((window, context) => {
    if (Date.parse(window.expiresAt) <= Date.parse(window.capturedAt)) {
      context.addIssue({
        code: "custom",
        message: "price evidence must expire after it is captured",
        path: ["expiresAt"],
      });
    }
  });

export const ManagedDemoModelPriceSchema = z.strictObject({
  role: ManagedDemoModelRoleSchema,
  modelId: GuardianModelIdSchema,
  inputMicroUsdPerMillionTokens: MicroUsdSchema.min(1),
  outputMicroUsdPerMillionTokens: MicroUsdSchema.min(1),
});
export type ManagedDemoModelPrice = z.infer<typeof ManagedDemoModelPriceSchema>;

export const ManagedDemoPriceSnapshotSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    snapshotId: OpaqueIdSchema,
    version: VersionNumberSchema,
    modelPolicyId: GuardianModelPolicyIdSchema,
    modelPolicyVersion: VersionNumberSchema,
    models: z.array(ManagedDemoModelPriceSchema).min(1).max(4),
    tavilyMicroUsdPerCredit: MicroUsdSchema.min(1),
    evidence: PriceEvidenceWindowSchema,
  })
  .superRefine((snapshot, context) => {
    validateModelRoleBindings(snapshot, context);
  });
export type ManagedDemoPriceSnapshot = DeepReadonly<z.infer<typeof ManagedDemoPriceSnapshotSchema>>;

export const ManagedDemoModelCeilingSchema = z.strictObject({
  role: ManagedDemoModelRoleSchema,
  modelId: GuardianModelIdSchema,
  maxCallsPerJourney: PositiveCountSchema.max(8),
  maxPromptTokensPerCall: PositiveTokenCountSchema,
  maxCompletionTokensPerCall: PositiveTokenCountSchema,
});
export type ManagedDemoModelCeiling = z.infer<typeof ManagedDemoModelCeilingSchema>;

const AvailabilityWindowSchema = z
  .strictObject({
    opensAt: TimestampSchema,
    closesAt: TimestampSchema,
  })
  .superRefine((window, context) => {
    if (Date.parse(window.closesAt) <= Date.parse(window.opensAt)) {
      context.addIssue({
        code: "custom",
        message: "managed-demo availability must close after it opens",
        path: ["closesAt"],
      });
    }
  });

const ManagedDemoBudgetLimitsSchema = z
  .strictObject({
    totalMicroUsd: MicroUsdSchema.min(1),
    dailyMicroUsd: MicroUsdSchema.min(1),
    perJourneyPreauthorizationMicroUsd: MicroUsdSchema.min(1),
    totalJourneyAdmissions: PositiveCountSchema,
    dailyJourneyAdmissions: PositiveCountSchema,
    perSourceDailyJourneyAdmissions: PositiveCountSchema,
    maxConcurrentJourneys: PositiveCountSchema.max(1_000),
    queueCapacity: z.number().int().nonnegative().max(10_000),
    queueTimeoutSeconds: PositiveCountSchema.max(3_600),
    reservationTtlSeconds: PositiveCountSchema.max(3_600),
    cooldownSeconds: z.number().int().nonnegative().max(86_400),
  })
  .superRefine((limits, context) => {
    if (limits.dailyMicroUsd > limits.totalMicroUsd) {
      context.addIssue({
        code: "custom",
        message: "daily budget cannot exceed total budget",
        path: ["dailyMicroUsd"],
      });
    }
    if (limits.perJourneyPreauthorizationMicroUsd > limits.dailyMicroUsd) {
      context.addIssue({
        code: "custom",
        message: "journey preauthorization cannot exceed daily budget",
        path: ["perJourneyPreauthorizationMicroUsd"],
      });
    }
    if (limits.dailyJourneyAdmissions > limits.totalJourneyAdmissions) {
      context.addIssue({
        code: "custom",
        message: "daily admission count cannot exceed total admission count",
        path: ["dailyJourneyAdmissions"],
      });
    }
    if (limits.perSourceDailyJourneyAdmissions > limits.dailyJourneyAdmissions) {
      context.addIssue({
        code: "custom",
        message: "per-source admission count cannot exceed daily admission count",
        path: ["perSourceDailyJourneyAdmissions"],
      });
    }
  });

export const ManagedDemoBudgetPolicySchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    policyId: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u),
    version: VersionNumberSchema,
    pool: ManagedDemoPoolSchema,
    enabled: z.boolean(),
    availability: AvailabilityWindowSchema,
    modelPolicyId: GuardianModelPolicyIdSchema,
    modelPolicyVersion: VersionNumberSchema,
    models: z.array(ManagedDemoModelCeilingSchema).min(1).max(4),
    research: z.strictObject({
      maxBasicSearchesPerJourney: z.number().int().min(0).max(1),
      maxBasicExtractsPerJourney: z.number().int().min(0).max(2),
      maxTavilyCreditsPerJourney: z.literal(2),
    }),
    limits: ManagedDemoBudgetLimitsSchema,
    anonymousCredentialedMutations: z.literal(0),
  })
  .superRefine((policy, context) => {
    validateModelRoleBindings(policy, context);
  });
export type ManagedDemoBudgetPolicy = DeepReadonly<z.infer<typeof ManagedDemoBudgetPolicySchema>>;

const CompetitionAvailability = {
  opensAt: "2026-10-30T17:00:00.000Z",
  closesAt: "2026-12-15T20:00:00.000Z",
} as const;

const CompetitionModels = [
  {
    role: "mission_dialogue",
    modelId: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    maxCallsPerJourney: 1,
    maxPromptTokensPerCall: 4_000,
    maxCompletionTokensPerCall: 1_024,
  },
  {
    role: "native_worker",
    modelId: "moonshotai/Kimi-K2.7-Code",
    maxCallsPerJourney: 2,
    maxPromptTokensPerCall: 8_000,
    maxCompletionTokensPerCall: 2_048,
  },
  {
    role: "contextual_risk_primary",
    modelId: "nvidia/nemotron-3-super-120b-a12b",
    maxCallsPerJourney: 1,
    maxPromptTokensPerCall: 4_000,
    maxCompletionTokensPerCall: 512,
  },
  {
    role: "contextual_risk_escalation",
    modelId: "nvidia/Nemotron-3-Ultra-550b-a55b",
    maxCallsPerJourney: 1,
    maxPromptTokensPerCall: 4_000,
    maxCompletionTokensPerCall: 512,
  },
] as const;

const SharedCompetitionPolicy = {
  schemaVersion: 1,
  policyId: "managed-demo-competition-2026",
  version: 1,
  enabled: true,
  availability: CompetitionAvailability,
  modelPolicyId: "competition-2026-09-01",
  modelPolicyVersion: 2,
  models: CompetitionModels,
  research: {
    maxBasicSearchesPerJourney: 1,
    maxBasicExtractsPerJourney: 1,
    maxTavilyCreditsPerJourney: 2,
  },
  anonymousCredentialedMutations: 0,
} as const;

export const INITIAL_JUDGE_DEMO_BUDGET_POLICY = ManagedDemoBudgetPolicySchema.parse({
  ...SharedCompetitionPolicy,
  pool: "judge",
  limits: {
    totalMicroUsd: 25_000_000,
    dailyMicroUsd: 5_000_000,
    perJourneyPreauthorizationMicroUsd: 100_000,
    totalJourneyAdmissions: 250,
    dailyJourneyAdmissions: 50,
    perSourceDailyJourneyAdmissions: 20,
    maxConcurrentJourneys: 4,
    queueCapacity: 20,
    queueTimeoutSeconds: 120,
    reservationTtlSeconds: 600,
    cooldownSeconds: 10,
  },
});

export const INITIAL_PUBLIC_DEMO_BUDGET_POLICY = ManagedDemoBudgetPolicySchema.parse({
  ...SharedCompetitionPolicy,
  pool: "public",
  limits: {
    totalMicroUsd: 25_000_000,
    dailyMicroUsd: 5_000_000,
    perJourneyPreauthorizationMicroUsd: 100_000,
    totalJourneyAdmissions: 250,
    dailyJourneyAdmissions: 50,
    perSourceDailyJourneyAdmissions: 2,
    maxConcurrentJourneys: 2,
    queueCapacity: 10,
    queueTimeoutSeconds: 120,
    reservationTtlSeconds: 600,
    cooldownSeconds: 30,
  },
});

export const ManagedDemoAdmissionRequestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  journeyId: OpaqueIdSchema,
  sourceFingerprint: Sha256DigestSchema,
  requestedAt: TimestampSchema,
});
export type ManagedDemoAdmissionRequest = z.infer<typeof ManagedDemoAdmissionRequestSchema>;

const ManagedDemoUsageBindingShape = {
  schemaVersion: ContractVersionSchema,
  reservationId: OpaqueIdSchema,
  journeyId: OpaqueIdSchema,
  recordedAt: TimestampSchema,
} as const;

export const ManagedDemoNebiusUsageSchema = z.strictObject({
  ...ManagedDemoUsageBindingShape,
  provider: z.literal("nebius_token_factory"),
  role: ManagedDemoModelRoleSchema,
  modelId: GuardianModelIdSchema,
  promptTokens: TokenCountSchema,
  completionTokens: TokenCountSchema,
});
export type ManagedDemoNebiusUsage = z.infer<typeof ManagedDemoNebiusUsageSchema>;

export const ManagedDemoTavilyUsageSchema = z.strictObject({
  ...ManagedDemoUsageBindingShape,
  provider: z.literal("tavily"),
  operation: z.enum(["basic_search", "basic_extract"]),
  credits: z.literal(1),
});
export type ManagedDemoTavilyUsage = z.infer<typeof ManagedDemoTavilyUsageSchema>;

export const ManagedDemoUsageSchema = z.discriminatedUnion("provider", [
  ManagedDemoNebiusUsageSchema,
  ManagedDemoTavilyUsageSchema,
]);
export type ManagedDemoUsage = z.infer<typeof ManagedDemoUsageSchema>;

export const ManagedDemoNebiusUsageObservationSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    provider: z.literal("nebius_token_factory"),
    providerRequestId: ProviderRequestIdSchema,
    role: ManagedDemoModelRoleSchema,
    modelId: GuardianModelIdSchema,
    promptTokens: TokenCountSchema,
    completionTokens: TokenCountSchema,
    totalTokens: TokenCountSchema,
    observedAt: TimestampSchema,
  })
  .superRefine((usage, context) => {
    if (usage.promptTokens + usage.completionTokens !== usage.totalTokens) {
      context.addIssue({
        code: "custom",
        message: "Nebius total tokens must equal prompt plus completion tokens",
        path: ["totalTokens"],
      });
    }
  });
export type ManagedDemoNebiusUsageObservation = z.infer<
  typeof ManagedDemoNebiusUsageObservationSchema
>;

export const ManagedDemoTavilyUsageObservationSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  provider: z.literal("tavily"),
  providerRequestId: ProviderRequestIdSchema,
  operation: z.enum(["basic_search", "basic_extract"]),
  credits: z.literal(1),
  observedAt: TimestampSchema,
});
export type ManagedDemoTavilyUsageObservation = z.infer<
  typeof ManagedDemoTavilyUsageObservationSchema
>;

export const ManagedDemoUsageObservationSchema = z.discriminatedUnion("provider", [
  ManagedDemoNebiusUsageObservationSchema,
  ManagedDemoTavilyUsageObservationSchema,
]);
export type ManagedDemoUsageObservation = z.infer<typeof ManagedDemoUsageObservationSchema>;

function providerRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("provider usage envelope is invalid");
  }
  return value as Record<string, unknown>;
}

export function projectManagedDemoNebiusUsageObservation(
  value: unknown,
  expected: {
    readonly role: ManagedDemoModelRole;
    readonly modelId: string;
    readonly observedAt: string;
  },
): ManagedDemoNebiusUsageObservation {
  const response = providerRecord(value);
  const usage = providerRecord(response.usage);
  if (response.model !== expected.modelId) {
    throw new TypeError("Nebius usage model does not match the fixed assignment");
  }
  return ManagedDemoNebiusUsageObservationSchema.parse({
    schemaVersion: 1,
    provider: "nebius_token_factory",
    providerRequestId: response.id,
    role: expected.role,
    modelId: response.model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    observedAt: expected.observedAt,
  });
}

export function projectManagedDemoTavilyUsageObservation(
  value: unknown,
  expected: {
    readonly operation: "basic_search" | "basic_extract";
    readonly observedAt: string;
  },
): ManagedDemoTavilyUsageObservation {
  const response = providerRecord(value);
  return ManagedDemoTavilyUsageObservationSchema.parse({
    schemaVersion: 1,
    provider: "tavily",
    providerRequestId: response.request_id,
    operation: expected.operation,
    credits: 1,
    observedAt: expected.observedAt,
  });
}

export const ManagedDemoSettlementRequestSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    reservationId: OpaqueIdSchema,
    journeyId: OpaqueIdSchema,
    settledAt: TimestampSchema,
    outcome: z.enum(["completed", "failed"]),
    usage: z.array(ManagedDemoUsageSchema).max(MAX_MANAGED_DEMO_USAGE_ENTRIES),
  })
  .superRefine((request, context) => {
    if (request.outcome === "completed" && request.usage.length === 0) {
      context.addIssue({
        code: "custom",
        message: "completed journeys require provider usage",
        path: ["usage"],
      });
    }
    request.usage.forEach((usage, index) => {
      if (usage.reservationId !== request.reservationId) {
        context.addIssue({
          code: "custom",
          message: "usage reservation does not match settlement",
          path: ["usage", index, "reservationId"],
        });
      }
      if (usage.journeyId !== request.journeyId) {
        context.addIssue({
          code: "custom",
          message: "usage journey does not match settlement",
          path: ["usage", index, "journeyId"],
        });
      }
      if (Date.parse(usage.recordedAt) > Date.parse(request.settledAt)) {
        context.addIssue({
          code: "custom",
          message: "usage cannot be recorded after settlement",
          path: ["usage", index, "recordedAt"],
        });
      }
    });
  });
export type ManagedDemoSettlementRequest = z.infer<typeof ManagedDemoSettlementRequestSchema>;

export const ManagedDemoReservationStatusSchema = z.enum(["reserved", "settled", "forfeited"]);
export type ManagedDemoReservationStatus = z.infer<typeof ManagedDemoReservationStatusSchema>;

export const ManagedDemoBudgetSnapshotSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  policyId: z.string().min(1).max(80),
  policyVersion: VersionNumberSchema,
  pool: ManagedDemoPoolSchema,
  enabled: z.boolean(),
  totalReservedMicroUsd: MicroUsdSchema,
  totalSettledMicroUsd: MicroUsdSchema,
  dailyReservedMicroUsd: MicroUsdSchema,
  dailySettledMicroUsd: MicroUsdSchema,
  totalJourneyAdmissions: z.number().int().nonnegative().max(1_000_000),
  dailyJourneyAdmissions: z.number().int().nonnegative().max(1_000_000),
  totalCompletedJourneys: z.number().int().nonnegative().max(1_000_000),
  dailyCompletedJourneys: z.number().int().nonnegative().max(1_000_000),
  activeJourneys: z.number().int().nonnegative().max(1_000),
  capturedAt: TimestampSchema,
});
export type ManagedDemoBudgetSnapshot = z.infer<typeof ManagedDemoBudgetSnapshotSchema>;

export const ManagedDemoAdmissionResultSchema = z.discriminatedUnion("state", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    state: z.literal("admitted"),
    reservationId: OpaqueIdSchema,
    journeyId: OpaqueIdSchema,
    preauthorizedMicroUsd: MicroUsdSchema.min(1),
    expiresAt: TimestampSchema,
    budget: ManagedDemoBudgetSnapshotSchema,
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    state: z.literal("denied"),
    reason: z.enum([
      "disabled",
      "outside_window",
      "total_budget_exhausted",
      "daily_budget_exhausted",
      "total_journeys_exhausted",
      "daily_journeys_exhausted",
      "source_limit_exhausted",
      "concurrency_exhausted",
      "queue_full",
      "queue_timeout",
      "cooldown_active",
      "stale_price_evidence",
      "journey_replayed",
    ]),
    budget: ManagedDemoBudgetSnapshotSchema,
  }),
]);
export type ManagedDemoAdmissionResult = z.infer<typeof ManagedDemoAdmissionResultSchema>;

export const ManagedDemoSettlementResultSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  reservationId: OpaqueIdSchema,
  journeyId: OpaqueIdSchema,
  status: z.enum(["settled", "forfeited"]),
  chargedMicroUsd: MicroUsdSchema,
  budget: ManagedDemoBudgetSnapshotSchema,
});
export type ManagedDemoSettlementResult = z.infer<typeof ManagedDemoSettlementResultSchema>;

export const ManagedDemoDeploymentIdentitySchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  deploymentId: OpaqueIdSchema,
  pool: ManagedDemoPoolSchema,
  policyId: z.string().min(1).max(80),
  policyVersion: VersionNumberSchema,
});
export type ManagedDemoDeploymentIdentity = z.infer<typeof ManagedDemoDeploymentIdentitySchema>;

export const ManagedDemoOperatorPolicyUpdateSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    deploymentId: OpaqueIdSchema,
    expectedPolicyId: z.string().min(1).max(80),
    expectedPolicyVersion: VersionNumberSchema,
    replacement: ManagedDemoBudgetPolicySchema,
    reason: boundedVisibleText(240),
    updatedAt: TimestampSchema,
  })
  .superRefine((update, context) => {
    if (update.replacement.policyId !== update.expectedPolicyId) {
      context.addIssue({
        code: "custom",
        message: "replacement policy identifier does not match expectation",
        path: ["replacement", "policyId"],
      });
    }
    if (update.replacement.version !== update.expectedPolicyVersion + 1) {
      context.addIssue({
        code: "custom",
        message: "replacement policy version must advance exactly once",
        path: ["replacement", "version"],
      });
    }
  });
export type ManagedDemoOperatorPolicyUpdate = z.infer<typeof ManagedDemoOperatorPolicyUpdateSchema>;

export const ManagedDemoOperatorPriceUpdateSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    deploymentId: OpaqueIdSchema,
    expectedSnapshotId: OpaqueIdSchema,
    expectedSnapshotVersion: VersionNumberSchema,
    replacement: ManagedDemoPriceSnapshotSchema,
    reason: boundedVisibleText(240),
    updatedAt: TimestampSchema,
  })
  .superRefine((update, context) => {
    if (update.replacement.snapshotId !== update.expectedSnapshotId) {
      context.addIssue({
        code: "custom",
        message: "replacement price snapshot identifier does not match expectation",
        path: ["replacement", "snapshotId"],
      });
    }
    if (update.replacement.version !== update.expectedSnapshotVersion + 1) {
      context.addIssue({
        code: "custom",
        message: "replacement price snapshot version must advance exactly once",
        path: ["replacement", "version"],
      });
    }
  });
export type ManagedDemoOperatorPriceUpdate = z.infer<typeof ManagedDemoOperatorPriceUpdateSchema>;
