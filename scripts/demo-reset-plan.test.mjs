import assert from "node:assert/strict";
import test from "node:test";

import { buildDemoResetPlan } from "./demo-reset-plan.mjs";

const BASE = "16263e7a0e9bc81df55bac9b8413fc2256077a9d";

test("builds the one fixed disposable-repository reset", () => {
  const plan = buildDemoResetPlan({
    baseCommit: BASE,
    fixtureBranchExists: false,
    openFixturePullRequests: 0,
  });

  assert.deepEqual(plan.target, {
    owner: "Loothore907",
    repository: "guardian-agent-demo",
    repositoryId: 1_352_093_544,
    baseBranch: "main",
    fixtureBranch: "guardian/demo-fixture-pr",
    fixturePath: "fixtures/approved-change.md",
  });
  assert.equal(plan.createBranch.fromCommit, BASE);
  assert.equal(plan.writeFixture.branch, "guardian/demo-fixture-pr");
  assert.match(plan.writeFixture.content, new RegExp(BASE, "u"));
  assert.deepEqual(plan.openPullRequest, {
    title: "test: exercise exact Guardian approval path",
    body: "Harmless disposable fixture for the Agentic Guardian exact-approval demonstration.",
    base: "main",
    head: "guardian/demo-fixture-pr",
    draft: false,
  });
  assert.equal(JSON.stringify(plan).includes("token"), false);
});

test("rejects an inexact baseline, existing branch, open fixture, and unknown input", () => {
  const valid = {
    baseCommit: BASE,
    fixtureBranchExists: false,
    openFixturePullRequests: 0,
  };
  assert.throws(() => buildDemoResetPlan({ ...valid, baseCommit: `${BASE}0` }), TypeError);
  assert.throws(() => buildDemoResetPlan({ ...valid, fixtureBranchExists: true }), TypeError);
  assert.throws(() => buildDemoResetPlan({ ...valid, openFixturePullRequests: 1 }), TypeError);
  assert.throws(() => buildDemoResetPlan({ ...valid, destination: "other/repository" }), TypeError);
});
