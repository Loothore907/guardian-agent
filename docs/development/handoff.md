# Current development handoff

Last reconciled: September 7, 2026. PR #42 integrates the issue #40
manifest-bound gitless-source contract, and exact-head plus post-merge CI passed.
PR #44 integrated the second bounded KC run sheet. That window ended without an
admission, credential activation or provider request because the Codex operator session
misclassified expected missing-fixture failures from an inapplicable VM-side
`pnpm check`, cleaned up and stopped the replacement, and did not successfully
resume before the sheet's absolute clock expired. Read the
[retry abort evidence](evidence/2026-09-07-kc-hosted-retry-abort.md).

Both VMs are stopped. The original retry sheet no longer authorizes execution:
its absolute admission and shutdown times expired even though its one admission
was not consumed. A later session must integrate a fresh bounded clock and stop
fallback. No product-code repair is required for the intentional fixture
exclusions described below.

## Start here

1. Run `node scripts/session-hygiene.mjs start --remote` and inspect current
   issues, PRs, exact-head CI and dirty/unpublished work.
2. Read [the failed hosted gate](evidence/2026-09-07-kc-hosted-gate.md), closed
   issue [#40](https://github.com/Loothore907/guardian-agent/issues/40), and
   [ADR-0056](../adr/0056-manifest-bound-gitless-session-sources.md).
3. Treat `95648b58a871664ef6e29c9713bb2e7dacaa4f05` as the last reviewed
   hosted-source revision. Its exact-head main run 124 passed; PR #42's Linux CI
   also verified the complete generated repository archive. Reconfirm source
   identity if current `main` changes before a new run.
4. Create and integrate a new bounded run sheet before any hosted action. Bind
   fresh absolute admission/guest/cloud-stop times and the remaining compute
   allowance; the PR #44 timestamps are expired.
5. Run the complete `pnpm check` in the full repository, not in the reduced
   deployment archive. On the VM, use the deployment-safe Linux/reference gates
   and the reviewed standalone containment probes.

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

The issue #40 source milestone is integrated through PR #42: protected
research startup requires the full credential-free source manifest, and workspace
planning authorizes only its exact ordered path/size/digest/executable entries
without requiring mutable `.git` metadata. It remains an offline claim until
the fixed path completes a hosted journey; integration and post-merge CI are
complete. The second window verified the exact archive, offline install, Linux
permissions and production manifest-bound reference runtime on the replacement,
but it did not start the judge host or providers.

The production manifest intentionally excludes
`apps/reference-supervisor/test-fixtures/`,
`packages/linux-peer-identity/test-fixtures/` and `scripts/test-fixtures/`.
Some repository test files consequently cannot run inside the reduced archive.
This is asserted by the manifest test and is not an authorization failure. Do
not add the fixtures to a live bundle merely to make the development suite run.
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

Both KC VMs were most recently authenticated as `STOPPED` after the replacement's
08:49:18–09:22:38 UTC retry interval. The retry judge host and Caddy were never
started. Existing Nebius/Tavily and ingress resources remain exact-resource
bound and unchanged. The live ledger still contains only the first attempt's
failed, forfeited 100,000-microUSD reservation and empty usage report. The retry
temporary bearer was never created and is verified absent. The cutoff automation
retains its original configuration and is paused.

Leave both VMs stopped. The retry archive and extracted root were removed from
the VM; the exact ignored local bundle remains under
`tmp/c7-acceptance/kc-retry-95648b5/`. Reuse the replacement, resources and
fixtures only after a fresh bounded execution window, admission and cloud-stop
fallback are approved. Preserve the shared USD 25 allowance; the conservative
infrastructure estimate is USD 1.110945, the provider dashboard's last observed
compute total was USD 1.01 at 06:47 UTC, and the failed USD 0.10 reservation
awaits provider reconciliation.

## Evidence and history

- [Repository recovery and validation](repo-hygiene-recovery-2026-09-06.md)
- [KC hosted-gate result](evidence/2026-09-07-kc-hosted-gate.md)
- [KC hosted-retry abort](evidence/2026-09-07-kc-hosted-retry-abort.md)
- [Latest KC protected-enrollment evidence](evidence/2026-09-06-kc-continuation.md)
- [Protected research-only startup evidence](evidence/2026-09-06-protected-judge-startup.md)
- [C6 residuals](c6-residual-review.md)
- [C7 completion criteria](c7-completion-and-acceptance-plan.md)
- [WSL recovery procedure](wsl-session-recovery.md)
- [Archived handoff chronology](handoff-history-2026-09-06.md)

Historical dates, counts and future-tense instructions remain in the archive for
provenance. They do not supersede this pickup or create new execution authority.
