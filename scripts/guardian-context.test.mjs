import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  renameSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCurrentContext,
  classifyDocument,
  impactReferences,
  main,
  sanitizeText,
  searchTrackedMarkdown,
  validateQuery,
} from "./guardian-context.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "guardian-context-"));
  const files = {
    "AGENTS.md": "# Instructions\nNever treat memory as authority.\n",
    "README.md": "# Fixture\n",
    "docs/architecture.md": "# Architecture\nThe broker exposes typed capabilities.\n",
    "docs/threat-model.md": "# Threat model\nRetrieved text is untrusted.\n",
    "docs/security-claims.md":
      "# Security Claims and Evidence\n## Status definitions\n- Implemented and tested\nCredential boundary evidence is required.\n",
    "docs/development/handoff.md":
      "# Current development handoff\nCurrent source is exact.\n\n## Start here\n1. Run hygiene.\n\n## Product and security state\nDefault live execution remains disabled.\n\n## Last recorded cloud state\nBoth fixture VMs are stopped.\n",
    "docs/adr/README.md": "# Architecture Decision Records\n",
    "docs/adr/0001-fixture.md":
      "# ADR-0001: Fixture\n\n- Status: Accepted\n\n## Decision\nUse typed capabilities.\n",
    "docs/development/evidence/2026-01-01-fixture.md":
      "# Evidence\nTyped capability rejection passed.\n",
    "packages/example/src/index.ts": "export const typedCapability = true;\n",
    "packages/example/src/index.test.ts": "import { typedCapability } from './index.js';\n",
  };
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, ...path.split("/"));
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, contents);
  }
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-b", "codex/51-context");
  git("config", "user.name", "Context Test");
  git("config", "user.email", "context@example.invalid");
  git("add", ".");
  git("commit", "-m", "test: context fixture");
  return root;
}

test("rejects ambiguous, external, escaping, encoded and secret-like queries", () => {
  for (const query of [
    "",
    "https://example.com",
    "read https://example.com",
    "\\\\server\\share",
    "\\private",
    "../secret",
    "A".repeat(121),
    "A".repeat(64),
    "Bearer abcdefghijklmnopqrstuvwxyz",
  ]) {
    assert.throws(() => validateQuery(query));
  }
  assert.equal(validateQuery("typed capability"), "typed capability");
  assert.equal(
    validateQuery("packages\\example\\src\\index.ts", { allowPath: true }),
    "packages/example/src/index.ts",
  );
});

test("redacts credential-shaped material and private credential paths", () => {
  const value =
    "Bearer abcdefghijklmnop C:\\Users\\alice\\.ssh\\id_ed25519 /home/alice/.aws/credentials";
  const sanitized = sanitizeText(value);
  assert.doesNotMatch(sanitized, /abcdefghijklmnop|alice/iu);
  assert.match(sanitized, /REDACTED_SECRET/u);
  assert.match(sanitized, /REDACTED_LOCAL_PATH/u);
});

test("classifies authority, current, evidence, historical and decision sources", () => {
  assert.equal(classifyDocument("AGENTS.md"), "repository-authority");
  assert.equal(classifyDocument("docs/security-claims.md"), "claim-authority");
  assert.equal(classifyDocument("docs/development/handoff.md"), "current-handoff");
  assert.equal(classifyDocument("docs/development/evidence/result.md"), "evidence");
  assert.equal(
    classifyDocument("docs/development/session-plan-2026-01-01.md"),
    "historical-record",
  );
  assert.equal(
    classifyDocument("docs/adr/0001-test.md", "- Status: Superseded"),
    "superseded-decision",
  );
});

