import { randomUUID } from "node:crypto";
import { mkdir, lstat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { canonicalDigest } from "@guardian/canonical";
import {
  CredentialStoreConfigSchema,
  JudgeTaskScopeSchema,
  JudgePortalRunResultSchema,
  OpaqueIdSchema,
  SessionDraftPreviewSchema,
  type JudgeTaskScope,
  type JudgeScenarioId,
  type ManagedDemoJourneyUsageReporters,
  type DeploymentAuthorization,
  type JudgePortalRunResult,
} from "@guardian/contracts";
import type { startReferenceAuthoritySupervisor } from "./index.js";
import { judgeRuntimeScope } from "./judge-runtime-scope.js";

/** Trusted runtime adapter; access credentials and HTTP inputs cannot supply
 * provider settings, connection IDs, standing consent or a worker factory. */
export class SupervisorJudgePortalRuntime {
  readonly #credentialStore;
  readonly #options;
  constructor(options: {
    projectRoot: string;
    stateRoot: string;
    credentialStore: unknown;
    principalId: string;
    connection?: {
      connectionId: string;
      owner: string;
      repository: string;
      githubClientId: string;
    };
    seededAuthorization?: (
      scenarioId: JudgeScenarioId,
      scope: JudgeTaskScope,
    ) => DeploymentAuthorization;
    now?: () => string;
    startSupervisor: typeof startReferenceAuthoritySupervisor;
  }) {
    const path = relative(options.projectRoot, options.stateRoot);
    if (
      !isAbsolute(options.projectRoot) ||
      !isAbsolute(options.stateRoot) ||
      (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path))
    )
      throw new TypeError("judge state must be outside the source workspace");
    OpaqueIdSchema.parse(options.principalId);
    if (options.connection) OpaqueIdSchema.parse(options.connection.connectionId);
    this.#credentialStore = CredentialStoreConfigSchema.parse(options.credentialStore);
    this.#options = {
      ...options,
      connection: options.connection === undefined ? undefined : { ...options.connection },
    };
  }

  async prepare(input: {
    mode: "seeded" | "piloted";
    scenarioId: JudgeScenarioId | null;
    scope: JudgeTaskScope;
    sourceFingerprint: string;
    journeyId: string;
    reporters: ManagedDemoJourneyUsageReporters;
  }) {
    const scope = JudgeTaskScopeSchema.parse(input.scope);
    const now = this.#options.now ?? (() => new Date().toISOString());
    const connection = this.#options.connection;
    if (
      scope.githubTarget !== null &&
      (!connection ||
        scope.githubTarget.owner !== connection.owner ||
        scope.githubTarget.repository !== connection.repository)
    )
      throw new TypeError("judge connection unavailable");
    const target = scope.githubTarget;
    const sessionPlan =
      target === null
        ? undefined
        : {
            maxActions: target.operation === "github.pull_request.merge" ? 2 : 1,
            maxMutations: target.operation === "github.pull_request.merge" ? 1 : 0,
            mutationRetries: 0,
            targets: [
              {
                ...target,
                operation: "github.pull_request.read",
                connectionId: connection!.connectionId,
              },
              ...(target.operation === "github.pull_request.merge"
                ? [{ ...target, connectionId: connection!.connectionId }]
                : []),
            ],
          };
    const expected = judgeRuntimeScope(scope, sessionPlan);
    // Seeded execution requires its own exact trusted standing authorization.
    const deploymentAuthorization =
      input.mode === "seeded" && input.scenarioId !== null
        ? this.#options.seededAuthorization?.(input.scenarioId, scope)
        : undefined;
    if (input.mode === "seeded" && deploymentAuthorization === undefined)
      throw new TypeError("seeded standing authorization unavailable");
    const journeyId = OpaqueIdSchema.parse(input.journeyId);
    const root = join(this.#options.stateRoot, journeyId);
    const metadata = await lstat(this.#options.stateRoot);
    if (
      !metadata.isDirectory() ||
      metadata.isSymbolicLink() ||
      (process.platform !== "win32" &&
        ((metadata.mode & 0o077) !== 0 || metadata.uid !== process.getuid?.()))
    )
      throw new TypeError("judge state is not private");
    await mkdir(root, { mode: 0o700 });
    const issuedAt = now();
    const evidence: JudgePortalRunResult["evidence"] = [];
    const start = this.#options.startSupervisor;
    const supervisor = await start(
      {
        sessionId: journeyId,
        callerId: randomUUID(),
        projectRoot: this.#options.projectRoot,
        authorityStorePath: join(root, "authority.sqlite"),
        workspaceRoots: [join(root, "workspaces")],
        issuedAt,
        expiresAt: new Date(Date.parse(issuedAt) + 600_000).toISOString(),
        credentialStore: this.#credentialStore,
        ...(sessionPlan === undefined ? {} : { sessionPlan }),
        ...(deploymentAuthorization === undefined ? {} : { deploymentAuthorization }),
      },
      {
        judgeScope: scope,
        workerMode: "nebius_native",
        riskProcess: "nemotron",
        managedDemoBudget: input.reporters,
        ...(connection === undefined ? {} : { githubClientId: connection.githubClientId }),
        now,
        observeWorker: (event) => {
          if (event.kind === "turn") {
            if (
              event.turn.previousToolResult?.outcome === "succeeded" &&
              ((event.turn.previousToolResult.name === "guardian.research" &&
                (Array.isArray(event.turn.previousToolResult.output.evidence)
                  ? event.turn.previousToolResult.output.evidence.length > 0
                  : true)) ||
                (event.turn.previousToolResult.name === "github.pull_request.read" &&
                  event.turn.previousToolResult.output.review !== undefined))
            )
              evidence.push({ kind: "content_exposed", origin: "worker", action: "none" });
            if (event.result.outcome.kind === "tool_request") {
              const action = event.result.outcome.request.name;
              if (
                action === "guardian.research" ||
                action === "github.pull_request.read" ||
                action === "github.pull_request.merge"
              )
                evidence.push({ kind: "action_attempted", origin: "worker", action });
            }
          } else {
            const action = event.result.name;
            if (
              action === "guardian.research" ||
              action === "github.pull_request.read" ||
              action === "github.pull_request.merge"
            )
              evidence.push({
                kind: event.result.outcome === "succeeded" ? "action_allowed" : "action_denied",
                origin: "runtime",
                action,
              });
          }
        },
      },
    );
    let closed = false,
      started = false;
    let closing: Promise<void> | undefined;
    const close = () => {
      closed = true;
      return (closing ??= supervisor.close());
    };
    try {
      const preview = SessionDraftPreviewSchema.parse(
        supervisor.bootstrap.createDraft({ schemaVersion: 1, objective: scope.objective }),
      );
      if (
        preview.objective !== scope.objective ||
        canonicalDigest("judge.constraints", 1, preview.constraints) !==
          canonicalDigest("judge.constraints", 1, expected.constraints) ||
        canonicalDigest("judge.permissions", 1, preview.permissions) !==
          canonicalDigest("judge.permissions", 1, expected.permissions) ||
        canonicalDigest("judge.plan", 1, preview.sessionPlan ?? null) !==
          canonicalDigest("judge.plan", 1, expected.plan ?? null) ||
        preview.workerMaxTurns !== 8 ||
        preview.worker.kind !== "nebius_native" ||
        canonicalDigest("judge.tools", 1, preview.workerTools) !==
          canonicalDigest("judge.tools", 1, expected.workerTools)
      )
        throw new TypeError("supervisor preview differs from portal scope");
      return {
        scope: structuredClone(scope),
        bindingDigest: canonicalDigest("judge.runtime", 1, {
          journeyId,
          sourceFingerprint: input.sourceFingerprint,
          previewDigest: preview.previewDigest,
        }),
        confirmAndRun: async (signal: AbortSignal) => {
          if (closed || started || signal.aborted) throw new TypeError("judge runtime unavailable");
          started = true;
          const abort = () => {
            void close().catch(() => undefined);
          };
          signal.addEventListener("abort", abort, { once: true });
          try {
            const result = await supervisor.bootstrap.confirmAndLaunch({
              schemaVersion: 1,
              draftId: preview.draftId,
              previewDigest: preview.previewDigest,
              confirmedBy: {
                kind: "human",
                principalId: deploymentAuthorization?.principalId ?? this.#options.principalId,
              },
              confirmedAt: deploymentAuthorization?.authorizedAt ?? now(),
              ...(deploymentAuthorization === undefined
                ? { assurance: "development_confirmation" as const }
                : {
                    assurance: "deployment_authorization" as const,
                    authorizationId: deploymentAuthorization.authorizationId,
                    journeyId,
                  }),
            });
            const final =
              result.workerTurn.state === "completed" &&
              result.workerTurn.result.outcome.kind === "final_response"
                ? result.workerTurn.result.outcome.response
                : undefined;
            const completed =
              !closed &&
              !signal.aborted &&
              result.state === "active" &&
              final !== undefined &&
              (sessionPlan === undefined || result.sessionPlanGrantId !== undefined);
            if (completed)
              evidence.push({ kind: "task_completed", origin: "worker", action: "none" });
            return JudgePortalRunResultSchema.parse({
              schemaVersion: 1,
              state: completed ? "completed" : "stopped",
              assurance: "observed",
              evidence,
              ...(completed ? { answer: final } : {}),
            });
          } finally {
            signal.removeEventListener("abort", abort);
            await close();
          }
        },
        close,
      };
    } catch {
      await close();
      throw new TypeError("judge runtime preparation unavailable");
    }
  }
}
