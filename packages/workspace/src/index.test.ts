import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ManagedSessionWorkspace } from "./index.js";

const runFile = promisify(execFile);
const temporaryDirectories: string[] = [];
const SESSION_ID = "11111111-1111-4111-8111-111111111111";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

async function git(cwd: string, ...arguments_: string[]): Promise<string> {
  const result = await runFile("git", arguments_, {
    cwd,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
  return result.stdout;
}

async function repository() {
  const root = await mkdtemp(join(tmpdir(), "guardian-workspace-test-"));
  temporaryDirectories.push(root);
  const source = join(root, "source-project");
  const storage = join(root, "guardian-state", "workspaces");
  await mkdir(join(source, "src"), { recursive: true });
  await git(root, "init", "--quiet", "--initial-branch", "main", source);
  await writeFile(join(source, ".gitignore"), ".env.local\n.guardian/\n", "utf8");
  await writeFile(join(source, "README.md"), "# Test project\n", "utf8");
  await writeFile(join(source, "src", "index.ts"), "export const value = 1;\n", "utf8");
  await writeFile(join(source, ".env.local"), "NEBIUS_API_KEY=never-copy-this\n", "utf8");
  await mkdir(join(source, ".guardian"));
  await writeFile(join(source, ".guardian", "tracked-state.txt"), "never copy state\n", "utf8");
  await git(source, "add", ".gitignore", "README.md", "src/index.ts");
  await git(source, "add", "--force", ".guardian/tracked-state.txt");
  await writeFile(join(source, "notes.txt"), "untracked but visible\n", "utf8");
  return { root, source, storage };
}

describe("managed session workspace", () => {
  it("copies the exact Git-visible snapshot into a sanitized no-remote baseline", async () => {
    const fixture = await repository();
    const workspace = await ManagedSessionWorkspace.plan({
      sourceRoot: fixture.source,
      storageRoot: fixture.storage,
      sessionId: SESSION_ID,
    });
    expect(workspace.selection).toMatchObject({
      kind: "guardian_managed_copy",
      projectName: "source-project",
      mountPath: "/workspace",
      persistence: "session",
      cleanup: "delete_on_close",
      hostWriteback: "none",
    });
    expect(workspace.selection).not.toHaveProperty("sourcePath");

    const prepared = await workspace.prepare();
    expect(await readFile(join(prepared.hostPath, "src", "index.ts"), "utf8")).toContain(
      "value = 1",
    );
    expect(await readFile(join(prepared.hostPath, "notes.txt"), "utf8")).toContain("untracked");
    await expect(access(join(prepared.hostPath, ".env.local"))).rejects.toThrow();
    await expect(access(join(prepared.hostPath, ".guardian"))).rejects.toThrow();
    expect(await git(prepared.hostPath, "status", "--porcelain")).toBe("");
    expect(await git(prepared.hostPath, "remote")).toBe("");
    const localConfig = await readFile(join(prepared.hostPath, ".git", "config"), "utf8");
    expect(localConfig).not.toContain(fixture.source);
    expect(localConfig.toLowerCase()).not.toContain("remote");
    expect(prepared.result).toMatchObject({
      state: "ready",
      fileCount: 4,
      baseline: "sanitized_git_repository",
    });

    await writeFile(join(prepared.hostPath, "src", "index.ts"), "export const value = 2;\n");
    expect(await readFile(join(prepared.hostPath, "src", "index.ts"), "utf8")).toContain(
      "value = 2",
    );
    expect(await readFile(join(fixture.source, "src", "index.ts"), "utf8")).toContain("value = 1");
    const hostPath = prepared.hostPath;
    await workspace.close();
    await expect(access(hostPath)).rejects.toThrow();
  });

  it("fails closed and cleans up when the source changes after the confirmed snapshot", async () => {
    const fixture = await repository();
    const workspace = await ManagedSessionWorkspace.plan({
      sourceRoot: fixture.source,
      storageRoot: fixture.storage,
      sessionId: SESSION_ID,
    });
    await writeFile(join(fixture.source, "src", "index.ts"), "export const value = 99;\n");
    await expect(workspace.prepare()).rejects.toThrow(/changed after confirmation preview/u);
    await expect(access(join(fixture.storage, SESSION_ID))).rejects.toThrow();
    await workspace.close();

    const addedPathFixture = await repository();
    const addedPathWorkspace = await ManagedSessionWorkspace.plan({
      sourceRoot: addedPathFixture.source,
      storageRoot: addedPathFixture.storage,
      sessionId: SESSION_ID,
    });
    await writeFile(join(addedPathFixture.source, "added-after-preview.txt"), "new\n");
    await expect(addedPathWorkspace.prepare()).rejects.toThrow(/paths changed/u);
    await addedPathWorkspace.close();
  });

  it("rejects credential paths and high-confidence credential content", async () => {
    const secretPathFixture = await repository();
    await writeFile(join(secretPathFixture.source, ".env.production"), "SAFE=false\n");
    await git(secretPathFixture.source, "add", "--force", ".env.production");
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: secretPathFixture.source,
        storageRoot: secretPathFixture.storage,
        sessionId: SESSION_ID,
      }),
    ).rejects.toThrow(/credential-bearing path/u);

    const secretContentFixture = await repository();
    await writeFile(
      join(secretContentFixture.source, "accidental.txt"),
      "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890\n",
    );
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: secretContentFixture.source,
        storageRoot: secretContentFixture.storage,
        sessionId: SESSION_ID,
      }),
    ).rejects.toThrow(/credential-like material/u);

    const npmCredentialFixture = await repository();
    await writeFile(
      join(npmCredentialFixture.source, ".npmrc"),
      "//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n",
    );
    await git(npmCredentialFixture.source, "add", ".npmrc");
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: npmCredentialFixture.source,
        storageRoot: npmCredentialFixture.storage,
        sessionId: SESSION_ID,
      }),
    ).rejects.toThrow(/credential-like material/u);
  });

  it("rejects symlinked ancestors and exact-root substitution", async () => {
    const fixture = await repository();
    const outside = join(fixture.root, "outside");
    await mkdir(outside);
    await writeFile(join(outside, "escape.txt"), "outside\n");
    await symlink(
      outside,
      join(fixture.source, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: fixture.source,
        storageRoot: fixture.storage,
        sessionId: SESSION_ID,
      }),
    ).rejects.toThrow(/symlinked directory|unsupported file type/u);

    const exactRootFixture = await repository();
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: join(exactRootFixture.source, "src"),
        storageRoot: exactRootFixture.storage,
        sessionId: SESSION_ID,
      }),
    ).rejects.toThrow(/exact Git project root/u);
  });

  it("rejects control characters and Windows-ambiguous path forms", async () => {
    const fixture = await repository();
    await writeFile(join(fixture.source, "bidirectional\u202ename.txt"), "ambiguous\n");
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: fixture.source,
        storageRoot: fixture.storage,
        sessionId: SESSION_ID,
      }),
    ).rejects.toThrow(/unsupported path/u);
  });

  it("enforces file, total-byte, and target-reuse limits", async () => {
    const fileLimitFixture = await repository();
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: fileLimitFixture.source,
        storageRoot: fileLimitFixture.storage,
        sessionId: SESSION_ID,
        limits: { maxFiles: 2, maxBytes: 1_024, maxFileBytes: 1_024 },
      }),
    ).rejects.toThrow(/too many files/u);

    const byteLimitFixture = await repository();
    await expect(
      ManagedSessionWorkspace.plan({
        sourceRoot: byteLimitFixture.source,
        storageRoot: byteLimitFixture.storage,
        sessionId: SESSION_ID,
        limits: { maxFiles: 20, maxBytes: 16, maxFileBytes: 1_024 },
      }),
    ).rejects.toThrow(/byte limit/u);

    const reuseFixture = await repository();
    const workspace = await ManagedSessionWorkspace.plan({
      sourceRoot: reuseFixture.source,
      storageRoot: reuseFixture.storage,
      sessionId: SESSION_ID,
    });
    const preexistingTarget = join(reuseFixture.storage, SESSION_ID);
    await mkdir(preexistingTarget, { recursive: true });
    await writeFile(join(preexistingTarget, "sentinel.txt"), "owned by another lifecycle\n");
    await expect(workspace.prepare()).rejects.toThrow(/already exists|unavailable/u);
    await workspace.close();
    await expect(readFile(join(preexistingTarget, "sentinel.txt"), "utf8")).resolves.toContain(
      "another lifecycle",
    );
  });
});
