import {
  LocalCommandRequestSchema,
  LocalCommandResultSchema,
  ResearchJourneyResultSchema,
  ResearchRequestSchema,
  SessionStatusSchema,
  type ResearchRequest,
  type ResearchScope,
} from "@guardian/contracts";
import { runReferenceLocalCommand } from "@guardian/executor";
import { foundationStatus, type BoundSessionRuntime } from "@guardian/session";
import {
  guardResearchRequest,
  ResearchIpcError,
  ResearchRequestDeniedError,
  type ResearchServiceClient,
} from "@guardian/research";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export interface GuardianMcpServerOptions {
  readonly runtime?: BoundSessionRuntime;
  readonly now?: () => string;
  readonly research?: {
    readonly client: ResearchServiceClient;
    readonly scope: ResearchScope;
  };
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
    if (tool === "guardian.research") {
      const research = options.research;
      if (research === undefined) {
        throw new TypeError("the reference session host has no bound research service");
      }
      if (!options.runtime?.isResearchScopeWithinProfile(research.scope)) {
        throw new TypeError("the research service scope exceeds the bound session profile");
      }
      server.registerTool(
        tool,
        {
          title: "Guardian bounded public research",
          description: "Search approved public domains through the Guardian research boundary.",
          inputSchema: ResearchRequestSchema,
          outputSchema: ResearchJourneyResultSchema,
        },
        async (request) => {
          let guardedRequest: ResearchRequest;
          try {
            guardedRequest = guardResearchRequest(request, research.scope);
          } catch (error) {
            const reason =
              error instanceof ResearchRequestDeniedError ? error.reason : "invalid_request";
            return {
              isError: true,
              content: [{ type: "text", text: JSON.stringify({ error: reason }) }],
            };
          }
          const evaluatedAt = now();
          const authorization = options.runtime?.authorizeResearchCall(guardedRequest, evaluatedAt);
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
          try {
            const response = await research.client.search(guardedRequest, evaluatedAt);
            const result = ResearchJourneyResultSchema.parse(response.result);
            return {
              content: [{ type: "text", text: JSON.stringify(result) }],
              structuredContent: result,
            };
          } catch (error) {
            const reason = error instanceof ResearchIpcError ? error.reason : "service_unavailable";
            return {
              isError: true,
              content: [{ type: "text", text: JSON.stringify({ error: reason }) }],
            };
          }
        },
      );
      continue;
    }
    throw new TypeError(`the reference session host does not implement ${tool}`);
  }

  return server;
}
