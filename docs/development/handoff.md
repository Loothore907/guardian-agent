# Current development handoff

Last reconciled: September 7, 2026. The current revision implements and tests the
issue #40 manifest-bound gitless-source contract offline. The first bounded KC
hosted-research attempt remains a failed-closed result before provider startup.
Both VMs are stopped, and the spent run sheet does not authorize a retry.

## Start here

1. Run `node scripts/session-hygiene.mjs start --remote` and inspect current
   issues, PRs, exact-head CI and dirty/unpublished work.
2. Read [the failed hosted gate](evidence/2026-09-07-kc-hosted-gate.md), issue
   [#40](https://github.com/Loothore907/guardian-agent/issues/40), and
   [ADR-0056](../adr/0056-manifest-bound-gitless-session-sources.md).
3. Verify this revision's exact-head CI and protected integration. Its production
   supervisor test uses a real extracted archive root with no `.git`; Linux CI
   additionally verifies the complete generated repository archive.
4. Prepare a new bounded run sheet only after integration. A second journey needs
   explicit authority because the one admission in the current sheet was consumed
   and conservatively forfeited.

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

The issue #40 source milestone is implemented in this revision: protected
research startup requires the full credential-free source manifest, and workspace
planning authorizes only its exact ordered path/size/digest/executable entries
without requiring mutable `.git` metadata. It remains an offline claim until
exact-head CI and protected integration complete.
The operator policy/price real-clock contract is implemented and tested offline
through the production service child; see
[ADR-0054](../adr/0054-operator-budget-service-clock.md). The protected
research-only startup and fixed two-resource ingress loader are now implemented
and tested offline under
[ADR-0055](../adr/0055-protected-research-judge-startup.md). They remain disabled
by default and do not require or expose the GitHub mutation path. The reviewed
credential-free source manifest exists. The concrete
[hosted run sheet](c7-hosted-research-run-sheet.md) was executed once and is now
spent. Its pre-provider gates established intended-host containment, protected
runtime retrieval, exact price/policy installation, authenticated ingress and
admission-before-preparation. The draft then failed because workspace planning
requires a Git worktree. Reliable external HTTPS, live provider settlement, and
later clean/seeded evaluations remain open.
Missing GitHub App setup and exact disposable targets gate mutations. Never reuse
merged PR 3.

Separate debt: intermittent authority-child startup, Windows real-clock IPC,
WSL warm-restart cgroup failures, billing reconciliation, and generalized hosted
BYOK/typed credential-copy grants. Do not repeat enrollment or recreate fixtures
to regain context. Do not promote assurance from successful model cooperation.

## Last recorded cloud state

Both KC VMs were cloud-confirmed `STOPPED` at 03:00:42 UTC September 7. The
replacement's live host and Caddy were stopped first. Existing Nebius/Tavily and
ingress resources remain exact-resource bound; protected runtime retrieval passed.
The live ledger contains one failed, forfeited 100,000-microUSD reservation and an
empty usage report. Tavily usage remained unchanged at 4/1500. The temporary judge
bearer was deleted. The cutoff automation is paused.

Leave both VMs stopped. Reuse the replacement, resources and fixtures only after
this source revision is integrated and a fresh bounded execution window,
admission and cloud-stop fallback are approved. Preserve the shared USD 25
allowance; the conservative infrastructure estimate is USD 1.044294 and the
failed USD 0.10 reservation awaits provider reconciliation.

## Evidence and history

- [Repository recovery and validation](repo-hygiene-recovery-2026-09-06.md)
- [KC hosted-gate result](evidence/2026-09-07-kc-hosted-gate.md)
- [Latest KC protected-enrollment evidence](evidence/2026-09-06-kc-continuation.md)
- [Protected research-only startup evidence](evidence/2026-09-06-protected-judge-startup.md)
- [C6 residuals](c6-residual-review.md)
- [C7 completion criteria](c7-completion-and-acceptance-plan.md)
- [WSL recovery procedure](wsl-session-recovery.md)
- [Archived handoff chronology](handoff-history-2026-09-06.md)

Historical dates, counts and future-tense instructions remain in the archive for
provenance. They do not supersede this pickup or create new execution authority.
