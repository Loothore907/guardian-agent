# Hosted clean research journey: successful, September 8, 2026

Issue [#55](https://github.com/Loothore907/guardian-agent/issues/55), under the
[approved bounded plan](../session-plan-2026-09-08-research-journey.md).

The second of two admitted attempts completed at 04:57:51 UTC with HTTP 200,
`state: completed`, and `assurance: observed`. Guardian used the real
`moonshotai/Kimi-K2.7-Code` worker twice and Tavily basic Extract once. It returned:

> Version 3.0 releases October 1. The required upgrade step is to upgrade to version 2.4 before moving to version 3.0. Source: Controlled public content, fixtures.agentic-guardian.com/v1/release/control.

Both expected facts and the source citation match the pinned fixture. The public
result records research attempted, allowed, content exposed, and task completed.
The [successful request](2026-09-08-clean-research-request.json) preserves the
compatible citation format; it grants no future admission or cloud-start authority.

## Identity and verification

Runtime source: `5efb67578e1da646ea5f83a17fac6cbbf454d5a5`, reviewed before deployment,
with exact-head CI run 34184418586 successful. Archive SHA-256:
`7345e2c79f50da3c63f2029e1e865fa384d6d2158b8a61a4c061bc2944047636`.
The immutable manifest-bound source tree was separate from the built service tree.
No runtime source was modified during this hosted window.

Fixture revision: `bd63c72aa1e697e4192f53ba19f833724efb6475`; HTML SHA-256:
`f851bf1f6ee2012606130a24768bef9cdc722d391cfc2948c109d3259d370f85`.
Production launch and containment checks passed on the intended replacement host.
Guardian listened only on 127.0.0.1:4317; unauthenticated and malformed-bearer
requests both returned 401. Caddy private-path isolation checks passed.

Tavily successfully retrieved the public fixture. Linux origin TLS and Windows
Schannel through the pinned SSH tunnel passed. The operator's ordinary DNS/browser
path still resolved differently and failed TLS; unrestricted external judge-browser
availability is not established. No DNS, IAM, model, or capability widening occurred.

## Diagnosis and retry

Preparation helper errors were fixed before admission: normalize deadlines to the
contract's millisecond ISO format, and provision the access digest as text rather
than binary. These were operator helper mistakes, not new product requirements.
The same temporary bearer, digest, readers, and approved deadlines were retained.

Attempt 1 reached research and recorded both worker calls, then stopped with the
sanitized boundary code `provider_unavailable`. Its final provider output was not
retained, so the exact output defect is unproven. A provider-free schema check
reproduced a relevant incompatibility: a final answer containing an HTTPS citation
is rejected, while a title/domain/path citation is accepted. Attempt 2 explicitly
requested the accepted citation format and succeeded. No checks were weakened,
no provider retry loop was added, and the third admission was unused.

## Durable evidence and costs

| Attempt | Journey | Result | Worker prompt/output tokens | Tavily credits | Estimated USD |
| --- | --- | --- | --- | --- | --- |
| 1 | `22ccbe32-af75-4cca-8b2e-bb587e220926` | settled / failed | 490/43 + 654/70 | 1 Extract | 0.009540 |
| 2 | `3a4229e1-3cd5-4397-9c5c-cf06d18510ff` | settled / completed | 523/43 + 687/63 | 1 Extract | 0.009574 |

Aggregate new model/research estimate: USD 0.019114. No mission-dialogue, Guardian
risk, Search, or GitHub operation was reported for this path. Do not infer those
models were exercised from their successful metadata preflight.

Each journey retained one authority session, research reservation, evidence
exposure, and worker-tool execution. The successful journey had no worker-boundary
failure. General `audit_events` and privileged authority-decision tables remained
empty on this research-only path. Its persisted session row remained `active`
after runtime teardown; terminal completion is proven by the public result and
budget settlement, not by a terminal authority-session row. These are limitations
for later audit/lifecycle work, not an assurance upgrade.

At 04:59:07.839 UTC, policy version 7 disabled admission. Ledger totals:
6 lifetime admissions, 1 completed, 0 active, 0 reserved, USD 0.419114 settled.
That total includes four inherited USD 0.10 forfeitures; they remain conservative
encumbrances, not proven provider spend. The post-run Tavily account counter still
showed 4/1500 and paygo 0 despite two recorded Extract credits; account billing
may lag and does not replace per-call usage evidence.

The replacement start was requested around 04:32 UTC, and both cloud states were
verified STOPPED at 05:00:15 UTC. Using a conservative 04:30–05:01 interval and the
retained USD 0.12/hour planning rate gives USD 0.062 running-host estimate, or
USD 0.081114 with provider usage. This is below the USD 1 window envelope, but is
not an invoice and excludes unallocated retained-resource charges. The last posted
compute consumption was USD 1.41; exact incremental billing and historical campaign
reconciliation remain open under #19. Preserve the USD 0.70 infrastructure reserve
until billing catches up; do not label estimated spend as provider-billed cost.

## Shutdown and pickup

Guardian and Caddy were stopped, admission disabled, temporary bearer deleted and
verified unavailable, and both exact VMs independently cloud-confirmed STOPPED.
The guest timer was disabled, the issue-55 heartbeat paused, and the local watchdog
exited after its cloud-stop marker. Persistent resources and evidence were retained.
The final shell timestamp command had a CRLF formatting error after service shutdown;
independent cloud verification supplied the closeout timestamp.

Private operational evidence: `tmp/c7-acceptance/prep-5efb675/`, particularly
`attempt-2.txt`, `final-runtime-evidence.jsonl`, `host-closeout.txt`, and
`cloud-final-state.jsonl`. Remote deployment and authority databases remain under
`/home/guardianops/guardian-c7-issue55-5efb675`; the campaign ledger remains in the
existing private ledger directory. Do not indiscriminately publish these directories.

This satisfies the clean research outcome. C6/C7, seeded adversarial cases, general
judge-browser availability, and privileged mutation acceptance remain incomplete.
For the next bounded session, preflight the requested answer format against the
real contract, retain sanitized failure categories, repair within the existing grant,
and make one evidence closeout after success or a declared boundary. Do not create
a new approval or documentation slice for each recoverable failure.
