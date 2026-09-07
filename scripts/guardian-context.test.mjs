import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
