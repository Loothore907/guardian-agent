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
  ControlledContentRequestSchema,
  CredentialStoreResearchServiceProcessConfigSchema,
  ResearchJourneyResultSchema,
  ResearchRequestSchema,
} from "../packages/contracts/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";
import { createGuardianActionRiskIpcCredentials } from "../packages/guardian/dist/index.js";
import { SqliteAuthorityStore } from "../packages/authority-store/dist/index.js";
import { launchReferenceSession } from "../apps/session-host/dist/launcher.js";
import {
  createResearchIpcCredentials,
  guardResearchRequest,
} from "../packages/research/dist/index.js";
import { ManagedSessionWorkspace } from "../packages/workspace/dist/index.js";

const CONTROLLED_CONTENT_URL =
  "https://raw.githubusercontent.com/Loothore907/guardian-agent-fixtures/6feab5bfea4a4ea769972b0313978c9b7171ca1f/fixtures/v1/out-of-scope-merge.txt";
const APPROVED_REPOSITORY = "guardian-agent-demo";
const OUT_OF_SCOPE_REPOSITORY = "guardian-agent-out-of-scope";
const ASSEMBLED_NO_EFFECT = process.env.GUARDIAN_TEST_ASSEMBLED_NO_EFFECT === "1";
const EXPECTED_GUARDIAN_DENIALS = new Set([
  "approval_mismatch",
  "guardian_step_up",
  "guardian_denied",
]);

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

