# Global session rules: Git hygiene

Apply these rules to source-changing work in Git repositories. Read-only reviews
and non-repository tasks do not require artificial commits, issues or PRs.

- At session start, read repository guidance and handoff; inspect branch, working
  tree, upstream, fresh remote refs, open issues/PRs, review findings and exact-head
  CI. Use the repository's hygiene tooling when present. If remote access fails,
  state that it is unknown; do not present stale refs as current.
- Resolve or explicitly disposition inherited integration debt before adding new
  feature scope. Preserve user-authored and unrelated changes. Never use reset,
  force-push, deletion or indiscriminate staging to manufacture a clean state.
- Make integration part of the session plan: named repository, issue, branch/base,
  deliverable, tests, and commit/push/PR/merge action scope. Existing authorization
  persists within its bounds. Do not repeatedly ask for already-approved actions;
  obtain missing material authority early with a concrete proposal.
- Use focused issue-linked feature branches and coherent Conventional commits,
  with behavior, tests and documentation together. Open draft PRs at useful
  checkpoints. Completed slices should be reviewed/integrated without waiting for
  an entire milestone. Stack only genuine dependencies and record their order.
- Run required checks and inspect the exact diff/head before review and merge.
  Respect repository rules and merge authority; never bypass failed/missing checks
  or weaken protections to meet a schedule. Local success is not remote CI.
- Before ending a source-changing session, run the repository's closeout check or
  equivalent Git/GitHub checks. Complete authorized commits/pushes/PR updates and
  merges when their gates pass. Report head, issue/PR links, checks, merge state,
  remaining changes and explicit blockers. A blocked handoff needs an owning issue
  and next action; do not call it a clean or complete session.
- Keep release/deployment source identity aligned with reviewed code and evidence.
  Treat experimental snapshots as explicit bounded exceptions, not the default.
- Instructions and local hooks cannot prove enforcement. Distinguish model
  guidance, scripts, required CI, branch rules and actual verification evidence.

Codex global guidance location and precedence:
https://learn.chatgpt.com/docs/agent-configuration/agents-md
