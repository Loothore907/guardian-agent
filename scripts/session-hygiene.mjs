import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const conventional = /^(feat|fix|docs|test|chore|refactor|perf|build|ci|revert)(\([a-z0-9_-]+\))?!?: .+/u;
const branchPattern = /^(codex|feat|fix|docs|chore|security)\/([1-9][0-9]*)-[a-z0-9][a-z0-9-]*$/u;

export function validatePullRequest(pr) {
  const errors = [];
  if (!pr || typeof pr !== "object") return ["missing_pull_request"];
  if (!conventional.test(pr.title ?? "")) errors.push("nonconventional_title");
  const branch = branchPattern.exec(pr.head?.ref ?? pr.headRefName ?? "");
  if (!branch) errors.push("missing_issue_branch");
  const references = [...(pr.body ?? "").matchAll(/\b(?:refs|fixes|closes|resolves)\s+#([1-9][0-9]*)\b/giu)].map(m => m[1]);
  if (!references.length || (branch && !references.includes(branch[2]))) errors.push("missing_branch_issue_reference");
  return errors;
}

export function inspectLocal(cwd = process.cwd()) {
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const changed = git("status", "--porcelain=v1", "--untracked-files=all").split("\n").filter(Boolean);
  let upstream = null, ahead = null, behind = null;
  try {
    upstream = git("rev-parse", "--abbrev-ref", "@{upstream}");
    [ahead, behind] = git("rev-list", "--left-right", "--count", "HEAD...@{upstream}").split(/\s+/u).map(Number);
  } catch { /* Missing upstream is reported explicitly. */ }
  return { branch, head, changed, upstream, ahead, behind };
}

export function localBlockers(state) {
  const errors = [];
  if (!state.branch) errors.push("detached_head");
  if (state.changed.length) errors.push("uncommitted_changes");
  if (!state.upstream) errors.push("missing_upstream");
  else if (state.upstream !== `origin/${state.branch}`) errors.push("unexpected_upstream");
  if (state.ahead > 0) errors.push("unpushed_commits");
  if (state.behind > 0) errors.push("behind_upstream");
  return errors;
}

export function checkRemote(state, pr, mode = "close") {
  const errors = validatePullRequest(pr);
  if (mode === "start" && pr.state === "MERGED") errors.push("merged_branch_requires_new_work_branch");
  if (pr.headRefOid !== state.head) errors.push("remote_head_mismatch");
  if (pr.state !== "OPEN" && pr.state !== "MERGED") errors.push("pull_request_closed_unmerged");
  let builds = (pr.statusCheckRollup ?? []).filter(check => check.name === "build");
  if (builds.length > 1) {
    const times = builds.map(check => Date.parse(check.startedAt));
    // GitHub retains superseded runs when edited/ready events cancel a run at
    // the same SHA. Never let an older success mask a newer pending/failing run.
    builds = times.every(Number.isFinite)
      ? builds.filter((_check, index) => times[index] === Math.max(...times))
      : [];
  }
  if (!builds.length || builds.some(check => check.status !== "COMPLETED" || check.conclusion !== "SUCCESS")) errors.push("build_not_green");
  return errors;
}

export function main(args = process.argv.slice(2)) {
  const [mode, ...flags] = args;
  if (!["start", "close", "pr"].includes(mode) || flags.some(flag => flag !== "--remote") || flags.length > 1 || (mode === "pr" && flags.length)) throw new Error("invalid_arguments");
  if (mode === "pr") {
    if (!process.env.GITHUB_EVENT_PATH) throw new Error("missing_event_path");
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const errors = validatePullRequest(event.pull_request);
    console.log(JSON.stringify({ mode, errors }));
    return errors.length ? 1 : 0;
  }
  if (flags.includes("--remote")) {
    execFileSync("git", ["fetch", "origin"], { stdio: ["ignore", "pipe", "pipe"] });
  }
  const state = inspectLocal();
  const errors = localBlockers(state);
  let remote = "unknown", prUrl = null;
  if (flags.includes("--remote")) {
    if (state.branch === "main") {
      remote = "fetched_main";
      // A clean main is a valid starting point, not a feature-session closeout.
      if (mode === "close") errors.push("feature_closeout_requires_pull_request");
    } else {
      try {
        const pr = JSON.parse(execFileSync("gh", ["pr", "view", state.branch, "--json", "title,body,headRefName,headRefOid,state,statusCheckRollup,url"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
        errors.push(...checkRemote(state, pr, mode));
        const issue = branchPattern.exec(state.branch)?.[2];
        if (issue) execFileSync("gh", ["issue", "view", issue, "--json", "number,state"], { stdio: ["ignore", "pipe", "pipe"] });
        remote = "verified"; prUrl = pr.url;
      } catch { errors.push("remote_issue_or_pull_request_unavailable"); }
    }
  } else errors.push("remote_state_unknown");
  console.log(JSON.stringify({ mode, ...state, remote, prUrl, errors }, null, 2));
  return errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = main(); }
  catch { console.error(JSON.stringify({ error: "hygiene_check_unavailable" })); process.exitCode = 1; }
}
