# C7 protected hosted research run sheet

- Status: executed once; failed closed during gitless workspace preparation;
  no retry or second journey authorized
- Date: 2026-09-06
- Tracking: issue #19
- Cost class: R2, with R3 limits only if the documented Guardian invalid-output
  escalation occurs
- Maximum: one admitted journey, one replacement VM, two hours from cloud start,
  existing cumulative USD 25 development allowance, no top-up

This run sheet authorizes preparation for and one bounded research-only acceptance
journey. It does not authorize GitHub access or mutation, a second journey,
automatic retries, a second VM, a model-policy substitution, a public pilot,
judging-period uptime, a spending increase or a security-claim promotion.

The authorized attempt ran on September 7. Gates through authenticated ingress
and budget admission passed, but the exact draft returned 503 because the
credential-free `git archive` lacks the Git metadata required by
`ManagedSessionWorkspace.plan`. The ledger forfeited its USD 0.10 reservation
with `usage: []`; no confirmation, provider call or retry followed. Both VMs are
stopped. See [the run evidence](evidence/2026-09-07-kc-hosted-gate.md) and issue
[#40](https://github.com/Loothore907/guardian-agent/issues/40). This run sheet is
spent and does not authorize another admission.

The offline successor contract in ADR-0056 adds an exact ordered file manifest
to newly generated source bundles and requires it in protected research startup.
A production-supervisor child test prepares a real extracted gitless archive.
Any future run sheet must bind a newly reviewed post-integration commit, archive,
manifest and lockfile; the historical values below remain evidence for the spent
attempt and must not be reused as the new source identity.

The approved successor is the
[September 7 retry sheet](c7-hosted-research-run-sheet-2026-09-07-retry.md).
Its authority is limited to its one exact execution and does not alter this
historical record.

## Fixed identities

| Item                    | Bound value                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| Repository              | `Loothore907/guardian-agent`                                                    |
| Reviewed runtime source | `0bee21f50cec47db1d015e34fdbd408d5db499d5`                                      |
| Source archive SHA-256  | `e5dadf164bf00c9056ec72417191e4408efb2c58e7390be56c3ffae9960a47ee`              |
| Lockfile SHA-256        | `9425effa8a472bbb356cea1472d33df3fd3c73a2d69f3ebb97576a5bac68f492`              |
| Runtime                 | Node `v24.19.0`; pnpm `11.19.0`                                                 |
| Nebius project          | `project-u00h7t9mkc007dezqchqwv`                                                |
| Replacement VM          | `computeinstance-u00dkgrgnqdmy4vz67`, 4 vCPU/16 GiB, 32 GiB disk                |
| Runtime service account | `serviceaccount-u00kxywmp8yn71epyz`                                             |
| Original VM             | `computeinstance-u00jbhqf6qg9jwag4g`; must remain stopped                       |
| Nebius provider secret  | `mbsec-u00vj1q4t557yq8zk4`; reuse, do not reenroll                              |
| Tavily provider secret  | `mbsec-u00cabt74nah2z9rp4`; reuse, do not reenroll                              |
| Judge origin            | `judge.agentic-guardian.com`                                                    |
| Fixture revision        | `bd63c72aa1e697e4192f53ba19f833724efb6475`                                      |
| Fixture roots           | `fixtures.agentic-guardian.com/v1/` and `fixtures.homegrowncannalytics.com/v1/` |

The reviewed archive starts in disabled mode and contains no resource IDs,
credential values, private state or spending authority. Verify both archive and
lockfile hashes on the VM. Do not deploy the historical `2dcc7cd…` snapshot or a
whole-workspace copy.

## Protected ingress provisioning

Provision exactly two distinct SecretStash resources in the named project:

1. `guardian-c7-kc-dev-judge-access-digest`, with the fixed payload key
   `judge_access_credential_sha256`; and
2. `guardian-c7-kc-dev-source-fingerprint-key`, with the fixed payload key
   `judge_source_fingerprint_key`.

Generate fresh high-entropy source material outside the VM, browser-visible logs,
repository and model context. Copy only the derived access digest to the first
resource and the independent fingerprint key to the second. Do not move or alter
the retained Nebius/Tavily credentials. Grant the fixed runtime service account
payload-read access to only these two new resources and the two existing provider
resources. Record the assigned `mbsec-…` IDs in ignored operator state before
constructing the strict bootstrap descriptor. No wildcard project reader is
permitted.

The public origin uses the retained replacement IPv4 and a DNS-only `A` record.
Caddy is the only public listener on TCP 80/443 and proxies to Guardian on
`127.0.0.1`. It overwrites `Host`, `X-Forwarded-Proto` and the single
`X-Forwarded-For` value and suppresses access logging for judge routes. The
research-only service exposes authenticated `POST /v1/judge/draft` and
`POST /v1/judge/confirm`; verify that the legacy direct
`POST /v1/judge/journeys`, unknown routes and unauthenticated requests cannot
start work. Do not change either apex domain or the existing fixture roots.

## Model, research and budget limits

The exact model IDs are the four entries in
[`c7-cost-baselines.md`](c7-cost-baselines.md). Before opening admission, use the
authenticated operator path to prove each exact ID is currently available and to
install a fresh price snapshot. Reconcile the active Tavily plan and bind only one
basic Search and one basic Extract. If an ID or price is unavailable, stop; do not
select a replacement in the run descriptor.

Use these limits:

| Control                        |                                              Value |
| ------------------------------ | -------------------------------------------------: |
| Development campaign allowance |                       USD 25 cumulative; unchanged |
| API allocation                 |                                  USD 20; unchanged |
| Infrastructure reserve         |                                   USD 5; unchanged |
| Incremental VM compute reserve |                     USD 0.24 maximum for two hours |
| Journey count                  |                                                  1 |
| Concurrent journeys            |                                                  1 |
| Queue capacity                 |                              0 additional journeys |
| Per-source admissions          |                                                  1 |
| Journey admission envelope     |                                   USD 0.10 maximum |
| Mission-dialogue calls         |                                                  1 |
| Guardian-risk calls            | 1 primary plus at most 1 invalid-output escalation |
| Worker calls                   |                                          2 maximum |
| Tavily calls                   |        1 basic Search plus 1 basic Extract maximum |
| Automatic provider retries     |                                                  0 |

Reconcile retained infrastructure, provider-billed amounts, ledger reservations
and delayed/unknown usage before startup. The last local snapshot recorded USD
0.912327 of infrastructure estimate, zero ledger admissions and no reconciled
provider bill; those facts are historical, not a current balance. If the fresh
authenticated prices make the exact request require more than USD 0.10, or the
conservative campaign total cannot be shown to stay within USD 25, admission
remains disabled.

## Clock and shutdown plan

Let `T0` be the authenticated cloud timestamp at which the replacement enters
`RUNNING`:

- before `T0`, establish a guest shutdown for `T0 + 105 minutes` and an independent
  operator cloud-stop fallback no later than `T0 + 120 minutes`;
- close admission at `T0 + 90 minutes` even if no journey has run;
- after the one terminal settlement, immediately disable admission and begin
  cleanup rather than using the remaining window; and
- confirm both VMs report `STOPPED` from the cloud control plane by `T0 + 120`.

Record every compute interval in the ignored campaign cost state. A guest poweroff
without cloud-state confirmation is insufficient. If the cutoff mechanism cannot
be established before startup, do not start the VM.

## Go/no-go sequence

Every item is fail-closed and must retain sanitized evidence:

1. Verify the reviewed source revision, manifest, required CI and current clean
   integration state.
2. Query the cloud control plane. Confirm the original is stopped and the
   replacement is stopped; confirm no unexpected resource, reader or billing
   change.
3. Reconcile campaign costs and prove this window plus one USD 0.10 reservation
   remains inside the unchanged allowance.
4. Establish the two cutoff mechanisms, then start only the replacement and set
   `T0` from authenticated cloud state.
5. Verify the pinned SSH host fingerprint and deploy the exact credential-free
   archive. Start `pnpm start:judge-host` in `disabled` mode first.
6. Run intended-host process, peer, filesystem, credential-path, direct-network,
   alternate-tool and Git-push bypass probes. Any failure blocks credential use.
7. Provision/read the two fixed ingress resources and verify exact-resource IAM,
   redaction, buffer cleanup and rejection of swapped or widened bindings.
8. Retrieve the existing provider slots through their fixed readers. Verify that
   credentials do not enter argv, environment, logs, responses, model context or
   the source tree.
9. Capture authenticated model availability/prices and the Tavily plan; install a
   new versioned operator price snapshot and time-bounded policy while admission
   remains disabled.
10. Verify Caddy header overwrite, no judge-route access log, TLS, exact host and
    negative routes locally and from the operator side. Enable only the reviewed
    `research_only` descriptor.
11. Run an unauthorized request and malformed near miss; prove neither reserves a
    journey nor starts a provider. Then authenticate, draft and explicitly confirm
    the one research mission.
12. Prove admission precedes provider preparation. Retain sanitized per-role usage,
    answer, latency, Guardian decision, durable settlement and audit evidence.
13. Disable admission immediately. Reconcile reservation/settlement state, stop all
    children, remove transient deployment files and confirm both VMs stopped.
14. Update issue #19 and the evidence/handoff documents. Promote no claim beyond
    the reproduced evidence.

## Operator-owned facts, not new product decisions

The executing agent owns verification of current VM state, retained charges,
operator-source firewall reachability, SecretStash resource IDs, current model
catalog and prices, Caddy behavior, timestamps, evidence capture and cleanup.
The user needs another decision only if a gate requires more money, more time,
another VM/provider, a model-policy change, a second journey, broader ingress or
credential access, GitHub capability, or a weaker acceptance criterion.
