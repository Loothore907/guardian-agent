import { createHash } from "node:crypto";
import {
  chmod,
  constants,
  lstat,
  mkdir,
  open,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

import { canonicalDigest } from "@guardian/canonical";
import {
  OpaqueIdSchema,
  SessionWorkspaceLimitsSchema,
  SessionWorkspaceResultSchema,
  SessionWorkspaceSelectionSchema,
  boundedCredentialSafeText,
  type SessionWorkspaceLimits,
  type SessionWorkspaceResult,
  type SessionWorkspaceSelection,
} from "@guardian/contracts";

const DEFAULT_LIMITS = SessionWorkspaceLimitsSchema.parse({
  maxFiles: 4_096,
  maxBytes: 64 * 1_024 * 1_024,
  maxFileBytes: 4 * 1_024 * 1_024,
});
const MAXIMUM_GIT_OUTPUT_BYTES = 4 * 1_024 * 1_024;
const PREPARED_WORKSPACE = Symbol("guardian.prepared_workspace");

interface ManifestEntry {
  readonly path: string;
  readonly digest: string;
  readonly size: number;
  readonly executable: boolean;
}

export interface PreparedSessionWorkspace {
  readonly [PREPARED_WORKSPACE]: true;
  readonly sessionId: string;
  readonly hostPath: string;
  readonly result: SessionWorkspaceResult;
}

function canonicalHostPath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/\/$/u, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isWithin(candidate: string, root: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath))
  );
}

function safeGitEnvironment(storageRoot: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    HOME: storageRoot,
    LANG: "C.UTF-8",
  };
  for (const name of ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"] as const) {
    const value = process.env[name];
    if (value !== undefined) environment[name] = value;
  }
  return environment;
}

async function runGit(options: {
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environmentRoot: string;
  readonly maximumOutputBytes?: number;
}): Promise<Buffer> {
  const maximumOutputBytes = options.maximumOutputBytes ?? 64 * 1_024;
  return await new Promise<Buffer>((resolveOutput, rejectOutput) => {
    const child = spawn("git", options.arguments, {
      cwd: options.cwd,
      env: safeGitEnvironment(options.environmentRoot),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let errorBytes = 0;
    const timer = setTimeout(() => child.kill(), 15_000);
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > maximumOutputBytes) child.kill();
      else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errorBytes += chunk.byteLength;
      if (errorBytes > 4_096) child.kill();
    });
    child.once("error", () => rejectOutput(new TypeError("workspace Git operation failed")));
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || outputBytes > maximumOutputBytes || errorBytes > 4_096) {
        rejectOutput(new TypeError("workspace Git operation failed"));
        return;
      }
      resolveOutput(Buffer.concat(chunks, outputBytes));
    });
  });
}

function hasUnsupportedPathCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      character === ":" ||
      codePoint === undefined ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x200b && codePoint <= 0x200f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      codePoint === 0x2060 ||
      (codePoint >= 0x2066 && codePoint <= 0x2069) ||
      codePoint === 0xfeff
    );
  });
}

function validateRelativePath(value: string): string {
  if (
    value.length < 1 ||
    value.length > 512 ||
    value !== value.normalize("NFC") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    hasUnsupportedPathCharacter(value)
  ) {
    throw new TypeError("workspace source contains an unsupported path");
  }
  const segments = value.split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.length > 255 ||
        segment.endsWith(".") ||
        segment.endsWith(" ") ||
        /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment),
    )
  ) {
    throw new TypeError("workspace source path escapes its project root");
  }
  return value;
}

function hasSecretBearingPath(relativePath: string): boolean {
  const name = relativePath.split("/").at(-1)?.toLowerCase() ?? "";
  if (name === ".env.example" || name.endsWith(".example")) return false;
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    name === ".pypirc" ||
    name === ".git-credentials" ||
    name === "credentials" ||
    name === "id_rsa" ||
    name === "id_ed25519" ||
    name.endsWith(".pem") ||
    name.endsWith(".p12") ||
    name.endsWith(".pfx") ||
    name.endsWith(".key")
  );
}

