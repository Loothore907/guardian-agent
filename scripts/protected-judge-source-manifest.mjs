import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { ProtectedJudgeSourceManifestSchema } from "../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function assertOutputRoot(repositoryRoot, outputRoot) {
  const expectedRoot = resolve(repositoryRoot, "tmp");
  const actual = resolve(outputRoot);
  const relation = relative(expectedRoot, actual);
  if (
    relation === "" ||
    relation === ".." ||
    relation.startsWith("..\\") ||
    relation.startsWith("../") ||
    isAbsolute(relation)
  ) {
    throw new TypeError("protected judge source output must be a new directory under tmp");
  }
  return actual;
}

export async function createProtectedJudgeSourceBundle(repositoryRootValue, outputRootValue) {
  const repositoryRoot = resolve(repositoryRootValue);
  const outputRoot = assertOutputRoot(repositoryRoot, outputRootValue);
  await mkdir(outputRoot, { recursive: false });
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    windowsHide: true,
  });
  const gitCommit = stdout.trim();
  if (!/^[0-9a-f]{40}$/u.test(gitCommit)) throw new TypeError("source revision is invalid");
  const archivePath = join(outputRoot, `guardian-source-${gitCommit}.tar`);
  const manifestPath = join(outputRoot, `guardian-source-${gitCommit}.manifest.json`);
  await execFileAsync("git", ["archive", "--format=tar", `--output=${archivePath}`, gitCommit], {
    cwd: repositoryRoot,
    windowsHide: true,
  });
  const metadata = await lstat(archivePath);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size < 1) {
    throw new TypeError("source archive is invalid");
  }
  const packageManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  const pnpmVersion = /^pnpm@(.+)$/u.exec(packageManifest.packageManager)?.[1];
  const manifest = ProtectedJudgeSourceManifestSchema.parse({
    schemaVersion: 1,
    executionMode: "disabled",
    gitCommit,
    lockfileSha256: await sha256(join(repositoryRoot, "pnpm-lock.yaml")),
    sourceArchiveSha256: await sha256(archivePath),
    nodeVersion: process.version,
    pnpmVersion,
    listenHost: "127.0.0.1",
    requiredSecretSlots: [
      "access_credential_sha256",
      "source_fingerprint_key",
      "nebius/default",
      "tavily/default",
    ],
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return {
    archivePath,
    manifestPath,
    archiveName: basename(archivePath),
    manifest,
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputRoot = process.argv[2];
  if (outputRoot === undefined || process.argv.length !== 3) {
    process.stderr.write(
      "usage: node scripts/protected-judge-source-manifest.mjs <tmp-output-dir>\n",
    );
    process.exitCode = 1;
  } else {
    createProtectedJudgeSourceBundle(process.cwd(), outputRoot)
      .then(({ archivePath, manifestPath }) => {
        process.stdout.write(`${JSON.stringify({ archivePath, manifestPath })}\n`);
      })
      .catch(() => {
        process.stderr.write("protected judge source manifest failed\n");
        process.exitCode = 1;
      });
  }
}
