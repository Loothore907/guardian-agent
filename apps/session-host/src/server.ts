import {
  LocalCommandRequestSchema,
  LocalCommandResultSchema,
  SessionStatusSchema,
} from "@guardian/contracts";
import { runReferenceLocalCommand } from "@guardian/executor";
import { foundationStatus, type BoundSessionRuntime } from "@guardian/session";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export interface GuardianMcpServerOptions {
  readonly runtime?: BoundSessionRuntime;
  readonly now?: () => string;
}

export function createGuardianMcpServer(options: GuardianMcpServerOptions = {}) {
  const server = new McpServer(
    { name: "guardian-session", version: "0.0.0" },
    { capabilities: { tools: {} } },
  );

  const now = options.now ?? (() => new Date().toISOString());
  const catalog = options.runtime?.toolCatalog() ?? ["guardian.session_status"];

  for (const tool of catalog) {
    if (tool === "guardian.session_status") {
      server.registerTool(
        tool,
        {
          title: "Guardian session status",
          description: "Return the current non-secret Guardian session status.",
          inputSchema: z.strictObject({}),
          outputSchema: SessionStatusSchema,
        },
        () => {
          const status = SessionStatusSchema.parse(
            options.runtime?.status(now()) ?? foundationStatus(),
          );
          return {
            content: [{ type: "text", text: JSON.stringify(status) }],
            structuredContent: status,
          };
        },
      );
      continue;
    }
    if (tool === "guardian.local_command") {
      server.registerTool(
        tool,
        {
          title: "Guardian isolated local command",
          description: "Run one typed command in the disposable, network-disabled workspace.",
          inputSchema: LocalCommandRequestSchema,
          outputSchema: LocalCommandResultSchema,
        },
        async (request) => {
          const authorization = options.runtime?.authorizeLocalCommandCall(request, now());
          if (!authorization?.allowed) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ error: authorization?.reason ?? "not_active" }),
                },
              ],
            };
          }
          const result = await runReferenceLocalCommand(request);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result,
          };
        },
      );
      continue;
    }
    throw new TypeError(`the reference session host does not implement ${tool}`);
  }

  return server;
}
