import { describe, expect, it } from "vitest";

import {
  INITIAL_JUDGE_DEMO_BUDGET_POLICY,
  ProtectedJudgeHostConfigSchema,
  ProtectedJudgeSourceManifestSchema,
} from "./index.js";

const IDS = {
  deployment: "11111111-1111-4111-8111-111111111111",
  principal: "22222222-2222-4222-8222-222222222222",
  service: "33333333-3333-4333-8333-333333333333",
  snapshot: "44444444-4444-4444-8444-444444444444",
  callers: [
    "55555555-5555-4555-8555-555555555550",
    "55555555-5555-4555-8555-555555555551",
    "55555555-5555-4555-8555-555555555552",
    "55555555-5555-4555-8555-555555555553",
    "55555555-5555-4555-8555-555555555554",
  ],
  capabilities: [
    "66666666-6666-4666-8666-666666666660",
    "66666666-6666-4666-8666-666666666661",
    "66666666-6666-4666-8666-666666666662",
    "66666666-6666-4666-8666-666666666663",
    "66666666-6666-4666-8666-666666666664",
  ],
} as const;
const SOURCE_MANIFEST = {
  schemaVersion: 1 as const,
  kind: "immutable_file_manifest" as const,
  executionMode: "disabled" as const,
  gitCommit: "a".repeat(40),
  lockfileSha256: "b".repeat(64),
  sourceArchiveSha256: "c".repeat(64),
  entries: [
    {
      path: "pnpm-lock.yaml",
      digest: "b".repeat(64),
      size: 10,
      executable: false,
    },
  ],
  nodeVersion: "v24.19.0",
  pnpmVersion: "11.19.0",
  listenHost: "127.0.0.1" as const,
  requiredSecretSlots: [
    "access_credential_sha256",
    "source_fingerprint_key",
    "nebius/default",
    "tavily/default",
  ] as const,
};

function researchConfig() {
  const roles = [
    ["journey_controller", ["admission.request", "journey.settle"]],
    ["interaction_service", ["usage.record"]],
    ["guardian_service", ["usage.record"]],
    ["worker_service", ["usage.record"]],
    ["research_service", ["usage.record"]],
  ] as const;
  const capabilities = roles.map(([callerRole, allowedOperations], index) => ({
    schemaVersion: 1 as const,
    capability: IDS.capabilities[index]!,
    callerRole,
    callerId: IDS.callers[index]!,
    deploymentId: IDS.deployment,
    allowedOperations,
    issuedAt: "2026-11-01T00:00:00.000Z",
    expiresAt: "2026-12-15T20:00:00.000Z",
  }));
  const endpoint = "managed-demo-endpoint";
  const client = (index: number) => ({
    schemaVersion: 1 as const,
    endpoint,
    binding: capabilities[index]!,
  });
  const location = {
    schemaVersion: 1 as const,
    custodyProfile: "managed_demo" as const,
    pool: "judge" as const,
    runtime: "linux" as const,
    storeTarget: "nebius_secretstash" as const,
  };
  const prices = {
    schemaVersion: 1 as const,
    snapshotId: IDS.snapshot,
    version: 1,
    modelPolicyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.modelPolicyId,
    modelPolicyVersion: INITIAL_JUDGE_DEMO_BUDGET_POLICY.modelPolicyVersion,
    models: INITIAL_JUDGE_DEMO_BUDGET_POLICY.models.map((model) => ({
      role: model.role,
      modelId: model.modelId,
      inputMicroUsdPerMillionTokens: 1,
      outputMicroUsdPerMillionTokens: 1,
    })),
    tavilyMicroUsdPerCredit: 8_000,
    evidence: {
      capturedAt: "2026-11-01T00:00:00.000Z",
      expiresAt: "2026-12-15T20:00:00.000Z",
    },
  };
  return {
    schemaVersion: 1 as const,
    executionMode: "research_only" as const,
    listen: { host: "127.0.0.1" as const, port: 4317 },
    expectedHost: "judge.agentic-guardian.com",
    deploymentId: IDS.deployment,
    principalId: IDS.principal,
    projectRoot: "/srv/guardian/source",
    sourceManifest: SOURCE_MANIFEST,
    stateRoot: "/var/lib/guardian/judge",
    credentialStore: {
      schemaVersion: 1 as const,
      custodyProfile: "managed_demo" as const,
      pool: "judge" as const,
      resources: [
        {
          schemaVersion: 1 as const,
          location,
          reference: { schemaVersion: 1 as const, provider: "nebius" as const, slot: "default" },
          secretId: "mbsec-judgenebius123",
          payloadKey: "nebius_api_key" as const,
        },
        {
          schemaVersion: 1 as const,
          location,
          reference: { schemaVersion: 1 as const, provider: "tavily" as const, slot: "default" },
          secretId: "mbsec-judgetavily123",
          payloadKey: "tavily_api_key" as const,
        },
      ],
    },
    ingressSecrets: {
      schemaVersion: 1 as const,
      custodyProfile: "managed_demo" as const,
      pool: "judge" as const,
      resources: [
        {
          schemaVersion: 1 as const,
          location,
          slot: "access_credential_sha256" as const,
          secretId: "mbsec-judgeaccess123",
          payloadKey: "judge_access_credential_sha256" as const,
        },
        {
          schemaVersion: 1 as const,
          location,
          slot: "source_fingerprint_key" as const,
          secretId: "mbsec-judgefingerprint123",
          payloadKey: "judge_source_fingerprint_key" as const,
        },
      ],
    },
    budgetService: {
      schemaVersion: 1 as const,
      serviceInstanceId: IDS.service,
      endpoint,
      ledgerPath: "/var/lib/guardian/judge/campaign-budget.sqlite",
      deployment: {
        schemaVersion: 1 as const,
        deploymentId: IDS.deployment,
        pool: "judge" as const,
        policyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.policyId,
        policyVersion: INITIAL_JUDGE_DEMO_BUDGET_POLICY.version,
      },
      policy: INITIAL_JUDGE_DEMO_BUDGET_POLICY,
      prices,
      capabilities,
    },
    budgetClients: {
      schemaVersion: 1 as const,
      controller: client(0),
      usage: {
        interaction: client(1),
        guardian: client(2),
        worker: client(3),
        research: client(4),
      },
    },
  };
}

