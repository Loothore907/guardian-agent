import { describe, expect, it, vi } from "vitest";

import { BrokerExecutionRequestSchema, type BrokerExecutionResult } from "@guardian/contracts";

import {
  BrokerIpcError,
  LocalBrokerIpcClient,
  LocalBrokerIpcServer,
  createBrokerIpcCredentials,
} from "./ipc.js";

const ids = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  connection: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  profile: "55555555-5555-4555-8555-555555555555",
  request: "66666666-6666-4666-8666-666666666666",
  proposal: "77777777-7777-4777-8777-777777777777",
  evidence: "88888888-8888-4888-8888-888888888888",
} as const;

const now = "2026-09-02T20:00:00.000Z";
const headCommit = "a".repeat(40);

function readExecution(sessionId: string = ids.session) {
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
      requestId: ids.request,
      sessionId,
      callerId: ids.caller,
      connectionId: ids.connection,
      missionId: ids.mission,
      missionVersion: 1,
      profileId: ids.profile,
      profileVersion: 1,
      policyVersion: 1,
      proposal: {
        schemaVersion: 1,
        proposalId: ids.proposal,
        sessionId,
        callerId: ids.caller,
        missionId: ids.mission,
        missionVersion: 1,
        profileId: ids.profile,
        profileVersion: 1,
        proposedAt: now,
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
    evidenceExposureIds: [ids.evidence],
  });
}

function snapshot(pullRequest = 2): BrokerExecutionResult {
  return {
    ok: true,
    result: {
      owner: "loothore907",
      repository: "guardian-agent-demo",
      pullRequest,
      headCommit,
      state: "open",
      draft: false,
      title: "Controlled fixture",
      baseBranch: "main",
    },
  };
}

function config(credentials = createBrokerIpcCredentials()) {
  return {
    credentials,
    value: {
      schemaVersion: 1,
      ...credentials,
      sessionId: ids.session,
      callerId: ids.caller,
      startsAt: "2026-09-02T19:59:00.000Z",
      expiresAt: "2026-09-02T20:01:00.000Z",
    },
  } as const;
}

async function withServer<T>(options: {
  readonly handler: () => Promise<BrokerExecutionResult>;
  readonly clientNow?: string;
  readonly serverNow?: string;
  readonly run: (client: LocalBrokerIpcClient) => Promise<T>;
}): Promise<T> {
  const service = config();
  const server = new LocalBrokerIpcServer(service.value, options.handler, {
    now: () => options.serverNow ?? now,
  });
  await server.listen();
  try {
    return await options.run(
      new LocalBrokerIpcClient({
        ...service.credentials,
        sessionId: ids.session,
        callerId: ids.caller,
        now: () => options.clientNow ?? now,
      }),
    );
  } finally {
    await server.close();
  }
}

describe("broker IPC", () => {
  it("returns one exact request-bound allowlisted snapshot", async () => {
    const handler = vi.fn(() => Promise.resolve(snapshot()));
    const result = await withServer({
      handler,
      run: (client) => client.execute(readExecution()),
    });

    expect(result).toEqual(snapshot());
    expect(handler).toHaveBeenCalledWith(readExecution(), now);
  });

  it("passes a fixed broker denial without reflecting private detail", async () => {
    const result = await withServer({
      handler: () => Promise.resolve({ ok: false, code: "scope_mismatch" }),
      run: (client) => client.execute(readExecution()),
    });
    expect(result).toEqual({ ok: false, code: "scope_mismatch" });
  });

  it("rejects the wrong capability before invoking the handler", async () => {
    const service = config();
    const handler = vi.fn(() => Promise.resolve(snapshot()));
    const server = new LocalBrokerIpcServer(service.value, handler, { now: () => now });
    await server.listen();
    try {
      const client = new LocalBrokerIpcClient({
        ...service.credentials,
        capability: "99999999-9999-4999-8999-999999999999",
        sessionId: ids.session,
        callerId: ids.caller,
        now: () => now,
      });
      await expect(client.execute(readExecution())).rejects.toMatchObject({
        reason: "unauthorized",
      });
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects cross-session input in the client before IPC", async () => {
    const service = config();
    const client = new LocalBrokerIpcClient({
      ...service.credentials,
      sessionId: ids.session,
      callerId: ids.caller,
      now: () => now,
    });
    await expect(
      client.execute(readExecution("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")),
    ).rejects.toMatchObject({ reason: "unauthorized" });
  });

  it("rejects future, pre-start, and exact-expiry client frames", async () => {
    for (const [clientNow, reason] of [
      ["2026-09-02T20:00:01.000Z", "invalid_request"],
      ["2026-09-02T19:58:59.999Z", "not_active"],
      ["2026-09-02T20:01:00.000Z", "expired"],
    ] as const) {
      await expect(
        withServer({
          handler: () => Promise.resolve(snapshot()),
          clientNow,
          run: (client) => client.execute(readExecution()),
        }),
      ).rejects.toMatchObject({ reason });
    }
    await expect(
      withServer({
        handler: () => Promise.resolve(snapshot()),
        serverNow: "2026-09-02T20:01:00.000Z",
        clientNow: "2026-09-02T20:00:59.000Z",
        run: (client) => client.execute(readExecution()),
      }),
    ).rejects.toMatchObject({ reason: "expired" });
  });

  it("fails closed when a success result mutates the exact pull request", async () => {
    await expect(
      withServer({
        handler: () => Promise.resolve(snapshot(3)),
        run: (client) => client.execute(readExecution()),
      }),
    ).rejects.toMatchObject({ reason: "service_unavailable" });
  });

  it("rejects malformed handler output without reflecting it", async () => {
    let error: unknown;
    try {
      await withServer({
        handler: () => Promise.resolve({ ok: false, code: "token=do-not-reflect" } as never),
        run: (client) => client.execute(readExecution()),
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(BrokerIpcError);
    expect(error).toMatchObject({ reason: "service_unavailable" });
    expect(String(error)).not.toContain("do-not-reflect");
  });

  it("rejects duplicate evidence identifiers before IPC", () => {
    const execution = readExecution();
    expect(() =>
      BrokerExecutionRequestSchema.parse({
        ...execution,
        evidenceExposureIds: [ids.evidence, ids.evidence],
      }),
    ).toThrow();
  });

  it("accepts only a fixed local broker endpoint", () => {
    expect(
      () =>
        new LocalBrokerIpcClient({
          endpoint: "https://api.github.com",
          capability: ids.session,
          sessionId: ids.session,
          callerId: ids.caller,
        }),
    ).toThrow("broker IPC endpoint");
  });
});
