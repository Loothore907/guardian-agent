import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalDigest } from "../packages/canonical/dist/index.js";
import { InMemoryManagedDemoJudgeIngressSecrets } from "../apps/control-api/dist/judge-ingress.js";
import { buildHeadlessJudgeHost } from "./headless-judge-host.mjs";

test("headless host authenticates before budget admission and closes ingress secrets", async () => {
  const credential = "synthetic-judge-credential-000000001";
  const secrets = new InMemoryManagedDemoJudgeIngressSecrets({
    expectedCredentialDigest: createHash("sha256").update(credential).digest(),
    sourceFingerprintKey: Buffer.alloc(32, 7),
  });
  const objective = "Review the fixed fixture.";
  const sessionPlan = {
    maxActions: 1,
    maxMutations: 1,
    mutationRetries: 0,
    targets: [
      {
        operation: "github.pull_request.merge",
        connectionId: randomUUID(),
        owner: "owner",
        repository: "demo",
        pullRequest: 1,
        headCommit: "a".repeat(40),
        baseBranch: "main",
      },
    ],
  };
  const resources = ["app_private_key", "installation"].map((slot) => ({
    schemaVersion: 1,
    location: {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "judge",
      runtime: "linux",
      storeTarget: "nebius_secretstash",
    },
    reference: { schemaVersion: 1, provider: "github", slot },
    secretId: "mbsec-judge123",
    payloadKey:
      slot === "app_private_key" ? "github_app_private_key" : "github_installation_metadata",
  }));
  const execution = {
    deployment: {
      objective,
      sessionPlan,
      projectRoot: join(tmpdir(), "guardian-host-project"),
      stateRoot: join(tmpdir(), "guardian-host-state"),
      authorization: {
        authorizationId: randomUUID(),
        deploymentId: randomUUID(),
        principalId: randomUUID(),
        authorizedAt: "2026-09-01T00:00:00.000Z",
        expiresAt: "2026-10-01T00:00:00.000Z",
        objectiveDigest: canonicalDigest("deployment_objective", 1, objective),
        sessionPlanIntentDigest: canonicalDigest("session_plan_intent", 1, sessionPlan),
        permissionsDigest: "b".repeat(64),
        workspaceSnapshotDigest: "c".repeat(64),
      },
    },
    credentialStore: { schemaVersion: 1, custodyProfile: "managed_demo", pool: "judge", resources },
    researchRequest: {
      query: "Guardian security review",
      allowedDomains: ["docs.github.com"],
      maxResults: 1,
    },
    unsafeTarget: {
      kind: "github_pull_request",
      owner: "owner",
      repository: "source",
      pullRequest: 1,
      headCommit: "b".repeat(40),
    },
    githubClientId: "Iv23liP8Sq3ZEAyeIHju",
    researchRequiredTerms: ["review"],
    controlledContentUrl: "https://docs.github.com/fixture",
  };
  let admissions = 0;
  const app = buildHeadlessJudgeHost({
    execution,
    secrets,
    expectedHost: "judge.agentic-guardian.com",
    logger: false,
    budget: {
      begin() {
        admissions++;
        return Promise.resolve({ state: "denied" });
      },
    },
  });
  const headers = {
    host: "judge.agentic-guardian.com",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "192.0.2.8",
  };
  try {
    const request = {
      method: "POST",
      url: "/v1/judge/journeys",
      remoteAddress: "127.0.0.1",
      payload: { schemaVersion: 1, objective },
    };
    assert.equal((await app.inject({ ...request, headers })).statusCode, 401);
    assert.equal(admissions, 0);
    const response = await app.inject({
      ...request,
      headers: { ...headers, authorization: `Bearer ${credential}` },
    });
    assert.equal(response.statusCode, 429);
    assert.equal(admissions, 1);
    assert.equal(response.body.includes(credential), false);
  } finally {
    await app.close();
  }
  assert.equal(secrets.verifyBearerCredential(credential), false);
});
