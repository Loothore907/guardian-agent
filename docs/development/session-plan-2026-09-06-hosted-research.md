# Proposed session plan: hosted research acceptance

Date: 2026-09-06. Status: draft for discussion, not execution authority.

User scope correction: this session prepares the candidate and run sheet only.
Cloud execution/testing belongs to the next session. Source-integration recovery
and enforceable session Git hygiene must be resolved before further runtime work;
the user has requested discussion of the workflow failure and corrective rules.

The user subsequently selected repository cleanup and global Git-hygiene rules
as the priority. See [the recovery record](repo-hygiene-recovery-2026-09-06.md).
Runtime preparation resumes only after that work has a verified disposition.

## Outcome and baseline

Prepare an execution-ready candidate for one authenticated hosted research-only journey using
protected Nebius/Tavily credentials, admission before paid calls, and durable usage
settlement. This closes a bounded acceptance slice, not all C6/C7 or public judging.

Sources: [current KC pickup](c7-kc-hosted-acceptance-handoff.md),
[latest evidence](evidence/2026-09-06-kc-continuation.md),
[C6 residuals](c6-residual-review.md), and
[C7 completion criteria](c7-completion-and-acceptance-plan.md).

The last recorded cloud state is both KC VMs stopped; it was not re-queried during
this documentation review. The last tested snapshot is `2dcc7cd79e2e…`, with
679 tests passed / 6 skipped and passing Linux platform, reference containment,
build and audit checks. These are retained results, not tests rerun for this plan.
Nebius/Tavily cloud copies and exact-resource reader grants are verified; runtime
retrieval and live provider use remain unverified. The campaign ledger is disabled
with zero admissions. Previous admission/price windows must be refreshed.

Local inspection confirms the existing containment branch and a large mixed
worktree: 101 tracked changed files, plus untracked additions. Preserve all of it.

## Ordered work and completion gates

1. **Establish the source and evidence baseline offline.** Inventory tracked and
   untracked changes against the tested manifest. Map C6/C7 criteria to evidence,
   remaining tests and explicit limitations. Propose dependency-ordered source
   groups: containment/prerequisites, session authority/headless, portal/runtime,
   then hosted corrections, with each group's tests and documentation. Resolve
   the actual PR/base relationship before proposing publication.
   Done when the candidate identity, review groups and acceptance matrix are saved.

2. **Repair or prove operator budget updates offline.** Inspect policy/price
   updates across real IPC; ADR-0053 only fixes admission and settlement. Define
   trusted execution-time handling without weakening expiry, replay, policy-version
   or authorization checks. Test advancing clocks, delayed messages, stale prices,
   expired windows and attempted budget expansion. Preserve the existing durable
   campaign ledger and cumulative allowance.
   Done when production-child real-clock update tests pass and the contract is
   documented, including any required ADR/claim changes.

3. **Prepare protected startup and ingress offline.** Implement the fixed secret
   loader and service composition required by the existing headless host. Test
   missing/wrong credentials, caller/peer rejection, service startup failure,
   cancellation and cleanup, unauthorized ingress, and admission-before-provider
   ordering. Keep live execution disabled by default. Prepare exact deployment
   descriptors and source manifest without credentials or private state.
   Done when the synthetic end-to-end composition and relevant rejection tests
   pass, followed by the required suite and review of the changed boundaries.

4. **Prepare the concrete hosted run sheet.** Name replacement VM, exact source,
   approved credential resources/readers, ingress-secret provisioning scope,
   domain/routes, fixture URLs, model versions, request limits, journey count,
   spend ceiling, admission close, shutdown time and cleanup. Reconcile available
   budget against actual usage and retained-resource charges. Reuse existing
   enrollments, DNS, Caddy, dependencies and fixture files.
   Done when every remote effect is bound to existing authority or clearly listed
   for a new decision. A fresh compute window is required; the old window ended.

