import { posix } from "node:path";

import {
  BudgetedJudgePortalBackend,
  InMemoryManagedDemoJudgeIngressSecrets,
  JudgePortal,
  buildControlApi,
  type ManagedDemoJudgeBudgetController,
  type ManagedDemoJudgeIngressSecretMaterial,
} from "@guardian/control-api";
import {
  ProtectedJudgeHostConfigSchema,
  type ResearchOnlyProtectedJudgeHostConfigSchema,
} from "@guardian/contracts";
import { useManagedDemoJudgeIngressSecrets } from "@guardian/credential-store";
import { ManagedDemoJourneyBudgetController } from "@guardian/managed-demo-budget-client";
import {
  SupervisorJudgePortalRuntime,
  startReferenceAuthoritySupervisor,
} from "@guardian/reference-supervisor";

import { startManagedDemoBudgetChild, type ManagedDemoBudgetChild } from "./budget-child.js";

type ResearchOnlyConfig = ReturnType<typeof ResearchOnlyProtectedJudgeHostConfigSchema.parse>;
type ControlApi = ReturnType<typeof buildControlApi>;

export interface ProtectedJudgeHostRuntime {
  readonly app: ControlApi;
  close(): Promise<void>;
}

export interface ProtectedJudgeHostDependencies {
  createIngressSecrets(config: ResearchOnlyConfig): Promise<ManagedDemoJudgeIngressSecretMaterial>;
  startBudget(config: ResearchOnlyConfig): Promise<ManagedDemoBudgetChild>;
  createBudget(config: ResearchOnlyConfig): ManagedDemoJudgeBudgetController;
  createPortal(config: ResearchOnlyConfig, budget: ManagedDemoJudgeBudgetController): JudgePortal;
  createApp(options: Parameters<typeof buildControlApi>[0]): ControlApi;
  listen(app: ControlApi, host: "127.0.0.1", port: number): Promise<unknown>;
}

function assertPrivateRoots(config: ResearchOnlyConfig): void {
  const relation = posix.relative(config.projectRoot, config.stateRoot);
  if (
    !posix.isAbsolute(config.projectRoot) ||
    !posix.isAbsolute(config.stateRoot) ||
    relation === "" ||
    (relation !== ".." && !relation.startsWith("../") && !posix.isAbsolute(relation))
  ) {
    throw new TypeError("protected judge host roots are invalid");
  }
}

const defaultDependencies: ProtectedJudgeHostDependencies = {
  createIngressSecrets: async (config) =>
    await useManagedDemoJudgeIngressSecrets(
      config.ingressSecrets,
      (secrets) => new InMemoryManagedDemoJudgeIngressSecrets(secrets),
    ),
  startBudget: async (config) => await startManagedDemoBudgetChild(config.budgetService),
  createBudget: (config) => new ManagedDemoJourneyBudgetController(config.budgetClients),
  createPortal: (config, budget) => {
    const { schemaVersion, kind, sourceArchiveSha256, entries } = config.sourceManifest;
    const runtime = new SupervisorJudgePortalRuntime({
      projectRoot: config.projectRoot,
      sourceManifest: { schemaVersion, kind, sourceArchiveSha256, entries },
      stateRoot: config.stateRoot,
      credentialStore: config.credentialStore,
      principalId: config.principalId,
      startSupervisor: startReferenceAuthoritySupervisor,
    });
    return new JudgePortal({
      scenarios: {},
      backend: new BudgetedJudgePortalBackend({
        deploymentId: config.deploymentId,
        budget,
        prepareRuntime: async (input) => await runtime.prepare(input),
      }),
    });
  },
  createApp: (options) => buildControlApi(options),
  listen: async (app, host, port) => await app.listen({ host, port }),
};

export async function startProtectedJudgeHost(
  configValue: unknown,
  overrides: Partial<ProtectedJudgeHostDependencies> = {},
): Promise<ProtectedJudgeHostRuntime> {
  const config = ProtectedJudgeHostConfigSchema.parse(configValue);
  const dependencies = { ...defaultDependencies, ...overrides };
  let secrets: ManagedDemoJudgeIngressSecretMaterial | undefined;
  let budgetChild: ManagedDemoBudgetChild | undefined;
  let portal: JudgePortal | undefined;
  let app: ControlApi | undefined;
  let closing = false;
  let closePromise: Promise<void> | undefined;
  const close = () =>
    (closePromise ??= (async () => {
      closing = true;
      const results = await Promise.allSettled([
        app?.close(),
        app === undefined ? portal?.close() : undefined,
        budgetChild?.close(),
      ]);
      if (app === undefined) secrets?.close();
      const failure = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (failure !== undefined) throw failure.reason;
    })());

  try {
    if (config.executionMode === "disabled") {
      app = dependencies.createApp({ logger: false });
    } else {
      assertPrivateRoots(config);
      secrets = await dependencies.createIngressSecrets(config);
      budgetChild = await dependencies.startBudget(config);
      const budget = dependencies.createBudget(config);
      portal = dependencies.createPortal(config, budget);
      app = dependencies.createApp({
        logger: false,
        judge: {
          deploymentId: config.deploymentId,
          expectedHost: config.expectedHost,
          secrets,
          portal,
        },
      });
      void budgetChild.exited.then(() => {
        if (!closing) void close().catch(() => undefined);
      });
    }
    await dependencies.listen(app, config.listen.host, config.listen.port);
    return { app, close };
  } catch {
    await close().catch(() => undefined);
    throw new TypeError("protected judge host failed to start");
  }
}
