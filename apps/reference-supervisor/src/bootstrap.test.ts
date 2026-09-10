import { randomUUID } from "node:crypto";
import { canonicalDigest } from "@guardian/canonical";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GUARDIAN_MODEL_POLICY,
  DEFAULT_NEBIUS_WORKER_SELECTION,
  type WorkerTurnEnvelope,
  type WorkerTurnResult,
  type WorkerToolExecutionEnvelope,
  type WorkerToolResult,
} from "@guardian/contracts";
import type {
  LaunchedReferenceSession,
  ReferenceSessionLaunchInput,
} from "@guardian/session-host/launcher";
import { createWorkerToolResult } from "@guardian/worker";

import {
  type ReferenceSessionBootstrapOptions,
  ReferenceSessionBootstrapCoordinator,
} from "./bootstrap.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  principal: "33333333-3333-4333-8333-333333333333",
  draft: "44444444-4444-4444-8444-444444444444",
  mission: "55555555-5555-4555-8555-555555555555",
  profile: "66666666-6666-4666-8666-666666666666",
  revocation: "77777777-7777-4777-8777-777777777777",
  turn: "88888888-8888-4888-8888-888888888888",
  execution: "99999999-9999-4999-8999-999999999999",
  secondTurn: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const;
const CREATED_AT = "2026-08-31T10:00:00.000Z";
const WORKSPACE_SELECTION = {
  schemaVersion: 1,
  kind: "guardian_managed_copy",
  projectName: "guardian",
  sourceRootDigest: "a".repeat(64),
  sourceSnapshotDigest: "b".repeat(64),
  mountPath: "/workspace",
  persistence: "session",
  cleanup: "delete_on_close",
  hostWriteback: "none",
  limits: { maxFiles: 100, maxBytes: 1_000_000, maxFileBytes: 100_000 },
} as const;
const WORKSPACE_RESULT = {
  schemaVersion: 1,
  state: "ready",
  selection: WORKSPACE_SELECTION,
  fileCount: 2,
  totalBytes: 20,
  baseline: "sanitized_git_repository",
} as const;
const workspaceOptions = (
  workspaceSelection: typeof WORKSPACE_SELECTION = WORKSPACE_SELECTION,
) => ({
  workspaceSelection,
  prepareWorkspace: vi.fn(() =>
    Promise.resolve({
      sessionId: IDS.session,
      result: { ...WORKSPACE_RESULT, selection: workspaceSelection },
    } as never),
  ),
});

function coordinator(
  runWorkerTurn?: (turn: WorkerTurnEnvelope) => Promise<WorkerTurnResult>,
  executeWorkerTool?: (
    execution: WorkerToolExecutionEnvelope,
    launched: LaunchedReferenceSession,
  ) => Promise<WorkerToolResult>,
  overrides: Partial<ReferenceSessionBootstrapOptions> = {},
) {
  let now = CREATED_AT;
  const randomIds = [
    IDS.draft,
    IDS.mission,
    IDS.profile,
    IDS.revocation,
    IDS.turn,
    IDS.execution,
    IDS.secondTurn,
  ];
  let launchInput: Omit<ReferenceSessionLaunchInput, "authority"> | undefined;
  const launchSession = vi.fn((input: Omit<ReferenceSessionLaunchInput, "authority">) => {
    launchInput = input;
    const mission = input.mission as { missionId: string; version: number };
    const profile = input.profile as {
      profileId: string;
      version: number;
      permissions: { tools: readonly string[] };
    };
    let runtimeState: "active" | "revoked" | "interrupted" = "active";
    return Promise.resolve({
      runtime: {
        status: () => ({
          sessionId: IDS.session,
          missionId: mission.missionId,
          missionVersion: mission.version,
          profileId: profile.profileId,
          profileVersion: profile.version,
          policyVersion: 1,
          callerId: IDS.caller,
          state: runtimeState,
          assurance: "enforced",
          expiresAt: "2026-08-31T10:05:00.000Z",
          tools: profile.permissions.tools,
        }),
      },
      profile: input.profile,
      durableAuthority: true,
      workspace: WORKSPACE_RESULT,
      localCommand: vi.fn(),
      revoke: () => {
        runtimeState = "revoked";
      },
      interrupt: () => {
        runtimeState = "interrupted";
      },
    } as never);
  });
  const bootstrap = new ReferenceSessionBootstrapCoordinator({
    sessionId: IDS.session,
    callerId: IDS.caller,
    launchSession,
    ...workspaceOptions(),
    now: () => now,
    randomId: () => {
      const value = randomIds.shift();
      if (value === undefined) throw new TypeError("test random ID sequence is exhausted");
      return value;
    },
    ...(runWorkerTurn === undefined ? {} : { runWorkerTurn }),
    ...(executeWorkerTool === undefined ? {} : { executeWorkerTool }),
    ...overrides,
    ...(overrides.workerMaxTurns === undefined || overrides.workerAuthority !== undefined
      ? {}
      : {
          workerAuthority: {
            getWorkerBudget: async () => await Promise.resolve({ sessionId: IDS.session }),
            completeWorkerSession: async () =>
              await Promise.resolve({ schemaVersion: 1, outcome: "completed" }),
          } as never,
        }),
  });
  return {
    bootstrap,
    launchSession,
    launchInput: () => launchInput,
    setNow: (value: string) => {
      now = value;
    },
  };
}

