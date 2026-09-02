import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoundSessionRuntime } from "@guardian/session";
import type { ResearchServiceClient } from "@guardian/research";

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
      localCommand: vi.fn(),
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

  it("preflights and executes only lifecycle-authorized research through the bound client", async () => {
    const missionId = "11111111-1111-4111-8111-111111111111";
    const sessionId = "22222222-2222-4222-8222-222222222222";
    const callerId = "33333333-3333-4333-8333-333333333333";
    const profileId = "44444444-4444-4444-8444-444444444444";
    const revocationHandle = "55555555-5555-4555-8555-555555555555";
    const permissions = {
      tools: ["guardian.session_status", "guardian.local_command", "guardian.research"],
      filesystem: { mode: "workspace_write", roots: ["/workspace"] },
      network: {
        mode: "guardian_only",
        destinations: [{ kind: "public_domain", hostname: "docs.github.com" }],
      },
      sideEffects: ["write_workspace"],
      time: { maxDurationSeconds: 300 },
      volume: {
        maxToolCalls: 5,
        maxResearchRequests: 2,
        maxResearchResults: 4,
        maxLocalCommands: 2,
        maxPrivilegedActions: 0,
      },
    } as const;
    const runtime = BoundSessionRuntime.create({
      sessionId,
      callerId,
      revocationHandle,
      policyVersion: 1,
      startsAt: "2026-08-30T08:30:00.000Z",
      expiresAt: "2026-08-30T08:35:00.000Z",
      mission: {
        schemaVersion: 1,
        missionId,
        version: 1,
        authoredBy: { kind: "human", principalId: "66666666-6666-4666-8666-666666666666" },
        authoredAt: "2026-08-30T08:00:00.000Z",
        objective: "Review public pull request documentation.",
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
    const researchResult = {
      evidence: [
        {
          schemaVersion: 1,
          title: "Pull request guidance",
          excerpt: "Branch protection can require review before merging.",
          sourceUrl: "https://docs.github.com/pull-requests",
          sourceContentDigest: "a".repeat(64),
          contentTrust: "untrusted_public_content",
          retrievedAt: "2026-08-30T08:31:00.000Z",
        },
      ],
      provenance: [
        {
          schemaVersion: 1,
          eventId: "77777777-7777-4777-8777-777777777777",
          sessionId,
          sequence: 1,
          operation: "guardian.research",
          queryDigest: "b".repeat(64),
          destination: { kind: "public_domain", hostname: "docs.github.com" },
          sourceUrl: "https://docs.github.com/pull-requests",
          sourceContentDigest: "a".repeat(64),
          contentTrust: "untrusted_public_content",
          retrievedAt: "2026-08-30T08:31:00.000Z",
          providerRequestId: "tavily_mcp_1",
        },
      ],
    } as const;
    const search = vi.fn<ResearchServiceClient["search"]>(() =>
      Promise.resolve({
        result: researchResult,
        budget: { sessionId, remainingRequests: 1, remainingResults: 3 },
      }),
    );
    const research = {
      client: { search },
      scope: {
        allowedDomains: ["docs.github.com"],
        maxResultsPerRequest: 2,
        remainingRequests: 2,
        remainingResults: 4,
        requiredTerms: ["pull request", "branch protection"],
      },
    } as const;
    expect(() =>
      createGuardianMcpServer({
        runtime,
        localCommand: vi.fn(),
        research: {
          ...research,
          scope: { ...research.scope, allowedDomains: ["attacker.example"] },
        },
      }),
    ).toThrow("scope exceeds");
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createGuardianMcpServer({
      runtime,
      localCommand: vi.fn(),
      research,
      now: () => "2026-08-30T08:31:00.000Z",
    });
    const client = new Client({ name: "guardian-test-client", version: "0.0.0" });
    closeables.push(client, server);
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const safe = await client.callTool({
      name: "guardian.research",
      arguments: {
        query: "GitHub pull request branch protection documentation",
        maxResults: 1,
        allowedDomains: ["docs.github.com"],
      },
    });
    expect(safe.structuredContent).toEqual(researchResult);
    expect(search).toHaveBeenCalledOnce();

    const denied = await client.callTool({
      name: "guardian.research",
      arguments: {
        query: "api_key=private-provider-value",
        maxResults: 1,
        allowedDomains: ["docs.github.com"],
      },
    });
    expect(denied.isError).toBe(true);
    expect(search).toHaveBeenCalledOnce();

    expect(runtime.revoke(revocationHandle)).toBe(true);
    const revoked = await client.callTool({
      name: "guardian.research",
      arguments: {
        query: "GitHub pull request branch protection documentation",
        maxResults: 1,
        allowedDomains: ["docs.github.com"],
      },
    });
    expect(revoked.isError).toBe(true);
    expect(search).toHaveBeenCalledOnce();
  });
});
