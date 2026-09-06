import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { inspectLocal, localBlockers, validatePullRequest, checkRemote } from "./session-hygiene.mjs";

const pr = { title: "fix: bind session authority", body: "Refs #13", headRefName: "codex/13-authority", headRefOid: "a".repeat(40), state: "OPEN", statusCheckRollup: [{name:"build",status:"COMPLETED",conclusion:"SUCCESS"}] };
test("accepts issue-linked Conventional Commit PRs", () => assert.deepEqual(validatePullRequest(pr), []));
test("rejects missing and unrelated issue references", () => {
  for (const body of ["", "Refs #14", "#13", "Refs #0"]) assert.ok(validatePullRequest({...pr,body}).includes("missing_branch_issue_reference"));
});
test("rejects detached/unscoped branch names and nonconventional titles", () => {
  for (const headRefName of ["main", "codex/random", "codex/0-fix", "codex/13-Fix"]) assert.ok(validatePullRequest({...pr,headRefName}).includes("missing_issue_branch"));
  assert.ok(validatePullRequest({...pr,title:"C6 work"}).includes("nonconventional_title"));
});
test("requires an exact remote head and a successful completed build", () => {
  assert.deepEqual(checkRemote({head:pr.headRefOid},pr),[]);
  assert.ok(checkRemote({head:"b".repeat(40)},pr).includes("remote_head_mismatch"));
  for (const statusCheckRollup of [[],[{name:"build",status:"IN_PROGRESS"}],[{name:"build",status:"COMPLETED",conclusion:"FAILURE"}],[{name:"build",status:"COMPLETED",conclusion:"SKIPPED"}]]) assert.ok(checkRemote({head:pr.headRefOid},{...pr,statusCheckRollup}).includes("build_not_green"));
  assert.ok(checkRemote({head:pr.headRefOid},{...pr,state:"CLOSED"}).includes("pull_request_closed_unmerged"));
});
test("reports unpublished, dirty and divergent work without changing it", () => {
  const root=mkdtempSync(join(tmpdir(),"guardian-hygiene-"));
  const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"]});
  try {
    git("init","-b","codex/13-authority");
    git("config","user.name","Hygiene Test");git("config","user.email","hygiene@example.invalid");
    writeFileSync(join(root,"source.txt"),"fixture\n");git("add","source.txt");git("commit","-m","test: fixture");
    const clean=inspectLocal(root);assert.ok(localBlockers(clean).includes("missing_upstream"));
    git("remote","add","origin","https://example.invalid/fixture.git");git("update-ref","refs/remotes/origin/codex/13-authority",clean.head);git("branch","--set-upstream-to=origin/codex/13-authority");
    assert.deepEqual(localBlockers(inspectLocal(root)),[]);
    writeFileSync(join(root,"untracked.txt"),"preserve me\n");
    assert.ok(localBlockers(inspectLocal(root)).includes("uncommitted_changes"));
    git("add","untracked.txt");git("commit","-m","test: ahead");
    assert.ok(localBlockers(inspectLocal(root)).includes("unpushed_commits"));
    git("checkout","--detach");assert.ok(localBlockers(inspectLocal(root)).includes("detached_head"));
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test("uses the latest same-head build without hiding pending/failing or ambiguous runs", () => {
  const old = {name:"build",status:"COMPLETED",conclusion:"CANCELLED",startedAt:"2026-09-06T12:00:00Z"};
  const latest = {...old,conclusion:"SUCCESS",startedAt:"2026-09-06T12:00:05Z"};
  assert.deepEqual(checkRemote({head:pr.headRefOid},{...pr,statusCheckRollup:[old,latest]}),[]);
  for (const run of [{...latest,status:"IN_PROGRESS",conclusion:""},{...latest,conclusion:"FAILURE"},{...latest,conclusion:"SKIPPED"},{...latest,startedAt:undefined}]) {
    assert.ok(checkRemote({head:pr.headRefOid},{...pr,statusCheckRollup:[{...old,conclusion:"SUCCESS"},run]}).includes("build_not_green"));
  }
  assert.ok(checkRemote({head:pr.headRefOid},{...pr,statusCheckRollup:[latest,{...latest,conclusion:"FAILURE"}]}).includes("build_not_green"));
});

test("allows merged-PR closeout but refuses to resume feature work on that branch", () => {
  const merged = {...pr,state:"MERGED"};
  assert.deepEqual(checkRemote({head:pr.headRefOid},merged,"close"),[]);
  assert.ok(checkRemote({head:pr.headRefOid},merged,"start").includes("merged_branch_requires_new_work_branch"));
  assert.deepEqual(checkRemote({head:pr.headRefOid},pr,"start"),[]);
});
