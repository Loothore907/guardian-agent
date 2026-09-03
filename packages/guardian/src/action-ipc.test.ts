import { describe, expect, it, vi } from "vitest";

import { GuardianRiskEnvelopeSchema, type GuardianEvaluation } from "@guardian/contracts";

import {
  GuardianActionRiskIpcError,
  LocalGuardianActionRiskIpcClient,
  LocalGuardianActionRiskIpcServer,
  createGuardianActionRiskIpcCredentials,
} from "./action-ipc.js";

const ids = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
} as const;
const now = "2026-09-02T20:00:00.000Z";

const envelope = GuardianRiskEnvelopeSchema.parse({
  proposal: {
    tool: "github.pull_request.merge",
    arguments: {
      owner: "loothore907",
      repository: "guardian-agent-demo",
      pullRequest: 2,
      expectedHeadCommit: "a".repeat(40),
      method: "squash",
    },
  },
  deterministicFloor: "confirm",
  riskSignals: ["authority_expansion"],
  untrustedExcerpts: [],
  containsCredentials: false,
});

function evaluation(): GuardianEvaluation {
  return {
    status: "evaluated",
    providerRequestId: "action_risk_1",
    recommendation: {
      schemaVersion: 1,
      recommendation: "confirm",
      certainty: "certain",
      reasonCodes: ["authority_expansion"],
    },
    authorizationLevel: "confirm",
  };
}

function config(credentials = createGuardianActionRiskIpcCredentials()) {
  return {
    schemaVersion: 1,
    serviceKind: "action_risk",
    ...credentials,
    sessionId: ids.session,
    callerId: ids.caller,
    requestDigest: "b".repeat(64),
    startsAt: "2026-09-02T19:59:00.000Z",
    expiresAt: "2026-09-02T20:01:00.000Z",
    envelope,
  } as const;
}

async function withServer<T>(options: {
  readonly handler?: () => Promise<GuardianEvaluation>;
  readonly clientConfig?: (service: ReturnType<typeof config>) => unknown;
  readonly clientNow?: string;
  readonly serverNow?: string;
  readonly run: (client: LocalGuardianActionRiskIpcClient) => Promise<T>;
}): Promise<T> {
  const service = config();
  const server = new LocalGuardianActionRiskIpcServer(
    service,
    options.handler ?? (() => Promise.resolve(evaluation())),
    { now: () => options.serverNow ?? now },
  );
  await server.listen();
  try {
    return await options.run(
      new LocalGuardianActionRiskIpcClient(options.clientConfig?.(service) ?? service, {
        now: () => options.clientNow ?? now,
      }),
    );
  } finally {
    await server.close();
  }
}

describe("guardian action risk IPC", () => {
  it("evaluates only the exact supervisor-bound envelope", async () => {
    const handler = vi.fn(() => Promise.resolve(evaluation()));
    await expect(
      withServer({ handler, run: (client) => client.evaluate(envelope) }),
    ).resolves.toEqual(evaluation());
    expect(handler).toHaveBeenCalledWith(envelope);
  });

  it("consumes the provider turn exactly once", async () => {
    await withServer({
      run: async (client) => {
        await client.evaluate(envelope);
        await expect(client.evaluate(envelope)).rejects.toMatchObject({ reason: "turn_consumed" });
      },
    });
  });

  it("rejects an envelope mutation before IPC", async () => {
    const handler = vi.fn(() => Promise.resolve(evaluation()));
    await withServer({
      handler,
      run: async (client) => {
        await expect(
          client.evaluate({ ...envelope, deterministicFloor: "allow" }),
        ).rejects.toMatchObject({ reason: "unauthorized" });
      },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects wrong capability, session, caller, and digest bindings", async () => {
    for (const mutation of [
      { capability: "99999999-9999-4999-8999-999999999999" },
      { sessionId: "99999999-9999-4999-8999-999999999999" },
      { callerId: "99999999-9999-4999-8999-999999999999" },
      { requestDigest: "c".repeat(64) },
    ]) {
      await expect(
        withServer({
          clientConfig: (service) => ({ ...service, ...mutation }),
          run: (client) => client.evaluate(envelope),
        }),
      ).rejects.toMatchObject({ reason: "unauthorized" });
    }
  });

  it("rejects future, pre-start, and exact-expiry frames", async () => {
    for (const [clientNow, reason] of [
      ["2026-09-02T20:00:01.000Z", "invalid_request"],
      ["2026-09-02T19:58:59.999Z", "not_active"],
      ["2026-09-02T20:01:00.000Z", "expired"],
    ] as const) {
      await expect(
        withServer({ clientNow, run: (client) => client.evaluate(envelope) }),
      ).rejects.toMatchObject({ reason });
    }
  });

  it("rejects an exact-expiry server clock", async () => {
    await expect(
      withServer({
        serverNow: "2026-09-02T20:01:00.000Z",
        clientNow: "2026-09-02T20:00:59.000Z",
        run: (client) => client.evaluate(envelope),
      }),
    ).rejects.toMatchObject({ reason: "expired" });
  });

  it("maps malformed provider output to a fixed failure", async () => {
    let error: unknown;
    try {
      await withServer({
        handler: () => Promise.resolve({ token: "do-not-reflect" } as never),
        run: (client) => client.evaluate(envelope),
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(GuardianActionRiskIpcError);
    expect(error).toMatchObject({ reason: "provider_unavailable" });
    expect(String(error)).not.toContain("do-not-reflect");
  });

  it("rejects secret-like untrusted excerpts", () => {
    expect(() =>
      GuardianRiskEnvelopeSchema.parse({
        ...envelope,
        untrustedExcerpts: ["authorization: Bearer do-not-send"],
      }),
    ).toThrow();
  });

  it("accepts only a fixed local action-risk endpoint", () => {
    expect(
      () =>
        new LocalGuardianActionRiskIpcClient({
          ...config(),
          endpoint: "https://api.tokenfactory.nebius.com",
        }),
    ).toThrow("action risk IPC endpoint");
  });
});
