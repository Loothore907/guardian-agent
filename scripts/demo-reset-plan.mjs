import { pathToFileURL } from "node:url";

const TARGET = Object.freeze({
  owner: "Loothore907",
  repository: "guardian-agent-demo",
  repositoryId: 1_352_093_544,
  baseBranch: "main",
  fixtureBranch: "guardian/demo-fixture-pr",
  fixturePath: "fixtures/approved-change.md",
});

function exactCommit(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/u.test(value)) {
    throw new TypeError("demo reset requires an exact lowercase Git commit");
  }
  return value;
}

export function buildDemoResetPlan(input) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("demo reset input is invalid");
  }
  const fields = Object.keys(input);
  if (
    fields.some(
      (field) => !["baseCommit", "fixtureBranchExists", "openFixturePullRequests"].includes(field),
    ) ||
    fields.length !== 3
  ) {
    throw new TypeError("demo reset input is invalid");
  }
  const baseCommit = exactCommit(input.baseCommit);
  if (input.fixtureBranchExists !== false) {
    throw new TypeError("demo fixture branch must be absent");
  }
  if (input.openFixturePullRequests !== 0) {
    throw new TypeError("demo reset requires zero open fixture pull requests");
  }

  const fixtureContent = `# Approved demo change

This harmless file exists solely to exercise Agentic Guardian's repository-bound pull-request read, exact-request approval, head revalidation, and squash-merge controls.

It contains no credentials, executable code, network destination, or authority-bearing instruction.

Reset baseline: \`${baseCommit}\`
`;

  return Object.freeze({
    schemaVersion: 1,
    target: TARGET,
    expectedBaseCommit: baseCommit,
    createBranch: { name: TARGET.fixtureBranch, fromCommit: baseCommit },
    writeFixture: {
      path: TARGET.fixturePath,
      branch: TARGET.fixtureBranch,
      content: fixtureContent,
      commitMessage: "test: seed Guardian demo fixture",
    },
    openPullRequest: {
      title: "test: exercise exact Guardian approval path",
      body: "Harmless disposable fixture for the Agentic Guardian exact-approval demonstration.",
      base: TARGET.baseBranch,
      head: TARGET.fixtureBranch,
      draft: false,
    },
  });
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = buildDemoResetPlan({
    baseCommit: process.argv[2],
    fixtureBranchExists: false,
    openFixturePullRequests: 0,
  });
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}
