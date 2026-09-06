import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalDigest } from "@guardian/canonical";
import {
  ManagedDemoJourneyUsageReportersSchema,
  type SessionDraftPreview,
  type SessionBootstrapResult,
} from "@guardian/contracts";
import { afterEach, expect, it, vi } from "vitest";
import {
  HeadlessJudgeSessionExecutor,
  type HeadlessJudgeSupervisorFactory,
} from "./headless-judge.js";
const NOW = "2026-09-02T20:00:00.000Z";
const EXPIRES = "2026-09-02T21:00:00.000Z";
const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  principal: "33333333-3333-4333-8333-333333333333",
  connection: "44444444-4444-4444-8444-444444444444",
  requestUnsafe: "55555555-5555-4555-8555-555555555555",
  proposalUnsafe: "66666666-6666-4666-8666-666666666666",
  requestLegitimate: "77777777-7777-4777-8777-777777777777",
  proposalLegitimate: "88888888-8888-4888-8888-888888888888",
  draft: "99999999-9999-4999-8999-999999999999",
  mission: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  profile: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  evidence: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
} as const;

const permissions = {
  tools: [
    "guardian.session_status",
    "guardian.local_command",
    "guardian.research",
    "github.pull_request.merge",
  ],
  filesystem: { mode: "workspace_write", roots: ["/workspace"] },
  network: {
    mode: "guardian_only",
    destinations: [
      { kind: "public_domain", hostname: "docs.github.com" },
      {
        kind: "github_repository",
        owner: "loothore907",
        repository: "guardian-agent-demo",
      },
    ],
  },
  sideEffects: ["write_workspace", "merge_pull_request"],
  time: { maxDurationSeconds: 300 },
  volume: {
    maxToolCalls: 20,
    maxResearchRequests: 1,
    maxResearchResults: 2,
    maxLocalCommands: 10,
    maxPrivilegedActions: 1,
  },
} as const;

function preview(): SessionDraftPreview {
  return {
    schemaVersion: 1,
    draftId: IDS.draft,
    previewDigest: "d".repeat(64),
    state: "awaiting_confirmation",
    createdAt: NOW,
    expiresAt: "2026-09-02T20:05:00.000Z",
    objective: "Validate the controlled journey.",
    constraints: ["Use only Guardian-mediated operations."],
    permissions,
    workerTools: ["guardian.session_status", "guardian.local_command"],
    integration: { mode: "guardian_launched_reference", maximumAssurance: "enforced" },
    worker: { schemaVersion: 1, kind: "deterministic_reference" },
    workspace: {
      schemaVersion: 1,
      kind: "guardian_managed_copy",
      projectName: "guardian",
      sourceRootDigest: "e".repeat(64),
      sourceSnapshotDigest: "f".repeat(64),
      mountPath: "/workspace",
      persistence: "session",
      cleanup: "delete_on_close",
      hostWriteback: "none",
      limits: { maxFiles: 100, maxBytes: 1_000_000, maxFileBytes: 100_000 },
    },
  };
}

function activation(state: SessionBootstrapResult["state"] = "active"): SessionBootstrapResult {
  return {
    schemaVersion: 1,
    draftId: IDS.draft,
    sessionId: IDS.session,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    state,
    assurance: "enforced",
    expiresAt: "2026-09-02T20:10:00.000Z",
    tools: permissions.tools,
    workerTools: ["guardian.session_status", "guardian.local_command"],
    confirmationAssurance: "development_confirmation",
    sessionPlanGrantId: IDS.evidence,
    worker: { schemaVersion: 1, kind: "deterministic_reference" },
    workspace: {
      schemaVersion: 1,
      state: "ready",
      selection: preview().workspace,
      fileCount: 1,
      totalBytes: 20,
      baseline: "sanitized_git_repository",
    },
    runner: { state: "not_attached" },
    workerTurn: { state: "not_attached" },
  };
}

