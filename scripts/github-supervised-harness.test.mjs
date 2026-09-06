import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseGitHubCeremonyTarget,
  runSupervisedGitHubCeremony,
} from "./github-supervised-harness.mjs";
const target = { mode: "read", pullRequest: 3, headCommit: "a".repeat(40) };
const fixture = {
  brokerEntrypoint: fileURLToPath(new URL("./test-fixtures/github-broker.mjs", import.meta.url)),
  environment: process.platform === "win32" ? { FIXTURE_FIXED_CLOCK: "1" } : {},
  ...(process.platform === "win32"
    ? {
        fixedClock: true,
        guardianEntrypoint: fileURLToPath(
          new URL("./test-fixtures/github-guardian.mjs", import.meta.url),
        ),
      }
    : {}),
};

test("ceremony rejects missing, ambiguous, or widened targets", () => {
  for (const invalid of [
    null,
    {},
    { ...target, pullRequest: 0 },
    { ...target, headCommit: "main" },
    { ...target, headCommit: "0".repeat(40) },
    { ...target, owner: "other" },
    { ...target, mode: "delete" },
    { ...target, approval: true },
  ]) {
    assert.throws(() => parseGitHubCeremonyTarget(invalid), /exact disposable/);
  }
});
test("three supervised services return a sanitized exact-head read", async () => {
  const { result, fixtureCounts } = await runSupervisedGitHubCeremony(target, fixture);
  assert.deepEqual(fixtureCounts, { read: 1, merge: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.result.headCommit, target.headCommit);
  assert.equal(result.result.baseBranch, "main");
  assert.doesNotMatch(JSON.stringify(result), /ghu_|synthetic|private/);
});
test("exact approval permits one squash merge and replay fails closed", async () => {
  const { result, replay, fixtureCounts } = await runSupervisedGitHubCeremony(
    { ...target, mode: "merge" },
    { ...fixture, replay: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.result.status, "merged");
  assert.equal(result.result.mergeCommit, "c".repeat(40));
  assert.deepEqual(fixtureCounts, { read: 1, merge: 1 });
  assert.equal(replay.ok, false);
  assert.doesNotMatch(JSON.stringify({ result, replay }), /ghu_|synthetic/);
});
test("merge without approval is denied before external access", async () => {
  const { result, fixtureCounts } = await runSupervisedGitHubCeremony(
    { ...target, mode: "merge" },
    { ...fixture, omitApproval: true },
  );
  assert.deepEqual(result, { ok: false, code: "approval_mismatch" });
  assert.deepEqual(fixtureCounts, { read: 0, merge: 0 });
});
test("head mutation rejects an approved merge", async () => {
  const { result, fixtureCounts } = await runSupervisedGitHubCeremony(
    { ...target, mode: "merge" },
    { ...fixture, environment: { ...fixture.environment, FIXTURE_HEAD_CHANGED: "1" } },
  );
  assert.deepEqual(result, { ok: false, code: "resource_changed" });
  assert.deepEqual(fixtureCounts, { read: 1, merge: 0 });
});
