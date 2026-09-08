import { execFileSync } from "node:child_process";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_QUERY_CHARS = 120;
const MAX_RESULTS = 12;
const MAX_SNIPPET_CHARS = 360;
const MAX_CONTEXT_CHARS = 6_500;

const authoritySources = [
  ["AGENTS.md", "repository instructions"],
  ["docs/development/handoff.md", "current development state"],
  ["docs/security-claims.md", "public security claims"],
  ["docs/architecture.md", "architecture and trust boundaries"],
  ["docs/threat-model.md", "threat model"],
  ["docs/adr/README.md", "decision index"],
];

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gu,
  /\b(?:github_pat|gh[oprsu]|sk|xox[baprs])_[A-Za-z0-9_-]{12,}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/giu,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{12,}["']?/giu,
];

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

export function resolveRepoRoot(cwd = process.cwd()) {
  return git(cwd, "rev-parse", "--show-toplevel");
}

export function sanitizeText(value) {
  let text = String(value ?? "");
  for (const pattern of secretPatterns)
    text = text.replace(
      pattern,
      (match) => "[REDACTED_SECRET]" + "\n".repeat((match.match(/\n/gu) ?? []).length),
    );
  text = text.replace(
    /\b[A-Za-z]:\\Users\\[^\\\s]+\\(?:\.ssh|\.aws|\.config)\\[^\s`"']+/giu,
    "[REDACTED_LOCAL_PATH]",
  );
  text = text.replace(
    /\/home\/[^/\s]+\/(?:\.ssh|\.aws|\.config)\/[^\s`"']+/gu,
    "[REDACTED_LOCAL_PATH]",
  );
  return text;
}

export function validateQuery(raw, { allowPath = false } = {}) {
  const input = String(raw ?? "");
  if (input.length > MAX_QUERY_CHARS || /[\u0000-\u001f\u007f]/u.test(input))
    throw new Error("invalid_query");
  const query = input.trim();
  if (!query || query.length > MAX_QUERY_CHARS || /[\u0000-\u001f\u007f]/u.test(query))
    throw new Error("invalid_query");
  if (
    /[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(query) ||
    /^[A-Za-z]:[\\/]/u.test(query) ||
    query.startsWith("/") ||
    query.startsWith("\\")
  )
    throw new Error("external_or_absolute_query");
  if (query.startsWith("-") || /(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(query))
    throw new Error("escaping_query");
  if (
    secretPatterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(query);
    })
  )
    throw new Error("secret_like_query");
  if (/^[A-Za-z0-9+/]{64,}={0,2}$/u.test(query)) throw new Error("encoded_query");
  const allowed = allowPath
    ? /^[\p{L}\p{N} _./\\:@()[\]{}<>,+*?!'"-]+$/u
    : /^[\p{L}\p{N} _.:@()[\]{}<>,+*?!'"/-]+$/u;
  if (!allowed.test(query)) throw new Error("unsupported_query_characters");
  return query.replaceAll("\\", "/");
}

function sourceSnapshot(root) {
  const head = git(root, "rev-parse", "HEAD");
  const entries = execFileSync("git", ["ls-tree", "-rz", "--full-tree", head], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 2_000_000,
  });
  const sources = new Map();
  for (const entry of entries.split("\0").filter(Boolean)) {
    const match = /^(100644|100755) blob ([a-f0-9]{40,64})\t([^\0]+)$/u.exec(entry);
    if (!match) continue; // Never follow symlinks, gitlinks, or worktree paths.
    const [, , oid, path] = match;
    if (path.length > 240 || /[\u0000-\u001f\u007f\\]/u.test(path)) continue;
    sources.set(path, oid);
  }
  return { head, sources };
}

export function trackedFiles(root) {
  return [...sourceSnapshot(root).sources.keys()];
}

function readTracked(root, path, snapshot) {
  const oid = snapshot.sources.get(path);
  if (!oid) throw new Error("unavailable_source");
  try {
    const content = execFileSync("git", ["cat-file", "blob", oid], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1_048_576,
    });
    if (content.includes("\0")) throw new Error("binary_source");
    return sanitizeText(content);
  } catch {
    throw new Error("unavailable_source");
  }
}

function classifyAdr(content) {
  const status = /^- Status:\s*(Accepted|Proposed|Superseded|Rejected)\s*$/imu
    .exec(content)?.[1]
    ?.toLowerCase();
  return status ? `${status}-decision` : "decision";
}

export function classifyDocument(path, content = "") {
  if (path === "AGENTS.md") return "repository-authority";
  if (path === "docs/security-claims.md") return "claim-authority";
  if (path === "docs/development/handoff.md") return "current-handoff";
  if (path.startsWith("docs/adr/") && path !== "docs/adr/README.md") return classifyAdr(content);
  if (path.includes("/evidence/")) return "evidence";
  if (
    /handoff-history|session-(?:plan|closeout)|run-sheet|state-review|\/(?:19|20)\d\d-\d\d-\d\d/iu.test(
      path,
    )
  )
    return "historical-record";
  return "reference";
}

function markdownScope(files, scope) {
  if (scope === "claims") return files.filter((path) => path === "docs/security-claims.md");
  if (scope === "decisions")
    return files.filter(
      (path) =>
        path.startsWith("docs/adr/") && path.endsWith(".md") && path !== "docs/adr/README.md",
    );
  if (scope === "docs")
    return files.filter(
      (path) =>
        path.endsWith(".md") &&
        (path.startsWith("docs/") || path === "AGENTS.md" || path === "README.md"),
    );
  throw new Error("unsupported_scope");
}

function queryTokens(query) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}_-]+/u)
        .filter((token) => token.length > 1),
    ),
  ];
}

