import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { LocalBrokerIpcClient, createBrokerIpcCredentials } from "@guardian/broker";
import {
  BrokerExecutionRequestSchema,
  BrokerServiceProcessConfigSchema,
} from "@guardian/contracts";
import { createGuardianActionRiskIpcCredentials } from "@guardian/guardian";
import { describe, expect, it } from "vitest";

const sessionId = "11111111-1111-4111-8111-111111111111";
const callerId = "22222222-2222-4222-8222-222222222222";
const connectionId = "33333333-3333-4333-8333-333333333333";
const missionId = "44444444-4444-4444-8444-444444444444";
const profileId = "55555555-5555-4555-8555-555555555555";
const headCommit = "a".repeat(40);

function processConfig() {
  const now = Date.now();
  const startsAt = new Date(now - 5_000).toISOString();
  const expiresAt = new Date(now + 60_000).toISOString();
  return BrokerServiceProcessConfigSchema.parse({
    schemaVersion: 1,
    serviceKind: "github_broker",
    broker: {
      schemaVersion: 1,
      ...createBrokerIpcCredentials(),
      sessionId,
      callerId,
      startsAt,
      expiresAt,
    },
    authority: {
      schemaVersion: 1,
      endpoint: createAuthorityIpcEndpoint(),
      binding: {
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
        issuedAt: new Date(now - 10_000).toISOString(),
        expiresAt: new Date(now + 65_000).toISOString(),
      },
    },
    guardian: {
      schemaVersion: 1,
      serviceKind: "action_risk",
      ...createGuardianActionRiskIpcCredentials(),
      sessionId,
      callerId,
      requestDigest: "b".repeat(64),
      startsAt,
      expiresAt,
      envelope: {
        proposal: {
          tool: "github.pull_request.read",
          arguments: {
            owner: "loothore907",
            repository: "guardian-agent-demo",
            pullRequest: 2,
          },
        },
        deterministicFloor: "allow",
        riskSignals: ["clean_context"],
        untrustedExcerpts: [],
        containsCredentials: false,
      },
    },
    credentialStoreHandle: `guardian-credential://github/${connectionId}`,
    githubClientId: "Iv23liP8Sq3ZEAyeIHju",
  });
}

function readExecution() {
  const resourceVersion = {
    kind: "github_pull_request" as const,
    owner: "loothore907",
    repository: "guardian-agent-demo",
    pullRequest: 2,
    headCommit,
  };
  return BrokerExecutionRequestSchema.parse({
    request: {
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
        operation: "github.pull_request.read",
        arguments: {
          owner: "loothore907",
          repository: "guardian-agent-demo",
          pullRequest: 2,
        },
        resourceVersion,
      },
      resourceVersion,
    },
  });
}

function waitForReady(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new TypeError("broker child startup timed out")),
      5_000,
    );
    timeout.unref();
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout === "guardian broker service ready\n") {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new TypeError(stderr.length === 0 ? "broker child exited" : "broker child failed"));
    });
  });
}

async function closeChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  await exited;
}

describe("broker service process", () => {
  it("starts from one strict stdin frame and exposes only the W7 broker endpoint", async () => {
    const config = processConfig();
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("../dist/main.js", import.meta.url))],
      { cwd: process.cwd(), env: {}, stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );
    child.stdin.end(`${JSON.stringify(config)}\n`);
    try {
      await waitForReady(child);
      const result = await new LocalBrokerIpcClient(config.broker).execute(readExecution());
      expect(result).toEqual({ ok: false, code: "audit_unavailable" });
    } finally {
      await closeChild(child);
    }
  });

  it("rejects authority, Guardian, and lifetime substitutions", () => {
    const config = processConfig();
    for (const mutation of [
      {
        ...config,
        authority: {
          ...config.authority,
          binding: { ...config.authority.binding, callerRole: "research_service" },
        },
      },
      {
        ...config,
        authority: {
          ...config.authority,
          binding: {
            ...config.authority.binding,
            allowedOperations: [...config.authority.binding.allowedOperations, "session.create"],
          },
        },
      },
      {
        ...config,
        guardian: {
          ...config.guardian,
          callerId: "99999999-9999-4999-8999-999999999999",
        },
      },
      {
        ...config,
        broker: {
          ...config.broker,
          expiresAt: new Date(Date.parse(config.guardian.expiresAt) + 1_000).toISOString(),
        },
      },
    ]) {
      expect(() => BrokerServiceProcessConfigSchema.parse(mutation)).toThrow();
    }
  });

  it("rejects arbitrary bootstrap transport fields", () => {
    expect(() =>
      BrokerServiceProcessConfigSchema.parse({
        ...processConfig(),
        providerUrl: "https://example.invalid",
      }),
    ).toThrow();
  });
});