describe("protected judge host contracts", () => {
  it("accepts an inert loopback-only disabled startup", () => {
    const config = {
      schemaVersion: 1,
      executionMode: "disabled",
      listen: { host: "127.0.0.1", port: 4317 },
    } as const;
    expect(ProtectedJudgeHostConfigSchema.parse(config)).toEqual(config);
    expect(() =>
      ProtectedJudgeHostConfigSchema.parse({
        ...config,
        listen: { host: "0.0.0.0", port: 4317 },
      }),
    ).toThrow();
    expect(() => ProtectedJudgeHostConfigSchema.parse({ ...config, command: "node" })).toThrow();
  });

  it("binds research-only startup to Nebius, Tavily, ingress, and one budget service", () => {
    const config = researchConfig();
    expect(ProtectedJudgeHostConfigSchema.parse(config)).toEqual(config);
    expect(() =>
      ProtectedJudgeHostConfigSchema.parse({
        ...config,
        credentialStore: {
          ...config.credentialStore,
          resources: [config.credentialStore.resources[0]],
        },
      }),
    ).toThrow(/exactly Nebius and Tavily/u);
    expect(() =>
      ProtectedJudgeHostConfigSchema.parse({
        ...config,
        budgetClients: {
          ...config.budgetClients,
          controller: {
            ...config.budgetClients.controller,
            endpoint: "another-endpoint",
          },
        },
      }),
    ).toThrow(/configured service|share one exact endpoint/u);
    expect(() =>
      ProtectedJudgeHostConfigSchema.parse({
        ...config,
        budgetService: {
          ...config.budgetService,
          deployment: {
            ...config.budgetService.deployment,
            deploymentId: "77777777-7777-4777-8777-777777777777",
          },
        },
      }),
    ).toThrow();
  });

  it("keeps the public source manifest credential-free and disabled", () => {
    const manifest = {
      ...SOURCE_MANIFEST,
    } as const;
    expect(ProtectedJudgeSourceManifestSchema.parse(manifest)).toEqual(manifest);
    expect(() =>
      ProtectedJudgeSourceManifestSchema.parse({ ...manifest, secretId: "mbsec-private123" }),
    ).toThrow();
    expect(() =>
      ProtectedJudgeSourceManifestSchema.parse({ ...manifest, executionMode: "research_only" }),
    ).toThrow();
    expect(() =>
      ProtectedJudgeSourceManifestSchema.parse({
        ...manifest,
        entries: [...manifest.entries, manifest.entries[0]],
      }),
    ).toThrow(/duplicate/u);
    expect(() =>
      ProtectedJudgeSourceManifestSchema.parse({
        ...manifest,
        lockfileSha256: "e".repeat(64),
      }),
    ).toThrow(/lockfile digest/u);
    expect(() =>
      ProtectedJudgeSourceManifestSchema.parse({
        ...manifest,
        entries: [manifest.entries[0], { ...manifest.entries[0], path: "PNPM-LOCK.YAML" }],
      }),
    ).toThrow(/case-colliding/u);
  });
});