function shannonEntropy(value: string): number {
  const frequencies = new Map<string, number>();
  for (const character of value) frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function containsHighConfidenceCredential(buffer: Buffer, relativePath: string): boolean {
  const text = buffer.toString("utf8");
  const name = relativePath.split("/").at(-1)?.toLowerCase() ?? "";
  if (
    (name === ".npmrc" &&
      /(?:^|\n)\s*(?:\/\/[^\s=]+:)?(?:_auth|_authToken|username|password|email|certfile|keyfile)\s*=/iu.test(
        text,
      )) ||
    /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/u.test(text) ||
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/u.test(text) ||
    /\bAKIA[A-Z0-9]{16}\b/u.test(text)
  ) {
    return true;
  }
  const assignments = text.matchAll(
    /\b(?:api[_-]?key|authorization|bearer|password|secret|token)\b\s*[:=]\s*["']?([A-Za-z0-9+/=_-]{24,})/giu,
  );
  return Array.from(assignments).some((match) => {
    const candidate = match[1];
    return candidate !== undefined && shannonEntropy(candidate) >= 4.2;
  });
}

function shouldInspectCredentialContent(relativePath: string): boolean {
  const normalized = relativePath.toLowerCase();
  return !(
    /(?:^|\/)__fixtures__(?:\/|$)/u.test(normalized) ||
    /(?:^|\/)[^/]+\.(?:test|spec)\.[^/]+$/u.test(normalized) ||
    normalized === "docs/development/evidence/c6-secret-corpus.md"
  );
}

async function assertNoSymlinkAncestor(sourceRoot: string, relativePath: string): Promise<void> {
  const segments = relativePath.split("/");
  let current = sourceRoot;
  for (const segment of segments.slice(0, -1)) {
    current = join(current, segment);
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new TypeError("workspace source contains a symlinked directory");
    }
  }
}

async function readManifestEntry(
  sourceRoot: string,
  relativePathValue: string,
  limits: SessionWorkspaceLimits,
): Promise<{ readonly entry: ManifestEntry; readonly content: Buffer }> {
  const relativePath = validateRelativePath(relativePathValue);
  if (hasSecretBearingPath(relativePath)) {
    throw new TypeError("workspace source contains a credential-bearing path");
  }
  await assertNoSymlinkAncestor(sourceRoot, relativePath);
  const sourcePath = resolve(sourceRoot, ...relativePath.split("/"));
  if (!isWithin(sourcePath, sourceRoot)) {
    throw new TypeError("workspace source path escapes its project root");
  }
  const metadata = await lstat(sourcePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new TypeError("workspace source contains an unsupported file type");
  }
  if (metadata.size > limits.maxFileBytes) {
    throw new TypeError("workspace source file exceeds the size limit");
  }
  const canonicalSourcePath = await realpath(sourcePath);
  if (!isWithin(canonicalSourcePath, sourceRoot)) {
    throw new TypeError("workspace source resolves outside its project root");
  }
  const handle = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let content: Buffer;
  try {
    const openedMetadata = await handle.stat();
    if (!openedMetadata.isFile() || openedMetadata.size !== metadata.size) {
      throw new TypeError("workspace source changed during inspection");
    }
    content = await handle.readFile();
  } finally {
    await handle.close();
  }
  if (
    shouldInspectCredentialContent(relativePath) &&
    containsHighConfidenceCredential(content, relativePath)
  ) {
    content.fill(0);
    throw new TypeError("workspace source contains credential-like material");
  }
  return {
    entry: {
      path: relativePath,
      digest: createHash("sha256").update(content).digest("hex"),
      size: content.byteLength,
      executable: (metadata.mode & 0o111) !== 0,
    },
    content,
  };
}

async function listGitVisiblePaths(
  sourceRoot: string,
  storageRoot: string,
  limits: SessionWorkspaceLimits,
): Promise<readonly string[]> {
  const exactSafeDirectory = `safe.directory=${sourceRoot.replaceAll("\\", "/")}`;
  const topLevel = (
    await runGit({
      arguments: ["-c", exactSafeDirectory, "rev-parse", "--show-toplevel"],
      cwd: sourceRoot,
      environmentRoot: storageRoot,
    })
  )
    .toString("utf8")
    .trim();
  if (canonicalHostPath(await realpath(topLevel)) !== canonicalHostPath(sourceRoot)) {
    throw new TypeError("workspace source must be the exact Git project root");
  }
  const output = await runGit({
    arguments: [
      "-c",
      exactSafeDirectory,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ".",
    ],
    cwd: sourceRoot,
    environmentRoot: storageRoot,
    maximumOutputBytes: MAXIMUM_GIT_OUTPUT_BYTES,
  });
  const paths = output
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0)
    .map(validateRelativePath)
    .filter((path) => !path.split("/").some((segment) => segment.toLowerCase() === ".guardian"))
    .sort((left, right) => left.localeCompare(right, "en"));
  if (paths.length > limits.maxFiles) throw new TypeError("workspace source has too many files");
  const caseFolded = paths.map((path) => path.toLowerCase());
  if (new Set(caseFolded).size !== paths.length) {
    throw new TypeError("workspace source contains case-colliding paths");
  }
  return paths;
}

