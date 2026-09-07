import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { ProtectedJudgeSourceManifestSchema } from "../packages/contracts/dist/index.js";

const execFileAsync = promisify(execFile);
const MAX_FILES = 4_096;
const MAX_BYTES = 64 * 1_024 * 1_024;
const MAX_FILE_BYTES = 4 * 1_024 * 1_024;

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sha256Buffer(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function immutableEntries(repositoryRoot, gitCommit, archivePath, inspectionRoot) {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "--full-tree", "--long", "-z", gitCommit],
    { cwd: repositoryRoot, encoding: null, maxBuffer: 4 * 1_024 * 1_024, windowsHide: true },
  );
  const records = Buffer.from(stdout)
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  if (records.length < 1 || records.length > MAX_FILES) {
    throw new TypeError("protected judge source file count is invalid");
  }
  const objects = records.map((record) => {
    const parsed = /^(100644|100755) blob ([0-9a-f]{40}) +([0-9]+)\t(.+)$/u.exec(record);
    if (parsed === null) throw new TypeError("protected judge source contains unsupported entries");
    const [, mode, objectId, sizeText, path] = parsed;
    const size = Number(sizeText);
    if (
      objectId === undefined ||
      path === undefined ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > MAX_FILE_BYTES
    ) {
      throw new TypeError("protected judge source entry is invalid");
    }
    return { mode, objectId, path, size };
  });
  if (objects.reduce((total, entry) => total + entry.size, 0) > MAX_BYTES) {
    throw new TypeError("protected judge source exceeds its byte limit");
  }
  await mkdir(inspectionRoot);
  await execFileAsync("tar", ["-xf", archivePath, "-C", inspectionRoot], {
    cwd: repositoryRoot,
    windowsHide: true,
  });
  const entries = new Array(objects.length);
  let next = 0;
  try {
    await Promise.all(
      Array.from({ length: Math.min(8, objects.length) }, async () => {
        while (next < objects.length) {
          const index = next++;
          const object = objects[index];
          const extractedPath = join(inspectionRoot, ...object.path.split("/"));
          const metadata = await lstat(extractedPath);
          if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_FILE_BYTES) {
            throw new TypeError("protected judge archive contains unsupported entries");
          }
          const content = await readFile(extractedPath);
          try {
            entries[index] = {
              path: object.path,
              digest: sha256Buffer(content),
              size: content.byteLength,
              executable: object.mode === "100755",
            };
          } finally {
            content.fill(0);
          }
        }
      }),
    );
  } finally {
    await rm(inspectionRoot, { recursive: true, force: true });
  }
  if (entries.reduce((total, entry) => total + entry.size, 0) > MAX_BYTES) {
    throw new TypeError("protected judge archive exceeds its byte limit");
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
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
  const packageResult = await execFileAsync("git", ["cat-file", "blob", `${gitCommit}:package.json`], {
    cwd: repositoryRoot,
    encoding: null,
    maxBuffer: 64 * 1_024,
    windowsHide: true,
  });
  const packageContent = Buffer.from(packageResult.stdout);
  let pnpmVersion;
  try {
    const packageManifest = JSON.parse(packageContent.toString("utf8"));
    pnpmVersion = /^pnpm@(.+)$/u.exec(packageManifest.packageManager)?.[1];
  } finally {
    packageContent.fill(0);
  }
  const entries = await immutableEntries(
    repositoryRoot,
    gitCommit,
    archivePath,
    join(outputRoot, ".source-inspection"),
  );
  const lockfile = entries.find((entry) => entry.path === "pnpm-lock.yaml");
  if (lockfile === undefined) throw new TypeError("protected judge source lockfile is missing");
  const manifest = ProtectedJudgeSourceManifestSchema.parse({
    schemaVersion: 1,
    kind: "immutable_file_manifest",
    executionMode: "disabled",
    gitCommit,
    lockfileSha256: lockfile.digest,
    sourceArchiveSha256: await sha256(archivePath),
    entries,
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
