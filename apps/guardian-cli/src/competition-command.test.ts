import { describe, expect, it, vi } from "vitest";

import type {
  MissionFormationDraftSnapshot,
  SessionBootstrapResult,
  SessionDraftPreview,
} from "@guardian/contracts";

import {
  buildGuardianCompetitionRequests,
  parseGuardianCompetitionDeploymentEnvironment,
  runGuardianCompetitionCommand,
  type GuardianCompetitionCommandSupervisor,
  type GuardianCompetitionSupervisorFactory,
} from "./competition-command.js";
import type { GuardianCliAssistedBootstrap, GuardianCliIo } from "./index.js";

const NOW = "2026-09-02T20:00:00.000Z";
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

function environment(overrides: Readonly<Record<string, string>> = {}) {
  return {
    GUARDIAN_GITHUB_APP_CLIENT_ID: "Iv23liP8Sq3ZEAyeIHju",
    GUARDIAN_COMPETITION_RESEARCH_QUERY: "Guardian pull request security review",
    GUARDIAN_COMPETITION_RESEARCH_DOMAINS: "docs.github.com",
    GUARDIAN_COMPETITION_RESEARCH_REQUIRED_TERMS: "pull request",
    GUARDIAN_COMPETITION_UNSAFE_OWNER: "loothore907",
    GUARDIAN_COMPETITION_UNSAFE_REPOSITORY: "guardian-agent",
    GUARDIAN_COMPETITION_UNSAFE_PULL_REQUEST: "13",
    GUARDIAN_COMPETITION_UNSAFE_EXPECTED_HEAD: "b".repeat(40),
    GUARDIAN_COMPETITION_OWNER: "loothore907",
    GUARDIAN_COMPETITION_REPOSITORY: "guardian-agent-demo",
    GUARDIAN_COMPETITION_PULL_REQUEST: "2",
    GUARDIAN_COMPETITION_EXPECTED_HEAD: "a".repeat(40),
    ...overrides,
  };
}

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

function bootstrap(): GuardianCliAssistedBootstrap {
  const draft: MissionFormationDraftSnapshot = {
    schemaVersion: 1,
    draftId: IDS.draft,
    revision: 1,
    state: "awaiting_review",
    createdAt: NOW,
    expiresAt: "2026-09-02T20:05:00.000Z",
    modelPolicyId: "competition-2026-09-01",
    modelPolicyVersion: 1,
    draft: {
      schemaVersion: 1,
      objective: "Validate the controlled journey.",
      constraints: ["Use only Guardian-mediated operations."],
      requestedPermissions: permissions,
      requestedRoute: "qwen_assisted",
    },
    mechanicallyMissingFields: [],
  };
  return {
    createDraft: vi.fn(() => preview()),
    createAssistedObjectiveDraft: vi.fn(() => draft),
    reviewAssistedDraft: vi.fn(() =>
      Promise.resolve({
        providerRequestId: "fake_review_1",
        outcome: {
          schemaVersion: 1 as const,
          status: "ready" as const,
          reasonCodes: ["no_issue" as const],
        },
      }),
    ),
    reviseAssistedDraft: vi.fn(() => draft),
    compileAssistedDraft: vi.fn(() => Promise.resolve(preview())),
    compileAssistedFallback: vi.fn(() => Promise.resolve(preview())),
    confirmAndLaunch: vi.fn(() => Promise.resolve(activation())),
  };
}

function completedResult() {
  return {
    state: "completed",
    research: {
      evidence: [
        {
          schemaVersion: 1,
          title: "GitHub Docs",
          excerpt: "Merge safety documentation.",
          sourceUrl: "https://docs.github.com/pulls",
          sourceContentDigest: "1".repeat(64),
          contentTrust: "untrusted_public_content",
          retrievedAt: NOW,
        },
      ],
      provenance: [
        {
          schemaVersion: 1,
          eventId: IDS.evidence,
          sessionId: IDS.session,
          sequence: 1,
          operation: "guardian.research",
          queryDigest: "2".repeat(64),
          destination: { kind: "public_domain", hostname: "docs.github.com" },
          sourceUrl: "https://docs.github.com/pulls",
          sourceContentDigest: "1".repeat(64),
          contentTrust: "untrusted_public_content",
          retrievedAt: NOW,
          providerRequestId: "fake_provider_1",
        },
      ],
    },
    researchBudget: { sessionId: IDS.session, remainingRequests: 0, remainingResults: 1 },
    unsafeAttempt: { outcome: "denied", code: "scope_mismatch" },
    legitimateAttempt: {
      outcome: "succeeded",
      result: {
        status: "merged",
        owner: "loothore907",
        repository: "guardian-agent-demo",
        pullRequest: 2,
        headCommit: "a".repeat(40),
        mergeCommit: "3".repeat(40),
      },
    },
  } as const;
}

function terminal(): { readonly io: GuardianCliIo; readonly output: string[] } {
  const output: string[] = [];
  return {
    output,
    io: {
      interactive: true,
      write: (text) => output.push(text),
      readConfirmation: vi.fn((prompt: string) => {
        if (prompt.startsWith("Type CONFIRM ")) return Promise.resolve(`CONFIRM ${"d".repeat(12)}`);
        const match = /Type AUTHORIZE ([a-f0-9]{12})/u.exec(prompt);
        return Promise.resolve(match === null ? "" : `AUTHORIZE ${match[1]}`);
      }),
    },
  };
}