async function initializeSanitizedGitRepository(workspacePath: string, storageRoot: string) {
  const commands = [
    ["init", "--quiet", "--initial-branch", "guardian-session", workspacePath],
    ["-C", workspacePath, "config", "--local", "core.autocrlf", "false"],
    ["-C", workspacePath, "config", "--local", "core.filemode", "false"],
    ["-C", workspacePath, "config", "--local", "credential.helper", ""],
    ["-C", workspacePath, "add", "--all"],
    [
      "-C",
      workspacePath,
      "-c",
      "user.name=Agentic Guardian",
      "-c",
      "user.email=guardian@invalid.local",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "--no-gpg-sign",
      "--allow-empty",
      "-m",
      "Guardian session baseline",
    ],
  ] as const;
  for (const arguments_ of commands) {
    await runGit({ arguments: arguments_, cwd: storageRoot, environmentRoot: storageRoot });
  }
}

export class ManagedSessionWorkspace {
  readonly selection: SessionWorkspaceSelection;
  readonly #sourceRoot: string;
  readonly #storageRoot: string;
  readonly #sessionRoot: string;
  readonly #workspacePath: string;
  readonly #sessionId: string;
  readonly #manifest: readonly ManifestEntry[];
  readonly #sourceIdentity: { readonly device: number; readonly inode: number };
  #prepared: PreparedSessionWorkspace | undefined;
  #closed = false;
  #ownsSessionRoot = false;