function matchScore(line, query, tokens) {
  const lower = line.toLowerCase();
  if (lower.includes(query.toLowerCase())) return 100 + query.length;
  const matched = tokens.filter((token) => lower.includes(token)).length;
  return matched === tokens.length && matched > 0 ? matched * 10 : 0;
}

function snippet(line) {
  const clean = sanitizeText(line.replace(/\s+/gu, " ").trim());
  return clean.length <= MAX_SNIPPET_CHARS ? clean : `${clean.slice(0, MAX_SNIPPET_CHARS - 1)}…`;
}

export function searchTrackedMarkdown(
  root,
  scope,
  rawQuery,
  { limit = MAX_RESULTS, snapshot = sourceSnapshot(root) } = {},
) {
  const query = validateQuery(rawQuery);
  const tokens = queryTokens(query);
  if (!tokens.length) throw new Error("invalid_query");
  const results = [];
  for (const path of markdownScope([...snapshot.sources.keys()], scope)) {
    const content = readTracked(root, path, snapshot);
    let fileMatches = 0;
    for (const [index, line] of content.split(/\r?\n/u).entries()) {
      const score = matchScore(line, query, tokens);
      if (!score || !line.trim() || fileMatches >= 3) continue;
      results.push({
        path,
        line: index + 1,
        classification: classifyDocument(path, content),
        score,
        snippet: snippet(line),
      });
      fileMatches += 1;
    }
  }
  return results
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || a.line - b.line)
    .slice(0, Math.max(1, Math.min(limit, MAX_RESULTS)));
}

function inspectGit(root, sourceHead) {
  const branch = git(root, "branch", "--show-current");
  const head = sourceHead ?? git(root, "rev-parse", "HEAD");
  const changed = git(root, "status", "--porcelain=v1", "--untracked-files=all")
    .split("\n")
    .filter(Boolean);
  let upstream = null;
  let ahead = null;
  let behind = null;
  try {
    upstream = git(root, "rev-parse", "--abbrev-ref", "@{upstream}");
    [ahead, behind] = git(root, "rev-list", "--left-right", "--count", "HEAD...@{upstream}")
      .split(/\s+/u)
      .map(Number);
  } catch {
    // Missing upstream is represented in the result rather than guessed.
  }
  return {
    branch,
    head,
    upstream,
    ahead,
    behind,
    changed: changed.slice(0, 12).map(snippet),
    changedCount: changed.length,
    sourceState: changed.length ? "working-tree" : "exact-head",
    contentSource: "HEAD regular-file Git blobs; staged and unstaged edits excluded",
  };
}

