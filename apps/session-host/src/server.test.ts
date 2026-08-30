import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import { BoundSessionRuntime } from "@guardian/session";

import { createGuardianMcpServer } from "./server.js";

const closeables: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(closeables.splice(0).map(async (closeable) => closeable.close()));
});

describe("Guardian MCP server", () => {
  it("exposes and calls only the scaffolded read-only status tool", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createGuardianMcpServer();
    const client = new Client({ name: "guardian-test-client", version: "0.0.0" });
    closeables.push(client, server);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(["guardian.session_status"]);

    const result = await client.callTool({ name: "guardian.session_status", arguments: {} });
    expect(result.structuredContent).toEqual({ status: "foundation", assurance: "unknown" });
  });

  it("derives the active catalog from the profile and rechecks revocation", async () => {
    const permissions = {
      tools: ["guardian.session_status", "guardian.local_command"],
      filesystem: { mode: "workspace_write", roots: ["/workspace"] },
      network: { mode: "none", destinations: [] },
      sideEffects: ["write_workspace"],
      time: { maxDurationSeconds: 300 },
      volume: {
        maxToolCalls: 5,
        maxResearchRequests: 0,
        maxResearchResults: 0,
        maxLocalCommands: 5,
        maxPrivilegedActions: 0,
      },
    } as const;
    const missionId = "11111111-1111-4111-8111-111111111111";
    const revocationHandle = "22222222-2222-4222-8222-222222222222";
    const runtime = BoundSessionRuntime.create({
      sessionId: "33333333-3333-4333-8333-333333333333",
      callerId: "44444444-4444-4444-8444-444444444444",
      revocationHandle,
      policyVersion: 1,
      startsAt: "2026-08-30T08:30:00.000Z",
      expiresAt: "2026-08-30T08:35:00.000Z",
      mission: {
        schemaVersion: 1,
        missionId,
        version: 1,
        authoredBy: {
          kind: "human",
          principalId: "55555555-5555-4555-8555-555555555555",
        },
        authoredAt: "2026-08-30T08:00:00.000Z",
        objective: "Test the bound MCP catalog.",
        constraints: [],
        authority: permissions,
      },
      profile: {
        schemaVersion: 1,
        profileId: "66666666-6666-4666-8666-666666666666",
        version: 1,
        missionId,
        missionVersion: 1,
        policyVersion: 1,
        permissions,
        assurance: { level: "unknown", evidence: [] },
      },
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createGuardianMcpServer({
      runtime,
      now: () => "2026-08-30T08:31:00.000Z",
    });
    const client = new Client({ name: "guardian-test-client", version: "0.0.0" });
    closeables.push(client, server);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "guardian.local_command",
      "guardian.session_status",
    ]);
    expect(runtime.revoke(revocationHandle)).toBe(true);
    const result = await client.callTool({
      name: "guardian.local_command",
      arguments: {
        executable: "node",
        arguments: ["--version"],
        workingDirectory: "/workspace",
        timeoutSeconds: 5,
      },
    });
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ error: "revoked" }) }]);
  });
});