describe("Guardian executable competition command", () => {
  it("parses only strict public deployment input", () => {
    const parsed = parseGuardianCompetitionDeploymentEnvironment(environment());
    expect(parsed).toMatchObject({
      githubClientId: "Iv23liP8Sq3ZEAyeIHju",
      legitimateTarget: { repository: "guardian-agent-demo", pullRequest: 2 },
      unsafeTarget: { repository: "guardian-agent", pullRequest: 13 },
    });
    expect(() =>
      parseGuardianCompetitionDeploymentEnvironment(
        environment({ GUARDIAN_COMPETITION_RESEARCH_QUERY: `token=${"x".repeat(32)}` }),
      ),
    ).toThrow("secret-like");
    expect(() =>
      parseGuardianCompetitionDeploymentEnvironment(
        environment({ GUARDIAN_COMPETITION_UNSAFE_REPOSITORY: "guardian-agent-demo" }),
      ),
    ).toThrow("different repositories");
  });

  it("builds exact requests only from an active enforced activation", () => {
    const deployment = parseGuardianCompetitionDeploymentEnvironment(environment());
    const randomIds = [
      IDS.requestUnsafe,
      IDS.proposalUnsafe,
      IDS.requestLegitimate,
      IDS.proposalLegitimate,
    ];
    const requests = buildGuardianCompetitionRequests({
      deployment,
      activation: activation(),
      callerId: IDS.caller,
      connectionId: IDS.connection,
      proposedAt: NOW,
      randomId: () => randomIds.shift()!,
    });
    expect(requests.unsafeRequest).toMatchObject({
      sessionId: IDS.session,
      callerId: IDS.caller,
      connectionId: IDS.connection,
      proposal: {
        operation: "github.pull_request.merge",
        arguments: { repository: "guardian-agent" },
      },
    });
    expect(requests.legitimateRequest).toMatchObject({
      missionId: IDS.mission,
      profileId: IDS.profile,
      policyVersion: 1,
      proposal: { arguments: { repository: "guardian-agent-demo", method: "squash" } },
    });
    expect(() =>
      buildGuardianCompetitionRequests({
        deployment,
        activation: activation("revoked"),
        callerId: IDS.caller,
        connectionId: IDS.connection,
        proposedAt: NOW,
      }),
    ).toThrow("active enforced session");
  });

  it("runs the fixed fake-provider journey from the exact executable command and closes", async () => {
    const serviceBootstrap = bootstrap();
    const runCompetitionJourney = vi.fn<
      GuardianCompetitionCommandSupervisor["runCompetitionJourney"]
    >(() => Promise.resolve(completedResult()));
    const close = vi.fn(() => Promise.resolve());
    const supervisor: GuardianCompetitionCommandSupervisor = {
      bootstrap: serviceBootstrap,
      runCompetitionJourney,
      close,
    };
    const startSupervisor = vi.fn<GuardianCompetitionSupervisorFactory>(() =>
      Promise.resolve(supervisor),
    );
    const ids = [
      IDS.session,
      IDS.caller,
      IDS.principal,
      IDS.connection,
      IDS.requestUnsafe,
      IDS.proposalUnsafe,
      IDS.requestLegitimate,
      IDS.proposalLegitimate,
    ];
    const console = terminal();

    await expect(
      runGuardianCompetitionCommand({
        arguments: ["competition"],
        environment: environment(),
        projectRoot: "C:\\guardian",
        io: console.io,
        startSupervisor,
        now: () => NOW,
        randomId: () => ids.shift()!,
      }),
    ).resolves.toMatchObject({ state: "completed" });

    expect(startSupervisor.mock.calls[0]?.[0]).toMatchObject({
      sessionId: IDS.session,
      callerId: IDS.caller,
    });
    expect(startSupervisor.mock.calls[0]?.[1]).toMatchObject({
      interactionProcess: "fake",
      riskProcess: "fake",
      workerMode: "deterministic_reference",
      competition: {
        connectionId: IDS.connection,
        repository: "guardian-agent-demo",
        researchDomains: ["docs.github.com"],
      },
    });
    expect(runCompetitionJourney.mock.calls[0]?.[0]).toMatchObject({
      unsafeRequest: {
        proposal: {
          arguments: { repository: "guardian-agent" },
        },
      },
      legitimateRequest: {
        proposal: {
          arguments: { repository: "guardian-agent-demo" },
        },
      },
    });
    expect(close).toHaveBeenCalledOnce();
    expect(console.output.join("\n")).toContain(
      "Guardian controlled competition journey completed",
    );
  });

  it("rejects any non-exact command before starting the supervisor", async () => {
    const startSupervisor = vi.fn();
    await expect(
      runGuardianCompetitionCommand({
        arguments: ["competition", "anything"],
        environment: environment(),
        projectRoot: "C:\\guardian",
        io: terminal().io,
        startSupervisor,
      }),
    ).rejects.toThrow("usage");
    expect(startSupervisor).not.toHaveBeenCalled();
  });
});
