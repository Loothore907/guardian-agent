import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

import { ProtectedJudgeSourceManifestSchema } from "../packages/contracts/dist/index.js";
import { ManagedSessionWorkspace } from "../packages/workspace/dist/index.js";
import { createProtectedJudgeSourceBundle } from "./protected-judge-source-manifest.mjs";

test("creates a credential-free disabled manifest for an exact tracked archive", async () => {
  const repositoryRoot = resolve(".");
  const temporaryRoot = join(repositoryRoot, "tmp");
  await mkdir(temporaryRoot, { recursive: true });
  const outputRoot = await mkdtemp(join(temporaryRoot, "protected-judge-manifest-test-"));
  await rm(outputRoot, { recursive: true });
  let workspace;
  try {
    const result = await createProtectedJudgeSourceBundle(repositoryRoot, outputRoot);
    const manifestText = await readFile(result.manifestPath, "utf8");
    const manifest = ProtectedJudgeSourceManifestSchema.parse(JSON.parse(manifestText));
    assert.equal(manifest.executionMode, "disabled");
    assert.match(manifest.gitCommit, /^[0-9a-f]{40}$/u);
    assert.match(manifest.sourceArchiveSha256, /^[0-9a-f]{64}$/u);
    assert.ok(manifest.entries.length > 0);
    assert.equal(
      manifest.entries.find((entry) => entry.path === "pnpm-lock.yaml")?.digest,
      manifest.lockfileSha256,
    );
    for (const forbidden of ["mbsec-", '"ledgerPath"', '"credentialDigest"']) {
      assert.equal(manifestText.includes(forbidden), false);
    }
    const archiveRoot = join(outputRoot, "archive-root");
    await mkdir(archiveRoot);
    execFileSync("tar", ["-xf", result.archivePath, "-C", archiveRoot], { windowsHide: true });
    await assert.rejects(access(join(archiveRoot, ".git")));
    const transformedFixture = await readFile(join(archiveRoot, "scripts", "pnpm.ps1"));
    const transformedEntry = manifest.entries.find((entry) => entry.path === "scripts/pnpm.ps1");
    assert.equal(transformedEntry?.size, transformedFixture.byteLength);
    assert.equal(
      transformedEntry?.digest,
      createHash("sha256").update(transformedFixture).digest("hex"),
    );
    transformedFixture.fill(0);
    // NTFS does not expose the POSIX executable bits recorded by git archive.
    // The protected runtime is Linux; CI performs this complete archive check.
    if (process.platform !== "win32") {
      workspace = await ManagedSessionWorkspace.plan({
        sourceRoot: archiveRoot,
        sourceManifest: {
          schemaVersion: manifest.schemaVersion,
          kind: manifest.kind,
          sourceArchiveSha256: manifest.sourceArchiveSha256,
          entries: manifest.entries,
        },
        storageRoot: join(outputRoot, "sessions"),
        sessionId: "11111111-1111-4111-8111-111111111111",
      });
      const prepared = await workspace.prepare();
      assert.match(
        await readFile(join(prepared.hostPath, "package.json"), "utf8"),
        /agentic-guardian/u,
      );
    }
  } finally {
    await workspace?.close();
    await rm(outputRoot, { recursive: true, force: true });
  }
});