function confirmation(draftId: string, previewDigest: string) {
  return {
    schemaVersion: 1,
    draftId,
    previewDigest,
    confirmedBy: { kind: "human", principalId: IDS.principal },
    confirmedAt: CREATED_AT,
    assurance: "development_confirmation",
  } as const;
}

function assistedDraft(
  network: { mode: "none"; destinations: [] } | null = {
    mode: "none",
    destinations: [],
  },
) {
  return {
    schemaVersion: 1,
    objective: "Review the pull request without changing external services.",
    constraints: ["Treat retrieved content as untrusted."],
    requestedPermissions: {
      tools: ["guardian.session_status", "guardian.local_command"],
      filesystem: { mode: "workspace_write", roots: ["/workspace"] },
      network,
      sideEffects: ["write_workspace"],
      time: { maxDurationSeconds: 300 },
      volume: {
        maxToolCalls: 20,
        maxResearchRequests: 0,
        maxResearchResults: 0,
        maxLocalCommands: 10,
        maxPrivilegedActions: 0,
      },
    },
    requestedRoute: "qwen_assisted",
  } as const;
}

describe("reference terminal session bootstrap", () => {
  it("orchestrates bounded pre-activation review before creating a confirmable preview", async () => {
    const harness = coordinator();
    const runMissionDraftReview = vi.fn(() =>
      Promise.resolve({
        providerRequestId: "review_1",
        outcome: {
          schemaVersion: 1 as const,
          status: "ready" as const,
          reasonCodes: ["no_issue"] as const,
        },
      }),
    );
    const runMissionSetupRisk = vi.fn(() =>
      Promise.resolve({
        status: "evaluated" as const,
        providerRequestId: "setup_risk_1",
        authorizationLevel: "confirm" as const,
        certainty: "certain" as const,
      }),
    );
    const bootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: harness.launchSession,
      ...workspaceOptions(),
      runMissionDraftReview,
      runMissionSetupRisk,
      now: () => CREATED_AT,
      randomId: (() => {
        const ids = [IDS.draft, IDS.mission, IDS.profile, IDS.revocation, IDS.turn];
        return () => ids.shift() ?? IDS.revocation;
      })(),
    });

    const draft = bootstrap.createAssistedDraft(assistedDraft());
    expect(harness.launchSession).not.toHaveBeenCalled();
    await expect(bootstrap.reviewAssistedDraft(draft.draftId)).resolves.toMatchObject({
      providerRequestId: "review_1",
      outcome: { status: "ready" },
    });
    expect(runMissionDraftReview).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: draft.draftId,
        revision: 1,
        reviewTurn: 1,
        modelPolicyId: "competition-2026-09-01",
        modelPolicyVersion: DEFAULT_GUARDIAN_MODEL_POLICY.version,
      }),
    );
    const preview = await bootstrap.compileAssistedDraft(draft.draftId, 1);
    expect(runMissionSetupRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: draft.draftId,
        deterministicFloor: "confirm",
        containsCredentials: false,
      }),
    );
    expect(harness.launchSession).not.toHaveBeenCalled();

    await expect(
      bootstrap.confirmAndLaunch(confirmation(preview.draftId, preview.previewDigest)),
    ).resolves.toMatchObject({ state: "active" });
    expect(harness.launchSession).toHaveBeenCalledOnce();
  });

  it("revalidates a complete revised draft after bounded clarification", async () => {
    const harness = coordinator();
    const outcomes = [
      {
        providerRequestId: "review_1",
        outcome: {
          schemaVersion: 1 as const,
          status: "needs_clarification" as const,
          missingFields: ["network" as const],
          reasonCodes: ["destination_ambiguity" as const],
          questions: [{ field: "network" as const, question: "What network access is allowed?" }],
        },
      },
      {
        providerRequestId: "review_2",
        outcome: {
          schemaVersion: 1 as const,
          status: "ready" as const,
          reasonCodes: ["no_issue" as const],
        },
      },
    ];
    const bootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: harness.launchSession,
      ...workspaceOptions(),
      runMissionDraftReview: () => Promise.resolve(outcomes.shift()!),
      runMissionSetupRisk: () =>
        Promise.resolve({
          status: "evaluated",
          providerRequestId: "setup_risk_1",
          authorizationLevel: "confirm",
          certainty: "certain",
        }),
      now: () => CREATED_AT,
      randomId: () => IDS.draft,
    });
    const draft = bootstrap.createAssistedDraft(assistedDraft(null));
    await expect(bootstrap.reviewAssistedDraft(draft.draftId)).resolves.toMatchObject({
      outcome: { status: "needs_clarification" },
    });
    const revised = bootstrap.reviseAssistedDraft(draft.draftId, 1, assistedDraft());
    await expect(bootstrap.reviewAssistedDraft(revised.draftId)).resolves.toMatchObject({
      outcome: { status: "ready" },
    });
    await expect(bootstrap.compileAssistedDraft(revised.draftId, 2)).resolves.toMatchObject({
      state: "awaiting_confirmation",
    });
  });

  it("fails closed when setup risk is unavailable", async () => {
    const harness = coordinator();
    const bootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: harness.launchSession,
      ...workspaceOptions(),
      runMissionDraftReview: () =>
        Promise.resolve({
          providerRequestId: "review_1",
          outcome: { schemaVersion: 1, status: "ready", reasonCodes: ["no_issue"] },
        }),
      now: () => CREATED_AT,
      randomId: () => IDS.draft,
    });
    const draft = bootstrap.createAssistedDraft(assistedDraft());
    await bootstrap.reviewAssistedDraft(draft.draftId);

    await expect(bootstrap.compileAssistedDraft(draft.draftId, 1)).rejects.toThrow(
      /denied activation/u,
    );
    expect(harness.launchSession).not.toHaveBeenCalled();
  });

  it("creates no authority until the normalized preview is directly confirmed", async () => {
    const harness = coordinator();
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request without changing external services.",
    });

    expect(harness.launchSession).not.toHaveBeenCalled();
    expect(preview).toMatchObject({
      draftId: IDS.draft,
      state: "awaiting_confirmation",
      permissions: {
        tools: ["guardian.session_status", "guardian.local_command"],
        network: { mode: "none", destinations: [] },
        volume: { maxPrivilegedActions: 0 },
      },
      integration: {
        mode: "guardian_launched_reference",
        maximumAssurance: "enforced",
      },
      worker: { schemaVersion: 1, kind: "deterministic_reference" },
      workerTools: ["guardian.session_status", "guardian.local_command"],
    });

    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );
    const launched = harness.launchInput();

    expect(launched?.mission).toMatchObject({
      authoredBy: { kind: "human", principalId: IDS.principal },
      objective: preview.objective,
      authority: preview.permissions,
    });
    expect(launched?.profile).toMatchObject({
      permissions: preview.permissions,
      assurance: { level: "unknown", evidence: [] },
    });
    expect(launched).not.toHaveProperty("authority");
    expect(result).toMatchObject({
      sessionId: IDS.session,
      assurance: "enforced",
      confirmationAssurance: "development_confirmation",
      worker: { schemaVersion: 1, kind: "deterministic_reference" },
      runner: { state: "not_attached" },
      workerTurn: { state: "not_attached" },
    });
    expect(result).not.toHaveProperty("capability");
    expect(result).not.toHaveProperty("revocationHandle");
    expect(result).not.toHaveProperty("endpoint");
  });

  it("binds broad mission authority separately from the narrower worker tool catalog", async () => {
    const harness = coordinator();
    const bootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: harness.launchSession,
      ...workspaceOptions(),
      missionTemplate: {
        constraints: ["Use only Guardian-mediated external operations."],
        permissions: {
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
        },
        workerTools: ["guardian.session_status", "guardian.local_command"],
      },
      now: () => CREATED_AT,
      randomId: (() => {
        const ids = [IDS.draft, IDS.mission, IDS.profile, IDS.revocation, IDS.turn];
        return () => ids.shift() ?? IDS.revocation;
      })(),
    });
    const preview = bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Validate the controlled authorization journey.",
    });

    expect(preview.permissions.tools).toContain("github.pull_request.merge");
    expect(preview.workerTools).toEqual(["guardian.session_status", "guardian.local_command"]);
    const result = await bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );
    expect(harness.launchInput()?.mission).toMatchObject({ authority: preview.permissions });
    expect(harness.launchInput()?.profile).toMatchObject({ permissions: preview.permissions });
    expect(result.workerTools).toEqual(preview.workerTools);
  });

  it("rejects a worker tool catalog that exceeds the mission authority", () => {
    const harness = coordinator();
    expect(
      () =>
        new ReferenceSessionBootstrapCoordinator({
          sessionId: IDS.session,
          callerId: IDS.caller,
          launchSession: harness.launchSession,
          ...workspaceOptions(),
          missionTemplate: {
            constraints: ["Keep authority narrow."],
            permissions: {
              ...assistedDraft().requestedPermissions,
              network: { mode: "none", destinations: [] },
            },
            workerTools: ["github.pull_request.merge"],
          },
        }),
    ).toThrow("unique subset");
  });

  it("binds the selected worker and workspace snapshot into the confirmed digest", () => {
    const referenceHarness = coordinator();
    const referencePreview = referenceHarness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });
    const hostedHarness = coordinator();
    const hostedBootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: hostedHarness.launchSession,
      ...workspaceOptions(),
      workerSelection: DEFAULT_NEBIUS_WORKER_SELECTION,
      now: () => CREATED_AT,
      randomId: (() => {
        const ids = [IDS.draft, IDS.mission, IDS.profile, IDS.revocation];
        return () => ids.shift() ?? IDS.revocation;
      })(),
    });
    const hostedPreview = hostedBootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });

    expect(hostedPreview.worker).toMatchObject({
      kind: "nebius_native",
      provider: "nebius_token_factory",
      role: "native_worker",
    });
    expect(hostedPreview.previewDigest).not.toBe(referencePreview.previewDigest);

    const changedWorkspaceBootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: hostedHarness.launchSession,
      ...workspaceOptions({ ...WORKSPACE_SELECTION, sourceSnapshotDigest: "c".repeat(64) }),
      now: () => CREATED_AT,
      randomId: () => IDS.draft,
    });
    const changedWorkspacePreview = changedWorkspaceBootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });
    expect(changedWorkspacePreview.previewDigest).not.toBe(referencePreview.previewDigest);
  });

  it("runs W1 only after confirmation and returns a bound pending typed request", async () => {
    const runWorkerTurn = vi.fn((turn: WorkerTurnEnvelope) =>
      Promise.resolve({
        providerRequestId: "fake_worker_tool_1",
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
        outcome: {
          kind: "tool_request" as const,
          request: { name: "guardian.session_status" as const, arguments: {} },
        },
      }),
    );
    const harness = coordinator(runWorkerTurn);
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request without changing external services.",
    });
    expect(runWorkerTurn).not.toHaveBeenCalled();

    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );

    expect(runWorkerTurn).toHaveBeenCalledTimes(1);
    expect(runWorkerTurn.mock.calls[0]?.[0]).toMatchObject({
      turnId: IDS.turn,
      sessionId: IDS.session,
      callerId: IDS.caller,
      missionId: IDS.mission,
      missionVersion: 1,
      profileId: IDS.profile,
      profileVersion: 1,
      policyVersion: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: DEFAULT_GUARDIAN_MODEL_POLICY.version,
      worker: { kind: "deterministic_reference" },
      turnNumber: 1,
      allowedTools: ["guardian.session_status", "guardian.local_command"],
      remainingBudget: {
        remainingDurationSeconds: 300,
        remainingToolCalls: 20,
        remainingLocalCommands: 10,
        remainingPrivilegedActions: 0,
      },
    });
    expect(result.workerTurn).toMatchObject({
      state: "completed",
      result: {
        turnId: IDS.turn,
        outcome: { kind: "tool_request", request: { name: "guardian.session_status" } },
      },
    });
  });

  it("executes one exact request and requires the second worker turn to finish", async () => {
    const runWorkerTurn = vi.fn((turn: WorkerTurnEnvelope) =>
      Promise.resolve({
        providerRequestId: `fake_worker_${turn.turnNumber}`,
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
        outcome:
          turn.turnNumber === 1
            ? {
                kind: "tool_request" as const,
                request: { name: "guardian.session_status" as const, arguments: {} },
              }
            : { kind: "final_response" as const, response: "The bounded task is complete." },
      }),
    );
    const executeWorkerTool = vi.fn((execution: WorkerToolExecutionEnvelope) =>
      Promise.resolve(
        createWorkerToolResult({
          schemaVersion: 1,
          executionId: execution.executionId,
          executionDigest: execution.executionDigest,
          sessionId: execution.sessionId,
          callerId: execution.callerId,
          missionId: execution.missionId,
          missionVersion: execution.missionVersion,
          profileId: execution.profileId,
          profileVersion: execution.profileVersion,
          policyVersion: execution.policyVersion,
          sourceTurnId: execution.sourceTurnId,
          sourceTurnNumber: execution.sourceTurnNumber,
          sourceTurnDigest: execution.sourceTurnDigest,
          requestDigest: execution.requestDigest,
          completedAt: CREATED_AT,
          remainingBudget: {
            remainingDurationSeconds: 300,
            remainingToolCalls: 19,
            remainingResearchRequests: 0,
            remainingResearchResults: 0,
            remainingLocalCommands: 10,
            remainingPrivilegedActions: 0,
          },
          outcome: "succeeded",
          name: "guardian.session_status",
          output: {
            sessionId: IDS.session,
            missionId: IDS.mission,
            missionVersion: 1,
            profileId: IDS.profile,
            profileVersion: 1,
            policyVersion: 1,
            callerId: IDS.caller,
            state: "active",
            assurance: "enforced",
            expiresAt: "2026-08-31T10:05:00.000Z",
            tools: ["guardian.local_command", "guardian.session_status"],
          },
        }),
      ),
    );
    const harness = coordinator(runWorkerTurn, executeWorkerTool);
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Inspect the exact session status and finish.",
    });
    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );

    expect(runWorkerTurn).toHaveBeenCalledTimes(2);
    expect(executeWorkerTool).toHaveBeenCalledTimes(1);
    expect(executeWorkerTool.mock.calls[0]?.[0]).toMatchObject({
      executionId: IDS.execution,
      sourceTurnId: IDS.turn,
      sourceTurnNumber: 1,
      request: { name: "guardian.session_status" },
      workspace: WORKSPACE_RESULT,
    });
    expect(runWorkerTurn.mock.calls[1]?.[0]).toMatchObject({
      turnId: IDS.secondTurn,
      turnNumber: 2,
      allowedTools: [],
      previousToolResult: { name: "guardian.session_status" },
      remainingBudget: { remainingToolCalls: 19 },
    });
    expect(result.workerTurn).toMatchObject({
      state: "completed",
      result: { outcome: { kind: "final_response", response: "The bounded task is complete." } },
      toolResult: { executionId: IDS.execution, name: "guardian.session_status" },
    });
  });

  it("keeps the exact lifecycle active after a contained sanitized denial", async () => {
    const runWorkerTurn = vi.fn((turn: WorkerTurnEnvelope) =>
      Promise.resolve({
        providerRequestId: `fake_worker_denial_${turn.turnNumber}`,
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
        outcome:
          turn.turnNumber === 1
            ? {
                kind: "tool_request" as const,
                request: { name: "guardian.session_status" as const, arguments: {} },
              }
            : { kind: "final_response" as const, response: "The denied action was contained." },
      }),
    );
    const executeWorkerTool = vi.fn((execution: WorkerToolExecutionEnvelope) =>
      Promise.resolve(
        createWorkerToolResult({
          schemaVersion: 1,
          executionId: execution.executionId,
          executionDigest: execution.executionDigest,
          sessionId: execution.sessionId,
          callerId: execution.callerId,
          missionId: execution.missionId,
          missionVersion: execution.missionVersion,
          profileId: execution.profileId,
          profileVersion: execution.profileVersion,
          policyVersion: execution.policyVersion,
          sourceTurnId: execution.sourceTurnId,
          sourceTurnNumber: execution.sourceTurnNumber,
          sourceTurnDigest: execution.sourceTurnDigest,
          requestDigest: execution.requestDigest,
          completedAt: CREATED_AT,
          remainingBudget: {
            remainingDurationSeconds: 300,
            remainingToolCalls: 20,
            remainingResearchRequests: 0,
            remainingResearchResults: 0,
            remainingLocalCommands: 10,
            remainingPrivilegedActions: 0,
          },
          outcome: "denied",
          name: "guardian.session_status",
          denial: {
            code: "request_denied",
            disposition: "continue",
            policyId: "reference-worker-violations-2026-09-02",
            policyVersion: 1,
          },
        }),
      ),
    );
    const harness = coordinator(runWorkerTurn, executeWorkerTool);
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Finish safely after an ordinary denied action.",
    });
    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );

    expect(runWorkerTurn).toHaveBeenCalledTimes(2);
    expect(runWorkerTurn.mock.calls[1]?.[0]).toMatchObject({
      allowedTools: [],
      previousToolResult: {
        outcome: "denied",
        denial: { code: "request_denied", disposition: "continue" },
      },
    });
    expect(result).toMatchObject({
      state: "active",
      workerTurn: {
        state: "completed",
        result: { outcome: { kind: "final_response" } },
        toolResult: { outcome: "denied" },
      },
    });
  });

  it("stops before a second turn when deterministic policy revokes", async () => {
    const runWorkerTurn = vi.fn((turn: WorkerTurnEnvelope) =>
      Promise.resolve({
        providerRequestId: "fake_worker_revoked_1",
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
        outcome: {
          kind: "tool_request" as const,
          request: { name: "guardian.session_status" as const, arguments: {} },
        },
      }),
    );
    const executeWorkerTool = vi.fn((execution: WorkerToolExecutionEnvelope) =>
      Promise.resolve(
        createWorkerToolResult({
          schemaVersion: 1,
          executionId: execution.executionId,
          executionDigest: execution.executionDigest,
          sessionId: execution.sessionId,
          callerId: execution.callerId,
          missionId: execution.missionId,
          missionVersion: execution.missionVersion,
          profileId: execution.profileId,
          profileVersion: execution.profileVersion,
          policyVersion: execution.policyVersion,
          sourceTurnId: execution.sourceTurnId,
          sourceTurnNumber: execution.sourceTurnNumber,
          sourceTurnDigest: execution.sourceTurnDigest,
          requestDigest: execution.requestDigest,
          completedAt: CREATED_AT,
          remainingBudget: {
            remainingDurationSeconds: 300,
            remainingToolCalls: 20,
            remainingResearchRequests: 0,
            remainingResearchResults: 0,
            remainingLocalCommands: 10,
            remainingPrivilegedActions: 0,
          },
          outcome: "denied",
          name: "guardian.session_status",
          denial: {
            code: "request_denied",
            disposition: "revoked",
            policyId: "reference-worker-violations-2026-09-02",
            policyVersion: 1,
          },
        }),
      ),
    );
    const harness = coordinator(runWorkerTurn, executeWorkerTool);
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Stop after deterministic revocation.",
    });
    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );

    expect(runWorkerTurn).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      state: "revoked",
      workerTurn: {
        state: "revoked",
        toolResult: { denial: { code: "request_denied", disposition: "revoked" } },
      },
    });
  });

  it("fails closed when the second worker turn requests another tool", async () => {
    const runWorkerTurn = vi.fn((turn: WorkerTurnEnvelope) =>
      Promise.resolve({
        providerRequestId: `fake_worker_${turn.turnNumber}`,
        turnId: turn.turnId,
        turnNumber: turn.turnNumber,
        turnDigest: turn.turnDigest,
        outcome: {
          kind: "tool_request" as const,
          request: { name: "guardian.session_status" as const, arguments: {} },
        },
      }),
    );
    const executeWorkerTool = vi.fn((execution: WorkerToolExecutionEnvelope) =>
      Promise.resolve(
        createWorkerToolResult({
          schemaVersion: 1,
          executionId: execution.executionId,
          executionDigest: execution.executionDigest,
          sessionId: execution.sessionId,
          callerId: execution.callerId,
          missionId: execution.missionId,
          missionVersion: execution.missionVersion,
          profileId: execution.profileId,
          profileVersion: execution.profileVersion,
          policyVersion: execution.policyVersion,
          sourceTurnId: execution.sourceTurnId,
          sourceTurnNumber: execution.sourceTurnNumber,
          sourceTurnDigest: execution.sourceTurnDigest,
          requestDigest: execution.requestDigest,
          completedAt: CREATED_AT,
          remainingBudget: {
            remainingDurationSeconds: 300,
            remainingToolCalls: 19,
            remainingResearchRequests: 0,
            remainingResearchResults: 0,
            remainingLocalCommands: 10,
            remainingPrivilegedActions: 0,
          },
          outcome: "succeeded",
          name: "guardian.session_status",
          output: {
            sessionId: IDS.session,
            missionId: IDS.mission,
            missionVersion: 1,
            profileId: IDS.profile,
            profileVersion: 1,
            policyVersion: 1,
            callerId: IDS.caller,
            state: "active",
            assurance: "enforced",
            expiresAt: "2026-08-31T10:05:00.000Z",
            tools: ["guardian.local_command", "guardian.session_status"],
          },
        }),
      ),
    );
    const harness = coordinator(runWorkerTurn, executeWorkerTool);
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Attempt no more than one exact tool request.",
    });
    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );
    expect(result.workerTurn).toEqual({ state: "failed_closed", error: "provider_malformed" });
    expect(result.state).toBe("revoked");
    expect(runWorkerTurn).toHaveBeenCalledTimes(2);
    expect(executeWorkerTool).toHaveBeenCalledTimes(1);
  });

  it("binds the Guardian mission brief to the normalized mission and profile", async () => {
    const harness = coordinator();
    const runInteraction = vi.fn(() =>
      Promise.resolve({
        state: "completed" as const,
        providerRequestId: "provider_request_1",
        outcome: { kind: "mission_brief" as const, summary: "Mission received." },
      }),
    );
    const bootstrap = new ReferenceSessionBootstrapCoordinator({
      sessionId: IDS.session,
      callerId: IDS.caller,
      launchSession: harness.launchSession,
      ...workspaceOptions(),
      runInteraction,
      now: () => CREATED_AT,
      randomId: (() => {
        const ids = [IDS.draft, IDS.mission, IDS.profile, IDS.revocation];
        return () => ids.shift() ?? IDS.revocation;
      })(),
    });
    const preview = bootstrap.createDraft({ schemaVersion: 1, objective: "Review the PR." });

    const result = await bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );

    expect(runInteraction).toHaveBeenCalledWith({
      sessionId: IDS.session,
      callerId: IDS.caller,
      missionId: IDS.mission,
      missionVersion: 1,
      profileId: IDS.profile,
      profileVersion: 1,
      policyVersion: 1,
      startsAt: CREATED_AT,
      expiresAt: "2026-08-31T10:05:00.000Z",
      context: {
        objective: "Review the PR.",
        constraints: preview.constraints,
        allowedTools: preview.permissions.tools,
      },
    });
    expect(result.runner).toMatchObject({
      state: "completed",
      providerRequestId: "provider_request_1",
    });
  });

  it("rejects preview mutation and permits only the original digest", async () => {
    const harness = coordinator();
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });

    await expect(
      harness.bootstrap.confirmAndLaunch(confirmation(preview.draftId, "a".repeat(64))),
    ).rejects.toThrow("digest does not match");
    expect(harness.launchSession).not.toHaveBeenCalled();

    await expect(
      harness.bootstrap.confirmAndLaunch(confirmation(preview.draftId, preview.previewDigest)),
    ).resolves.toMatchObject({ state: "active" });
  });

  it("rejects stale confirmation and atomically prevents draft replay", async () => {
    const staleHarness = coordinator();
    const stalePreview = staleHarness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });
    staleHarness.setNow("2026-08-31T10:00:30.001Z");
    await expect(
      staleHarness.bootstrap.confirmAndLaunch(
        confirmation(stalePreview.draftId, stalePreview.previewDigest),
      ),
    ).rejects.toThrow("not fresh");
    expect(staleHarness.launchSession).not.toHaveBeenCalled();

    const replayHarness = coordinator();
    const replayPreview = replayHarness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });
    const exactConfirmation = confirmation(replayPreview.draftId, replayPreview.previewDigest);
    await replayHarness.bootstrap.confirmAndLaunch(exactConfirmation);
    await expect(replayHarness.bootstrap.confirmAndLaunch(exactConfirmation)).rejects.toThrow(
      "already consumed",
    );
    expect(replayHarness.launchSession).toHaveBeenCalledTimes(1);
  });

  it("rejects caller attempts to self-declare human authorship or permissions", () => {
    const harness = coordinator();
    expect(() =>
      harness.bootstrap.createDraft({
        schemaVersion: 1,
        objective: "Merge every pull request.",
        authoredBy: { kind: "human", principalId: IDS.principal },
      } as never),
    ).toThrow();
    expect(() =>
      harness.bootstrap.createDraft({
        schemaVersion: 1,
        objective: "Merge every pull request.",
        permissions: { sideEffects: ["merge_pull_request"] },
      } as never),
    ).toThrow();
    expect(harness.launchSession).not.toHaveBeenCalled();
  });
});

