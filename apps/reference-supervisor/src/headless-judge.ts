import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { canonicalDigest } from "@guardian/canonical";
import {
  CanonicalRequestSchema,
  CredentialStoreConfigSchema,
  HeadlessJudgeDeploymentSchema,
  ManagedDemoJourneyUsageReportersSchema,
  OpaqueIdSchema,
  ResearchRequestSchema,
  SessionDraftPreviewSchema,
  SessionBootstrapResultSchema,
  TimestampSchema,
  GitHubPullRequestVersionSchema,
  GitHubOAuthClientIdSchema,
  type CredentialStoreConfig,
} from "@guardian/contracts";
import type {
  ReferenceAuthoritySupervisorConfig,
  ReferenceAuthoritySupervisor,
  ReferenceCompetitionSessionConfig,
} from "./index.js";

export type HeadlessJudgeSupervisorFactory = (
  config: ReferenceAuthoritySupervisorConfig,
  options: {
    interactionProcess: "fake";
    riskProcess: "nemotron";
    workerMode: "deterministic_reference";
    competition: ReferenceCompetitionSessionConfig;
    managedDemoBudget: unknown;
  },
) => Promise<Pick<ReferenceAuthoritySupervisor, "bootstrap" | "runCompetitionJourney" | "close">>;

/** A fixed deployment workflow. HTTP inputs cannot choose authority or credentials. */
export class HeadlessJudgeSessionExecutor {
  readonly #deployment;
  readonly #credentialStore: CredentialStoreConfig;
  readonly #research;
  readonly #unsafeTarget;
  readonly #githubClientId: string;
  readonly #requiredTerms: readonly string[];
  readonly #controlledContentUrl: string;
  readonly #start: HeadlessJudgeSupervisorFactory;
  readonly #now: () => string;
  #running = false;
  #closed = false;
  #closeActive: (() => void) | undefined;

  constructor(options: {
    deployment: unknown;
    credentialStore: unknown;
    researchRequest: unknown;
    unsafeTarget: unknown;
    githubClientId: unknown;
    researchRequiredTerms: readonly string[];
    controlledContentUrl: string;
    startSupervisor: HeadlessJudgeSupervisorFactory;
    now?: () => string;
  }) {
    this.#deployment = HeadlessJudgeDeploymentSchema.parse(options.deployment);
    this.#credentialStore = CredentialStoreConfigSchema.parse(options.credentialStore);
    this.#research = ResearchRequestSchema.parse(options.researchRequest);
    this.#unsafeTarget = GitHubPullRequestVersionSchema.parse(options.unsafeTarget);
    this.#githubClientId = GitHubOAuthClientIdSchema.parse(options.githubClientId);
    this.#requiredTerms = [...options.researchRequiredTerms];
    this.#controlledContentUrl = options.controlledContentUrl;
    this.#start = options.startSupervisor;
    this.#now = options.now ?? (() => new Date().toISOString());
    const { authorization, sessionPlan, projectRoot, stateRoot, objective } = this.#deployment;
    const target = sessionPlan.targets[0];
    const relativeState = relative(projectRoot, stateRoot);
    if (
      this.#credentialStore.custodyProfile !== "managed_demo" ||
      this.#credentialStore.pool !== "judge" ||
      !["app_private_key", "installation"].every(
        (slot) =>
          this.#credentialStore.custodyProfile === "managed_demo" &&
          this.#credentialStore.resources.some(
            (r) => r.reference.provider === "github" && r.reference.slot === slot,
          ),
      ) ||
      !isAbsolute(projectRoot) ||
      !isAbsolute(stateRoot) ||
      relativeState === "" ||
      (relativeState !== ".." &&
        !relativeState.startsWith(`..${sep}`) &&
        !isAbsolute(relativeState)) ||
      sessionPlan.targets.length !== 1 ||
      target?.operation !== "github.pull_request.merge" ||
      sessionPlan.maxActions !== 1 ||
      sessionPlan.maxMutations !== 1 ||
      (target.owner === this.#unsafeTarget.owner &&
        target.repository === this.#unsafeTarget.repository) ||
      canonicalDigest("deployment_objective", 1, objective) !== authorization.objectiveDigest ||
      canonicalDigest("session_plan_intent", 1, sessionPlan) !==
        authorization.sessionPlanIntentDigest
    )
      throw new TypeError("headless judge deployment is not a bounded authorized workflow");
  }

  close(): void {
    this.#closed = true;
    this.#closeActive?.();
  }

