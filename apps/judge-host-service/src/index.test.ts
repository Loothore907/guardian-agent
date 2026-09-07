import { randomUUID } from "node:crypto";

import { JudgePortal, type ManagedDemoJudgeIngressSecretMaterial } from "@guardian/control-api";
import { INITIAL_JUDGE_DEMO_BUDGET_POLICY } from "@guardian/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  startProtectedJudgeHost,
  type ProtectedJudgeHostDependencies,
  type ProtectedJudgeHostRuntime,
} from "./index.js";

const openHosts: ProtectedJudgeHostRuntime[] = [];

afterEach(async () => {
  await Promise.allSettled(openHosts.splice(0).map(async (host) => await host.close()));
});

function researchConfig() {
  const deploymentId = randomUUID();
  const endpoint = "managed-demo-endpoint";
  const roles = [
    ["journey_controller", ["admission.request", "journey.settle"]],
    ["interaction_service", ["usage.record"]],
    ["guardian_service", ["usage.record"]],
    ["worker_service", ["usage.record"]],
    ["research_service", ["usage.record"]],
  ] as const;
  const capabilities = roles.map(([callerRole, allowedOperations]) => ({
    schemaVersion: 1 as const,
    capability: randomUUID(),
    callerRole,
    callerId: randomUUID(),
    deploymentId,
    allowedOperations,
    issuedAt: "2026-11-01T00:00:00.000Z",
    expiresAt: "2026-12-15T20:00:00.000Z",
  }));
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
  return {
    schemaVersion: 1 as const,
    executionMode: "research_only" as const,
    listen: { host: "127.0.0.1" as const, port: 4317 },
    expectedHost: "judge.agentic-guardian.com",
    deploymentId,
    principalId: randomUUID(),
    projectRoot: "/srv/guardian/source",
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
      serviceInstanceId: randomUUID(),
      endpoint,
      ledgerPath: "/var/lib/guardian/judge/campaign-budget.sqlite",
      deployment: {
        schemaVersion: 1 as const,
        deploymentId,
        pool: "judge" as const,
        policyId: INITIAL_JUDGE_DEMO_BUDGET_POLICY.policyId,
        policyVersion: INITIAL_JUDGE_DEMO_BUDGET_POLICY.version,
      },
      policy: INITIAL_JUDGE_DEMO_BUDGET_POLICY,
      prices: {
        schemaVersion: 1 as const,
        snapshotId: randomUUID(),
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
      },
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

function controlledDependencies(options: { failBudget?: boolean; failListen?: boolean } = {}) {
  const order: string[] = [];
  let secretsClosed = false;
  let budgetClosed = false;
  let resolveBudgetExit!: () => void;
  const budgetExited = new Promise<void>((resolve) => {
    resolveBudgetExit = resolve;
  });
  const secrets: ManagedDemoJudgeIngressSecretMaterial = {
    verifyBearerCredential: () => false,
    deriveSourceFingerprint: () => "a".repeat(64),
    close: () => {
      secretsClosed = true;
    },
  };
  const portal = new JudgePortal({
    scenarios: {},
    backend: { prepare: () => Promise.reject(new TypeError("should not prepare")) },
  });
  const portalClose = vi.spyOn(portal, "close");
  const dependencies = {
    createIngressSecrets: vi.fn(() => {
      order.push("secrets");
      return Promise.resolve(secrets);
    }),
    startBudget: vi.fn(() => {
      order.push("budget");
      if (options.failBudget) return Promise.reject(new TypeError("private budget detail"));
      return Promise.resolve({
        processId: 123,
        exited: budgetExited,
        close: () => {
          budgetClosed = true;
          resolveBudgetExit();
          return Promise.resolve();
        },
      });
    }),
    createBudget: vi.fn(() => {
      order.push("controller");
      return { begin: () => Promise.resolve({ state: "denied" as const }) };
    }),
    createPortal: vi.fn(() => {
      order.push("portal");
      return portal;
    }),
    listen: vi.fn(() => {
      order.push("listen");
      return options.failListen
        ? Promise.reject(new TypeError("private listener detail"))
        : Promise.resolve();
    }),
  } satisfies Partial<ProtectedJudgeHostDependencies>;
  return {
    dependencies,
    order,
    portalClose,
    resolveBudgetExit,
    secretsClosed: () => secretsClosed,
    budgetClosed: () => budgetClosed,
  };
}

describe("protected judge host composition", () => {
  it("starts an inert disabled host without touching secrets or budget", async () => {
    const createIngressSecrets = vi.fn();
    const startBudget = vi.fn();
    const host = await startProtectedJudgeHost(
      {
        schemaVersion: 1,
        executionMode: "disabled",
        listen: { host: "127.0.0.1", port: 4317 },
      },
      {
        createIngressSecrets,
        startBudget,
        listen: () => Promise.resolve(),
      },
    );
    openHosts.push(host);

    expect((await host.app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    expect(createIngressSecrets).not.toHaveBeenCalled();
    expect(startBudget).not.toHaveBeenCalled();
  });

  it("builds research-only dependencies before listening and omits mutation ingress", async () => {
    const controlled = controlledDependencies();
    const host = await startProtectedJudgeHost(researchConfig(), controlled.dependencies);
    openHosts.push(host);

    expect(controlled.order).toEqual(["secrets", "budget", "controller", "portal", "listen"]);
    const legacy = await host.app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      payload: { schemaVersion: 1, objective: "not enabled" },
    });
    expect(legacy.statusCode).toBe(404);
    const unauthorized = await host.app.inject({
      method: "POST",
      url: "/v1/judge/draft",
      payload: {
        schemaVersion: 1,
        mode: "piloted",
        scope: {
          objective: "Review public material",
          researchUrls: ["https://example.com/update"],
          githubTarget: null,
          durationSeconds: 300,
        },
      },
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(controlled.dependencies.createBudget).toHaveBeenCalledOnce();
  });

  it("closes loaded secrets when budget startup fails", async () => {
    const controlled = controlledDependencies({ failBudget: true });
    await expect(
      startProtectedJudgeHost(researchConfig(), controlled.dependencies),
    ).rejects.toThrow("protected judge host failed to start");
    expect(controlled.secretsClosed()).toBe(true);
    expect(controlled.portalClose).not.toHaveBeenCalled();
  });

  it("closes the app, portal, secrets, and budget when listening fails", async () => {
    const controlled = controlledDependencies({ failListen: true });
    await expect(
      startProtectedJudgeHost(researchConfig(), controlled.dependencies),
    ).rejects.toThrow("protected judge host failed to start");
    expect(controlled.portalClose).toHaveBeenCalledOnce();
    expect(controlled.secretsClosed()).toBe(true);
    expect(controlled.budgetClosed()).toBe(true);
  });

  it("closes the HTTP composition after an unexpected budget child exit", async () => {
    const controlled = controlledDependencies();
    const host = await startProtectedJudgeHost(researchConfig(), controlled.dependencies);
    openHosts.push(host);
    controlled.resolveBudgetExit();
    await vi.waitFor(() => {
      expect(controlled.portalClose).toHaveBeenCalledOnce();
      expect(controlled.secretsClosed()).toBe(true);
    });
  });
});
