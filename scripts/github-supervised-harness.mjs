import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LocalAuthorityIpcClient,
  createAuthorityIpcEndpoint,
} from "../packages/authority-client/dist/index.js";
import { DevelopmentAuthorizationIssuer } from "../apps/authorization-service/dist/index.js";
import {
  digestCanonicalRequest,
  digestGitHubConnectionScope,
} from "../packages/authorization/dist/index.js";
import { LocalBrokerIpcClient, createBrokerIpcCredentials } from "../packages/broker/dist/index.js";
import {
  BrokerServiceProcessConfigSchema,
  CanonicalRequestSchema,
} from "../packages/contracts/dist/index.js";
import { createGuardianActionRiskIpcCredentials } from "../packages/guardian/dist/index.js";
import { startSupervisedServiceProcess } from "../apps/reference-supervisor/dist/supervised-process.js";
import { credentialServiceEnvironment } from "../apps/reference-supervisor/dist/credential-service-environment.js";

export function parseGitHubCeremonyTarget(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "headCommit,mode,pullRequest" ||
    !["read", "merge"].includes(value.mode) ||
    !Number.isSafeInteger(value.pullRequest) ||
    value.pullRequest < 1 ||
    typeof value.headCommit !== "string" ||
    !/^[a-f0-9]{40}$/u.test(value.headCommit) ||
    /^0{40}$/u.test(value.headCommit)
  )
    throw new TypeError("exact disposable GitHub target required");
  return Object.freeze({ ...value, owner: "loothore907", repository: "guardian-agent-demo" });
}

