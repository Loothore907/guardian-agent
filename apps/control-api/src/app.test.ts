import { createHash } from "node:crypto";
import { Writable } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildControlApi } from "./app.js";
import {
  InMemoryManagedDemoJudgeIngressSecrets,
  type ManagedDemoJudgeJourneyCoordinator,
} from "./judge-ingress.js";

const openApps: ReturnType<typeof buildControlApi>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe("control API", () => {
  it("returns an honest pre-enforcement health state", async () => {
    const app = buildControlApi({ logger: false });
    openApps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "foundation", assurance: "unknown" });
  });

  const deploymentId = "11111111-1111-4111-8111-111111111111";
  const credential = "judge-fixture-credential-0000000001";
  const headers = {
    host: "judge.agentic-guardian.com",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "192.0.2.8",
    authorization: `Bearer ${credential}`,
  };

  function judgeApp(coordinator: ManagedDemoJudgeJourneyCoordinator) {
    const app = buildControlApi({
      logger: false,
      judge: {
        deploymentId,
        expectedHost: "judge.agentic-guardian.com",
        secrets: new InMemoryManagedDemoJudgeIngressSecrets({
          expectedCredentialDigest: createHash("sha256").update(credential).digest(),
          sourceFingerprintKey: Buffer.alloc(32, 9),
        }),
        coordinator,
      },
    });
    openApps.push(app);
    return app;
  }

  function completedRun() {
    return vi.fn((...input: Parameters<ManagedDemoJudgeJourneyCoordinator["run"]>) => {
      void input;
      return Promise.resolve({
        schemaVersion: 1 as const,
        state: "completed" as const,
      });
    });
  }

  it("does not register the legacy journey route for portal-only composition", async () => {
    const app = buildControlApi({
      logger: false,
      judge: {
        deploymentId,
        expectedHost: headers.host,
        secrets: new InMemoryManagedDemoJudgeIngressSecrets({
          expectedCredentialDigest: createHash("sha256").update(credential).digest(),
          sourceFingerprintKey: Buffer.alloc(32, 9),
        }),
      },
    });
    openApps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "127.0.0.1",
      headers,
      payload: { schemaVersion: 1, objective: "Review the bounded repository" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: "not_found" });
  });

  it("authenticates one same-host proxy request and passes only objective plus fingerprint", async () => {
    const run = completedRun();
    const app = judgeApp({ run });
    const response = await app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "127.0.0.1",
      headers,
      payload: { schemaVersion: 1, objective: "Review the bounded repository" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual({ schemaVersion: 1, state: "completed" });
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[0]).toBe("Review the bounded repository");
    expect(run.mock.calls[0]?.[1]).toMatch(/^[a-f0-9]{64}$/u);
    expect(run.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [
      "missing credential",
      {
        host: headers.host,
        "x-forwarded-proto": headers["x-forwarded-proto"],
        "x-forwarded-for": headers["x-forwarded-for"],
      },
    ],
    ["wrong credential", { ...headers, authorization: "Bearer wrong000000000000000000000000000" }],
    ["wrong host", { ...headers, host: "demo.agentic-guardian.com" }],
    ["non-TLS forwarding", { ...headers, "x-forwarded-proto": "http" }],
    ["forwarded chain", { ...headers, "x-forwarded-for": "192.0.2.8, 198.51.100.9" }],
    ["alternate forwarded identity", { ...headers, "x-real-ip": "198.51.100.9" }],
    ["malformed source", { ...headers, "x-forwarded-for": "not-an-address" }],
  ])("rejects %s before the journey coordinator", async (_name, candidateHeaders) => {
    const run = completedRun();
    const app = judgeApp({ run });
    const response = await app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "127.0.0.1",
      headers: candidateHeaders,
      payload: { schemaVersion: 1, objective: "Review the bounded repository" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      schemaVersion: 1,
      state: "stopped",
      code: "unauthorized",
    });
    expect(run).not.toHaveBeenCalled();
    expect(response.body).not.toContain(credential);
    expect(response.body).not.toContain("192.0.2.8");
  });

  it("rejects a non-loopback direct peer despite otherwise valid headers", async () => {
    const run = completedRun();
    const app = judgeApp({ run });
    const response = await app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "198.51.100.9",
      headers,
      payload: { schemaVersion: 1, objective: "Review the bounded repository" },
    });

    expect(response.statusCode).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects authority fields and secret-like objectives before admission", async () => {
    const run = completedRun();
    const app = judgeApp({ run });
    for (const payload of [
      { schemaVersion: 1, objective: "Review the bounded repository", pool: "judge" },
      { schemaVersion: 1, objective: "token=abcdefghijklmnopqrstuvwxyz0123456789" },
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/judge/journeys",
        remoteAddress: "127.0.0.1",
        headers,
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        schemaVersion: 1,
        state: "stopped",
        code: "invalid_request",
      });
    }
    expect(run).not.toHaveBeenCalled();
  });

  it("maps capacity and internal failures to bounded public responses", async () => {
    for (const [result, status] of [
      [
        {
          schemaVersion: 1 as const,
          state: "denied" as const,
          code: "capacity_unavailable" as const,
        },
        429,
      ],
      [
        { schemaVersion: 1 as const, state: "stopped" as const, code: "journey_failed" as const },
        503,
      ],
    ] as const) {
      const app = judgeApp({ run: vi.fn(() => Promise.resolve(result)) });
      const response = await app.inject({
        method: "POST",
        url: "/v1/judge/journeys",
        remoteAddress: "127.0.0.1",
        headers,
        payload: { schemaVersion: 1, objective: "Review the bounded repository" },
      });
      expect(response.statusCode).toBe(status);
      expect(response.json()).toEqual(result);
    }
  });

  it("sanitizes malformed JSON without invoking the coordinator", async () => {
    const run = completedRun();
    const app = judgeApp({ run });
    const response = await app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "127.0.0.1",
      headers: { ...headers, "content-type": "application/json" },
      payload: '{"schemaVersion":1,"objective":',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      schemaVersion: 1,
      state: "stopped",
      code: "invalid_request",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("emits no automatic request log containing ingress secrets or source addresses", async () => {
    let logOutput = "";
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logOutput += String(chunk);
        callback();
      },
    });
    const run = completedRun();
    const app = buildControlApi({
      logger: true,
      logStream: stream,
      judge: {
        deploymentId,
        expectedHost: "judge.agentic-guardian.com",
        secrets: new InMemoryManagedDemoJudgeIngressSecrets({
          expectedCredentialDigest: createHash("sha256").update(credential).digest(),
          sourceFingerprintKey: Buffer.alloc(32, 9),
        }),
        coordinator: { run },
      },
    });
    openApps.push(app);

    await app.inject({
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "127.0.0.1",
      headers,
      payload: { schemaVersion: 1, objective: "Review the bounded repository" },
    });

    expect(logOutput).not.toContain(credential);
    expect(logOutput).not.toContain("192.0.2.8");
    expect(logOutput).not.toMatch(/[a-f0-9]{64}/u);
  });
});
