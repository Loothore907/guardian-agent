import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { startReferenceAuthoritySupervisor } from "./index.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  mission: "33333333-3333-4333-8333-333333333333",
  profile: "44444444-4444-4444-8444-444444444444",
  connection: "55555555-5555-4555-8555-555555555555",
  request: "66666666-6666-4666-8666-666666666666",
  proposal: "77777777-7777-4777-8777-777777777777",
  principal: "88888888-8888-4888-8888-888888888888",
} as const;
const NOW_MILLISECONDS = Date.now();
const START = new Date(NOW_MILLISECONDS - 60_000).toISOString();
const NOW = new Date(NOW_MILLISECONDS).toISOString();
const EXPIRY = new Date(NOW_MILLISECONDS + 10 * 60_000).toISOString();
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function location() {
  const directory = await mkdtemp(join(tmpdir(), "guardian-reference-supervisor-"));
  temporaryDirectories.push(directory);
  if (process.platform !== "win32") await chmod(directory, 0o700);
  const workspace = join(directory, "workspace");
  await mkdir(workspace);
  const projectRoot = join(directory, "project");
  await mkdir(projectRoot);
  await writeFile(join(projectRoot, "README.md"), "# Session fixture\n", "utf8");
  execFileSync("git", ["init", "--quiet"], { cwd: projectRoot, windowsHide: true });
  return { databasePath: join(directory, "authority.sqlite"), projectRoot, workspace };
}

function session() {
  return {
    schemaVersion: 1,
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    startsAt: START,
    expiresAt: EXPIRY,
    status: "active",
    createdAt: START,
    updatedAt: START,
  } as const;
}

function request() {
  const resourceVersion = {
    kind: "github_pull_request",
    owner: "loothore907",
    repository: "guardian-agent-demo",
    pullRequest: 1,
    headCommit: "a".repeat(40),
  } as const;
  return {
    schemaVersion: 1,
    requestId: IDS.request,
    sessionId: IDS.session,
    callerId: IDS.caller,
    connectionId: IDS.connection,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    proposal: {
      schemaVersion: 1,
      proposalId: IDS.proposal,
      sessionId: IDS.session,
      callerId: IDS.caller,
      missionId: IDS.mission,
      missionVersion: 1,
      profileId: IDS.profile,
      profileVersion: 1,
      proposedAt: NOW,
      operation: "github.pull_request.merge",
      arguments: {
        owner: "loothore907",
        repository: "guardian-agent-demo",
        pullRequest: 1,
        expectedHeadCommit: "a".repeat(40),
        method: "squash",
      },
      resourceVersion,
    },
    resourceVersion,
  } as const;
}