function sectionLines(markdown, heading, limit) {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start < 0) return [];
  const selected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/u.test(line)) break;
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    selected.push(snippet(clean));
    if (selected.length >= limit) break;
  }
  return selected;
}

function openingLines(markdown, limit) {
  return markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .slice(0, limit)
    .map(snippet);
}

export function buildCurrentContext(root = resolveRepoRoot(), snapshot = sourceSnapshot(root)) {
  const files = new Set(snapshot.sources.keys());
  const missing = authoritySources.map(([path]) => path).filter((path) => !files.has(path));
  if (missing.length) throw new Error("missing_authority_sources");
  const handoff = readTracked(root, "docs/development/handoff.md", snapshot);
  return {
    notice:
      "Advisory context only. Re-read exact sources before security claims, privileged operations, or integration decisions.",
    repository: inspectGit(root, snapshot.head),
    authoritySources: authoritySources.map(([path, purpose]) => ({ path, purpose })),
    handoff: {
      opening: openingLines(handoff, 6),
      startHere: sectionLines(handoff, "Start here", 6),
      productAndSecurity: sectionLines(handoff, "Product and security state", 6),
      cloudState: sectionLines(handoff, "Last recorded cloud state", 6),
    },
  };
}

function searchableCodeFiles(files) {
  return files.filter(
    (path) =>
      textExtensions.has(extname(path).toLowerCase()) &&
      path !== "pnpm-lock.yaml" &&
      !path.includes("/dist/") &&
      !path.includes("/coverage/"),
  );
}

export function impactReferences(
  root,
  rawTarget,
  { limit = MAX_RESULTS, snapshot = sourceSnapshot(root) } = {},
) {
  const target = validateQuery(rawTarget, { allowPath: true });
  const files = [...snapshot.sources.keys()];
  const canonical = files.find((path) => path.toLowerCase() === target.toLowerCase());
  const extension = canonical ? extname(canonical) : "";
  const stem = canonical ? basename(canonical, extension).toLowerCase() : "";
  const needles = canonical
    ? [
        canonical.toLowerCase(),
        basename(canonical).toLowerCase(),
        ...(extension === ".ts" || extension === ".tsx" ? [`${stem}.js`] : []),
      ]
    : [target.toLowerCase()];
  const results = [];
  for (const path of searchableCodeFiles(files)) {
    const content = readTracked(root, path, snapshot);
    let fileMatches = 0;
    for (const [index, line] of content.split(/\r?\n/u).entries()) {
      const lower = line.toLowerCase();
      if (!needles.some((needle) => lower.includes(needle)) || fileMatches >= 3) continue;
      results.push({
        path,
        line: index + 1,
        classification: classifyDocument(path, content),
        snippet: snippet(line),
      });
      fileMatches += 1;
    }
  }
  return {
    target,
    targetType: canonical ? "tracked-path" : "symbol-or-text",
    targetPath: canonical ?? null,
    method: "lexical references; verify runtime dependency direction with pnpm boundaries",
    references: results
      .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
      .slice(0, Math.max(1, Math.min(limit, MAX_RESULTS))),
  };
}

