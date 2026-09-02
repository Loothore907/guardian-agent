import { describe, expect, it } from "vitest";

import {
  DEFAULT_GUARDIAN_MODEL_POLICY,
  GuardianModelPolicySchema,
  resolveBuiltInGuardianModelPolicy,
} from "./model-policy.js";

describe("Guardian model policy", () => {
  it("pins reproducible current defaults behind a versioned policy identifier", () => {
    expect(resolveBuiltInGuardianModelPolicy("competition-2026-09-01")).toEqual(
      DEFAULT_GUARDIAN_MODEL_POLICY,
    );
    expect(DEFAULT_GUARDIAN_MODEL_POLICY.missionDialogue.modelId).toBe(
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
    );
    expect(DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker).toEqual({
      provider: "nebius_token_factory",
      role: "native_worker",
      modelId: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    });
    expect(DEFAULT_GUARDIAN_MODEL_POLICY.contextualRiskPrimary.modelId).toContain("nemotron");
  });

  it("allows a worker upgrade only through a new validated policy version", () => {
    const upgraded = GuardianModelPolicySchema.parse({
      ...DEFAULT_GUARDIAN_MODEL_POLICY,
      policyId: "competition-worker-upgrade-fixture",
      version: 2,
      nativeWorker: {
        ...DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker,
        modelId: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      },
    });
    expect(upgraded.nativeWorker.modelId).toBe("Qwen/Qwen3-Coder-480B-A35B-Instruct");
  });

  it("allows a mission-dialogue upgrade while retaining mandatory NVIDIA Nemotron risk roles", () => {
    expect(
      GuardianModelPolicySchema.parse({
        ...DEFAULT_GUARDIAN_MODEL_POLICY,
        policyId: "competition-dialogue-upgrade-fixture",
        version: 2,
        missionDialogue: {
          ...DEFAULT_GUARDIAN_MODEL_POLICY.missionDialogue,
          modelId: "zai-org/future-dialogue-model",
        },
      }).missionDialogue.modelId,
    ).toBe("zai-org/future-dialogue-model");
  });

  it("rejects arbitrary policy identifiers and removal of the Nemotron competition presence", () => {
    expect(() => resolveBuiltInGuardianModelPolicy("caller-selected-model")).toThrow(
      "policy is unavailable",
    );
    expect(() =>
      GuardianModelPolicySchema.parse({
        ...DEFAULT_GUARDIAN_MODEL_POLICY,
        policyId: "invalid-risk-model",
        contextualRiskPrimary: {
          ...DEFAULT_GUARDIAN_MODEL_POLICY.contextualRiskPrimary,
          modelId: "other/vendor-model",
        },
      }),
    ).toThrow("require NVIDIA Nemotron");
  });
});
