import { z } from "zod";

import {
  boundedVisibleText,
  ContractVersionSchema,
  type DeepReadonly,
  VersionNumberSchema,
} from "./common.js";

export const GuardianModelPolicyIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u);
export const GuardianModelIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/u);

const MissionDialogueSelectionSchema = z.strictObject({
  provider: z.literal("nebius_token_factory"),
  role: z.literal("mission_dialogue"),
  modelId: GuardianModelIdSchema,
});

const NativeWorkerSelectionSchema = z.strictObject({
  provider: z.literal("nebius_token_factory"),
  role: z.literal("native_worker"),
  modelId: GuardianModelIdSchema,
});

const ContextualRiskSelectionSchema = z.strictObject({
  provider: z.literal("nebius_token_factory"),
  role: z.enum(["contextual_risk_primary", "contextual_risk_escalation"]),
  modelId: GuardianModelIdSchema,
});

export const GuardianModelPolicySchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    policyId: GuardianModelPolicyIdSchema,
    version: VersionNumberSchema,
    description: boundedVisibleText(200),
    nativeWorker: NativeWorkerSelectionSchema,
    missionDialogue: MissionDialogueSelectionSchema,
    contextualRiskPrimary: ContextualRiskSelectionSchema.extend({
      role: z.literal("contextual_risk_primary"),
    }),
    contextualRiskEscalation: ContextualRiskSelectionSchema.extend({
      role: z.literal("contextual_risk_escalation"),
    }),
    competitionRequirements: z.strictObject({
      nvidiaRiskModelRequired: z.literal(true),
      nemotronRiskModelRequired: z.literal(true),
    }),
  })
  .superRefine((policy, context) => {
    const riskModels = [
      policy.contextualRiskPrimary.modelId,
      policy.contextualRiskEscalation.modelId,
    ];
    if (
      riskModels.some(
        (modelId) =>
          !modelId.toLowerCase().startsWith("nvidia/") ||
          !modelId.toLowerCase().includes("nemotron"),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "competition risk roles require NVIDIA Nemotron models",
        path: ["contextualRiskPrimary"],
      });
    }
    if (new Set(riskModels).size !== riskModels.length) {
      context.addIssue({
        code: "custom",
        message: "primary and escalation risk models must differ",
        path: ["contextualRiskEscalation"],
      });
    }
  });
export type GuardianModelPolicy = DeepReadonly<z.infer<typeof GuardianModelPolicySchema>>;

export const COMPETITION_GUARDIAN_MODEL_POLICY_V1 = GuardianModelPolicySchema.parse({
  schemaVersion: 1,
  policyId: "competition-2026-09-01",
  version: 1,
  description:
    "Nebius-native hackathon policy with an upgradeable worker and mandatory Nemotron risk roles.",
  nativeWorker: {
    provider: "nebius_token_factory",
    role: "native_worker",
    modelId: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
  },
  missionDialogue: {
    provider: "nebius_token_factory",
    role: "mission_dialogue",
    modelId: "Qwen/Qwen3-235B-A22B-Instruct-2507",
  },
  contextualRiskPrimary: {
    provider: "nebius_token_factory",
    role: "contextual_risk_primary",
    modelId: "nvidia/nemotron-3-super-120b-a12b",
  },
  contextualRiskEscalation: {
    provider: "nebius_token_factory",
    role: "contextual_risk_escalation",
    modelId: "nvidia/Nemotron-3-Ultra-550b-a55b",
  },
  competitionRequirements: {
    nvidiaRiskModelRequired: true,
    nemotronRiskModelRequired: true,
  },
});

export const DEFAULT_GUARDIAN_MODEL_POLICY = GuardianModelPolicySchema.parse({
  ...COMPETITION_GUARDIAN_MODEL_POLICY_V1,
  version: 2,
  description:
    "Nebius-native hackathon policy with Kimi K2.7 Code worker and mandatory Nemotron risk roles.",
  nativeWorker: {
    provider: "nebius_token_factory",
    role: "native_worker",
    modelId: "moonshotai/Kimi-K2.7-Code",
  },
});

function policyKey(policyId: string, version: number): string {
  return `${policyId}@${version}`;
}

const BUILT_IN_POLICIES = new Map<string, GuardianModelPolicy>([
  [
    policyKey(
      COMPETITION_GUARDIAN_MODEL_POLICY_V1.policyId,
      COMPETITION_GUARDIAN_MODEL_POLICY_V1.version,
    ),
    COMPETITION_GUARDIAN_MODEL_POLICY_V1,
  ],
  [
    policyKey(DEFAULT_GUARDIAN_MODEL_POLICY.policyId, DEFAULT_GUARDIAN_MODEL_POLICY.version),
    DEFAULT_GUARDIAN_MODEL_POLICY,
  ],
]);

export function resolveBuiltInGuardianModelPolicy(
  value: unknown,
  versionValue: unknown,
): GuardianModelPolicy {
  const policyId = GuardianModelPolicyIdSchema.parse(value);
  const version = VersionNumberSchema.parse(versionValue);
  const policy = BUILT_IN_POLICIES.get(policyKey(policyId, version));
  if (policy === undefined) throw new TypeError("guardian model policy is unavailable");
  return policy;
}