function formatCurrent(context) {
  const repo = context.repository;
  const lines = [
    "GUARDIAN CONTEXT ATLAS — ADVISORY, NOT AUTHORITY",
    context.notice,
    repo.contentSource,
    `Repository: ${repo.branch || "detached"} @ ${repo.head.slice(0, 12)} (${repo.sourceState}; upstream ${repo.upstream ?? "none"}; ahead ${repo.ahead ?? "unknown"}, behind ${repo.behind ?? "unknown"})`,
  ];
  if (repo.changed.length)
    lines.push(`Changed paths: ${repo.changed.slice(0, 12).map(snippet).join(" | ")}`);
  lines.push(
    "Authority order:",
    ...context.authoritySources.map((source) => `- ${source.path}: ${source.purpose}`),
  );
  for (const [label, values] of [
    ["Current handoff", context.handoff.opening],
    ["Start here", context.handoff.startHere],
    ["Product/security", context.handoff.productAndSecurity],
    ["Last recorded cloud state", context.handoff.cloudState],
  ]) {
    if (values.length) lines.push(`${label}:`, ...values.map((value) => `- ${value}`));
  }
  const output = sanitizeText(lines.join("\n"));
  return output.length <= MAX_CONTEXT_CHARS ? output : `${output.slice(0, MAX_CONTEXT_CHARS - 1)}…`;
}

function formatSearch(scope, query, results, repository) {
  const lines = [
    `Guardian ${scope} search: ${sanitizeText(query)}`,
    `Source: ${repository.head} (${repository.sourceState}); ${repository.contentSource}`,
  ];
  if (!results.length)
    lines.push(
      "No tracked-source matches. Do not infer absence of behavior or authority from this search alone.",
    );
  for (const result of results)
    lines.push(`- ${result.path}:${result.line} [${result.classification}] ${result.snippet}`);
  return lines.join("\n");
}

function parseArgs(args) {
  const json = args.includes("--json");
  const hook = args.includes("--hook");
  const positionals = args.filter((arg) => arg !== "--json" && arg !== "--hook");
  const [command = "current", ...rest] = positionals;
  if (args.some((arg) => arg.startsWith("--") && arg !== "--json" && arg !== "--hook"))
    throw new Error("invalid_arguments");
  return { command, query: rest.join(" "), json, hook };
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const { command, query, json, hook } = parseArgs(args);
  const root = resolveRepoRoot(cwd);
  if (command === "help" && !query && !hook && !json) {
    console.log(
      "Usage: node scripts/guardian-context.mjs <current|bootstrap|search-docs|claim|decision|impact> [query] [--json]",
    );
    return 0;
  }
  const snapshot = sourceSnapshot(root);
  if ((command === "current" || command === "bootstrap") && !query) {
    const context = buildCurrentContext(root, snapshot);
    if (hook) {
      if (command !== "bootstrap" || json) throw new Error("invalid_arguments");
      console.log(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "SessionStart",
            additionalContext: formatCurrent(context),
          },
        }),
      );
    } else
      console.log(json ? sanitizeText(JSON.stringify(context, null, 2)) : formatCurrent(context));
    return 0;
  }
  if (hook || !query) throw new Error("invalid_arguments");
  if (["search-docs", "claim", "decision"].includes(command)) {
    const scope = command === "claim" ? "claims" : command === "decision" ? "decisions" : "docs";
    const normalized = validateQuery(query);
    const results = searchTrackedMarkdown(root, scope, normalized, { snapshot });
    console.log(
      json
        ? sanitizeText(
            JSON.stringify(
              { repository: inspectGit(root, snapshot.head), scope, query: normalized, results },
              null,
              2,
            ),
          )
        : sanitizeText(formatSearch(scope, normalized, results, inspectGit(root, snapshot.head))),
    );
    return results.length ? 0 : 1;
  }
  if (command === "impact") {
    const result = impactReferences(root, query, { snapshot });
    console.log(
      json
        ? sanitizeText(
            JSON.stringify({ repository: inspectGit(root, snapshot.head), ...result }, null, 2),
          )
        : sanitizeText(
            formatSearch(
              "impact",
              result.target,
              result.references,
              inspectGit(root, snapshot.head),
            ),
          ),
    );
    return result.references.length ? 0 : 1;
  }
  throw new Error("invalid_arguments");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "context_unavailable",
      }),
    );
    process.exitCode = 2;
  }
}
