import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Deliberately exclude executable fixtures, configuration and authority documents.
const authority =
  /^(?:docs\/adr\/|docs\/(?:security-claims|threat-model|architecture)\.md$|docs\/development\/(?:global-session-rules|session-git-hygiene|development-loop)\.md$|docs\/development\/session-plan[^/]*\.md$)/u;
export function proseOnly(path) {
  return (
    !authority.test(path) &&
    (path === "README.md" || /^docs\/(?!private\/)[a-zA-Z0-9_./-]+\.md$/u.test(path)) &&
    !path.split("/").includes("..") &&
    !/(?:^|\/)AGENTS\.md$/u.test(path)
  );
}

const git = (cwd, ...args) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
function commit(cwd, ref) {
  if (!/^[a-zA-Z0-9_./-]+$/u.test(ref) || ref.startsWith("-")) throw new Error("invalid_revision");
  return git(cwd, "rev-parse", "--verify", `${ref}^{commit}`).trim();
}
export function inspectChanges(cwd, base, head = "HEAD") {
  base = commit(cwd, base);
  head = commit(cwd, head);
  const fields = git(cwd, "diff", "--raw", "-z", "--no-renames", base, head, "--").split("\0");
  const changes = [];
  for (let i = 0; i < fields.length - 1; i += 2) {
    const match = /^:(\d{6}) (\d{6}) [a-f0-9]+ [a-f0-9]+ ([AMD T])$/u.exec(fields[i]);
    if (!match || !fields[i + 1]) throw new Error("unsupported_diff");
    changes.push({ path: fields[i + 1], oldMode: match[1], newMode: match[2], status: match[3] });
  }
  const lane =
    changes.length > 0 &&
    changes.every(
      (c) =>
        proseOnly(c.path) &&
        [c.oldMode, c.newMode].every((mode) => mode === "100644" || mode === "000000"),
    )
      ? "docs"
      : "full";
  return { base, head, lane, changes };
}

export function checkMarkdown(path, text, tracked) {
  const errors = [];
  if (text.includes("\0") || Buffer.byteLength(text) > 512 * 1024)
    return [`${path}: invalid_or_oversized_document`];
  // Ignore examples inside fenced code. Check inline and reference-style targets.
  const prose = text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gmu, "");
  const targets = [
    ...prose.matchAll(/\[[^\]\n]*\]\((<[^>\n]+>|[^\s)]+)(?:\s+["'][^\n]*["'])?\)/gu),
  ].map((m) => m[1]);
  targets.push(...[...prose.matchAll(/^\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)/gmu)].map((m) => m[1]));
  for (let target of targets) {
    target = target.replace(/^<|>$/gu, "");
    if (/^(?:https?:|mailto:|app:|codex:|#)/iu.test(target)) continue;
    try {
      target = decodeURIComponent(target.split(/[?#]/u)[0]);
    } catch {
      errors.push(`${path}: invalid_link_encoding`);
      continue;
    }
    if (!target) continue;
    const resolved = posix.normalize(posix.join(posix.dirname(path), target));
    if (
      /^(?:\/|[a-z]:|\\)/iu.test(target) ||
      resolved === ".." ||
      resolved.startsWith("../") ||
      target.includes("\\")
    ) {
      errors.push(`${path}: link_outside_repository`);
      continue;
    }
    if (!tracked.has(resolved) && ![...tracked].some((p) => p.startsWith(`${resolved}/`)))
      errors.push(`${path}: missing_link_target ${resolved}`);
  }
  return errors;
}

export function validateDocuments(cwd, report) {
  git(cwd, "diff", "--check", report.base, report.head, "--");
  const tracked = new Set(
    git(cwd, "ls-tree", "-r", "--name-only", "-z", report.head).split("\0").filter(Boolean),
  );
  const errors = [];
  for (const change of report.changes) {
    if (change.status === "D" || !proseOnly(change.path) || change.newMode !== "100644") continue;
    const text = git(cwd, "show", `${report.head}:${change.path}`);
    errors.push(...checkMarkdown(change.path, text, tracked));
  }
  if (errors.length) throw new Error(errors.join("\n"));
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  let base,
    head = "HEAD",
    check = false,
    ci = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === "--base") base = args.shift();
    else if (arg === "--head") head = args.shift();
    else if (arg === "--check") check = true;
    else if (arg === "--ci") ci = true;
    else throw new Error("invalid_arguments");
  }
  if (ci) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    base = event.pull_request?.base?.sha ?? event.before;
    if (!/^[a-f0-9]{40}$/u.test(base ?? "") || /^0+$/u.test(base))
      throw new Error("comparison_base_unavailable");
  }
  if (!base || !head) throw new Error("comparison_base_required");
  const report = inspectChanges(cwd, base, head);
  if (check) validateDocuments(cwd, report);
  console.log(JSON.stringify(report, null, 2));
  if (ci && process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `lane=${report.lane}\n`);
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
