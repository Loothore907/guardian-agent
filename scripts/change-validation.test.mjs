import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  proseOnly,
  inspectChanges,
  validateDocuments,
  checkMarkdown,
} from "./change-validation.mjs";

test("CI entrypoint emits docs only after validation and fails missing base without an output", () =>
  repository(({ root, write, save, base }) => {
    write("docs/note.md", "[Home](../README.md)\n");
    save();
    const event = join(root, "event.json"),
      output = join(root, "output.txt");
    writeFileSync(event, JSON.stringify({ pull_request: { base: { sha: base } } }));
    writeFileSync(output, "");
    const options = {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GITHUB_EVENT_PATH: event, GITHUB_OUTPUT: output },
    };
    const script = fileURLToPath(new URL("./change-validation.mjs", import.meta.url));
    execFileSync(process.execPath, [script, "--ci", "--check"], options);
    assert.equal(readFileSync(output, "utf8"), "lane=docs\n");
    writeFileSync(event, JSON.stringify({ before: "0".repeat(40) }));
    writeFileSync(output, "");
    assert.throws(() => execFileSync(process.execPath, [script, "--ci", "--check"], options));
    assert.equal(readFileSync(output, "utf8"), "");
  }));

function repository(run) {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent, "guardian-routing-"));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const write = (path, text) => {
    mkdirSync(resolve(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const save = () => {
    git("add", "--all");
    git("commit", "-m", "test: fixture");
    return git("rev-parse", "HEAD");
  };
  try {
    git("init", "-b", "main");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.invalid");
    write("README.md", "# Fixture\n");
    write("source.ts", "export {};\n");
    run({ root, git, write, save, base: save() });
  } finally {
    assert.ok(resolve(root).startsWith(parent + sep + "guardian-routing-"));
    rmSync(root, { recursive: true, force: true });
  }
}

test("only prose qualifies; executable, authority, config and unknown paths use full", () => {
  for (const path of [
    "README.md",
    "docs/development/handoff.md",
    "docs/development/evidence/result.md",
  ])
    assert.equal(proseOnly(path), true, path);
  for (const path of [
    "AGENTS.md",
    "docs/AGENTS.md",
    "docs/private/note.md",
    "docs/security-claims.md",
    "docs/threat-model.md",
    "docs/adr/0001-decision.md",
    "docs/development/session-plan-next.md",
    "docs/development/development-loop.md",
    ".github/workflows/ci.yml",
    "docs/request.json",
    "docs/test.mjs",
    "apps/test.md",
    "docs/../README.md",
  ])
    assert.equal(proseOnly(path), false, path);
});
test("committed docs validate without dependencies; empty and mixed changes use full", () =>
  repository(({ root, write, save, base }) => {
    assert.equal(inspectChanges(root, base).lane, "full");
    write("docs/note.md", "[Home](../README.md)\n");
    save();
    const docs = inspectChanges(root, base);
    assert.equal(docs.lane, "docs");
    validateDocuments(root, docs);
    write("source.ts", "export const changed = true;\n");
    save();
    assert.equal(inspectChanges(root, base).lane, "full");
  }));
test("renaming code into docs cannot hide the deleted source", () =>
  repository(({ root, git, save, base }) => {
    git("mv", "source.ts", "source.md");
    save();
    assert.equal(inspectChanges(root, base).lane, "full");
  }));
test("a symlink disguised as markdown requires full validation", () =>
  repository(({ root, git, base }) => {
    const blob = git("rev-parse", "HEAD:README.md");
    git("update-index", "--add", "--cacheinfo", `120000,${blob},docs/link.md`);
    git("commit", "-m", "test: symlink");
    assert.equal(inspectChanges(root, base).lane, "full");
  }));
test("deleted docs are classified, and broken changed-document links fail", () =>
  repository(({ root, git, write, save, base }) => {
    git("rm", "README.md");
    write("docs/note.md", "[Missing](../README.md)\n");
    save();
    const report = inspectChanges(root, base);
    assert.equal(report.lane, "docs");
    assert.throws(() => validateDocuments(root, report), /missing_link_target/u);
  }));
test("malformed and missing comparison refs never select a successful docs lane", () =>
  repository(({ root, base }) => {
    for (const ref of ["--help", "missing", "HEAD;echo", ""])
      assert.throws(() => inspectChanges(root, ref));
    assert.throws(() => inspectChanges(root, base, "missing"));
  }));
test("checks reference and encoded links while ignoring fenced examples and external links", () => {
  const files = new Set(["README.md", "docs/a b.md"]);
  assert.deepEqual(
    checkMarkdown(
      "docs/note.md",
      "[Home](../README.md#title)\n[Space](<a%20b.md>)\n[web](https://example.invalid)\n```md\n[example](absent.md)\n```\n",
      files,
    ),
    [],
  );
  assert.match(
    checkMarkdown("docs/note.md", "[ref]: missing.md\n", files)[0],
    /missing_link_target/u,
  );
  for (const target of ["../../outside.md", "C:/private.md", "%GG"])
    assert.equal(checkMarkdown("docs/note.md", `[x](${target})`, files).length, 1);
});
