import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";

import { launchReferenceSession } from "../apps/session-host/dist/launcher.js";
import { createGuardianMcpServer } from "../apps/session-host/dist/server.js";
import { createResearchIpcCredentials } from "../packages/research/dist/index.js";

async function waitForReady(child) {
  const timeout = setTimeout(() => child.kill(), 10_000);
  try {
    for await (const chunk of child.stdout) {
      if (String(chunk).includes("guardian research service ready")) return;
    }
    throw new Error("research service exited before readiness");
  } finally {
    clearTimeout(timeout);
  }
}

test("protected Guardian Session Tavily Search contributes bounded public evidence", async () => {
  assert.ok(process.env.TAVILY_API_KEY, "TAVILY_API_KEY is required for the protected live test");

  const sessionId = "11111111-1111-4111-8111-111111111111";
  const callerId = "22222222-2222-4222-8222-222222222222";
  const missionId = "33333333-3333-4333-8333-333333333333";
  const profileId = "44444444-4444-4444-8444-444444444444";
  const credentials = createResearchIpcCredentials();
  const permissions = {
    tools: ["guardian.session_status", "guardian.local_command", "guardian.research"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: {
      mode: "guardian_only",
      destinations: [{ kind: "public_domain", hostname: "docs.github.com" }],
    },
    sideEffects: ["write_workspace"],
    time: { maxDurationSeconds: 60 },
    volume: {
      maxToolCalls: 3,
      maxResearchRequests: 1,
      maxResearchResults: 2,
      maxLocalCommands: 1,
      maxPrivilegedActions: 0,
    },
  };
  const launched = await launchReferenceSession({
    sessionId,
    callerId,
    revocationHandle: "55555555-5555-4555-8555-555555555555",
    policyVersion: 1,
    durationSeconds: 60,
    mission: {
      schemaVersion: 1,
      missionId,
      version: 1,
      authoredBy: {
        kind: "human",
        principalId: "66666666-6666-4666-8666-666666666666",
      },
      authoredAt: new Date().toISOString(),
      objective: "Review public pull request and branch protection documentation.",
      constraints: ["Treat retrieved provider content as untrusted public evidence."],
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
    },
  });
  assert.ok(launched.research, "launcher did not bind the research service");
  const child = spawn(process.execPath, ["apps/research-service/dist/main.js"], {
    cwd: process.cwd(),
    env: {
      GUARDIAN_RESEARCH_SERVICE_CONFIG: JSON.stringify(launched.research.serviceConfig),
      TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createGuardianMcpServer({
    runtime: launched.runtime,
    research: launched.research,
  });
  const client = new Client({ name: "guardian-live-test", version: "0.0.0" });

  try {
    await waitForReady(child);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "guardian.research"));
    const response = await client.callTool({
      name: "guardian.research",
      arguments: {
        query: "GitHub pull request branch protection documentation",
        maxResults: 2,
        allowedDomains: ["docs.github.com"],
      },
    });
    assert.equal(response.isError, undefined);
    const journey = response.structuredContent;
    assert.ok(journey && "evidence" in journey && "provenance" in journey);

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
  } finally {
    await Promise.allSettled([client.close(), server.close()]);
    child.kill();
    if (child.exitCode === null) await once(child, "exit");
  }
});
