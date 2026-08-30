import { SessionStatusSchema } from "@guardian/contracts";
import { foundationStatus } from "@guardian/session";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export function createGuardianMcpServer() {
  const server = new McpServer(
    { name: "guardian-session", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    "guardian.session_status",
    {
      title: "Guardian session status",
      description: "Return the current non-secret Guardian session status.",
      inputSchema: z.strictObject({}),
      outputSchema: SessionStatusSchema,
    },
    () => {
      const status = foundationStatus();
      return {
        content: [{ type: "text", text: JSON.stringify(status) }],
        structuredContent: status,
      };
    },
  );

  return server;
}
