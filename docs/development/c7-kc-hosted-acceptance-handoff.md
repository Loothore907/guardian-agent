# C7 handoff: gitless source fixed offline; hosted gate remains closed

## Current checkpoint — September 7 retry 3

Both exact KC VMs are cloud-confirmed `STOPPED`; the replacement stop completed
at 21:28:09 UTC after Nebius auto-recovered it from guest shutdown. The cutoff
automation is paused. Retry 3 is spent and produced no credential activation,
provider call, reservation, admission or journey.

The exact reviewed archive built and the Linux, reference-runtime and standalone
containment gates passed. Disabled Guardian and Caddy started, but the Codex
operator aborted and removed the transient deployment after one Windows Schannel
failure instead of preserving it for independent corroboration. Follow-up
Windows, Chromium and OpenSSL probes all found a protocol-level TLS failure. The
two `agentic-guardian.com` hostnames resolved to `18.204.152.241`, not the
replacement VM's `204.12.168.166`; because corroboration occurred after teardown,
the fault is not yet localized among DNS, upstream proxy, Caddy or Guardian. See
the [retry-3 abort evidence](evidence/2026-09-07-kc-hosted-retry-3-abort.md).

Nebius billing showed USD 1.13 compute usage and USD 23.87 balance at a lagging
19:40 UTC snapshot. The conservative local infrastructure estimate is USD
1.256279. Persistent disks, IPs, DNS, fixtures, SecretStash resources, IAM
bindings and the private ledger remain preserved.

## Earlier September 7 checkpoint

Both KC VMs are cloud-confirmed `STOPPED`. The bounded run sheet was executed
once and is spent. Intended-host containment, exact SecretStash/IAM bindings,
protected runtime retrieval, authenticated model/pricing inventory, operator-clock
policy activation, DNS-only TLS, negative routes and admission-before-preparation
passed. The temporary judge bearer was deleted and the cutoff automation paused.

The first exact draft was admitted at 02:55:49.768 UTC, then returned 503 and
settled failed 21 ms later with `usage: []`. No confirmation, provider call or
retry occurred. The USD 0.10 reservation is conservatively forfeited. Tavily
remained 4/1500 after the attempt. The public TLS path also became unreliable
after the negative-test burst; it remains a separate availability gate.

