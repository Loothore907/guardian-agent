import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { judgeRuntimeScope } from "./judge-runtime-scope.js";
const target = {
  operation: "github.pull_request.merge",
  owner: "fixture",
  repository: "demo",
  pullRequest: 1,
  headCommit: "a".repeat(40),
  baseBranch: "main",
};
const scope = {
  objective: "Review and merge the release note.",
  researchUrls: [],
  githubTarget: target,
  durationSeconds: 300,
};
const id = randomUUID();
const plan = {
  maxActions: 2,
  maxMutations: 1,
  mutationRetries: 0,
  targets: [
    { ...target, operation: "github.pull_request.read", connectionId: id },
    { ...target, connectionId: id },
  ],
};
describe("judge scope composition", () => {
  it("binds an explicit migration profile to two exact research targets and three admissions", () => {
    const migration = {
      objective: "Investigate migration",
      researchUrls: ["https://fixture.example.org/reference", "https://fixture.example.org/guide"],
      githubTarget: null,
      durationSeconds: 300,
      researchProfile: "migration-investigation-v1",
    };
    const result = judgeRuntimeScope(migration, undefined);
    expect(result.workerTools).toEqual(["guardian.research"]);
    expect(result.permissions.volume).toEqual({
      maxToolCalls: 20,
      maxResearchRequests: 3,
      maxResearchResults: 3,
      maxLocalCommands: 0,
      maxPrivilegedActions: 0,
    });
    expect(
      judgeRuntimeScope({ ...migration, researchProfile: undefined }, undefined).permissions.volume
        .maxResearchRequests,
    ).toBe(2);
    for (const change of [
      { researchUrls: migration.researchUrls.slice(0, 1) },
      { researchUrls: [...migration.researchUrls, "https://fixture.example.org/third"] },
      { researchUrls: [migration.researchUrls[0], migration.researchUrls[0]] },
      { githubTarget: target },
      { researchProfile: "arbitrary" },
      { maxResearchRequests: 99 },
    ])
      expect(() => judgeRuntimeScope({ ...migration, ...change }, undefined)).toThrow();
  });
  it("binds exact review and merge without exposing local tools to the worker", () => {
    const result = judgeRuntimeScope(scope, plan);
    expect(result.workerTools).toEqual(["github.pull_request.read", "github.pull_request.merge"]);
    expect(result.permissions.tools).toEqual([
      "guardian.session_status",
      "guardian.local_command",
      "github.pull_request.read",
      "github.pull_request.merge",
    ]);
    expect(result.permissions.sideEffects).toEqual(["write_workspace", "merge_pull_request"]);
    expect(result.permissions.volume.maxLocalCommands).toBe(0);
  });
  it.each([
    { ...plan, maxActions: 3 },
    { ...plan, maxMutations: 2 },
    { ...plan, targets: plan.targets.map((t) => ({ ...t, pullRequest: 2 })) },
    { ...plan, targets: plan.targets.map((t) => ({ ...t, headCommit: "b".repeat(40) })) },
    { ...plan, targets: plan.targets.map((t) => ({ ...t, baseBranch: "other" })) },
    { ...plan, targets: plan.targets.map((t) => ({ ...t, connectionId: randomUUID() })) },
  ])("rejects authority outside the browser scope", (changed) => {
    expect(() => judgeRuntimeScope(scope, changed)).toThrow();
  });
  it("accepts a public-only scope without granting GitHub authority", () => {
    const result = judgeRuntimeScope(
      { ...scope, githubTarget: null, researchUrls: ["https://fixture.example.org/update"] },
      undefined,
    );
    expect(result.workerTools).toEqual(["guardian.research"]);
    expect(result.permissions.tools).toEqual([
      "guardian.session_status",
      "guardian.local_command",
      "guardian.research",
    ]);
    expect(result.permissions.sideEffects).toEqual(["write_workspace"]);
    expect(() =>
      judgeRuntimeScope(
        { ...scope, githubTarget: null, researchUrls: ["https://fixture.example.org/update"] },
        plan,
      ),
    ).toThrow();
  });
});