const planIntent = {
  maxActions: 1,
  maxMutations: 1,
  mutationRetries: 0,
  targets: [
    {
      operation: "github.pull_request.merge",
      connectionId: IDS.execution,
      owner: "owner",
      repository: "demo",
      pullRequest: 1,
      headCommit: "a".repeat(40),
      baseBranch: "main",
    },
  ],
} as const;
const planMission = {
  constraints: ["Only execute the confirmed plan."],
  workerTools: ["guardian.session_status"],
  permissions: {
    tools: ["guardian.session_status", "github.pull_request.merge"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: {
      mode: "guardian_only",
      destinations: [{ kind: "github_repository", owner: "owner", repository: "demo" }],
    },
    sideEffects: ["write_workspace", "merge_pull_request"],
    time: { maxDurationSeconds: 300 },
    volume: {
      maxToolCalls: 2,
      maxLocalCommands: 0,
      maxResearchRequests: 0,
      maxResearchResults: 0,
      maxPrivilegedActions: 1,
    },
  },
} as const;

it("binds targets into the initial preview and activates the grant before any worker turn", async () => {
  const events: string[] = [];
  const grant = vi.fn(async () => {
    events.push("grant");
    return await Promise.resolve(IDS.execution);
  });
  const { bootstrap } = coordinator(undefined, undefined, {
    sessionPlan: planIntent,
    missionTemplate: planMission,
    activateSessionPlan: grant,
    runInteraction: async () => {
      events.push("interaction");
      return await Promise.resolve({ state: "not_attached" });
    },
  });
  const preview = bootstrap.createDraft({
    schemaVersion: 1,
    objective: "Review the approved merge.",
  });
  expect(preview.sessionPlan).toEqual(planIntent);
  const altered = coordinator(undefined, undefined, {
    sessionPlan: {
      ...planIntent,
      targets: planIntent.targets.map((t) => ({ ...t, headCommit: "b".repeat(40) })),
    },
    missionTemplate: planMission,
    activateSessionPlan: grant,
  });
  const other = altered.bootstrap.createDraft({
    schemaVersion: 1,
    objective: "Review the approved merge.",
  });
  expect(other.previewDigest).not.toBe(preview.previewDigest);
  await expect(
    bootstrap.confirmAndLaunch(confirmation(preview.draftId, preview.previewDigest)),
  ).resolves.toMatchObject({ sessionPlanGrantId: IDS.execution });
  expect(events).toEqual(["grant", "interaction"]);
  expect(grant).toHaveBeenCalledOnce();
});

it("rejects grant intent outside the mission before producing a confirmable preview", () => {
  const { bootstrap } = coordinator(undefined, undefined, {
    sessionPlan: planIntent,
    activateSessionPlan: () => Promise.resolve(IDS.execution),
  });
  expect(() => bootstrap.createDraft({ schemaVersion: 1, objective: "Review." })).toThrow(
    "exceeds mission",
  );
});

it("interrupts launch and never starts the worker when grant persistence fails", async () => {
  const worker = vi.fn();
  const { bootstrap, launchSession } = coordinator(worker, undefined, {
    sessionPlan: planIntent,
    missionTemplate: planMission,
    activateSessionPlan: async () => {
      return await Promise.reject(new Error("unavailable"));
    },
  });
  const preview = bootstrap.createDraft({ schemaVersion: 1, objective: "Review." });
  await expect(
    bootstrap.confirmAndLaunch(confirmation(preview.draftId, preview.previewDigest)),
  ).rejects.toThrow("session interrupted");
  expect(worker).not.toHaveBeenCalled();
  const launched = await Promise.resolve(
    launchSession.mock.results[0]!.value as Promise<LaunchedReferenceSession>,
  );
  expect(launched.runtime.status(CREATED_AT).state).toBe("interrupted");
});

it("uses standing deployment consent without fabricating fresh human presence", async () => {
  const base = coordinator(undefined, undefined, {
    sessionPlan: planIntent,
    missionTemplate: planMission,
    activateSessionPlan: () => Promise.resolve(IDS.execution),
  });
  const objective = "Review the approved merge.";
  const preview = base.bootstrap.createDraft({ schemaVersion: 1, objective });
  const authorization = {
    authorizationId: IDS.principal,
    deploymentId: IDS.execution,
    principalId: IDS.principal,
    authorizedAt: "2026-08-30T10:00:00.000Z",
    expiresAt: "2026-09-01T10:00:00.000Z",
    objectiveDigest: canonicalDigest("deployment_objective", 1, objective),
    permissionsDigest: canonicalDigest("deployment_permissions", 1, preview.permissions),
    sessionPlanIntentDigest: canonicalDigest("session_plan_intent", 1, planIntent),
    workspaceSnapshotDigest: preview.workspace.sourceSnapshotDigest,
  };
  const activate = vi.fn<NonNullable<ReferenceSessionBootstrapOptions["activateSessionPlan"]>>(() =>
    Promise.resolve(IDS.execution),
  );
  const configured = coordinator(undefined, undefined, {
    sessionPlan: planIntent,
    missionTemplate: planMission,
    activateSessionPlan: activate,
    deploymentAuthorization: authorization,
  });
  const pending = configured.bootstrap.createDraft({ schemaVersion: 1, objective });
  const consent = {
    ...confirmation(pending.draftId, pending.previewDigest),
    confirmedAt: authorization.authorizedAt,
    assurance: "deployment_authorization" as const,
    authorizationId: authorization.authorizationId,
    journeyId: IDS.session,
  };
  await expect(configured.bootstrap.confirmAndLaunch(consent)).resolves.toMatchObject({
    confirmationAssurance: "deployment_authorization",
    sessionPlanGrantId: IDS.execution,
  });
  expect(activate.mock.calls[0]?.[2]).toMatchObject({ confirmedAt: authorization.authorizedAt });
  await expect(
    base.bootstrap.confirmAndLaunch({
      ...consent,
      draftId: preview.draftId,
      previewDigest: preview.previewDigest,
    }),
  ).rejects.toThrow("does not cover preview");
});

it("does not let a returned preview mutate the internally confirmed plan", async () => {
  const grant = vi.fn<NonNullable<ReferenceSessionBootstrapOptions["activateSessionPlan"]>>(() =>
    Promise.resolve(IDS.execution),
  );
  const { bootstrap } = coordinator(undefined, undefined, {
    sessionPlan: planIntent,
    missionTemplate: planMission,
    activateSessionPlan: grant,
  });
  const preview = bootstrap.createDraft({ schemaVersion: 1, objective: "Review." });
  Object.assign(preview.sessionPlan!.targets[0]!, { headCommit: "b".repeat(40) });
  await bootstrap.confirmAndLaunch(confirmation(preview.draftId, preview.previewDigest));
  expect(grant.mock.calls[0]?.[0].targets[0]?.headCommit).toBe("a".repeat(40));
});

function continuationResult(
  e: WorkerToolExecutionEnvelope,
  overrides: Record<string, unknown> = {},
) {
  const fields = [
    "schemaVersion",
    "executionId",
    "executionDigest",
    "sessionId",
    "callerId",
    "missionId",
    "missionVersion",
    "profileId",
    "profileVersion",
    "policyVersion",
    "sourceTurnId",
    "sourceTurnNumber",
    "sourceTurnDigest",
    "requestDigest",
  ];
  return createWorkerToolResult({
    ...Object.fromEntries(fields.map((key) => [key, e[key as keyof typeof e]])),
    completedAt: CREATED_AT,
    remainingBudget: {
      remainingDurationSeconds: 300,
      remainingToolCalls: 20 - e.sourceTurnNumber,
      remainingResearchRequests: 0,
      remainingResearchResults: 0,
      remainingLocalCommands: 10,
      remainingPrivilegedActions: 0,
    },
    outcome: "denied",
    name: e.request.name,
    denial: {
      code: "request_denied",
      disposition: "continue",
      policyId: "reference-worker-violations-2026-09-02",
      policyVersion: 1,
    },
    ...overrides,
  });
}
describe("C7 bounded continuation", () => {
  it("continues after eligible denial, binds history, and produces a final answer", async () => {
    const turns: WorkerTurnEnvelope[] = [];
    const harness = coordinator(
      async (t) => {
        await Promise.resolve();
        turns.push(t);
        return {
          providerRequestId: "fixture",
          turnId: t.turnId,
          turnDigest: t.turnDigest,
          turnNumber: t.turnNumber,
          outcome:
            t.turnNumber < 3
              ? {
                  kind: "tool_request",
                  request: { name: "guardian.session_status", arguments: {} },
                }
              : { kind: "final_response", response: "The denied requests were contained." },
        };
      },
      async (e) => await Promise.resolve(continuationResult(e)),
      { workerMaxTurns: 4, randomId: randomUUID },
    );
    const preview = harness.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Inspect safely.",
    });
    expect(preview.workerMaxTurns).toBe(4);
    const result = await harness.bootstrap.confirmAndLaunch(
      confirmation(preview.draftId, preview.previewDigest),
    );
    expect(result.workerTurn).toMatchObject({
      state: "completed",
      result: { turnNumber: 3, outcome: { kind: "final_response" } },
    });
    expect(turns[2]?.toolHistory).toHaveLength(1);
    expect(turns.map((t) => t.continuation?.deadline)).toEqual(
      Array(3).fill("2026-08-31T10:05:00.000Z"),
    );
  });
  it.each(["callerId", "sessionId", "missionId", "profileId"])(
    "rejects a correctly hashed result from another %s",
    async (field) => {
      const run = vi.fn(
        async (t: WorkerTurnEnvelope): Promise<WorkerTurnResult> =>
          await Promise.resolve({
            providerRequestId: "fixture",
            turnId: t.turnId,
            turnDigest: t.turnDigest,
            turnNumber: t.turnNumber,
            outcome: {
              kind: "tool_request",
              request: { name: "guardian.session_status", arguments: {} },
            },
          }),
      );
      const h = coordinator(
        run,
        async (e) => await Promise.resolve(continuationResult(e, { [field]: randomUUID() })),
        {
          workerMaxTurns: 4,
          randomId: randomUUID,
        },
      );
      const p = h.bootstrap.createDraft({ schemaVersion: 1, objective: "Inspect safely." });
      expect(
        (await h.bootstrap.confirmAndLaunch(confirmation(p.draftId, p.previewDigest))).workerTurn
          .state,
      ).toBe("failed_closed");
      expect(run).toHaveBeenCalledOnce();
    },
  );
  it("rejects a tool request on the final permitted turn", async () => {
    const h = coordinator(
      async (t) =>
        await Promise.resolve({
          providerRequestId: "fixture",
          turnId: t.turnId,
          turnDigest: t.turnDigest,
          turnNumber: t.turnNumber,
          outcome: {
            kind: "tool_request",
            request: { name: "guardian.session_status", arguments: {} },
          },
        }),
      async (e) => await Promise.resolve(continuationResult(e)),
      { workerMaxTurns: 2, randomId: randomUUID },
    );
    const p = h.bootstrap.createDraft({ schemaVersion: 1, objective: "Inspect safely." });
    expect(
      (await h.bootstrap.confirmAndLaunch(confirmation(p.draftId, p.previewDigest))).workerTurn
        .state,
    ).toBe("failed_closed");
  });
});
