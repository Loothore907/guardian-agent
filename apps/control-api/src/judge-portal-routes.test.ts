import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { buildControlApi } from "./app.js";
import { JudgePortal } from "./judge-portal.js";
import { InMemoryManagedDemoJudgeIngressSecrets } from "./judge-ingress.js";
const apps: ReturnType<typeof buildControlApi>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
const credential = "judge-fixture-credential-0000000001";
const headers = {
  host: "judge.agentic-guardian.com",
  "x-forwarded-proto": "https",
  "x-forwarded-for": "192.0.2.8",
  authorization: `Bearer ${credential}`,
};
const scope = {
  objective: "Summarize the update",
  researchUrls: ["https://example.com/update"],
  githubTarget: null,
  durationSeconds: 300 as const,
};
function setup() {
  const run = vi.fn(() =>
    Promise.resolve({ schemaVersion: 1, state: "completed", assurance: "observed", evidence: [] }),
  );
  const prepare = vi.fn(() =>
    Promise.resolve({
      scope,
      bindingDigest: "a".repeat(64),
      confirmAndRun: run,
      close: () => Promise.resolve(),
    }),
  );
  const portal = new JudgePortal({
    backend: { prepare },
    scenarios: { unauthorized_destination: () => Promise.resolve(scope) },
  });
  const app = buildControlApi({
    logger: false,
    judge: {
      deploymentId: "11111111-1111-4111-8111-111111111111",
      expectedHost: headers.host,
      secrets: new InMemoryManagedDemoJudgeIngressSecrets({
        expectedCredentialDigest: createHash("sha256").update(credential).digest(),
        sourceFingerprintKey: Buffer.alloc(32, 7),
      }),
      coordinator: {
        run: () =>
          Promise.resolve({ schemaVersion: 1, state: "stopped", code: "service_unavailable" }),
      },
      portal,
    },
  });
  apps.push(app);
  return { app, prepare, run };
}
it("authenticates before preparation and supports one exact HTTP launch", async () => {
  const { app, prepare, run } = setup();
  const payload = { schemaVersion: 1, mode: "seeded", scenarioId: "unauthorized_destination" };
  const denied = await app.inject({ method: "POST", url: "/v1/judge/draft", payload });
  expect(denied.statusCode).toBe(401);
  expect(prepare).not.toHaveBeenCalled();
  const draft = await app.inject({ method: "POST", url: "/v1/judge/draft", headers, payload });
  expect(draft.statusCode).toBe(200);
  expect(run).not.toHaveBeenCalled();
  const preview = draft.json<{ previewId: string; previewDigest: string }>();
  const confirmation = {
    schemaVersion: 1,
    previewId: preview.previewId,
    previewDigest: preview.previewDigest,
  };
  const result = await app.inject({
    method: "POST",
    url: "/v1/judge/confirm",
    headers,
    payload: confirmation,
  });
  expect(result.statusCode).toBe(200);
  expect(result.json<{ assurance: string }>().assurance).toBe("observed");
  expect(run).toHaveBeenCalledTimes(1);
  expect(
    (await app.inject({ method: "POST", url: "/v1/judge/confirm", headers, payload: confirmation }))
      .statusCode,
  ).toBe(409);
});
it("never echoes malformed input or forwards authority overrides", async () => {
  const { app, prepare } = setup();
  const response = await app.inject({
    method: "POST",
    url: "/v1/judge/draft",
    headers,
    payload: {
      schemaVersion: 1,
      mode: "seeded",
      scenarioId: "unauthorized_destination",
      credential: "private-fixture-marker",
    },
  });
  expect(response.statusCode).toBe(400);
  expect(response.body).not.toContain("private-fixture-marker");
  expect(prepare).not.toHaveBeenCalled();
});
it("default host publishes the catalog with all execution disabled", async () => {
  const app = buildControlApi({ logger: false });
  apps.push(app);
  const response = await app.inject({ method: "GET", url: "/v1/judge/catalog" });
  expect(response.statusCode).toBe(200);
  const catalog = response.json<{
    scenarios: { available: boolean }[];
    pilotedAvailable: boolean;
  }>();
  expect(catalog.scenarios.every((s) => !s.available)).toBe(true);
  expect(catalog.pilotedAvailable).toBe(false);
});
it("rejects query authority and never echoes an unknown URL", async () => {
  const { app, prepare } = setup();
  const response = await app.inject({
    method: "POST",
    url: "/v1/judge/draft?credential=private-fixture-marker",
    headers,
    payload: {},
  });
  expect(response.statusCode).toBe(400);
  expect(response.body).not.toContain("private-fixture-marker");
  const missing = await app.inject({ method: "GET", url: "/v1/judge/private-fixture-marker" });
  expect(missing.statusCode).toBe(404);
  expect(missing.body).not.toContain("private-fixture-marker");
  expect(prepare).not.toHaveBeenCalled();
});
