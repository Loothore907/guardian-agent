import assert from "node:assert/strict";
import test from "node:test";

import { randomUUID } from "node:crypto";

import { launchReferenceSession } from "../apps/session-host/dist/launcher.js";
import { runReferenceLocalCommand } from "../packages/executor/dist/index.js";

test("the production reference executor enforces the C4 isolation boundary", async () => {
  const missionId = randomUUID();
  const profileId = randomUUID();
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
  const launched = await launchReferenceSession({
    sessionId: randomUUID(),
    callerId: randomUUID(),
    revocationHandle: randomUUID(),
    policyVersion: 1,
    durationSeconds: 60,
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

  const command = await runReferenceLocalCommand({
    executable: "node",
    arguments: ["-e", "process.stdout.write('guardian-local-ok')"],
    workingDirectory: "/workspace",
    timeoutSeconds: 5,
  });
  assert.equal(command.stdout, "guardian-local-ok");
  assert.equal(command.exitCode, 0);
});
