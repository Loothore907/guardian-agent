import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";

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
});
