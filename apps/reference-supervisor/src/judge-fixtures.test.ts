import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { JudgeMutationFixturePool } from "./judge-fixtures.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const scope = {
  objective: "Review and merge the fixture",
  researchUrls: [],
  durationSeconds: 300,
  githubTarget: {
    operation: "github.pull_request.merge",
    owner: "fixture",
    repository: "demo",
    pullRequest: 4,
    headCommit: "a".repeat(40),
    baseBranch: "main",
  },
};
it("reserves exclusively across pool instances and never reuses after restart", async () => {
  const root = await mkdtemp(join(tmpdir(), "guardian-fixtures-"));
  roots.push(root);
  const piloted = new JudgeMutationFixturePool(root, [scope]);
  await expect(
    piloted.reserveTarget({
      ...scope,
      githubTarget: { ...scope.githubTarget, headCommit: "b".repeat(40) },
    }),
  ).rejects.toThrow("not a provisioned fixture");
  await expect(
    piloted.reserveTarget({
      ...scope,
      githubTarget: { ...scope.githubTarget, pullRequest: 5 },
    }),
  ).rejects.toThrow("not a provisioned fixture");
  const results = await Promise.allSettled([
    new JudgeMutationFixturePool(root, [scope]).reserve(),
    piloted.reserveTarget(scope),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  await expect(new JudgeMutationFixturePool(root, [scope]).reserve()).rejects.toThrow("exhausted");
  await expect(new JudgeMutationFixturePool(root, [scope]).reserveTarget(scope)).rejects.toThrow(
    "exhausted",
  );
});
it("rejects ambiguous duplicate PRs even with changed heads, and read targets", () => {
  expect(
    () =>
      new JudgeMutationFixturePool(tmpdir(), [
        scope,
        { ...scope, githubTarget: { ...scope.githubTarget, headCommit: "b".repeat(40) } },
      ]),
  ).toThrow("duplicate");
  expect(
    () =>
      new JudgeMutationFixturePool(tmpdir(), [
        {
          ...scope,
          githubTarget: { ...scope.githubTarget, operation: "github.pull_request.read" },
        },
      ]),
  ).toThrow("invalid mutation");
});
