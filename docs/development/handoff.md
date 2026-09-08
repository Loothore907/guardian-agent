# Current development handoff

Last reconciled: September 8, 2026 UTC. The hosted clean research journey succeeded
under [issue #55](https://github.com/Loothore907/guardian-agent/issues/55) and the
[approved session plan](session-plan-2026-09-08-research-journey.md).

Guardian returned the correct October 1 release date and prerequisite upgrade to
2.4, with a source citation, using real Nebius worker calls and Tavily extraction.
The second of two admissions completed and settled. Aggregate model/research usage
was an estimated USD 0.019114. See the
[consolidated result and limitations](evidence/2026-09-08-clean-research-success.md)
and [successful request fixture](evidence/2026-09-08-clean-research-request.json).

## Current state

- Tested runtime source: `5efb67578e1da646ea5f83a17fac6cbbf454d5a5`; exact-head CI
  passed. The plan was integrated by PR #56 on main `774c82611a2595cf8056d6ff623d68276ee8bf9d`.
  This result update changes evidence and pickup guidance only.
- Both KC VMs were cloud-confirmed STOPPED at 05:00:15 UTC. Guardian/Caddy are
  stopped; the temporary bearer is deleted. The issue-55 heartbeat is paused and
  its watchdog exited. Admission is disabled by durable budget policy version 7.
- Ledger: 6 lifetime admissions, 1 completed, 0 active/reserved, USD 0.419114
  settled including USD 0.40 inherited forfeitures. Billing reconciliation remains
  open; estimates and forfeitures are not proof of provider-billed spend.
- Result assurance is `observed`. The successful authority row still says active
  after teardown; budget settlement is terminal. General audit-event tables are
  empty for this path. No broader enforcement or C7-completion claim is made.
- Persistent disks, addresses, DNS, credential resources/readers, ledger, deployment,
  and private diagnostics remain retained. The window ended on success; its unused
  third admission does not authorize a later run.
- Unrelated draft PR #52 / issue #51 remains untouched.

## Next useful work

1. Run repository hygiene on fresh main and inspect current issues, PRs and CI.
   Review this result before historical failure handoffs. Leave both VMs stopped
   during preparation; do not spend a hosted window on document reconciliation.
2. Within a new bounded hosted grant, use the successful clean request as a
   control for the seeded research acceptance slice owned by #19. Preserve source,
   scope, time, spend, admission and shutdown bounds. C6/C7 remain incomplete.
3. Preflight setup payload formats and the requested output against the actual
   contracts. The current worker contract rejects URL links in final responses;
   a title/domain/path source citation works without weakening it.
4. Diagnose a recoverable failure, make the relevant repair, and retry within the
   existing grant. Stop at useful success or an actual boundary; collect one
   consolidated evidence report. Do not require a new approval or docs PR per error.
5. Keep external judge-browser TLS, sanitized provider failure visibility,
   authority-session terminal state, and delayed billing reconciliation explicit
   in #19 before broadening acceptance claims. Later GitHub mutation cases require
   their separate exact-target and credential gates.

Private evidence is retained in `tmp/c7-acceptance/prep-5efb675/` and the existing
remote private state directories. Preserve it without indiscriminate staging.
Earlier failures remain in the [hosted chronology](c7-kc-hosted-acceptance-handoff.md)
and linked evidence. Historical pickup instructions do not supersede this handoff.