5. **Next session only: run bounded KC acceptance after the run sheet is approved.** Recheck both
   cloud states; restart only the replacement with guest shutdown and cloud-stop
   fallback. Verify source identity, protected runtime retrieval/redaction and
   intended-host process/filesystem/credential/network isolation. Include direct
   network, credential-path, alternate-tool and Git-push bypass probes. Verify
   external HTTPS from the operator side as well as host-side fixture hashes.
   Authenticate ingress, refresh policy/prices through the tested operator path,
   and execute the single research journey with live admission and settlement.
   Retain sanitized provider usage, useful answer, latency, decisions and durable
   audit evidence. Failures return to diagnosis; no uncontrolled retries.
   Done when the journey is externally reachable, authenticated, correctly
   budgeted and durably settled, or its exact blocking failure is documented.

6. **Close out and review.** Disable admissions, reconcile reservations and usage,
   verify children exit, cloud-stop the replacement and confirm both VMs stopped.
   Record costs, source identity, evidence and unresolved items in the current
   pickup. Advance only evidence-backed claims. Prepare commit/PR proposals;
   publication and merge follow their separately bounded source-integration scope.

## Decisions for discussion

| Decision | Recommended direction | Timing |
| --- | --- | --- |
| Current session scope | Offline preparation and source-integration recovery; no cloud execution | User selected |
| Compute window | Up to two hours from replacement startup, only after offline readiness; same cumulative USD 25 ceiling, no top-up | Confirm exact fresh window before restart |
| Research versus GitHub | Research first; inventory App setup now, defer installation/mutations until this slice passes | Now |
| Source integration | Prepare dependency-ordered groups now; decide exact base/branch/PR before commits or publication | After inventory |
| Ingress custody | Use the existing fixed protected-store design; make resource, readers and provisioning effects concrete | Before hosted run approval |
| Finland | Treat declined quota as a deferred comparison, not a blocker for KC acceptance; no new region provisioned | Revisit after KC evidence |
| Supported-host scope | Native Linux for this acceptance; keep Windows/WSL limitations explicit | Now; does not remove existing platform obligations |
| Hosted BYOK | Keep as separate typed provisioning/product work | After the hosted core is proven |

## Technical debt and disposition

| Debt or evidence gap | Disposition |
| --- | --- |
| Exact-clock operator policy/price updates | Blocking: prove/fix before renewing live campaign configuration |
| Intermittent authority-child startup failure despite later passing cycles | Capture sanitized startup causes and cold-boot/restart evidence; a recurring failure blocks unattended acceptance |
| Incomplete protected startup/ingress wiring | Blocking for the proposed authenticated journey |
| Incomplete intended-host credential/service containment and retained live audit | Blocking for corresponding security claims; successful model calls alone cannot close it |
| External HTTPS intermittent timeouts | Blocking for externally usable acceptance; diagnose without broadening SSH access |
| Provider settlement, billing reconciliation, retained disk/IP costs | Reconcile before spending and at closeout; recorded compute estimate is not a bill |
| Large uncommitted prerequisite/C7 stack and unresolved review base | High priority: inventory now, package with tests, obtain exact-head review/CI before integration |
| Historical instructions mixed into current handoff/roadmap | Consolidate active status and ordered actions; retain history by links to evidence |
| Ignored operational helpers/state/evidence absent from a clone | Identify which sanitized procedures/helpers must ship for reproducibility; preserve private state outside source |
| Windows clock drift and WSL warm-restart cgroup failures | Separate platform track with documented recovery; no permanent fix claimed |
| Missing GitHub App installation/private-key slots and disposable exact targets | Next acceptance slice; never substitute OAuth or reuse merged PR 3 |
| C7 clean/seeded repeats and failure/uncertainty evaluation report | Required milestone follow-up after first journey; one run is not evaluation closure |
| Generalized hosted BYOK, typed credential-copy grants and recovery receipts | Future product design; current ignored operator transfer is not a shipped feature |
| WebAuthn, longer missions, calibration/load and continuous judging availability | Later roadmap/rollout work; preserve explicit scope and funding gates |

## Plan boundaries

This review creates only this draft. It does not start compute, call paid providers,
change credentials or remote settings, publish source, or authorize GitHub effects.
Existing approved resource/credential scope remains reusable; only expired or missing
material scope requires a new decision. Budget remains USD 20 API allocation plus
USD 5 infrastructure reserve within the shared USD 25 allowance, subject to actual
remaining funds. Exact call/count caps must be filled in before live execution.