Root cause: the reviewed deployment used a credential-free `git archive`, while
the prior `ManagedSessionWorkspace.plan` required `.git` through `git rev-parse`
and `git ls-files`. Merged
[PR #42](https://github.com/Loothore907/guardian-agent/pull/42) adds the strict
manifest-bound gitless-source contract and an actual gitless production-child
test. Exact-head and post-merge CI passed. Do not restart a VM or run a second
journey until a new bounded run sheet explicitly authorizes another admission. See
[the hosted-gate evidence](evidence/2026-09-07-kc-hosted-gate.md).

Conservative cumulative infrastructure estimate: USD 1.044294. The last posted
infrastructure bill is USD 0.86 and may lag. The failed USD 0.10 reservation awaits
provider reconciliation. The USD 25 allowance and USD 5 infrastructure reserve
were not changed. Disks, static addresses, DNS and exact SecretStash resources
remain retained.

## Superseded September 6 checkpoint

Checkpoint: 2026-09-06, after stopped-host protected enrollment.
This was the current pickup before the September 7 checkpoint above.

**Current state: both KC VMs are cloud-confirmed STOPPED.** The replacement ran
approximately 19:07–19:56:52 UTC and was stopped early while exact real-key transfer
approval remained pending. The cutoff heartbeat is paused after verification.
Disks, static IPs, DNS records and staged files remain retained. The fixture URLs
are offline while the host is stopped. After shutdown, the user explicitly
approved both named Nebius/Tavily transfers. Both cloud copies were enrolled and
verified against their retained Windows originals, with exact-resource runtime
payload-reader grants. No judge portal was exposed and no source commit or push
was made. Runtime retrieval/provider verification is still pending.

The new source snapshot is `2dcc7cd79e2e44f87bc1df4e9738d60303f378d6d61eee371c50145075bff472`
at `/home/guardianops/guardian-c7-2dcc7cd79e2e`. It fixes real-IPC budget clock
handling. Required suite: **679 passed / 6 skipped**, Linux platform **2/2**,
reference containment **1/1**, build and production audit passed. Synthetic
credential lifecycle, production budget-child preflight and eight host-side HTTPS
fixture hash checks passed. See [run evidence](evidence/2026-09-06-kc-continuation.md).
The older source snapshot and results below remain historical evidence.

The fixed two-resource ingress loader and disabled-by-default research-only
startup are now implemented and tested offline under
[ADR-0055](../adr/0055-protected-research-judge-startup.md). The reviewed source
manifest is bound to `0bee21f50cec47db1d015e34fdbd408d5db499d5`, and the
[approved run sheet](c7-hosted-research-run-sheet.md) plus
[mission cost baselines](c7-cost-baselines.md) define the one-journey/two-hour
scope. Next gates are the run sheet's current-state and price go/no-go checks,
then protected runtime retrieval/redaction and provider checks for the enrolled
Nebius/Tavily secrets;
authenticated ingress, live provider/budget settlement, intended-host verification
of the offline-tested
[ADR-0054](../adr/0054-operator-budget-service-clock.md) operator-update path, and
external fixture reachability. GitHub App private-key and installation setup
remain deferred to the mutation gate.
Resume only within an explicitly bounded window and establish cloud shutdown
before restarting; leave the original stopped. Do not treat the old cutoff as a
new uptime allowance. C7 remains incomplete.

September 6 continuation authority: the user approved execution of the existing
scope for two hours from replacement-VM startup, followed by cloud-level shutdown.
Use existing testing keys and the shared USD 25 allowance; leave the original
stopped. Both VMs were reverified Stopped in Console before restart preparation.
Replacement startup was requested at approximately **19:07 UTC**. The conservative
cloud-stop deadline was **21:06 UTC / 13:06 AKDT September 6**. Shutdown completed
early as recorded above. Guest shutdown and the heartbeat were fallback measures.

**Earlier window cutoff complete:** both KC VMs were confirmed **Stopped** in Nebius Console
at approximately 08:20 UTC. Guest poweroff briefly recovered to Running;
cloud-level stops completed after that transition. Disks and static addresses
are preserved and may still incur charges. Resume only the replacement in a new
bounded work window; leave the original stopped.

## Historical evidence

Earlier provisioning, synthetic fixture preparation and source snapshots are retained
in [September 5 KC evidence](evidence/2026-09-05-kc-linux-acceptance.md) and
[September 6 continuation](evidence/2026-09-06-kc-continuation.md). They do not
override the current state or next-session instructions below. Earlier intermittent
authority-child startup failures remain unresolved despite later passing runs.

## Superseded first actions from September 6

The section below is retained for provenance and must not be executed as a current
plan. The current actions are the September 7 checkpoint above.

Primary milestone: one authenticated hosted research-only journey using protected
Nebius/Tavily credentials, with admission before provider calls and durable usage
settlement afterward. This is the next acceptance slice, not a promise to finish
every C7 gate in one window. Do preparation while the VMs remain stopped:

- Use the reviewed [ADR-0054](../adr/0054-operator-budget-service-clock.md)
  operator path to refresh policy and prices on the intended host. Its
  production-child real-clock contract is tested offline; live
  KC use remains unverified. The campaign policy closed at September 6 21:01 UTC
  and its price evidence expired at 21:06 UTC. Do not reset the durable campaign
  ledger or increase the shared allowance while replacing them.
- Review the exact source manifest and concrete hosted run sheet. The protected
  ingress loader and research-only service composition are implemented offline;
  the default mode and ordinary control API still leave judge execution disabled.
- Inventory missing GitHub App installation/private-key setup and exact disposable
  targets. Keep GitHub mutation tests gated; the user OAuth slot is not a substitute.

Then execute the bounded hosted sequence:

1. Check both VMs' cloud states. Obtain a new bounded work window and resume only
   replacement `computeinstance-u00dkgrgnqdmy4vz67`; leave the original stopped.
   The September 6 continuation ended early; its approval is not indefinite uptime.
   Do not create another KC VM. Verify cost and time
   bounds for the new development window. Re-establish a bounded shutdown on
   restart: the initial `shutdown` schedule is not a recurring boot policy.
2. Use the reviewed credential-free `git archive` source bundle and manifest from
   the integrated protected-startup revision; do not reuse `2dcc7cd79e2e…` as the
   deployment source. Exclude `.env`, private state, `.git`, credentials and
   unrelated ignored files. Do not copy the whole workspace or stage all changes.
   Verify the archive and lockfile hashes on the host.
3. Reuse the installed pinned runtime dependencies and deploy the separated Guardian
   services with live execution disabled. The current snapshot's required Linux
   checks passed; rerun when code or runtime changes justify it. Complete the
   intended-host process/filesystem/credential/network probes, including direct
   network, credential-path, alternate-tool and Git-push bypass cases. Retain
   sanitized evidence. Start `pnpm start:judge-host` in disabled mode before the
   reviewed research-only descriptor is supplied. A successful `unshare` probe is
   insufficient.
4. Reuse the approved, verified copies in KC SecretStash:
   `guardian-c7-kc-dev-nebius` (`mbsec-u00vj1q4t557yq8zk4`) and
   `guardian-c7-kc-dev-tavily` (`mbsec-u00cabt74nah2z9rp4`), project
   `project-u00h7t9mkc007dezqchqwv`. Exact-resource payload-reader grants are
   installed for the runtime group; do not repeat enrollment. Verify runtime
   retrieval/redaction and fixed-provider calls. Configure selected-repository GitHub
   access using the approved credential custody design. No credential values may
   enter browser/model/public outputs, logs, source archives or worker context.
   Reuse existing enrollment where applicable; inventory safe descriptors first.
5. Bind the prepared, still-disabled persistent campaign ledger to the live
   supervised services: USD 20 API allocation plus
   USD 5 infrastructure reserve inside the shared USD 25 development allowance.
   Refresh expiring price evidence. Synthetic admission/settlement/expiry and
   cancellation checks passed; complete live usage and operator update checks.
   The local operator report exists, but
   hosted authenticated operator access and billing reconciliation are unfinished.
6. Reuse Caddy and the deployed static fixtures/DNS. Resolve external reachability,
   then deploy the authenticated portal to the approved Cloudflare domain and
   verify TLS/host-only cookies,
   ingress authentication and private IPC. Preserve the Homegrown apex and its
   existing services. Keep public static content isolated from credential services.
7. Register exact URLs and fresh disposable PR/head/base targets. Run clean/seeded
   pairs through actual providers: research/read-only first, then exact authorized
   mutations. Use three repeats of primary cases as approved, plus targeted repeats.
   Record actual model attempts, policy/Guardian decisions, external effects,
   answer fidelity, latency, usage and sanitized audit. Never reuse merged PR 3.
8. Map results to C7 exit criteria, resolve failures, and package accumulated source
   into reviewable prerequisite/C7 groups. Commit/push/PR review, required CI, merge
   and live rollout are distinct gates. Do not mark full C7 complete from local tests.

## Region and budget decisions already made

September 6 morning update: authenticated support ticket `K24958535` shows the
`eu-north1` two non-GPU vCPU request **Declined**, updated September 6 at 01:13
AKDT. Nebius cites limited capacity and suggests another region. Finland testing
is blocked on capacity/quota; no alternate host or new quota request has been
created. Both KC VMs remained Stopped at today's initial Console check.

- Keep KC and Finland as testing targets. KC comes first; Finland's request for
  two non-GPU vCPUs was declined. If capacity is subsequently approved, compare equivalent missions,
  source/fixture/model versions, latency, resource usage and cost before choosing
  the judging host. The different minimum VM sizes must be disclosed in comparison.
- No new blanket approval is needed for the already-approved bounded plan.
  Both hosts share the same allowance; this does not authorize indefinite dual
  uptime or further prepaid top-ups.
- The USD 25 Cloud Console balance is prepaid cash, not consumed service usage.
  KC's rounded console estimate is USD 0.12/hour; six hours is about USD 0.72,
  before taxes and additional network/API charges. Retained disk/IP can cost money
  after shutdown. Reconcile actual costs rather than assuming zero or exact totals.
- Previously recorded judging dates are December 1, 2026 09:00 Pacific through
  December 15, 2026 12:00 Pacific (08:00 through 11:00 Alaska respectively).
  Verify rules before final rollout. Judges need free continuous access during
  that window; the development shutdown must not carry into judging.
- Token Factory runtime calls plus the required NVIDIA model satisfy the relevant
  platform/model requirement; a Nebius Compute VM is an architecture choice.
  The current authorized test-host plan nevertheless remains KC plus Finland.

## Operational state to preserve

Selected reviewed runtime source: merged main revision
`e8aef7456a49c1a81894f00f45cde059ab5fc8fa`. Generate and record its exact
credential-free archive and manifest in a newly authorized run sheet before any
hosted action. The prior `0bee21f…` archive and older deployed snapshot remain
historical evidence, not the next deployment source.

Project: `project-u00h7t9mkc007dezqchqwv`.
Replacement: `computeinstance-u00dkgrgnqdmy4vz67`, `204.12.168.166`, STOPPED.
Original: `computeinstance-u00jbhqf6qg9jwag4g`, `204.12.170.222`, STOPPED; leave stopped.
The `stop-kc-testing-at-alaska-cutoff` automation is PAUSED after confirmed cloud
shutdown. No active timer authorizes or protects a new startup. Establish a new
bounded cutoff and cloud-stop fallback before resuming the replacement.

Ignored local operational files under `tmp/c7-acceptance/`: `kc-host.json`,
`kc-runtime-host.json`, `campaign-costs.json`, `campaign-budget.sqlite`,
`operator-costs.html`, `operator-costs.json`, `kc-source-manifest.json`, and
`kc-evidence/`. These are not included in a Git clone. The cost update helper
supports separate compute intervals; record each stop/start event. Retained
disk/address charges still require billing reconciliation.

Operator SSH user is `guardianops`; the private key remains only at
`/home/loothore907/.ssh/guardian-c7-nebius` in WSL Ubuntu-22.04. Use its existing
replacement known-hosts file, `/home/loothore907/.ssh/guardian-c7-runtime-known-hosts`.
The replacement fingerprint was verified via authenticated Nebius serial logs;
the original host's earlier first-use pin is separate. The authenticated local
operator CLI is `/home/loothore907/.local/lib/guardian-c7-operator/nebius`, profile
`guardian-c7-kc-operator`; operator authentication remains off the VM. Inspect safe
metadata only. Cloudflare browser sign-in may persist; this CLI does not manage DNS.

Private runtime state remains `/home/guardianops/guardian-c7-private/`, with
`campaign-budget.sqlite` and `budget-configuration.json`. The live ledger has one
failed admission: a 100,000-microUSD forfeiture with `usage: []`. The policy window
is expired and must not be reused. Cumulative infrastructure estimate is USD
1.044294; retained storage/IP and provider billing reconciliation remain pending.
Fixture commit is `bd63c72aa1e697e4192f53ba19f833724efb6475`; Caddy serves its
eight fixed paths from `/srv/guardian-fixtures/bd63c72aa1e6`. DNS records persist,
but URLs are offline with the host stopped. Do not republish or recreate fixtures.

Automatic review rejected refreshing the operator IP through
`checkip.amazonaws.com`. The last previously verified IP was reused; do not retry
that rejected external lookup indirectly. If operator connectivity changes, resolve
the exact source rule without widening SSH to the public internet.

## References

- [Approved test zones and hosting plan](c7-test-zones-and-hosting-plan.md)
- [September 7 hosted-gate result](evidence/2026-09-07-kc-hosted-gate.md)
- [Current KC acceptance evidence](evidence/2026-09-06-kc-continuation.md)
- [Credential placement product discussion](credential-placement-and-plan-approval.md)
- [Budget clock decision](../adr/0053-budget-queue-server-clock.md)
- [Risk-context and accounting decision](../adr/0052-c7-risk-context-and-cost-accounting.md)
- [Security claims](../security-claims.md)
- [Official competition rules](https://nebiusglobalaihackathon.devpost.com/rules)
