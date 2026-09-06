import assert from "node:assert/strict";
import { assertLinuxKeyringReady } from "./linux-keyring-preflight.mjs";
import {
  parseGitHubCeremonyTarget,
  runSupervisedGitHubCeremony,
} from "./github-supervised-harness.mjs";

// No defaults and no agent-supplied transport or credential material.
try {
  if (process.platform !== "linux" || process.env.GUARDIAN_TEST_SUPERVISED_GITHUB !== "1")
    throw new Error("explicit Linux protected gate required");
  const [mode, pr, head, ...extra] = process.argv.slice(2);
  if (extra.length || !/^[1-9][0-9]*$/u.test(pr ?? "")) throw new Error("exact target required");
  const target = parseGitHubCeremonyTarget({ mode, pullRequest: Number(pr), headCommit: head });
  if (
    mode === "merge" &&
    process.env.GUARDIAN_GITHUB_EXACT_MERGE !== `guardian-agent-demo#${pr}@${head}:squash`
  )
    throw new Error("exact merge confirmation required");
  assertLinuxKeyringReady();
  const { result } = await runSupervisedGitHubCeremony({
    mode,
    pullRequest: target.pullRequest,
    headCommit: target.headCommit,
  });
  if (!result.ok) {
    process.stdout.write(`${JSON.stringify({ status: "denied", code: result.code })}\n`);
    process.exitCode = 1;
  } else {
    assert.equal(result.result.headCommit, target.headCommit);
    if (mode === "read") {
      assert.equal(result.result.state, "open");
      assert.equal(result.result.draft, false);
      assert.equal(result.result.baseBranch, "main");
      assert.equal(result.result.title, "test: exercise exact Guardian approval path");
    } else assert.equal(result.result.status, "merged");
    process.stdout.write(
      `${JSON.stringify({
        status: "passed",
        mode,
        pullRequest: target.pullRequest,
        headCommit: target.headCommit,
        ...(mode === "merge" ? { mergeCommit: result.result.mergeCommit } : {}),
      })}\n`,
    );
  }
} catch (error) {
  // Preflight errors are fixed messages. Do not print arbitrary child/provider diagnostics.
  const message =
    error instanceof Error && error.message.startsWith("Linux ")
      ? error.message
      : "protected GitHub gate failed before a verified result; inspect sanitized readiness and target";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