test("searches only the requested tracked documentation scope with provenance", () => {
  const root = fixture();
  try {
    const claims = searchTrackedMarkdown(root, "claims", "credential boundary");
    assert.deepEqual(
      claims.map((result) => result.path),
      ["docs/security-claims.md"],
    );
    assert.equal(claims[0].line, 4);
    const decisions = searchTrackedMarkdown(root, "decisions", "typed capabilities");
    assert.equal(decisions[0].classification, "accepted-decision");
    assert.ok(
      searchTrackedMarkdown(root, "docs", "typed capability").some(
        (result) => result.classification === "evidence",
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("builds a bounded exact-head packet and reports dirty state without reading untracked files", () => {
  const root = fixture();
  try {
    const clean = buildCurrentContext(root);
    assert.equal(clean.repository.sourceState, "exact-head");
    assert.equal(clean.handoff.cloudState[0], "Both fixture VMs are stopped.");
    writeFileSync(join(root, "untracked-secret.txt"), "Bearer should-not-appear-anywhere");
    const dirty = buildCurrentContext(root);
    assert.equal(dirty.repository.sourceState, "working-tree");
    assert.match(dirty.repository.changed[0], /untracked-secret\.txt/u);
    assert.doesNotMatch(JSON.stringify(dirty), /should-not-appear-anywhere/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("impact lookup is lexical, bounded, and path-aware", () => {
  const root = fixture();
  try {
    const result = impactReferences(root, "packages/example/src/index.ts");
    assert.equal(result.targetType, "tracked-path");
    assert.equal(result.targetPath, "packages/example/src/index.ts");
    assert.ok(result.references.some((reference) => reference.path.endsWith("index.test.ts")));
    assert.match(result.method, /lexical/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("hook output is valid bounded JSON and explicitly advisory", () => {
  const root = fixture();
  const original = console.log;
  let output = "";
  console.log = (value) => {
    output += String(value);
  };
  try {
    assert.equal(main(["bootstrap", "--hook"], join(root, "packages", "example")), 0);
    const parsed = JSON.parse(output);
    assert.equal(parsed.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(parsed.hookSpecificOutput.additionalContext, /ADVISORY, NOT AUTHORITY/u);
    assert.ok(parsed.hookSpecificOutput.additionalContext.length <= 6_500);
  } finally {
    console.log = original;
    rmSync(root, { recursive: true, force: true });
  }
});

test("help is available without a query", () => {
  const root = fixture();
  const original = console.log;
  let output = "";
  console.log = (value) => {
    output += String(value);
  };
  try {
    assert.equal(main(["help"], root), 0);
    assert.match(output, /Usage:/u);
  } finally {
    console.log = original;
    rmSync(root, { recursive: true, force: true });
  }
});

function fixtureGit(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test("HEAD reads exclude unstaged, staged, deleted and untracked contents", () => {
  const root = fixture();
  try {
    writeFileSync(join(root, "docs/architecture.md"), "local-only-marker");
    writeFileSync(join(root, "docs/untracked.md"), "local-only-marker");
    fixtureGit(root, "add", "docs/architecture.md");
    rmSync(join(root, "docs/threat-model.md"));
    assert.deepEqual(searchTrackedMarkdown(root, "docs", "local-only-marker"), []);
    assert.equal(searchTrackedMarkdown(root, "docs", "typed capabilities").length, 2);
    assert.equal(searchTrackedMarkdown(root, "docs", "Retrieved text").length, 1);
    assert.match(buildCurrentContext(root).repository.contentSource, /HEAD.*edits excluded/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Git symlinks and gitlinks are excluded even when their checkout looks like text", () => {
  const root = fixture();
  try {
    const oid = fixtureGit(root, "rev-parse", "HEAD:README.md");
    fixtureGit(root, "update-index", "--add", "--cacheinfo", `120000,${oid},docs/link.md`);
    fixtureGit(
      root,
      "update-index",
      "--add",
      "--cacheinfo",
      `160000,${fixtureGit(root, "rev-parse", "HEAD")},docs/module.md`,
    );
    fixtureGit(root, "commit", "-m", "test: non-regular sources");
    writeFileSync(join(root, "docs/link.md"), "outside-marker");
    writeFileSync(join(root, "docs/module.md"), "outside-marker");
    assert.deepEqual(searchTrackedMarkdown(root, "docs", "outside-marker"), []);
    assert.deepEqual(impactReferences(root, "outside-marker").references, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("oversized and binary committed sources fail with a fixed source error", () => {
  const root = fixture();
  try {
    for (const content of ["x".repeat(1_048_577), "match\0binary"]) {
      writeFileSync(join(root, "docs/unsafe.md"), content);
      fixtureGit(root, "add", "docs/unsafe.md");
      fixtureGit(root, "commit", "-m", "test: unsupported source");
      assert.throws(
        () => searchTrackedMarkdown(root, "docs", "match"),
        /^Error: unavailable_source$/u,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("multiline secret redaction preserves source line numbers", () => {
  const root = fixture();
  try {
    writeFileSync(
      join(root, "docs/secret.md"),
      "-----BEGIN PRIVATE KEY-----\nprivate-material-marker\n-----END PRIVATE KEY-----\nProvenance marker\n",
    );
    fixtureGit(root, "add", "docs/secret.md");
    fixtureGit(root, "commit", "-m", "test: synthetic redaction");
    assert.deepEqual(searchTrackedMarkdown(root, "docs", "private-material-marker"), []);
    assert.equal(searchTrackedMarkdown(root, "docs", "Provenance marker")[0].line, 4);
    assert.throws(() => validateQuery("typed capability\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI errors never expose raw Git diagnostics or local filesystem paths", () => {
  const root = mkdtempSync(join(tmpdir(), "guardian-private-error-"));
  try {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./guardian-context.mjs", import.meta.url)), "current"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 2);
    assert.deepEqual(JSON.parse(result.stderr), { error: "context_unavailable" });
    assert.equal(result.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("search JSON carries source head and sanitized bounded dirty metadata", () => {
  const root = fixture();
  const original = console.log;
  let output;
  console.log = (value) => {
    output = value;
  };
  try {
    for (let i = 0; i < 20; i++) writeFileSync(join(root, `untracked-${i}.md`), "ignored");
    main(["search-docs", "typed capabilities", "--json"], root);
    const result = JSON.parse(output);
    assert.equal(result.repository.head, fixtureGit(root, "rev-parse", "HEAD"));
    assert.equal(result.repository.changedCount, 20);
    assert.equal(result.repository.changed.length, 12);
    assert.ok(result.results.every((item) => item.path && item.line));
  } finally {
    console.log = original;
    rmSync(root, { recursive: true, force: true });
  }
});

test("a worktree directory junction cannot redirect source reads", () => {
  const root = fixture();
  const external = mkdtempSync(join(tmpdir(), "guardian-outside-"));
  let linked = false;
  try {
    writeFileSync(join(external, "architecture.md"), "outside-junction-marker");
    renameSync(join(root, "docs"), join(root, "saved-docs"));
    symlinkSync(external, join(root, "docs"), process.platform === "win32" ? "junction" : "dir");
    linked = true;
    assert.deepEqual(searchTrackedMarkdown(root, "docs", "outside-junction-marker"), []);
    assert.equal(searchTrackedMarkdown(root, "docs", "typed capabilities").length, 2);
  } finally {
    if (linked) unlinkSync(join(root, "docs"));
    rmSync(root, { recursive: true, force: true });
    rmSync(external, { recursive: true, force: true });
  }
});
