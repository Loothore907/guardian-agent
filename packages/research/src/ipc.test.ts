import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LocalResearchIpcClient,
  LocalResearchIpcServer,
  SessionResearchGateway,
  createResearchIpcCredentials,
  type ResearchIpcHandler,
} from "./index.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  mission: "33333333-3333-4333-8333-333333333333",
  profile: "44444444-4444-4444-8444-444444444444",
} as const;
const request = {
  query: "GitHub pull request branch protection documentation",
  maxResults: 1,
  allowedDomains: ["docs.github.com"],
} as const;
const scope = {
  allowedDomains: ["docs.github.com"],
  maxResultsPerRequest: 2,
  remainingRequests: 1,
  remainingResults: 2,
  requiredTerms: ["pull request", "branch protection"],
} as const;
const activeAt = "2026-08-30T09:01:00.000Z";

const servers: LocalResearchIpcServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(async (server) => server.close()));
});

function config(credentials = createResearchIpcCredentials()) {
  return {
    schemaVersion: 1,
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    ...credentials,
    startsAt: "2026-08-30T09:00:00.000Z",
    expiresAt: "2026-08-30T09:05:00.000Z",
    scope,
  } as const;
}

function clientOptions(serverConfig: ReturnType<typeof config>) {
  return {
    endpoint: serverConfig.endpoint,
    capability: serverConfig.capability,
    sessionId: serverConfig.sessionId,
    callerId: serverConfig.callerId,
    missionId: serverConfig.missionId,
    missionVersion: serverConfig.missionVersion,
    profileId: serverConfig.profileId,
    profileVersion: serverConfig.profileVersion,
    policyVersion: serverConfig.policyVersion,
  } as const;
}

async function startServer(serverConfig: ReturnType<typeof config>, handler: ResearchIpcHandler) {
  const server = new LocalResearchIpcServer(serverConfig, handler);
  await server.listen();
  servers.push(server);
  return server;
}

function sessionHandler() {
  const gateway = new SessionResearchGateway(IDS.session, scope);
  const search = vi.fn(() =>
    Promise.resolve({
      requestId: "tavily_ipc_1",
      results: [
        {
          url: "https://docs.github.com/pull-requests",
          title: "Pull request guidance",
          content: "Branch protection rules can require reviews before merging.",
        },
      ],
    }),
  );
  const handler: ResearchIpcHandler = async (boundedRequest, requestedAt) => ({
    result: await gateway.search(boundedRequest, { search }, requestedAt),
    budget: gateway.budget,
  });
  return { handler, search };
}

describe("local research IPC boundary", () => {
  it("returns only session-bound evidence and budget over the local pipe", async () => {
    const serverConfig = config();
    const { handler } = sessionHandler();
    await startServer(serverConfig, handler);
    const client = new LocalResearchIpcClient(clientOptions(serverConfig));

    const response = await client.search(request, activeAt);

    expect(response.result.evidence[0]).toMatchObject({
      sourceUrl: "https://docs.github.com/pull-requests",
      contentTrust: "untrusted_public_content",
    });
    expect(response.result.provenance[0]).toMatchObject({ sessionId: IDS.session });
    expect(response.budget).toEqual({
      sessionId: IDS.session,
      remainingRequests: 0,
      remainingResults: 1,
    });
  });

  it.each([
    ["capability", { capability: randomUUID() }],
    ["caller", { callerId: randomUUID() }],
    ["profile", { profileId: randomUUID() }],
  ])("rejects a mismatched %s before the service handler", async (_label, mutation) => {
    const serverConfig = config();
    const handler = vi.fn<ResearchIpcHandler>();
    await startServer(serverConfig, handler);
    const client = new LocalResearchIpcClient({
      ...clientOptions(serverConfig),
      ...mutation,
    });

    await expect(client.search(request, activeAt)).rejects.toMatchObject({
      reason: "unauthorized",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    ["before start", "2026-08-30T08:59:59.999Z", "not_active"],
    ["at expiry", "2026-08-30T09:05:00.000Z", "expired"],
  ])("rejects %s before the service handler", async (_label, requestedAt, reason) => {
    const serverConfig = config();
    const handler = vi.fn<ResearchIpcHandler>();
    await startServer(serverConfig, handler);
    const client = new LocalResearchIpcClient(clientOptions(serverConfig));

    await expect(client.search(request, requestedAt)).rejects.toMatchObject({ reason });
    expect(handler).not.toHaveBeenCalled();
  });

  it("fails an exhausted session before a second provider invocation", async () => {
    const serverConfig = config();
    const { handler, search } = sessionHandler();
    await startServer(serverConfig, handler);
    const client = new LocalResearchIpcClient(clientOptions(serverConfig));

    await expect(client.search(request, activeAt)).resolves.toBeDefined();
    await expect(client.search(request, activeAt)).rejects.toMatchObject({
      reason: "budget_exhausted",
    });
    expect(search).toHaveBeenCalledOnce();
  });
});