describe("reference authority supervisor", () => {
  it("runs the fake pre-activation dialogue and setup-risk children", async () => {
    const { databasePath, projectRoot, workspace } = await location();
    const supervisor = await startReferenceAuthoritySupervisor(
      {
        sessionId: IDS.session,
        callerId: IDS.caller,
        authorityStorePath: databasePath,
        projectRoot,
        workspaceRoots: [workspace],
        issuedAt: START,
        expiresAt: EXPIRY,
      },
      {
        interactionProcess: "fake",
        riskProcess: "fake",
        workerMode: "nebius_native",
      },
    );
    try {
      await expect(
        supervisor.runCompetitionJourney({
          researchRequest: {},
          unsafeRequest: request(),
          legitimateRequest: request(),
          githubClientId: "Iv23liP8Sq3ZEAyeIHju",
          confirmation: { principalId: IDS.principal, confirmedAt: NOW },
        }),
      ).rejects.toThrow("requires an activated session");
      const draft = supervisor.bootstrap.createAssistedObjectiveDraft({
        schemaVersion: 1,
        objective: "Review the pull request without external side effects.",
      });
      await expect(supervisor.bootstrap.reviewAssistedDraft(draft.draftId)).resolves.toMatchObject({
        outcome: { status: "ready" },
      });
      await expect(
        supervisor.bootstrap.compileAssistedDraft(draft.draftId, draft.revision),
      ).resolves.toMatchObject({
        state: "awaiting_confirmation",
        worker: {
          kind: "nebius_native",
          provider: "nebius_token_factory",
          role: "native_worker",
        },
      });
    } finally {
      await supervisor.close();
    }
  });

  it("binds a strict competition mission and narrower worker catalog before activation", async () => {
    const { databasePath, projectRoot, workspace } = await location();
    const supervisor = await startReferenceAuthoritySupervisor(
      {
        sessionId: IDS.session,
        callerId: IDS.caller,
        authorityStorePath: databasePath,
        projectRoot,
        workspaceRoots: [workspace],
        issuedAt: START,
        expiresAt: EXPIRY,
      },
      {
        competition: {
          connectionId: IDS.connection,
          owner: "loothore907",
          repository: "guardian-agent-demo",
          researchDomains: ["docs.github.com"],
          researchRequiredTerms: ["pull request"],
        },
      },
    );
    try {
      const preview = supervisor.bootstrap.createDraft({
        schemaVersion: 1,
        objective: "Validate the controlled research and merge journey.",
      });
      expect(preview).toMatchObject({
        permissions: {
          tools: [
            "guardian.session_status",
            "guardian.local_command",
            "guardian.research",
            "github.pull_request.merge",
          ],
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
        },
        workerTools: ["guardian.session_status", "guardian.local_command"],
      });
    } finally {
      await supervisor.close();
    }
  });

  it("does not persist competition connection authority before exact session activation", async () => {
    const { databasePath, projectRoot, workspace } = await location();
    const config = {
      sessionId: IDS.session,
      callerId: IDS.caller,
      authorityStorePath: databasePath,
      projectRoot,
      workspaceRoots: [workspace],
      issuedAt: START,
      expiresAt: EXPIRY,
    } as const;
    const options = {
      competition: {
        connectionId: IDS.connection,
        owner: "loothore907",
        repository: "guardian-agent-demo",
        researchDomains: ["docs.github.com"],
        researchRequiredTerms: ["pull request"],
      },
    } as const;

    const declined = await startReferenceAuthoritySupervisor(config, options);
    declined.bootstrap.createDraft({
      schemaVersion: 1,
      objective: "Inspect the preview without confirming it.",
    });
    await declined.close();

    const restarted = await startReferenceAuthoritySupervisor(config, options);
    await restarted.close();
  });

  it("rejects malformed competition configuration before starting authority", async () => {
    await expect(
      startReferenceAuthoritySupervisor(
        {
          sessionId: IDS.session,
          callerId: IDS.caller,
          authorityStorePath: "unused.sqlite",
          projectRoot: ".",
          workspaceRoots: ["workspace"],
          issuedAt: START,
          expiresAt: EXPIRY,
        },
        {
          competition: {
            connectionId: IDS.connection,
            owner: "loothore907",
            repository: "guardian-agent-demo",
            researchDomains: ["not a host"],
            researchRequiredTerms: ["pull request"],
          },
        },
      ),
    ).rejects.toThrow();
  });

  it("stores an exact lower-assurance approval through the authorization role", async () => {
    const { databasePath, projectRoot, workspace } = await location();
    const supervisor = await startReferenceAuthoritySupervisor(
      {
        sessionId: IDS.session,
        callerId: IDS.caller,
        authorityStorePath: databasePath,
        projectRoot,
        workspaceRoots: [workspace],
        issuedAt: START,
        expiresAt: EXPIRY,
      },
      { now: () => NOW },
    );
    try {
      expect(supervisor.authorityProcessId).not.toBe(process.pid);
      await supervisor.launcher.createConnection({
        schemaVersion: 1,
        connectionId: IDS.connection,
        provider: "github",
        credentialStoreHandle: "guardian-credential://github/99999999-9999-4999-8999-999999999999",
        owner: "loothore907",
        repository: "guardian-agent-demo",
        permissions: ["pull_request:read", "pull_request:merge"],
        status: "active",
        createdAt: START,
        updatedAt: START,
      });
      await supervisor.launcher.createSession(
        session(),
        {
          sessionId: IDS.session,
          remainingToolCalls: 2,
          remainingLocalCommands: 0,
          remainingResearchRequests: 1,
          remainingResearchResults: 2,
        },
        [IDS.connection],
      );
      const issued = await supervisor.authorizationIssuer.issueExactApproval({
        request: request(),
        scopeDigest: "d".repeat(64),
        confirmation: { principalId: IDS.principal, confirmedAt: NOW },
      });

      expect(issued.assurance).toBe("development_confirmation");
      await expect(
        supervisor.broker.getApproval(IDS.session, issued.approval.approvalId),
      ).resolves.toEqual(issued.approval);
      await expect(
        supervisor.authorizationIssuer.issueExactApproval({
          request: { ...request(), callerId: IDS.principal },
          scopeDigest: "d".repeat(64),
          confirmation: { principalId: IDS.principal, confirmedAt: NOW },
        }),
      ).rejects.toThrow();
      await expect(
        supervisor.authorizationIssuer.issueExactApproval({
          request: request(),
          scopeDigest: "d".repeat(64),
          confirmation: {
            principalId: IDS.principal,
            confirmedAt: new Date(NOW_MILLISECONDS - 30_001).toISOString(),
          },
        }),
      ).rejects.toThrow("not fresh");
    } finally {
      await supervisor.close();
    }
  });

  it("fails before startup when mandatory authority configuration is missing", async () => {
    await expect(
      startReferenceAuthoritySupervisor({
        sessionId: IDS.session,
        callerId: IDS.caller,
        authorityStorePath: "",
        projectRoot: ".",
        workspaceRoots: [],
        issuedAt: START,
        expiresAt: EXPIRY,
      }),
    ).rejects.toThrow("authority store path is required");
  });

  it("does not restart an authority process after unexpected exit", async () => {
    const { databasePath, projectRoot, workspace } = await location();
    const supervisor = await startReferenceAuthoritySupervisor({
      sessionId: IDS.session,
      callerId: IDS.caller,
      authorityStorePath: databasePath,
      projectRoot,
      workspaceRoots: [workspace],
      issuedAt: START,
      expiresAt: EXPIRY,
    });
    try {
      process.kill(supervisor.authorityProcessId, "SIGTERM");
      await supervisor.authorityExited;
      await expect(supervisor.broker.getSession(IDS.session)).rejects.toMatchObject({
        reason: "authority_unavailable",
      });
    } finally {
      await supervisor.close();
    }
  });
});
