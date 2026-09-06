# Current development handoff

Last reconciled: September 6, 2026. Source integration and session Git hygiene are
the current priority. The hosted-research plan is preparation-only; cloud
execution/testing belongs to a later, explicitly bounded session.

## Start here

1. Run `node scripts/session-hygiene.mjs start --remote` and inspect current
   issues, PRs, exact-head CI and dirty/unpublished work before new feature scope.
2. Read [repository recovery](repo-hygiene-recovery-2026-09-06.md) for the source
   preservation evidence and PR dependency order. Resolve outstanding integration
   gates before continuing runtime implementation.
3. Once integration has a verified disposition, resume the
   [offline preparation plan](session-plan-2026-09-06-hosted-research.md).
4. Use [the KC acceptance pickup](c7-kc-hosted-acceptance-handoff.md) only for
   operational preparation and the next bounded execution session.

## Source and workflow

The former 38-commit backlog and accumulated worktree have been recovered into
issue-linked PRs. All product slices (PR #17 and #22–#30), governance PR #31
and the checker refinement #36 are merged. Recovery evidence and this handoff
are published through #32; verify its closeout on GitHub before starting new work.
Publication and local tests alone do not establish milestone completion.

Main now requires an up-to-date GitHub Actions build alongside PRs, resolved
review threads and squash/linear integration. No bypass actors were added.
Follow [session Git hygiene](session-git-hygiene.md) and run the close check before
handoff. Global Codex guidance is installed separately; it is not an automatic
hook or proof of future agent compliance.

## Product and security state

C6/C7 remain in progress. Typed durable session authority, bounded worker
continuation, exact-bound risk context, portal contracts/UI and synthetic service
composition exist. Default live portal execution remains disabled. Review
[security claims](../security-claims.md) before describing any control as verified.

The next hosted milestone is one authenticated research-only journey with
protected Nebius/Tavily use, admission before paid calls and durable settlement.
Offline blockers are operator policy/price real-clock updates and protected
startup/ingress composition. Hosted gates include full credential/service
containment, runtime retrieval/redaction, reliable external HTTPS, live settlement,
and later clean/seeded evaluations. Missing GitHub App setup and exact disposable
targets gate mutations. Never reuse merged PR 3.

Separate debt: intermittent authority-child startup, Windows real-clock IPC,
WSL warm-restart cgroup failures, billing reconciliation, and generalized hosted
BYOK/typed credential-copy grants. Do not repeat enrollment or recreate fixtures
to regain context. Do not promote assurance from successful model cooperation.

## Last recorded cloud state

Both KC VMs were cloud-confirmed stopped at the prior closeout. No cloud query or
state change occurred in this repository-cleanup session. Existing Nebius/Tavily
copies and exact-resource grants were verified by the operator, but runtime use
remains unverified. The durable campaign ledger was disabled with zero admissions.
Old policy/price windows and the old two-hour uptime grant have ended.

Leave the original VM stopped. Reuse the replacement, resources and fixtures only
under a fresh bounded execution window with cloud-stop fallback. Preserve the
shared USD 25 allowance; reconcile actual remaining costs before spending.
Use the KC pickup and ignored local metadata for exact operational descriptors.

## Evidence and history

- [Repository recovery and validation](repo-hygiene-recovery-2026-09-06.md)
- [Latest KC protected-enrollment evidence](evidence/2026-09-06-kc-continuation.md)
- [C6 residuals](c6-residual-review.md)
- [C7 completion criteria](c7-completion-and-acceptance-plan.md)
- [WSL recovery procedure](wsl-session-recovery.md)
- [Archived handoff chronology](handoff-history-2026-09-06.md)

Historical dates, counts and future-tense instructions remain in the archive for
provenance. They do not supersede this pickup or create new execution authority.
