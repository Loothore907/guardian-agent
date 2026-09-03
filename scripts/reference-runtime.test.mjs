import assert from "node:assert/strict";
import test from "node:test";

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { launchReferenceSession } from "../apps/session-host/dist/launcher.js";
import { startReferenceAuthoritySupervisor } from "../apps/reference-supervisor/dist/index.js";
import { ManagedSessionWorkspace } from "../packages/workspace/dist/index.js";

test("the production reference executor enforces the C4 isolation boundary", async () => {
  const missionId = randomUUID();
  const profileId = randomUUID();
  const sessionId = randomUUID();
  const temporaryRoot = await mkdtemp(join(tmpdir(), "guardian-reference-runtime-"));
  const projectRoot = join(temporaryRoot, "project");
  const storageRoot = join(temporaryRoot, "sessions");
  await mkdir(projectRoot);
  await writeFile(join(projectRoot, "README.md"), "# Reference workspace\n", "utf8");
  execFileSync("git", ["init", "--quiet"], { cwd: projectRoot, windowsHide: true });
  const workspace = await ManagedSessionWorkspace.plan({
    sourceRoot: projectRoot,
    storageRoot,
    sessionId,
  });
  const preparedWorkspace = await workspace.prepare();
  const permissions = {
    tools: ["guardian.session_status", "guardian.local_command"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: { mode: "none", destinations: [] },
    sideEffects: ["write_workspace"],
    time: { maxDurationSeconds: 60 },
    volume: {
      maxToolCalls: 5,
      maxResearchRequests: 0,
      maxResearchResults: 0,
      maxLocalCommands: 5,
      maxPrivilegedActions: 0,
    },
  };
  try {
    const launched = await launchReferenceSession({
      sessionId,
      callerId: randomUUID(),
      revocationHandle: randomUUID(),
      policyVersion: 1,
      durationSeconds: 60,
      workspace: preparedWorkspace,
      mission: {
        schemaVersion: 1,
        missionId,
        version: 1,
        authoredBy: { kind: "human", principalId: randomUUID() },
        authoredAt: new Date().toISOString(),
        objective: "Verify the C4 reference runtime.",
        constraints: [],
        authority: permissions,
      },
      profile: {
        schemaVersion: 1,
        profileId,
        version: 1,
        missionId,
        missionVersion: 1,
        policyVersion: 1,
        permissions,
        assurance: { level: "unknown", evidence: [] },
      },
    });

    const status = launched.runtime.status(new Date().toISOString());
    assert.equal(status.state, "active");
    assert.equal(status.assurance, "enforced");
    assert.deepEqual(status.tools, ["guardian.local_command", "guardian.session_status"]);
    assert.equal(launched.profile.assurance.evidence.length, 4);

    const command = await launched.localCommand({
      executable: "node",
      arguments: [
        "-e",
        "require('fs').writeFileSync('/workspace/persistent.txt','guardian-local-ok')",
      ],
      workingDirectory: "/workspace",
      timeoutSeconds: 5,
    });
    assert.equal(command.exitCode, 0);
    const persisted = await launched.localCommand({
      executable: "node",
      arguments: [
        "-e",
        "process.stdout.write(require('fs').readFileSync('/workspace/persistent.txt','utf8'))",
      ],
      workingDirectory: "/workspace",
      timeoutSeconds: 5,
    });
    assert.equal(persisted.stdout, "guardian-local-ok");
    assert.equal(persisted.exitCode, 0);
    await assert.rejects(access(join(projectRoot, "persistent.txt")));

    const commandBoundary = await launched.localCommand({
      executable: "node",
      arguments: [
        "-e",
        "const f=require('fs');const paths=['/home','/mnt','/root'];const keys=['GITHUB_TOKEN','GH_TOKEN','NEBIUS_API_KEY','TAVILY_API_KEY'];process.exit(paths.some(f.existsSync)||keys.some(k=>k in process.env)?1:0)",
      ],
      workingDirectory: "/workspace",
      timeoutSeconds: 5,
    });
    assert.equal(commandBoundary.exitCode, 0);

    const directNetwork = await launched.localCommand({
      executable: "node",
      arguments: [
        "-e",
        "fetch('https://example.com').then(()=>process.exit(1)).catch(()=>process.exit(0))",
      ],
      workingDirectory: "/workspace",
      timeoutSeconds: 5,
    });
    assert.equal(directNetwork.exitCode, 0);
    const w3CommandProbe = await launched.localCommand({
      executable: "node",
      arguments: ["-p", "require('fs').readFileSync('README.md','utf8').slice(0,80)"],
      workingDirectory: "/workspace",
      timeoutSeconds: 10,
    });
    assert.equal(w3CommandProbe.exitCode, 0, w3CommandProbe.stderr);
    assert.match(w3CommandProbe.stdout, /Reference workspace/u);

    const supervisorStartedAt = new Date();
    const supervisor = await startReferenceAuthoritySupervisor({
      sessionId: randomUUID(),
      callerId: randomUUID(),
      authorityStorePath: join(temporaryRoot, "w3-authority.sqlite"),
      projectRoot,
      workspaceRoots: [join(temporaryRoot, "w3-sessions")],
      issuedAt: supervisorStartedAt.toISOString(),
      expiresAt: new Date(supervisorStartedAt.getTime() + 10 * 60_000).toISOString(),
    });
    try {
      const draft = supervisor.bootstrap.createDraft({
        schemaVersion: 1,
        objective: "Read the exact prepared workspace through one bounded worker tool round-trip.",
      });
      const result = await supervisor.bootstrap.confirmAndLaunch({
        schemaVersion: 1,
        draftId: draft.draftId,
        previewDigest: draft.previewDigest,
        confirmedBy: { kind: "human", principalId: randomUUID() },
        confirmedAt: new Date().toISOString(),
        assurance: "development_confirmation",
      });
      assert.equal(
        result.workerTurn.state,
        "completed",
        result.workerTurn.state === "failed_closed"
          ? `W3 worker failed closed: ${result.workerTurn.error}`
          : "W3 worker did not complete",
      );
      assert.equal(result.workerTurn.result.turnNumber, 2);
      assert.equal(result.workerTurn.result.outcome.kind, "final_response");
      assert.equal(result.workerTurn.toolResult?.name, "guardian.local_command");
      assert.match(result.workerTurn.toolResult?.output.stdout ?? "", /Reference workspace/u);
      assert.equal(result.workerTurn.toolResult?.remainingBudget.remainingToolCalls, 19);
      assert.equal(result.workerTurn.toolResult?.remainingBudget.remainingLocalCommands, 9);
      await assert.rejects(access(join(projectRoot, "persistent.txt")));
    } finally {
      await supervisor.close();
    }
  } finally {
    await workspace.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
