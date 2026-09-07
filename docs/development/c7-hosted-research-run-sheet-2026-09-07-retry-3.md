# C7 protected hosted research retry 3 — September 7, 2026

- Status: executed once and spent; see the
  [retry-3 abort evidence](evidence/2026-09-07-kc-hosted-retry-3-abort.md)
- Tracking: issue #19
- Repository base: `main` at `8de529ff329d78488fd0faff126abb841f46fe09`
- Hosted source: `95648b58a871664ef6e29c9713bb2e7dacaa4f05`
- Maximum new exposure: unchanged at USD 0.34

This sheet replaces the expired retry-2 startup gate without extending its
22:00 UTC cloud-stop deadline, spend, credentials, resources, calls, journey
count or side-effect authority. Retry 2 produced no VM start, credential change,
provider call, reservation or admission.

Except for the absolute clock below, every source, archive, manifest, lockfile,
infrastructure, credential, reader, budget, call, route, test, fail-closed
execution, cleanup and integration bound in
[retry 2](c7-hosted-research-run-sheet-2026-09-07-retry-2.md) applies unchanged.
There is no GitHub access or mutation, automatic retry, second admission, new VM,
new provider, IAM widening, spending increase or security-claim promotion.

## Replacement absolute window

| Gate | Absolute UTC time |
| --- | --- |
| Earliest replacement startup | 2026-09-07 20:15:00 UTC |
| Latest replacement startup | 2026-09-07 20:20:00 UTC |
| Admission closes | 2026-09-07 21:30:00 UTC |
| Guest shutdown begins | 2026-09-07 21:45:00 UTC |
| Both VMs cloud-confirmed stopped | 2026-09-07 22:00:00 UTC |

The already-updated independent cloud-stop fallback for 22:00 UTC must remain
active before replacement startup. If this sheet is not merged or the exact
replacement is not started by 20:20 UTC, it expires without execution. Cleanup
begins immediately after terminal settlement or earlier abort.

## Pre-start reconfirmation

The authenticated Nebius Console reported both exact VMs `Stopped` immediately
before retry 2's expired start confirmation. Billing reported USD 23.88 balance
and USD 1.12 total compute usage, leaving the unchanged USD 0.34 maximum inside
the cumulative allowance. Recheck both VM rows after this sheet merges. Any
different state or unavailable allowance blocks startup.

The same-session complete-repository `pnpm check` and both run-sheet exact-head
builds passed. On the reduced VM archive, run only the deployment-safe gates and
reviewed standalone containment probes named by retry 2. Missing development
fixtures remain expected and must not be restored or interpreted as a production
failure.
