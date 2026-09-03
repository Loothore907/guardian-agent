import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  LocalAuthorityIpcClient,
  createAuthorityIpcEndpoint,
} from "../packages/authority-client/dist/index.js";
import { startAuthorityService } from "../apps/authority-service/dist/index.js";
import { digestCanonicalRequest } from "../packages/authorization/dist/index.js";
import { LocalBrokerIpcClient, createBrokerIpcCredentials } from "../packages/broker/dist/index.js";
import {
  BrokerServiceProcessConfigSchema,
  CanonicalRequestSchema,
} from "../packages/contracts/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";
import { createGuardianActionRiskIpcCredentials } from "../packages/guardian/dist/index.js";
import { SqliteAuthorityStore } from "../packages/authority-store/dist/index.js";
import { launchReferenceSession } from "../apps/session-host/dist/launcher.js";
import { ManagedSessionWorkspace } from "../packages/workspace/dist/index.js";

const OWNER = "loothore907";
const REPOSITORY = "guardian-agent-demo";
const EXPECTED_DENIALS = new Set(["approval_mismatch", "guardian_step_up", "guardian_denied"]);

async function waitForReady(child, readyLine, serviceName) {
  const timeout = setTimeout(() => child.kill(), 15_000);
  try {
    for await (const chunk of child.stdout) {
      if (String(chunk).includes(readyLine)) return;
    }
    throw new Error(`${serviceName} exited before readiness`);
  } finally {
    clearTimeout(timeout);
  }
}

