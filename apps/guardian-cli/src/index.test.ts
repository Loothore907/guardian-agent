import { describe, expect, it, vi } from "vitest";

import type { MissionFormationDraftSnapshot } from "@guardian/contracts";

import type { GuardianCliAssistedBootstrap, GuardianCliBootstrap, GuardianCliIo } from "./index.js";
import { parseGuardianCliArguments, runGuardianAssistedCli, runGuardianCli } from "./index.js";

const IDS = {
  draft: "11111111-1111-4111-8111-111111111111",
  principal: "22222222-2222-4222-8222-222222222222",
  session: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  profile: "55555555-5555-4555-8555-555555555555",
} as const;
const NOW = "2026-08-31T10:00:00.000Z";
const DIGEST = "abcdefabcdef" + "0".repeat(52);
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

function preview() {
  return {
    schemaVersion: 1,
    draftId: IDS.draft,
    previewDigest: DIGEST,
    state: "awaiting_confirmation",
    createdAt: NOW,
    expiresAt: "2026-08-31T10:05:00.000Z",
    objective: "Review the pull request.",
    constraints: ["Do not perform external service operations."],
    permissions: {
      tools: ["guardian.session_status", "guardian.local_command"],
      filesystem: { mode: "workspace_write", roots: ["/workspace"] },
      network: { mode: "none", destinations: [] },
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
    integration: {
      mode: "guardian_launched_reference",
      maximumAssurance: "enforced",
    },
    worker: { schemaVersion: 1, kind: "deterministic_reference" },
    workspace: WORKSPACE_SELECTION,
  } as const;
}

function bootstrap(): GuardianCliBootstrap {
  return {
    createDraft: vi.fn(() => preview()),
    confirmAndLaunch: vi.fn(() =>
      Promise.resolve({
        schemaVersion: 1,
        draftId: IDS.draft,
        sessionId: IDS.session,
        missionId: IDS.mission,
        missionVersion: 1,
        profileId: IDS.profile,
        profileVersion: 1,
        state: "active",
        assurance: "enforced",
        expiresAt: "2026-08-31T10:05:00.000Z",
        tools: ["guardian.local_command", "guardian.session_status"],
        confirmationAssurance: "development_confirmation",
        worker: { schemaVersion: 1, kind: "deterministic_reference" },
        workspace: {
          schemaVersion: 1,
          state: "ready",
          selection: WORKSPACE_SELECTION,
          fileCount: 2,
          totalBytes: 20,
          baseline: "sanitized_git_repository",
        },
        runner: {
          state: "completed",
          providerRequestId: "fake_interaction_1",
          outcome: { kind: "mission_brief", summary: "Mission received." },
        },
        workerTurn: { state: "not_attached" },
      } as const),
    ),
  };
}

function io(response: string, interactive = true) {
  const output: string[] = [];
  const value: GuardianCliIo = {
    interactive,
    write: (text) => output.push(text),
    readConfirmation: vi.fn(() => Promise.resolve(response)),
  };
  return { value, output };
}

function assistedBootstrap(): GuardianCliAssistedBootstrap {
  const base = bootstrap();
  const draft = {
    schemaVersion: 1,
    draftId: IDS.draft,
    revision: 1,
    state: "awaiting_review",
    createdAt: NOW,
    expiresAt: "2026-08-31T10:05:00.000Z",
    modelPolicyId: "competition-2026-09-01",
    modelPolicyVersion: 1,
    draft: {
      schemaVersion: 1,
      objective: "Review the pull request.",
      constraints: ["Do not perform external service operations."],
      requestedPermissions: preview().permissions,
      requestedRoute: "qwen_assisted",
    },
    mechanicallyMissingFields: [],
  } as const;
  return {
    ...base,
    createAssistedObjectiveDraft: vi.fn(() => draft),
    reviewAssistedDraft: vi
      .fn()
      .mockResolvedValueOnce({
        providerRequestId: "review_1",
        outcome: {
          schemaVersion: 1,
          status: "needs_clarification",
          missingFields: [],
          reasonCodes: ["ambiguous_objective"],
          questions: [{ field: "constraints", question: "What changes are forbidden?" }],
        },
      })
      .mockResolvedValueOnce({
        providerRequestId: "review_2",
        outcome: { schemaVersion: 1, status: "ready", reasonCodes: ["no_issue"] },
      }),
    reviseAssistedDraft: vi.fn(
      (_draftId, _revision, revised: MissionFormationDraftSnapshot["draft"]) => ({
        ...draft,
        revision: 2,
        draft: revised,
      }),
    ),
    compileAssistedDraft: vi.fn(() => Promise.resolve(preview())),
    compileAssistedFallback: vi.fn(() => Promise.resolve(preview())),
  };
}

describe("Guardian terminal bootstrap CLI", () => {
  it("accepts one explicit start objective and rejects missing input", () => {
    expect(parseGuardianCliArguments(["start", "Review", "PR", "12"])).toEqual({
      objective: "Review PR 12",
    });
    expect(() => parseGuardianCliArguments(["start"])).toThrow("usage");
    expect(() => parseGuardianCliArguments(["approve", "anything"])).toThrow("usage");
  });

  it("does not launch from a non-interactive invocation", async () => {
    const service = bootstrap();
    const terminal = io(`CONFIRM ${DIGEST.slice(0, 12)}`, false);
    await expect(
      runGuardianCli({
        objective: "Review the pull request.",
        principalId: IDS.principal,
        bootstrap: service,
        io: terminal.value,
        now: () => NOW,
      }),
    ).rejects.toThrow("interactive development confirmation is required");
    expect(service.confirmAndLaunch).not.toHaveBeenCalled();
  });

  it("requires the exact digest confirmation and sends no preview authority fields", async () => {
    const service = bootstrap();
    const terminal = io("CONFIRM wrong-digest");
    await expect(
      runGuardianCli({
        objective: "Review the pull request.",
        principalId: IDS.principal,
        bootstrap: service,
        io: terminal.value,
        now: () => NOW,
      }),
    ).rejects.toThrow("not confirmed");
    expect(service.confirmAndLaunch).not.toHaveBeenCalled();
    expect(service.createDraft).toHaveBeenCalledWith({
      schemaVersion: 1,
      objective: "Review the pull request.",
    });
  });

  it("launches the exact preview and labels development confirmation separately", async () => {
    const service = bootstrap();
    const terminal = io(`CONFIRM ${DIGEST.slice(0, 12)}`);
    const result = await runGuardianCli({
      objective: "Review the pull request.",
      principalId: IDS.principal,
      bootstrap: service,
      io: terminal.value,
      now: () => NOW,
    });

    expect(service.confirmAndLaunch).toHaveBeenCalledWith({
      schemaVersion: 1,
      draftId: IDS.draft,
      previewDigest: DIGEST,
      confirmedBy: { kind: "human", principalId: IDS.principal },
      confirmedAt: NOW,
      assurance: "development_confirmation",
    });
    expect(result.assurance).toBe("enforced");
    expect(terminal.output.join("\n")).toContain(
      "Confirmation assurance: development_confirmation",
    );
    expect(terminal.output.join("\n")).not.toContain("authorityCapability");
    expect(terminal.output.join("\n")).toContain("Guardian mission brief: Mission received.");
    expect(terminal.output.join("\n")).toContain("no host writeback, deleted on close");
  });

  it("relays bounded clarification, revalidates the revision, and then confirms", async () => {
    const service = assistedBootstrap();
    const responses = [
      "Do not merge or write external services.",
      `CONFIRM ${DIGEST.slice(0, 12)}`,
    ];
    const output: string[] = [];
    const terminal: GuardianCliIo = {
      interactive: true,
      write: (text) => output.push(text),
      readConfirmation: vi.fn(() => Promise.resolve(responses.shift() ?? "")),
    };

    await expect(
      runGuardianAssistedCli({
        objective: "Review the pull request.",
        principalId: IDS.principal,
        bootstrap: service,
        io: terminal,
        now: () => NOW,
      }),
    ).resolves.toMatchObject({ state: "active" });

    expect(service.reviseAssistedDraft).toHaveBeenCalledTimes(1);
    const revisionCall = vi.mocked(service.reviseAssistedDraft).mock.calls[0];
    expect(revisionCall?.[0]).toBe(IDS.draft);
    expect(revisionCall?.[1]).toBe(1);
    expect(revisionCall?.[2].constraints).toContain(
      "Human clarification for constraints: Do not merge or write external services.",
    );
    expect(service.compileAssistedDraft).toHaveBeenCalledWith(IDS.draft, 2);
    expect(output.join("\n")).toContain("Guardian development session preview");
  });
});