// Test-only injection is available to the local test module. The live entry point
// accepts no entrypoint, environment, transport, store, or approval overrides.
export async function runSupervisedGitHubCeremony(targetValue, testOptions = {}) {
  const target = parseGitHubCeremonyTarget(targetValue);
  const directory = await mkdtemp(join(tmpdir(), "guardian-github-supervised-"));
  const children = [];
  try {
    if (process.platform !== "win32") await chmod(directory, 0o700);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 180_000).toISOString();
    const sessionId = randomUUID(),
      callerId = randomUUID(),
      connectionId = randomUUID();
    const missionId = randomUUID(),
      profileId = randomUUID();
    const binding = (callerRole, allowedOperations) => ({
      schemaVersion: 1,
      capability: randomUUID(),
      callerRole,
      callerId,
      sessionId,
      allowedOperations,
      issuedAt: now,
      expiresAt,
    });
    const launcherBinding = binding("launcher", ["connection.create", "session.create"]);
    const brokerBinding = binding("broker_service", [
      "session.get",
      "connection.list",
      "approval.get",
      "approval.state",
      "budget.consume_tool",
      "approval.consume",
      "context.append_attempt",
      "context.append_decision",
    ]);
    const authorizationBinding = binding("authorization_service", ["approval.store"]);
    const endpoint = createAuthorityIpcEndpoint();
    async function start(entrypoint, bootstrap, readyLine, environment = {}) {
      const child = await startSupervisedServiceProcess({
        entrypoint,
        bootstrap,
        readyLine,
        environment,
      });
      children.push(child);
    }
    await start(
      fileURLToPath(new URL("../apps/authority-service/dist/main.js", import.meta.url)),
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: join(directory, "authority.sqlite"),
        workspaceRoots: [],
        capabilities: [launcherBinding, brokerBinding, authorizationBinding],
      },
      "guardian authority service ready",
    );
    const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
    const handle = `guardian-credential://github/${randomUUID()}`;
    const connection = {
      schemaVersion: 1,
      connectionId,
      provider: "github",
      credentialStoreHandle: handle,
      owner: target.owner,
      repository: target.repository,
      permissions:
        target.mode === "read"
          ? ["pull_request:read"]
          : ["pull_request:read", "pull_request:merge"],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await launcher.createConnection(connection);
    await launcher.createSession(
      {
        schemaVersion: 1,
        sessionId,
        callerId,
        missionId,
        missionVersion: 1,
        profileId,
        profileVersion: 1,
        policyVersion: 1,
        startsAt: now,
        expiresAt,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        sessionId,
        remainingToolCalls: 1,
        remainingLocalCommands: 0,
        remainingResearchRequests: 0,
        remainingResearchResults: 0,
      },
      [connectionId],
    );
    const resourceVersion = {
      kind: "github_pull_request",
      owner: target.owner,
      repository: target.repository,
      pullRequest: target.pullRequest,
      headCommit: target.headCommit,
    };
    const operation = `github.pull_request.${target.mode}`;
    const args = {
      owner: target.owner,
      repository: target.repository,
      pullRequest: target.pullRequest,
      ...(target.mode === "merge"
        ? { expectedHeadCommit: target.headCommit, method: "squash" }
        : {}),
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
        proposedAt: now,
        operation,
        arguments: args,
        resourceVersion,
      },
      resourceVersion,
    });
    const guardian = {
      schemaVersion: 1,
      serviceKind: "action_risk",
      ...createGuardianActionRiskIpcCredentials(),
      sessionId,
      callerId,
      requestDigest: digestCanonicalRequest(request),
      startsAt: now,
      expiresAt,
      envelope: {
        proposal: { tool: operation, arguments: args },
        deterministicFloor: target.mode === "merge" ? "confirm" : "allow",
        riskSignals: target.mode === "merge" ? ["authority_expansion"] : ["clean_context"],
        untrustedExcerpts: [],
        containsCredentials: false,
      },
    };
    const credentialStore = {
      schemaVersion: 1,
      custodyProfile: "byok",
      location: {
        schemaVersion: 1,
        custodyProfile: "byok",
        pool: "personal",
        runtime: process.platform === "win32" ? "windows" : "linux",
        storeTarget:
          process.platform === "win32" ? "windows_credential_manager" : "linux_secret_service",
      },
    };
    await start(
      testOptions.guardianEntrypoint ??
        fileURLToPath(new URL("../apps/guardian-service/dist/main.js", import.meta.url)),
      { ...guardian, credentialStore },
      "guardian risk service ready",
      { GUARDIAN_RISK_PROVIDER: "fake" },
    );
    const config = BrokerServiceProcessConfigSchema.parse({
      schemaVersion: 1,
      serviceKind: "github_broker",
      credentialStore,
      broker: {
        schemaVersion: 1,
        ...createBrokerIpcCredentials(),
        sessionId,
        callerId,
        startsAt: now,
        expiresAt,
      },
      authority: { schemaVersion: 1, endpoint, binding: brokerBinding },
      guardian,
      credentialStoreHandle: handle,
      githubClientId: "Iv23liP8Sq3ZEAyeIHju",
    });
    await start(
      testOptions.brokerEntrypoint ??
        fileURLToPath(new URL("../apps/broker-service/dist/main.js", import.meta.url)),
      config,
      "guardian broker service ready",
      testOptions.environment === undefined
        ? credentialServiceEnvironment()
        : {
            ...testOptions.environment,
            FIXTURE_AUTHORITY_PATH: join(directory, "authority.sqlite"),
          },
    );
    let approval;
    if (target.mode === "merge" && !testOptions.omitApproval) {
      const issuer = new DevelopmentAuthorizationIssuer({
        ...(testOptions.fixedClock ? { now: () => now } : {}),
        authority: new LocalAuthorityIpcClient({ endpoint, binding: authorizationBinding }),
        binding: authorizationBinding,
      });
      approval = (
        await issuer.issueExactApproval({
          request,
          scopeDigest: digestGitHubConnectionScope(connection),
          confirmation: {
            principalId: randomUUID(),
            confirmedAt: testOptions.fixedClock ? now : new Date().toISOString(),
          },
          lifetimeSeconds: 120,
        })
      ).approval;
    }
    const execution = { request, ...(approval === undefined ? {} : { approval }) };
    const client = new LocalBrokerIpcClient({
      ...config.broker,
      ...(testOptions.fixedClock ? { now: () => now } : {}),
    });
    const result = await client.execute(execution);
    const replay = testOptions.replay ? await client.execute(execution) : undefined;
    return {
      result,
      ...(replay === undefined ? {} : { replay }),
      ...(testOptions.environment === undefined
        ? {}
        : {
            fixtureCounts: JSON.parse(
              await readFile(join(directory, "fixture-counts.json"), "utf8"),
            ),
          }),
    };
  } finally {
    const failures = [];
    for (const child of children.reverse()) {
      try {
        await child.close();
      } catch {
        failures.push(true);
      }
    }
    await rm(directory, { recursive: true, force: true });
    if (failures.length) throw new Error("supervised GitHub cleanup failed");
  }
}