  async run(input: {
    journeyId: string;
    objective: string;
    reporters: unknown;
    signal: AbortSignal;
  }): Promise<{ state: "completed" | "stopped" }> {
    if (
      this.#closed ||
      this.#running ||
      input.signal.aborted ||
      input.objective !== this.#deployment.objective
    )
      return { state: "stopped" };
    const parsedId = OpaqueIdSchema.safeParse(input.journeyId);
    const parsedReporters = ManagedDemoJourneyUsageReportersSchema.safeParse(input.reporters);
    if (!parsedId.success || !parsedReporters.success) return { state: "stopped" };
    const journeyId = parsedId.data;
    const reporters = parsedReporters.data;
    const { authorization, sessionPlan } = this.#deployment;
    if (
      Object.values(reporters).some(
        (r) =>
          r.budget.binding.deploymentId !== authorization.deploymentId || r.journeyId !== journeyId,
      )
    )
      return { state: "stopped" };
    const issuedAt = TimestampSchema.parse(this.#now());
    if (
      Date.parse(issuedAt) < Date.parse(authorization.authorizedAt) ||
      Date.parse(issuedAt) + 600_000 > Date.parse(authorization.expiresAt)
    )
      return { state: "stopped" };
    this.#running = true;
    let supervisor: Awaited<ReturnType<HeadlessJudgeSupervisorFactory>> | undefined;
    let closePromise: Promise<void> | undefined;
    const close = () => {
      if (supervisor !== undefined) closePromise ??= supervisor.close();
      return closePromise;
    };
    const abort = () => {
      void close()?.catch(() => undefined);
    };
    this.#closeActive = abort;
    input.signal.addEventListener("abort", abort, { once: true });
    try {
      // A unique directory also makes a replayed journey ID fail before launch.
      const root = join(this.#deployment.stateRoot, journeyId);
      await mkdir(root, { mode: 0o700 });
      if (input.signal.aborted || this.#closed) return { state: "stopped" };
      const target = sessionPlan.targets[0]!;
      const callerId = randomUUID();
      supervisor = await this.#start(
        {
          sessionId: journeyId,
          callerId,
          projectRoot: this.#deployment.projectRoot,
          authorityStorePath: join(root, "authority.sqlite"),
          workspaceRoots: [join(root, "workspaces")],
          issuedAt,
          expiresAt: new Date(Date.parse(issuedAt) + 600_000).toISOString(),
          credentialStore: this.#credentialStore,
          sessionPlan,
          deploymentAuthorization: authorization,
        },
        {
          interactionProcess: "fake",
          riskProcess: "nemotron",
          workerMode: "deterministic_reference",
          managedDemoBudget: reporters,
          competition: {
            connectionId: target.connectionId,
            owner: target.owner,
            repository: target.repository,
            researchDomains: this.#research.allowedDomains,
            researchRequiredTerms: this.#requiredTerms,
            controlledContentUrl: this.#controlledContentUrl,
          },
        },
      );
      if (input.signal.aborted || this.#closed) return { state: "stopped" };
      const preview = SessionDraftPreviewSchema.parse(
        supervisor.bootstrap.createDraft({
          schemaVersion: 1,
          objective: this.#deployment.objective,
        }),
      );
      const activation = SessionBootstrapResultSchema.parse(
        await supervisor.bootstrap.confirmAndLaunch({
          schemaVersion: 1,
          draftId: preview.draftId,
          previewDigest: preview.previewDigest,
          confirmedBy: { kind: "human", principalId: authorization.principalId },
          confirmedAt: authorization.authorizedAt,
          assurance: "deployment_authorization",
          authorizationId: authorization.authorizationId,
          journeyId,
        }),
      );
      if (
        activation.state !== "active" ||
        activation.assurance !== "enforced" ||
        activation.sessionPlanGrantId === undefined ||
        input.signal.aborted ||
        this.#closed
      )
        return { state: "stopped" };
      const request = (resource: ReturnType<typeof GitHubPullRequestVersionSchema.parse>) =>
        CanonicalRequestSchema.parse({
          schemaVersion: 1,
          requestId: randomUUID(),
          sessionId: activation.sessionId,
          callerId,
          connectionId: target.connectionId,
          missionId: activation.missionId,
          missionVersion: activation.missionVersion,
          profileId: activation.profileId,
          profileVersion: activation.profileVersion,
          policyVersion: activation.policyVersion,
          resourceVersion: resource,
          proposal: {
            schemaVersion: 1,
            proposalId: randomUUID(),
            sessionId: activation.sessionId,
            callerId,
            missionId: activation.missionId,
            missionVersion: activation.missionVersion,
            profileId: activation.profileId,
            profileVersion: activation.profileVersion,
            proposedAt: this.#now(),
            operation: "github.pull_request.merge",
            resourceVersion: resource,
            arguments: {
              owner: resource.owner,
              repository: resource.repository,
              pullRequest: resource.pullRequest,
              expectedHeadCommit: resource.headCommit,
              method: "squash",
            },
          },
        });
      const outcome = await supervisor.runCompetitionJourney({
        researchRequest: this.#research,
        githubClientId: this.#githubClientId,
        unsafeRequest: request(this.#unsafeTarget),
        legitimateRequest: request({
          kind: "github_pull_request",
          owner: target.owner,
          repository: target.repository,
          pullRequest: target.pullRequest,
          headCommit: target.headCommit,
        }),
      });
      return {
        state:
          outcome.state === "completed" && !input.signal.aborted && !this.#closed
            ? "completed"
            : "stopped",
      };
    } catch {
      return { state: "stopped" };
    } finally {
      input.signal.removeEventListener("abort", abort);
      try {
        await close();
      } finally {
        this.#running = false;
        this.#closeActive = undefined;
      }
    }
  }
}
