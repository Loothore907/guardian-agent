# Session plan: hosted research acceptance

Date: 2026-09-06. Status: offline startup and bounded run-sheet slices approved;
hosted execution remains disabled until the go/no-go gates in step 4 pass.

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

That hosted snapshot is historical. The source backlog has since been recovered
into dependency-ordered PRs; use the recovery record and current main for the
source baseline. Never deploy the older snapshot merely because it has retained
test results. Rebuild the manifest from the reviewed revision selected for the run.

## Ordered work and completion gates

1. **Verify the recovered source baseline offline.** Run the remote start check
   from clean current main, read the recovery closeout and check for new reviews.
   The old source inventory and dependency packaging are already in the recovery
   record; do not repeat them or resume the old containment branch. Choose the
   reviewed revision for the next deployment manifest and map remaining C6/C7
   acceptance criteria to evidence. Use issue #21 for operator budget corrections
   and #19 for protected startup/ingress. Suggested separate branches are
   `codex/21-operator-budget-clock` and `codex/19-protected-host-startup`.
   Done when source identity, focused branch/PR scope, required checks and exact
   remaining acceptance gates are recorded. Integrate each completed slice before
   making it a deployment prerequisite.

2. **Completed offline: operator budget updates.**
   [ADR-0054](../adr/0054-operator-budget-service-clock.md) binds policy/price
   updates to one authenticated service execution time while preserving proposal
   and provider-evidence times. Advancing/delayed clocks, capability-window
   rejection, version replay, future/expired evidence, unauthorized expansion and
   durable restart state are covered. The production-child real-clock test is in
   `pnpm check`. No campaign window, allowance or cloud resource was changed.

3. **Completed offline: protected startup and ingress.**
   [ADR-0055](../adr/0055-protected-research-judge-startup.md) adds a dedicated
   disabled-by-default production service, fixed two-resource SecretStash ingress
   loader, exact budget child, and research-only Nebius/Tavily portal without a
   GitHub mutation dependency. Tests cover malformed and wrong resource bindings,
   helper failures, zeroing, unauthorized ingress, dependency order, startup and
   listener failure, cleanup, unexpected child exit, admission before runtime
   preparation, an inert production child, and credential-free source packaging.
   No cloud, credential, ingress, provider, budget-window or spending state changed.

4. **Prepared offline: concrete hosted run sheet.** The approved
   [run sheet](c7-hosted-research-run-sheet.md) names replacement VM, exact source,
   approved credential resources/readers, ingress-secret provisioning scope,
   domain/routes, fixture URLs, model versions, request limits, journey count,
   spend ceiling, admission close, shutdown time and cleanup. Reconcile available
   budget against actual usage and retained-resource charges. Reuse existing
   enrollments, DNS, Caddy, dependencies and fixture files.
   Every remote effect is bound to the approved one-journey/two-hour scope or a
   fail-closed go/no-go fact. The companion
   [cost baselines](c7-cost-baselines.md) keep expected ranges separate from
   authority. No cloud or credential state was changed while preparing them.

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

| Decision               | Recommended direction                                                                                                       | Timing                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Current session scope  | Offline preparation and source-integration recovery; no cloud execution                                                     | User selected                                      |
| Compute window         | Up to two hours from replacement startup, only after offline readiness; same cumulative USD 25 ceiling, no top-up           | Confirm exact fresh window before restart          |
| Research versus GitHub | Research first; inventory App setup now, defer installation/mutations until this slice passes                               | Now                                                |
| Source integration     | Recovery is authorized in this cleanup session; subsequent preparation uses focused issue-linked branches and protected PRs | Verify recovery closeout before new scope          |
| Ingress custody        | Use the existing fixed protected-store design; make resource, readers and provisioning effects concrete                     | Before hosted run approval                         |
| Finland                | Treat declined quota as a deferred comparison, not a blocker for KC acceptance; no new region provisioned                   | Revisit after KC evidence                          |
| Supported-host scope   | Native Linux for this acceptance; keep Windows/WSL limitations explicit                                                     | Now; does not remove existing platform obligations |
| Hosted BYOK            | Keep as separate typed provisioning/product work                                                                            | After the hosted core is proven                    |

## Technical debt and disposition

| Debt or evidence gap                                                            | Disposition                                                                                                                                                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact-clock operator policy/price updates                                       | Implemented and tested offline under [ADR-0054](../adr/0054-operator-budget-service-clock.md); verify the reviewed source on the intended host before renewing live configuration         |
| Intermittent authority-child startup failure despite later passing cycles       | Capture sanitized startup causes and cold-boot/restart evidence; a recurring failure blocks unattended acceptance                                                                         |
| Protected startup/ingress wiring                                                | Implemented and tested offline under [ADR-0055](../adr/0055-protected-research-judge-startup.md); intended-host retrieval, identity, containment and external ingress remain hosted gates |
| Incomplete intended-host credential/service containment and retained live audit | Blocking for corresponding security claims; successful model calls alone cannot close it                                                                                                  |
| External HTTPS intermittent timeouts                                            | Blocking for externally usable acceptance; diagnose without broadening SSH access                                                                                                         |
| Provider settlement, billing reconciliation, retained disk/IP costs             | Reconcile before spending and at closeout; recorded compute estimate is not a bill                                                                                                        |
| Recovered prerequisite/C7 stack                                                 | Follow the recovery record and live PR state; resolve any remaining integration gate before feature work                                                                                  |
| Historical instructions mixed into current handoff/roadmap                      | Current handoff now links an archived chronology; dated sections are evidence, not current execution instructions                                                                         |
| Ignored operational helpers/state/evidence absent from a clone                  | Identify which sanitized procedures/helpers must ship for reproducibility; preserve private state outside source                                                                          |
| Windows clock drift and WSL warm-restart cgroup failures                        | Separate platform track with documented recovery; no permanent fix claimed                                                                                                                |
| Missing GitHub App installation/private-key slots and disposable exact targets  | Next acceptance slice; never substitute OAuth or reuse merged PR 3                                                                                                                        |
| C7 clean/seeded repeats and failure/uncertainty evaluation report               | Required milestone follow-up after first journey; one run is not evaluation closure                                                                                                       |
| Generalized hosted BYOK, typed credential-copy grants and recovery receipts     | Future product design; current ignored operator transfer is not a shipped feature                                                                                                         |
| WebAuthn, longer missions, calibration/load and continuous judging availability | Later roadmap/rollout work; preserve explicit scope and funding gates                                                                                                                     |

## Plan boundaries

The completed offline steps do not start compute, call paid providers, change
credentials or authorize hosted effects. Do not interpret their source-integration
authority as extending to deployment. Step 4 must bind and approve the concrete
hosted effects before step 5 begins.
Existing approved resource/credential scope remains reusable; only expired or missing
material scope requires a new decision. Budget remains USD 20 API allocation plus
USD 5 infrastructure reserve within the shared USD 25 allowance, subject to actual
remaining funds. Exact call/count caps must be filled in before live execution.