  private constructor(options: {
    readonly sourceRoot: string;
    readonly storageRoot: string;
    readonly sessionId: string;
    readonly selection: SessionWorkspaceSelection;
    readonly manifest: readonly ManifestEntry[];
    readonly sourceIdentity: { readonly device: number; readonly inode: number };
  }) {
    this.#sourceRoot = options.sourceRoot;
    this.#storageRoot = options.storageRoot;
    this.#sessionId = options.sessionId;
    this.#sessionRoot = resolve(options.storageRoot, options.sessionId);
    this.#workspacePath = resolve(this.#sessionRoot, "workspace");
    if (
      !isWithin(this.#sessionRoot, options.storageRoot) ||
      this.#sessionRoot === options.storageRoot
    ) {
      throw new TypeError("session workspace target escapes its storage root");
    }
    this.selection = options.selection;
    this.#manifest = options.manifest;
    this.#sourceIdentity = options.sourceIdentity;
  }

  static async plan(options: {
    readonly sourceRoot: unknown;
    readonly storageRoot: unknown;
    readonly sessionId: unknown;
    readonly limits?: unknown;
  }): Promise<ManagedSessionWorkspace> {
    if (typeof options.sourceRoot !== "string" || typeof options.storageRoot !== "string") {
      throw new TypeError("workspace source and storage roots are required");
    }
    const sessionId = OpaqueIdSchema.parse(options.sessionId);
    const limits = SessionWorkspaceLimitsSchema.parse(options.limits ?? DEFAULT_LIMITS);
    const unresolvedSource = resolve(options.sourceRoot);
    const unresolvedStorage = resolve(options.storageRoot);
    const sourceMetadata = await stat(unresolvedSource);
    if (!sourceMetadata.isDirectory()) throw new TypeError("workspace source must be a directory");
    await mkdir(unresolvedStorage, { recursive: true, mode: 0o700 });
    const sourceRoot = await realpath(unresolvedSource);
    const storageRoot = await realpath(unresolvedStorage);
    const sourceIdentityMetadata = await stat(sourceRoot);
    if (canonicalHostPath(sourceRoot) === canonicalHostPath(storageRoot)) {
      throw new TypeError("workspace storage cannot replace the source project");
    }
    const paths = await listGitVisiblePaths(sourceRoot, storageRoot, limits);
    const manifest: ManifestEntry[] = [];
    let totalBytes = 0;
    for (const relativePath of paths) {
      const inspected = await readManifestEntry(sourceRoot, relativePath, limits);
      totalBytes += inspected.entry.size;
      inspected.content.fill(0);
      if (totalBytes > limits.maxBytes)
        throw new TypeError("workspace source exceeds its byte limit");
      manifest.push(inspected.entry);
    }
    const projectName = boundedCredentialSafeText(120).parse(basename(sourceRoot));
    const sourceRootDigest = canonicalDigest("workspace.source_root", 1, {
      path: canonicalHostPath(sourceRoot),
    });
    const sourceSnapshotDigest = canonicalDigest("workspace.source_snapshot", 1, {
      entries: manifest,
    });
    const selection = SessionWorkspaceSelectionSchema.parse({
      schemaVersion: 1,
      kind: "guardian_managed_copy",
      projectName,
      sourceRootDigest,
      sourceSnapshotDigest,
      mountPath: "/workspace",
      persistence: "session",
      cleanup: "delete_on_close",
      hostWriteback: "none",
      limits,
    });
    return new ManagedSessionWorkspace({
      sourceRoot,
      storageRoot,
      sessionId,
      selection,
      manifest,
      sourceIdentity: {
        device: sourceIdentityMetadata.dev,
        inode: sourceIdentityMetadata.ino,
      },
    });
  }

  async prepare(): Promise<PreparedSessionWorkspace> {
    if (this.#closed) throw new TypeError("session workspace is closed");
    if (this.#prepared !== undefined) throw new TypeError("session workspace is already prepared");
    try {
      await mkdir(this.#sessionRoot, { recursive: false, mode: 0o700 });
      this.#ownsSessionRoot = true;
    } catch {
      throw new TypeError("session workspace target already exists or is unavailable");
    }
    try {
      const currentSourceIdentity = await stat(this.#sourceRoot);
      if (
        currentSourceIdentity.dev !== this.#sourceIdentity.device ||
        currentSourceIdentity.ino !== this.#sourceIdentity.inode
      ) {
        throw new TypeError("workspace source root changed after confirmation preview");
      }
      const currentPaths = await listGitVisiblePaths(
        this.#sourceRoot,
        this.#storageRoot,
        this.selection.limits,
      );
      if (
        currentPaths.length !== this.#manifest.length ||
        currentPaths.some((path, index) => path !== this.#manifest[index]?.path)
      ) {
        throw new TypeError("workspace source paths changed after confirmation preview");
      }
      await mkdir(this.#workspacePath, { recursive: false, mode: 0o700 });
      let totalBytes = 0;
      for (const expected of this.#manifest) {
        const inspected = await readManifestEntry(
          this.#sourceRoot,
          expected.path,
          this.selection.limits,
        );
        try {
          if (
            inspected.entry.digest !== expected.digest ||
            inspected.entry.size !== expected.size ||
            inspected.entry.executable !== expected.executable
          ) {
            throw new TypeError("workspace source changed after confirmation preview");
          }
          const destination = resolve(this.#workspacePath, ...expected.path.split("/"));
          if (!isWithin(destination, this.#workspacePath)) {
            throw new TypeError("workspace destination escapes its session root");
          }
          await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
          await writeFile(destination, inspected.content, {
            flag: "wx",
            mode: expected.executable ? 0o755 : 0o644,
          });
          totalBytes += inspected.entry.size;
        } finally {
          inspected.content.fill(0);
        }
      }
      await initializeSanitizedGitRepository(this.#workspacePath, this.#storageRoot);
      if (process.platform !== "win32") await chmod(this.#sessionRoot, 0o700);
      const result = SessionWorkspaceResultSchema.parse({
        schemaVersion: 1,
        state: "ready",
        selection: this.selection,
        fileCount: this.#manifest.length,
        totalBytes,
        baseline: "sanitized_git_repository",
      });
      this.#prepared = Object.freeze({
        [PREPARED_WORKSPACE]: true as const,
        sessionId: this.#sessionId,
        hostPath: this.#workspacePath,
        result,
      });
      return this.#prepared;
    } catch (error) {
      await rm(this.#sessionRoot, { recursive: true, force: true });
      this.#ownsSessionRoot = false;
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#ownsSessionRoot) {
      await rm(this.#sessionRoot, { recursive: true, force: true });
      this.#ownsSessionRoot = false;
    }
    this.#prepared = undefined;
  }
}

export function assertPreparedSessionWorkspace(value: unknown): PreparedSessionWorkspace {
  if (
    typeof value !== "object" ||
    value === null ||
    !(PREPARED_WORKSPACE in value) ||
    (value as Partial<PreparedSessionWorkspace>)[PREPARED_WORKSPACE] !== true
  ) {
    throw new TypeError("trusted prepared session workspace is required");
  }
  return value as PreparedSessionWorkspace;
}