async function stopChild(child) {
  if (child.exitCode === null && child.signalCode === null) {
    const closed = once(child, "close");
    child.kill();
    let timeout;
    try {
      const closedBeforeTimeout = await Promise.race([
        closed.then(() => true),
        new Promise((resolve) => {
          timeout = setTimeout(() => resolve(false), 5_000);
          timeout.unref();
        }),
      ]);
      if (!closedBeforeTimeout) {
        child.kill("SIGKILL");
        child.unref();
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  child.stdin?.destroy();
  child.stdout?.destroy();
  child.stderr?.destroy();
}

test("live Nemotron evaluates an in-scope proposal through the broker without a privileged effect", async () => {
  assert.equal(
    process.platform,
    "win32",
    "protected Nemotron test requires Windows Credential Manager",
  );
  const credentialStatus = await new WindowsCredentialStore().status({
    schemaVersion: 1,
    provider: "nebius",
    slot: "default",
  });
  assert.equal(credentialStatus.state, "available", "nebius/default must be enrolled");
  console.log("[guardian-live] Nebius credential available");

  const sessionId = randomUUID();
  const callerId = randomUUID();
  const missionId = randomUUID();
  const profileId = randomUUID();
  const connectionId = randomUUID();
  const exposureId = randomUUID();
  const issuedAt = new Date(Date.now() - 5_000).toISOString();
  const capabilityExpiresAt = new Date(Date.now() + 300_000).toISOString();
  const authorityEndpoint = createAuthorityIpcEndpoint();
  const launcherBinding = {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole: "launcher",
    callerId,
    sessionId,
    allowedOperations: ["connection.create", "session.create"],
    issuedAt,
    expiresAt: capabilityExpiresAt,
  };
  const researchBinding = {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole: "research_service",
    callerId,
    sessionId,
    allowedOperations: ["context.append_exposures"],
    issuedAt,
    expiresAt: capabilityExpiresAt,
  };
  const brokerBinding = {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole: "broker_service",
    callerId,
    sessionId,
    allowedOperations: [
      "session.get",
      "connection.list",
      "approval.get",
      "approval.state",
      "budget.consume_tool",
      "approval.consume",
      "context.append_attempt",
      "context.append_decision",
    ],
    issuedAt,
    expiresAt: capabilityExpiresAt,
  };

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "guardian-nemotron-broker-live-"));
  const authorityStorePath = join(temporaryDirectory, "authority.sqlite");
  const projectRoot = join(temporaryDirectory, "project");
  const workspaceStorageRoot = join(temporaryDirectory, "workspaces");
  await mkdir(projectRoot);
  await writeFile(join(projectRoot, "README.md"), "# Protected Nemotron workspace\n", "utf8");
  execFileSync("git", ["init", "--quiet"], { cwd: projectRoot, windowsHide: true });
  const workspace = await ManagedSessionWorkspace.plan({
    sourceRoot: projectRoot,
    storageRoot: workspaceStorageRoot,
    sessionId,
  });
  const preparedWorkspace = await workspace.prepare();
  const authority = await startAuthorityService({
    schemaVersion: 1,
    serviceInstanceId: randomUUID(),
    endpoint: authorityEndpoint,
    authorityStorePath,
    workspaceRoots: [],
    capabilities: [launcherBinding, researchBinding, brokerBinding],
  });
  const permissions = {
    tools: ["guardian.session_status", "guardian.local_command", "github.pull_request.merge"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: {
      mode: "guardian_only",
      destinations: [{ kind: "github_repository", owner: OWNER, repository: REPOSITORY }],
    },
    sideEffects: ["write_workspace", "merge_pull_request"],
    time: { maxDurationSeconds: 180 },
    volume: {
      maxToolCalls: 1,
      maxResearchRequests: 0,
      maxResearchResults: 0,
      maxLocalCommands: 0,
      maxPrivilegedActions: 1,
    },
  };
  let guardianChild;
  let brokerChild;
  let authorityClosed = false;
  try {
    const launcherAuthority = new LocalAuthorityIpcClient({
      endpoint: authorityEndpoint,
      binding: launcherBinding,
    });
    await launcherAuthority.createConnection({
      schemaVersion: 1,
      connectionId,
      provider: "github",
      credentialStoreHandle: `guardian-credential://github/${connectionId}`,
      owner: OWNER,
      repository: REPOSITORY,
      permissions: ["pull_request:merge"],
      status: "active",
      createdAt: issuedAt,
      updatedAt: issuedAt,
    });
    const launched = await launchReferenceSession({
      sessionId,
      callerId,
      revocationHandle: randomUUID(),
      policyVersion: 1,
      durationSeconds: 180,
      workspace: preparedWorkspace,
      mission: {
        schemaVersion: 1,
        missionId,
        version: 1,
        authoredBy: { kind: "human", principalId: randomUUID() },
        authoredAt: new Date().toISOString(),
        objective: "Evaluate one fixed in-scope merge proposal without approving or executing it.",
        constraints: [
          "Nemotron may preserve or increase the deterministic confirmation floor.",
          "No approval or privileged effect is authorized by this test.",
        ],
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
      authority: {
        endpoint: authorityEndpoint,
        binding: launcherBinding,
        connectionIds: [connectionId],
      },
    });
    assert.equal(launched.runtime.status(new Date().toISOString()).assurance, "enforced");
    const session = await new LocalAuthorityIpcClient({
      endpoint: authorityEndpoint,
      binding: brokerBinding,
    }).getSession(sessionId);
    assert.ok(session, "durable session record is unavailable");
    console.log("[guardian-live] enforced session launched");

    await new LocalAuthorityIpcClient({
      endpoint: authorityEndpoint,
      binding: researchBinding,
    }).appendEvidenceExposures([
      {
        schemaVersion: 1,
        exposureId,
        sessionId,
        provenanceEventIds: [exposureId],
        sourceContentDigest: "a".repeat(64),
        sourceDomain: "raw.githubusercontent.com",
        contentTrust: "untrusted_public_content",
        signals: ["instruction_like_content", "claimed_authority", "side_effect_request"],
        retrievedAt: new Date().toISOString(),
      },
    ]);
    console.log("[guardian-live] minimized untrusted exposure registered");

    const resourceVersion = {
      kind: "github_pull_request",
      owner: OWNER,
      repository: REPOSITORY,
      pullRequest: 1,
      headCommit: "c".repeat(40),
    };
    const request = CanonicalRequestSchema.parse({
      schemaVersion: 1,
      requestId: randomUUID(),
      sessionId,
      callerId,
      connectionId,
      missionId,
      missionVersion: 1,
      profileId,
      profileVersion: 1,
      policyVersion: 1,
      proposal: {
        schemaVersion: 1,
        proposalId: randomUUID(),
        sessionId,
        callerId,
        missionId,
        missionVersion: 1,
        profileId,
        profileVersion: 1,
        proposedAt: new Date().toISOString(),
        operation: "github.pull_request.merge",
        arguments: {
          owner: resourceVersion.owner,
          repository: resourceVersion.repository,
          pullRequest: resourceVersion.pullRequest,
          expectedHeadCommit: resourceVersion.headCommit,
          method: "squash",
        },
        resourceVersion,
      },
      resourceVersion,
    });
    const brokerIpc = createBrokerIpcCredentials();
    const guardianIpc = createGuardianActionRiskIpcCredentials();
    const brokerConfig = BrokerServiceProcessConfigSchema.parse({
      schemaVersion: 1,
      serviceKind: "github_broker",
      broker: {
        schemaVersion: 1,
        ...brokerIpc,
        sessionId,
        callerId,
        startsAt: session.startsAt,
        expiresAt: session.expiresAt,
      },
      authority: {
        schemaVersion: 1,
        endpoint: authorityEndpoint,
        binding: brokerBinding,
      },
      guardian: {
        schemaVersion: 1,
        serviceKind: "action_risk",
        ...guardianIpc,
        sessionId,
        callerId,
        requestDigest: digestCanonicalRequest(request),
        startsAt: session.startsAt,
        expiresAt: session.expiresAt,
        envelope: {
          proposal: {
            tool: request.proposal.operation,
            arguments: request.proposal.arguments,
          },
          deterministicFloor: "confirm",
          riskSignals: ["authority_expansion"],
          untrustedExcerpts: [],
          containsCredentials: false,
        },
      },
      credentialStoreHandle: `guardian-credential://github/${connectionId}`,
      githubClientId: "Iv23liP8Sq3ZEAyeIHju",
    });

    guardianChild = spawn(process.execPath, ["apps/guardian-service/dist/main.js"], {
      cwd: process.cwd(),
      env: { GUARDIAN_RISK_PROVIDER: "nemotron" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    guardianChild.stdin.end(`${JSON.stringify(brokerConfig.guardian)}\n`);
    await waitForReady(guardianChild, "guardian risk service ready", "guardian risk service");
    console.log("[guardian-live] Nemotron risk service ready");

    brokerChild = spawn(process.execPath, ["apps/broker-service/dist/main.js"], {
      cwd: process.cwd(),
      env: {},
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    brokerChild.stdin.end(`${JSON.stringify(brokerConfig)}\n`);
    await waitForReady(brokerChild, "guardian broker service ready", "broker service");
    console.log("[guardian-live] broker service ready");

    const result = await new LocalBrokerIpcClient(brokerConfig.broker).execute({
      request,
      evidenceExposureIds: [exposureId],
    });
    assert.equal(result.ok, false);
    assert.ok(
      EXPECTED_DENIALS.has(result.code),
      `live Nemotron path returned unexpected result ${result.code}`,
    );
    console.log(`[guardian-live] live Nemotron result remained pre-effect: ${result.code}`);

    await stopChild(brokerChild);
    brokerChild = undefined;
    await stopChild(guardianChild);
    guardianChild = undefined;
    await authority.close();
    authorityClosed = true;

    const auditStore = new SqliteAuthorityStore(authorityStorePath);
    auditStore.initialize();
    try {
      const context = auditStore.getAuthorityContext(sessionId);
      assert.equal(context.exposures.length, 1);
      assert.equal(context.attempts.length, 1);
      assert.equal(context.decisions.length, 1);
      const [attempt] = context.attempts;
      const [decision] = context.decisions;
      assert.equal(attempt.requestDigest, digestCanonicalRequest(request));
      assert.deepEqual(attempt.evidenceExposureIds, [exposureId]);
      assert.equal(decision.attemptId, attempt.attemptId);
      assert.ok(["preserved", "escalated", "uncertain"].includes(decision.guardianOutcome));
      assert.ok(["confirm", "step_up", "deny"].includes(decision.authorizationFloor));
      assert.equal(decision.providerBoundary, "crossed");
      assert.equal(decision.adapterBoundary, "not_crossed");
      assert.equal(decision.toolConsumption, "not_consumed");
      assert.equal(decision.approvalConsumption, "not_consumed");
      assert.ok(["denied", "step_up"].includes(decision.controlOutcome));
      assert.equal(auditStore.getBudget(sessionId).remainingToolCalls, 1);
      const serializedContext = JSON.stringify(context);
      assert.equal(serializedContext.includes(REPOSITORY), false);
      assert.equal(serializedContext.includes("guardian-credential://"), false);
      assert.equal(serializedContext.includes("providerRequestId"), false);
    } finally {
      auditStore.close();
    }
    console.log(
      "[guardian-live] audit confirms model evaluation crossed, while approval, tool, adapter, and credential boundaries did not",
    );
  } finally {
    if (brokerChild !== undefined) await stopChild(brokerChild);
    if (guardianChild !== undefined) await stopChild(guardianChild);
    if (!authorityClosed) await authority.close();
    await workspace.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
