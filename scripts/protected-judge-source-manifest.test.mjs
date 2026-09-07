import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

import { ProtectedJudgeSourceManifestSchema } from "../packages/contracts/dist/index.js";
import { createProtectedJudgeSourceBundle } from "./protected-judge-source-manifest.mjs";

test("creates a credential-free disabled manifest for an exact tracked archive", async () => {
  const repositoryRoot = resolve(".");
  const temporaryRoot = join(repositoryRoot, "tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const outputRoot = await mkdtemp(join(temporaryRoot, "protected-judge-manifest-test-"));
  await rm(outputRoot, { recursive: true });
  try {
    const result = await createProtectedJudgeSourceBundle(repositoryRoot, outputRoot);
    const manifestText = await readFile(result.manifestPath, "utf8");
    const manifest = ProtectedJudgeSourceManifestSchema.parse(JSON.parse(manifestText));
    assert.equal(manifest.executionMode, "disabled");
    assert.match(manifest.gitCommit, /^[0-9a-f]{40}$/u);
    assert.match(manifest.sourceArchiveSha256, /^[0-9a-f]{64}$/u);
    for (const forbidden of ["mbsec-", "capability", "ledgerPath", "credentialDigest"]) {
      assert.equal(manifestText.includes(forbidden), false);
    }
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