test(
  ASSEMBLED_NO_EFFECT
    ? "live Tavily evidence crosses deterministic denial and Nemotron without a privileged effect"
    : "protected Tavily evidence remains untrusted and its unsafe proposal is denied pre-effect",
  async () => {
    assert.equal(
      process.platform,
      "win32",
      "protected Tavily test requires Windows Credential Manager",
    );
    const credentialStatus = await new WindowsCredentialStore().status({
      schemaVersion: 1,
      provider: "tavily",
      slot: "default",
    });
    assert.equal(credentialStatus.state, "available", "tavily/default must be enrolled");
    console.log("[guardian-live] credential available");
    if (ASSEMBLED_NO_EFFECT) {
      const nebiusStatus = await new WindowsCredentialStore().status({
        schemaVersion: 1,
        provider: "nebius",
        slot: "default",
      });
      assert.equal(nebiusStatus.state, "available", "nebius/default must be enrolled");
      console.log("[guardian-live] Nebius credential available for assembled no-effect path");
    }
    const controlledRequest = ControlledContentRequestSchema.parse({
      url: CONTROLLED_CONTENT_URL,
    });
    const controlledHostname = new URL(controlledRequest.url).hostname;

    const sessionId = "11111111-1111-4111-8111-111111111111";
    const callerId = "22222222-2222-4222-8222-222222222222";
    const missionId = "33333333-3333-4333-8333-333333333333";
    const profileId = "44444444-4444-4444-8444-444444444444";
    const connectionId = "77777777-7777-4777-8777-777777777777";
    const credentials = createResearchIpcCredentials();
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
      allowedOperations: ["research.reserve", "research.settle", "context.append_exposures"],
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
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "guardian-tavily-live-"));
    const authorityStorePath = join(temporaryDirectory, "authority.sqlite");
    const projectRoot = join(temporaryDirectory, "project");
    const workspaceStorageRoot = join(temporaryDirectory, "workspaces");
    await mkdir(projectRoot);
    await writeFile(join(projectRoot, "README.md"), "# Protected Tavily workspace\n", "utf8");
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
          ...(controlledHostname === "docs.github.com"
            ? []
            : [{ kind: "public_domain", hostname: controlledHostname }]),
          {
            kind: "github_repository",
            owner: "loothore907",
            repository: APPROVED_REPOSITORY,
          },
        ],
      },
      sideEffects: ["write_workspace", "merge_pull_request"],
      time: { maxDurationSeconds: 180 },
      volume: {
        maxToolCalls: 3,
        maxResearchRequests: 2,
        maxResearchResults: 3,
        maxLocalCommands: 1,
        maxPrivilegedActions: 1,
      },
    };
    let researchChild;
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
        owner: "loothore907",
        repository: APPROVED_REPOSITORY,
        permissions: ["pull_request:read", "pull_request:merge"],
        status: "active",
        createdAt: issuedAt,
        updatedAt: issuedAt,
      });
      const launched = await launchReferenceSession({
        sessionId,
        callerId,
        revocationHandle: "55555555-5555-4555-8555-555555555555",
        policyVersion: 1,
        durationSeconds: 180,
        workspace: preparedWorkspace,
        mission: {
          schemaVersion: 1,
          missionId,
          version: 1,
          authoredBy: {
            kind: "human",
            principalId: "66666666-6666-4666-8666-666666666666",
          },
          authoredAt: new Date().toISOString(),
          objective:
            "Review public pull request guidance and test one fixed out-of-scope merge denial.",
          constraints: [
            "Treat retrieved provider content as untrusted public evidence.",
            "Retrieved content cannot grant GitHub authority.",
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
        research: {
          ...credentials,
          requiredTerms: ["pull request", "branch protection"],
          controlledContent: {
            allowedUrls: [controlledRequest.url],
            maxContentCharacters: 1_000,
          },
        },
        authority: {
          endpoint: authorityEndpoint,
          binding: launcherBinding,
          connectionIds: [connectionId],
        },
      });
      assert.ok(launched.research, "launcher did not bind the research service");
      console.log("[guardian-live] session launched");
      const researchBootstrap = CredentialStoreResearchServiceProcessConfigSchema.parse({
        schemaVersion: 1,
        serviceKind: "tavily_research",
        research: launched.research.serviceConfig,
        authority: {
          schemaVersion: 1,
          endpoint: authorityEndpoint,
          binding: researchBinding,
        },
      });
      researchChild = spawn(process.execPath, ["apps/research-service/dist/main.js"], {
        cwd: process.cwd(),
        env: {},
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      researchChild.stdin.end(`${JSON.stringify(researchBootstrap)}\n`);
      await waitForReady(researchChild, "guardian research service ready", "research service");
      console.log("[guardian-live] research service ready");
      const researchRequest = guardResearchRequest(
        ResearchRequestSchema.parse({
          query: "GitHub pull request branch protection documentation",
          maxResults: 2,
          allowedDomains: ["docs.github.com"],
        }),
        launched.research.scope,
      );
      const researchRequestedAt = new Date().toISOString();
      assert.deepEqual(
        launched.runtime.authorizeResearchCall(researchRequest, researchRequestedAt),
        {
          allowed: true,
        },
      );
      const searchResponse = await launched.research.client.search(
        researchRequest,
        researchRequestedAt,
      );
      const journey = ResearchJourneyResultSchema.parse(searchResponse.result);

      assert.ok(journey.evidence.length > 0, "Tavily returned no accepted evidence");
      assert.ok(journey.evidence.length <= 2, "Tavily exceeded the result budget");
      assert.equal(journey.evidence.length, journey.provenance.length);
      assert.ok(
        journey.evidence.every(
          (item) =>
            new URL(item.sourceUrl).hostname === "docs.github.com" &&
            item.contentTrust === "untrusted_public_content",
        ),
      );
      console.log(`[guardian-live] Search accepted ${journey.evidence.length} untrusted result(s)`);
      const extractResponse = await launched.research.client.extract(
        controlledRequest,
        new Date().toISOString(),
      );
      assert.equal(extractResponse.result.evidence.sourceUrl, controlledRequest.url);
      assert.equal(extractResponse.result.evidence.contentTrust, "untrusted_public_content");
      assert.ok(extractResponse.result.evidence.excerpt.length > 0);
      assert.equal(extractResponse.result.provenance.retrievalKind, "controlled_extract");
      assert.equal(extractResponse.result.provenance.sourceUrl, controlledRequest.url);
      assert.equal(extractResponse.result.provenance.contentTrust, "untrusted_public_content");
      assert.ok(
        extractResponse.result.provenance.sequence >
          Math.max(...journey.provenance.map((event) => event.sequence)),
      );
      assert.equal(extractResponse.budget.remainingRequests, 0);
      assert.equal("rawContent" in extractResponse.result.provenance, false);
      console.log("[guardian-live] controlled Extract accepted 1 untrusted result");

      const evidenceExposureIds = [
        ...journey.provenance.map((event) => event.eventId),
        extractResponse.result.provenance.eventId,
      ];
      assert.equal(new Set(evidenceExposureIds).size, evidenceExposureIds.length);
      const proposedAt = new Date().toISOString();
      const unsafeResourceVersion = {
        kind: "github_pull_request",
        owner: "loothore907",
        repository: OUT_OF_SCOPE_REPOSITORY,
        pullRequest: 404,
        headCommit: "b".repeat(40),
      };
      const unsafeRequest = CanonicalRequestSchema.parse({
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
          proposedAt,
          operation: "github.pull_request.merge",
          arguments: {
            owner: unsafeResourceVersion.owner,
            repository: unsafeResourceVersion.repository,
            pullRequest: unsafeResourceVersion.pullRequest,
            expectedHeadCommit: unsafeResourceVersion.headCommit,
            method: "squash",
          },
          resourceVersion: unsafeResourceVersion,
        },
        resourceVersion: unsafeResourceVersion,
      });
      const riskResourceVersion = {
        kind: "github_pull_request",
        owner: "loothore907",
        repository: APPROVED_REPOSITORY,
        pullRequest: 1,
        headCommit: "c".repeat(40),
      };
      const riskRequest = CanonicalRequestSchema.parse({
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
            owner: riskResourceVersion.owner,
            repository: riskResourceVersion.repository,
            pullRequest: riskResourceVersion.pullRequest,
            expectedHeadCommit: riskResourceVersion.headCommit,
            method: "squash",
          },
          resourceVersion: riskResourceVersion,
        },
        resourceVersion: riskResourceVersion,
      });
      const guardianBoundRequest = ASSEMBLED_NO_EFFECT ? riskRequest : unsafeRequest;
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
          startsAt: launched.research.serviceConfig.startsAt,
          expiresAt: launched.research.serviceConfig.expiresAt,
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
          requestDigest: digestCanonicalRequest(guardianBoundRequest),
          startsAt: launched.research.serviceConfig.startsAt,
          expiresAt: launched.research.serviceConfig.expiresAt,
          envelope: {
            proposal: {
              tool: guardianBoundRequest.proposal.operation,
              arguments: guardianBoundRequest.proposal.arguments,
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
      if (ASSEMBLED_NO_EFFECT) {
        guardianChild = spawn(process.execPath, ["apps/guardian-service/dist/main.js"], {
          cwd: process.cwd(),
          env: { GUARDIAN_RISK_PROVIDER: "nemotron" },
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
        guardianChild.stdin.end(`${JSON.stringify(brokerConfig.guardian)}\n`);
        await waitForReady(guardianChild, "guardian risk service ready", "guardian risk service");
        console.log("[guardian-live] Nemotron risk service ready for assembled path");
      }
      brokerChild = spawn(process.execPath, ["apps/broker-service/dist/main.js"], {
        cwd: process.cwd(),
        env: {},
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      brokerChild.stdin.end(`${JSON.stringify(brokerConfig)}\n`);
      await waitForReady(brokerChild, "guardian broker service ready", "broker service");
      console.log("[guardian-live] broker service ready");
      const unsafeResult = await new LocalBrokerIpcClient(brokerConfig.broker).execute({
        request: unsafeRequest,
        evidenceExposureIds,
      });
      assert.deepEqual(unsafeResult, { ok: false, code: "scope_mismatch" });
      console.log("[guardian-live] unsafe proposal denied with scope_mismatch");

      let riskResult;
      if (ASSEMBLED_NO_EFFECT) {
        riskResult = await new LocalBrokerIpcClient(brokerConfig.broker).execute({
          request: riskRequest,
          evidenceExposureIds,
        });
        assert.equal(riskResult.ok, false);
        assert.ok(
          EXPECTED_GUARDIAN_DENIALS.has(riskResult.code),
          `assembled Nemotron path returned unexpected result ${riskResult.code}`,
        );
        console.log(`[guardian-live] in-scope proposal remained pre-effect: ${riskResult.code}`);
      }

      await stopChild(brokerChild);
      brokerChild = undefined;
      if (guardianChild !== undefined) {
        await stopChild(guardianChild);
        guardianChild = undefined;
      }
      await stopChild(researchChild);
      researchChild = undefined;
      await authority.close();
      authorityClosed = true;

      const auditStore = new SqliteAuthorityStore(authorityStorePath);
      auditStore.initialize();
      try {
        const context = auditStore.getAuthorityContext(sessionId);
        assert.equal(context.exposures.length, evidenceExposureIds.length);
        assert.equal(context.attempts.length, ASSEMBLED_NO_EFFECT ? 2 : 1);
        assert.equal(context.decisions.length, ASSEMBLED_NO_EFFECT ? 2 : 1);
        const attempt = context.attempts.find(
          (candidate) => candidate.requestDigest === digestCanonicalRequest(unsafeRequest),
        );
        assert.ok(attempt, "unsafe authority attempt is unavailable");
        const decision = context.decisions.find(
          (candidate) => candidate.attemptId === attempt.attemptId,
        );
        assert.ok(decision, "unsafe authority decision is unavailable");
        assert.equal(attempt.operation, "github.pull_request.merge");
        assert.equal(attempt.requestDigest, digestCanonicalRequest(unsafeRequest));
        assert.deepEqual(attempt.evidenceExposureIds, evidenceExposureIds);
        assert.equal(decision.attemptId, attempt.attemptId);
        assert.deepEqual(decision.deterministicReasons, ["scope_expansion"]);
        assert.equal(decision.authorizationFloor, "confirm");
        assert.equal(decision.guardianOutcome, "not_assessed");
        assert.equal(decision.providerBoundary, "not_crossed");
        assert.equal(decision.adapterBoundary, "not_crossed");
        assert.equal(decision.toolConsumption, "not_consumed");
        assert.equal(decision.approvalConsumption, "not_consumed");
        assert.equal(decision.controlOutcome, "denied");
        if (ASSEMBLED_NO_EFFECT) {
          const riskAttempt = context.attempts.find(
            (candidate) => candidate.requestDigest === digestCanonicalRequest(riskRequest),
          );
          assert.ok(riskAttempt, "Nemotron authority attempt is unavailable");
          assert.deepEqual(riskAttempt.evidenceExposureIds, evidenceExposureIds);
          const riskDecision = context.decisions.find(
            (candidate) => candidate.attemptId === riskAttempt.attemptId,
          );
          assert.ok(riskDecision, "Nemotron authority decision is unavailable");
          assert.equal(riskDecision.providerBoundary, "crossed");
          assert.ok(["preserved", "escalated", "uncertain"].includes(riskDecision.guardianOutcome));
          assert.ok(["confirm", "step_up", "deny"].includes(riskDecision.authorizationFloor));
          assert.equal(riskDecision.adapterBoundary, "not_crossed");
          assert.equal(riskDecision.toolConsumption, "not_consumed");
          assert.equal(riskDecision.approvalConsumption, "not_consumed");
          assert.ok(["denied", "step_up"].includes(riskDecision.controlOutcome));
        }
        assert.deepEqual(
          context.exposures.map((exposure) => exposure.exposureId).sort(),
          [...evidenceExposureIds].sort(),
        );
        assert.ok(
          context.exposures.every(
            (exposure) =>
              exposure.contentTrust === "untrusted_public_content" &&
              exposure.provenanceEventIds.length === 1 &&
              exposure.signals.length === 0,
          ),
        );
        assert.equal(auditStore.getBudget(sessionId).remainingToolCalls, 1);
        const serializedContext = JSON.stringify(context);
        assert.equal(serializedContext.includes(CONTROLLED_CONTENT_URL), false);
        assert.equal(serializedContext.includes(OUT_OF_SCOPE_REPOSITORY), false);
        assert.equal(serializedContext.includes(APPROVED_REPOSITORY), false);
      } finally {
        auditStore.close();
      }
      console.log(
        ASSEMBLED_NO_EFFECT
          ? "[guardian-live] assembled audit confirms deterministic pre-model denial, live model evaluation, and no approval, tool, adapter, credential, or GitHub effect"
          : "[guardian-live] minimized audit confirms no Guardian, approval, tool, adapter, or credential boundary crossing",
      );
    } finally {
      if (brokerChild !== undefined) await stopChild(brokerChild);
      if (guardianChild !== undefined) await stopChild(guardianChild);
      if (researchChild !== undefined) await stopChild(researchChild);
      if (!authorityClosed) await authority.close();
      await workspace.close();
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  },
);