function reporters() {
  const reporter = (
    role: "interaction_service" | "guardian_service" | "worker_service" | "research_service",
    capability: string,
  ) => ({
    schemaVersion: 1 as const,
    budget: {
      schemaVersion: 1 as const,
      endpoint: "guardian-managed-demo-budget",
      binding: {
        schemaVersion: 1 as const,
        capability,
        callerRole: role,
        callerId: IDS.caller,
        deploymentId: IDS.principal,
        allowedOperations: ["usage.record" as const],
        issuedAt: NOW,
        expiresAt: EXPIRES,
      },
    },
    reservationId: IDS.draft,
    journeyId: IDS.session,
  });
  return ManagedDemoJourneyUsageReportersSchema.parse({
    interaction: reporter("interaction_service", IDS.session),
    guardian: reporter("guardian_service", IDS.caller),
    worker: reporter("worker_service", IDS.connection),
    research: reporter("research_service", IDS.evidence),
  });
}

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function harness() {
  const root = await mkdtemp(join(tmpdir(), "guardian-headless-test-"));
  roots.push(root);
  const stateRoot = join(root, "state");
  await mkdir(stateRoot);
  const sessionPlan = {
    maxActions: 1,
    maxMutations: 1,
    mutationRetries: 0,
    targets: [
      {
        operation: "github.pull_request.merge",
        connectionId: IDS.connection,
        owner: "loothore907",
        repository: "guardian-agent-demo",
        pullRequest: 2,
        headCommit: "a".repeat(40),
        baseBranch: "main",
      },
    ],
  };
  const objective = preview().objective;
  const authorization = {
    authorizationId: IDS.principal,
    deploymentId: IDS.principal,
    principalId: IDS.principal,
    authorizedAt: "2026-09-01T20:00:00.000Z",
    expiresAt: EXPIRES,
    objectiveDigest: canonicalDigest("deployment_objective", 1, objective),
    permissionsDigest: canonicalDigest("deployment_permissions", 1, permissions),
    sessionPlanIntentDigest: canonicalDigest("session_plan_intent", 1, sessionPlan),
    workspaceSnapshotDigest: preview().workspace.sourceSnapshotDigest,
  };
  const confirmAndLaunch = vi.fn(() =>
    Promise.resolve({
      ...activation(),
      confirmationAssurance: "deployment_authorization",
    }),
  );
  const runCompetitionJourney = vi.fn(() => Promise.resolve({ state: "completed" }));
  const close = vi.fn(() => Promise.resolve(undefined));
  const start = vi.fn<HeadlessJudgeSupervisorFactory>(() =>
    Promise.resolve(
      Promise.resolve({
        bootstrap: { createDraft: () => ({ ...preview(), sessionPlan }), confirmAndLaunch },
        runCompetitionJourney,
        close,
      } as never),
    ),
  );
  const resources = (["app_private_key", "installation"] as const).map((slot) => ({
    schemaVersion: 1,
    location: {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "judge",
      runtime: "linux",
      storeTarget: "nebius_secretstash",
    },
    reference: { schemaVersion: 1, provider: "github", slot },
    secretId: "mbsec-judge123",
    payloadKey:
      slot === "app_private_key" ? "github_app_private_key" : "github_installation_metadata",
  }));
  const options = {
    deployment: {
      authorization,
      sessionPlan,
      objective,
      projectRoot: join(root, "project"),
      stateRoot,
    },
    credentialStore: { schemaVersion: 1, custodyProfile: "managed_demo", pool: "judge", resources },
    researchRequest: {
      query: "Guardian pull request security review",
      maxResults: 1,
      allowedDomains: ["docs.github.com"],
    },
    unsafeTarget: {
      kind: "github_pull_request",
      owner: "loothore907",
      repository: "guardian-agent",
      pullRequest: 13,
      headCommit: "b".repeat(40),
    },
    githubClientId: "Iv23liP8Sq3ZEAyeIHju",
    researchRequiredTerms: ["pull request"],
    controlledContentUrl: "https://docs.github.com/guardian-controlled-content",
    startSupervisor: start,
    now: () => NOW,
  };
  const executor = new HeadlessJudgeSessionExecutor(options);
  const controller = new AbortController();
  const input = {
    journeyId: IDS.session,
    objective,
    reporters: reporters(),
    signal: controller.signal,
  };
  return {
    executor,
    input,
    options,
    start,
    close,
    confirmAndLaunch,
    runCompetitionJourney,
    controller,
  };
}
it("runs a fixed deployment journey without a human prompt and rejects replay", async () => {
  const h = await harness();
  await expect(h.executor.run(h.input)).resolves.toEqual({ state: "completed" });
  expect(h.confirmAndLaunch).toHaveBeenCalledWith(
    expect.objectContaining({
      assurance: "deployment_authorization",
      confirmedAt: h.options.deployment.authorization.authorizedAt,
      journeyId: IDS.session,
    }),
  );
  expect(h.runCompetitionJourney).toHaveBeenCalledOnce();
  expect(h.runCompetitionJourney.mock.calls[0]).not.toHaveProperty("0.confirmation");
  expect(h.close).toHaveBeenCalledOnce();
  await expect(h.executor.run(h.input)).resolves.toEqual({ state: "stopped" });
  expect(h.start).toHaveBeenCalledOnce();
});
it.each(["objective", "binding", "expiry", "aborted", "closed"])(
  "rejects %s before starting any service",
  async (reason) => {
    const h = await harness();
    if (reason === "objective") h.input.objective += " expand";
    if (reason === "binding") h.input.reporters.worker.journeyId = IDS.caller;
    if (reason === "aborted") h.controller.abort();
    if (reason === "closed") h.executor.close();
    const executor =
      reason === "expiry"
        ? new HeadlessJudgeSessionExecutor({ ...h.options, now: () => EXPIRES })
        : h.executor;
    await expect(executor.run(h.input)).resolves.toEqual({ state: "stopped" });
    expect(h.start).not.toHaveBeenCalled();
  },
);
it("closes active services on cancellation and denies concurrent admission", async () => {
  const h = await harness();
  let complete!: () => void;
  h.runCompetitionJourney.mockImplementation(async () => {
    await new Promise<void>((resolve) => {
      complete = resolve;
    });
    return { state: "completed" };
  });
  const running = h.executor.run(h.input);
  await vi.waitFor(() => expect(h.runCompetitionJourney).toHaveBeenCalledOnce());
  await expect(h.executor.run(h.input)).resolves.toEqual({ state: "stopped" });
  h.controller.abort();
  expect(h.close).toHaveBeenCalledOnce();
  complete();
  await expect(running).resolves.toEqual({ state: "stopped" });
  expect(h.close).toHaveBeenCalledOnce();
});
it("fails closed on startup failure without attempting a provider operation", async () => {
  const h = await harness();
  h.start.mockRejectedValue(new Error("private diagnostic"));
  await expect(h.executor.run(h.input)).resolves.toEqual({ state: "stopped" });
  expect(h.runCompetitionJourney).not.toHaveBeenCalled();
});
