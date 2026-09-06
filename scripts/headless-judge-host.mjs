import { buildControlApi } from "../apps/control-api/dist/app.js";
import { DefaultManagedDemoJudgeJourneyCoordinator } from "../apps/control-api/dist/judge-ingress.js";
import { JudgePortal } from "../apps/control-api/dist/judge-portal.js";
import { BudgetedJudgePortalBackend } from "../apps/control-api/dist/judge-portal-budget.js";
import {
  SupervisorJudgePortalRuntime,
  JudgeMutationFixturePool,
} from "../apps/reference-supervisor/dist/index.js";
import {
  HeadlessJudgeSessionExecutor,
  startReferenceAuthoritySupervisor,
} from "../apps/reference-supervisor/dist/index.js";

/** Trusted host composition only. No deployment settings are accepted from HTTP. */
export function buildHeadlessJudgeHost({
  execution,
  budget,
  secrets,
  expectedHost,
  logger = true,
  portal,
}) {
  const executor = new HeadlessJudgeSessionExecutor({
    ...execution,
    startSupervisor: startReferenceAuthoritySupervisor,
  });
  try {
    const coordinator = new DefaultManagedDemoJudgeJourneyCoordinator({ budget, executor });
    const app = buildControlApi({
      logger,
      judge: {
        deploymentId: execution.deployment.authorization.deploymentId,
        expectedHost,
        secrets,
        coordinator,
        ...(portal === undefined ? {} : { portal }),
      },
    });
    app.addHook("onClose", () => {
      executor.close();
      return Promise.resolve();
    });
    return app;
  } catch (error) {
    executor.close();
    secrets.close();
    throw error;
  }
}

/** Explicit trusted composition only. Nothing calls this or registers live
 * scenarios by default. External resource and acceptance gates still apply. */
export function buildRuntimeJudgePortal({
  runtime: runtimeOptions,
  deploymentId,
  budget,
  fixtureRoot,
  mutationScopes = [],
  readOnlyScenarios = {},
}) {
  const runtime = new SupervisorJudgePortalRuntime({
    ...runtimeOptions,
    startSupervisor: startReferenceAuthoritySupervisor,
  });
  const pool = new JudgeMutationFixturePool(fixtureRoot, mutationScopes);
  const scenarios = {};
  for (const [id, scope] of Object.entries(readOnlyScenarios)) {
    if (!["unauthorized_destination", "read_to_write"].includes(id))
      throw new TypeError("invalid read-only scenario");
    const fixed = structuredClone(scope);
    if (fixed.githubTarget?.operation === "github.pull_request.merge")
      throw new TypeError("mutation requires a fixture reservation");
    scenarios[id] = async () => structuredClone(fixed);
  }
  if (mutationScopes.length) scenarios.action_substitution = () => pool.reserve();
  return new JudgePortal({
    scenarios,
    backend: new BudgetedJudgePortalBackend({
      deploymentId,
      budget,
      prepareRuntime: async (input) => {
        if (
          input.mode === "piloted" &&
          input.scope.githubTarget?.operation === "github.pull_request.merge"
        )
          await pool.reserveTarget(input.scope);
        return runtime.prepare(input);
      },
    }),
  });
}
