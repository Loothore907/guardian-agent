# September 4 discovery and verification review

- Date: 2026-09-04 (AKDT)
- Base: `e5b1217`, branch `codex/13-c6-linux-provider-containment`
- Reviewed implementation: that base plus the local fixes described below
- Initial worktree: clean
- Disposition: C6 and C7 remain In progress; no assurance status is promoted

## Outcome

The reviewed deterministic boundaries preserve the product intent: model output
and retrieved content do not create authority, mission confirmation and action
approval remain separate, and privileged effects use narrow typed operations.
The complete ordinary suite passes on Windows and Linux. This review fixes two
areas of runtime behavior and reconciles stale documentation; it does not claim
an exhaustive security audit or completion of the protected competition journey.

The largest remaining gap is provider-service containment on Linux. W26 already
records real Nebius enrollment and supervised Qwen/Nemotron consumption, but
successful authentication does not establish peer isolation or hosted assurance.
W27 is an unfinished implementation/evidence slice, not a completed record.

## Findings and local fixes

### 1. Supervised child output and failed-start cleanup

`apps/reference-supervisor/src/supervised-process.ts` accepted its readiness line
and then buffered subsequent stdout until another newline. A child emitting an
unexpected unterminated fragment remained alive. The new real-child regression
failed before the fix with `still_running`, then passed after the fix.

Failed startup also sent SIGTERM and awaited exit without the forced-shutdown
deadline used by explicit close. A Linux child ignoring SIGTERM could therefore
keep startup cleanup pending indefinitely.

The supervisor now treats any nonempty stdout after readiness as a protocol
violation, shares one idempotent bounded shutdown path across failure and close,
and escalates to SIGKILL after five seconds. Bootstrap writing and readiness
share the startup deadline; stdin write errors and spawn failures are handled
without reflecting child diagnostics. Existing successful fake service and
bootstrap-isolation tests remain green.

`apps/reference-supervisor/src/supervised-process.test.ts` adds two real-child
tests using `test-fixtures/supervised-failure.mjs`. The Linux ignored-SIGTERM test
passed in approximately five seconds and verifies the child is absent before
the sanitized startup rejection completes. This is local lifecycle evidence,
not a proof of descendant-tree, OS credential, or provider IPC containment.

### 2. Private IPv4 data in outbound research

`packages/research/src/index.ts` rejected `127.0.0.1`, `10/8`, and `192.168/16`,
but missed other loopback addresses, `172.16/12`, and link-local `169.254/16`.
Five mission-relevant regression queries reached the fake provider before the
fix, contradicting the intended outbound-data screen.

The guard now covers those ranges. Five rejection cases assert provider
non-invocation; three adjacent unblocked ranges assert allowed behavior.
`packages/research/src/index.test.ts` passes all 28 tests. This guards query
content sent to a research provider; it is not a network firewall or a complete
private-data detector. IPv6, alternate address representations, encoding
variants, and broader secret-corpus coverage remain C9 candidates.

### 3. Current status and evidence drift

The README, roadmap, and active C6 handoff still listed Linux provider consumption
as pending even though W26 records its completion. The C7 exit criteria also
required an external scaffold despite ADR-0015's native-worker selection. These
statements now agree with the accepted product contract.

ADR-0040 cited an absent Linux harness and nonexistent W27 evidence. It now
points to the actual opt-in `scripts/nebius-models-live.test.mjs` and W26 record,
while retaining broader containment as open. The custody plan and handoff now
describe the implemented controls without implying W27 is complete.

The architecture diagram is explicitly a target composition, the claim matrix
defines its existing `Implemented locally` label, and claims distinguish the
proven direct setup-risk service call from the still-unproven complete assisted
pre-activation flow. Historical PR #14 review data remains historical. CI policy
distinguishes configured checks from intended future coverage.

The provisional video allocation ended at exactly 3:00 despite the recorded
under-three-minute requirement. It now ends at 2:58 and explicitly retains the
unmet recording gates; no final video or qualification evidence is claimed.

## Intent-to-flow trace

| Flow                                                                | Current control and evidence                                                                                                                                                                                                                                            | Remaining boundary                                                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft → clarification → compiled mission → confirmation             | `packages/session/src/formation.ts`, supervisor bootstrap and CLI suites cover bounded revisions, ceilings, risk, exact digest, expiry, and one-use confirmation.                                                                                                       | Complete protected assisted pre-activation journey and user-verifying ceremony.                                                                                                   |
| Confirmed session → native worker → typed tool → result             | W1-W4, worker execution and workspace suites bind the catalog, one pending request, durable budgets, denial, and final turn.                                                                                                                                            | Worker-visible research/GitHub dispatch and persistent multi-turn state. The current worker catalog is status/local-command only.                                                 |
| Public research → untrusted evidence → attempted action             | Research gateway and controlled-journey suites cover outbound screening, exact Extract URLs, budgets, provenance, and scope denial. W19-W22 record protected separate/assembled no-effect runs.                                                                         | Worker-generated polluted-content attempt; broader outbound corpus and provider-side redirect assurance.                                                                          |
| Proposal → deterministic floor → Nemotron → exact approval → GitHub | Policy property tests preserve the floor. Broker and authority suites cover revalidation, changed head, expiry, replay, caller/connection binding, atomic consumption, and sanitized uncertain outcomes. W23 records the separately approved Windows disposable effect. | Linux GitHub ceremony, WebAuthn, and the protected effect-completing coordinator. Existing development confirmation is not a passkey.                                             |
| BYOK enrollment → OS store → fixed provider service                 | Loopback and transactional-store tests; ADR-0042/W26 record user-operated Windows/Linux Nebius enrollment and bounded service consumption.                                                                                                                              | Full provider-service peer/containment and artifact/process corpus evidence; Tavily browser enrollment and macOS remain separate.                                                 |
| Judge ingress → reserve → paid roles → settle                       | Budget/ingress tests cover fixed auth, deployment/role binding, admission order, bounded accounting, and terminal settlement.                                                                                                                                           | Concrete hosted startup, SecretStash ingress-secret resolution, Caddy, IAM, prices, calibration, load, funding, and deployment. The default executable leaves the route disabled. |

## Linux C6 residual

Source inspection finds `LinuxPeerVerifier` wired into
`apps/authority-service/src/index.ts` and
`apps/managed-demo-budget-service/src/index.ts`. Their native platform evidence
must not be generalized to all local IPC.

Interaction, mission-review, Guardian setup/action-risk, worker, research, and
broker IPC currently use exact capability/binding checks but lack equivalent
kernel peer verification and explicit owner-only socket setup. The relevant
sources are `packages/interaction/src/*ipc.ts`, `packages/guardian/src/*ipc.ts`,
`packages/worker/src/index.ts`, `packages/research/src/ipc.ts`, and
`packages/broker/src/ipc.ts`. This is a missing control as well as missing evidence;
another successful paid inference call alone cannot close it.

The next bounded slice should implement and test the selected peer/socket policy
for the Qwen/Nemotron service paths, including an unrelated process possessing a
valid capability, wrong UID/GID/ancestry, permission and symlink near misses,
minimal bootstrap/environment/argv, shutdown, and sanitized failures. Extend to
the other credential-holding paths before claiming general provider containment.
Then capture intended-host evidence using already enrolled credentials under a
bounded protected-run authorization, followed by the separate exact disposable
Linux GitHub read/merge ceremony.

## Remote progress checked read-only

GitHub was inspected during this review:

- [Issue #13](https://github.com/Loothore907/guardian-agent/issues/13) remains open.
  Its original body does not yet track the W24-W26 progress or current residual.
- [PR #17](https://github.com/Loothore907/guardian-agent/pull/17) remains open and
  unmerged at `bca431338035fd173a50074473eb62cb04dfcb53`, on the earlier peer-credentials
  branch; it is not the current local containment branch.
- [CI run 33828946554](https://github.com/Loothore907/guardian-agent/actions/runs/33828946554)
  passed required checks and Linux platform checks, then failed the production
  dependency audit. Job `100887552540` records three npm advisory bulk-endpoint
  timeouts, ending with error 23. No advisory result was obtained; this is neither
  a clean vulnerability scan nor evidence of a reported vulnerability.

No comments, issue changes, workflow retries, commits, pushes, merges, provider
calls, enrolled-credential reads/writes, or deployments were performed by this review.
Current competition rules and prices were not revalidated; their recorded source
dates and release-checkpoint requirements still apply.

## Verification

Windows:

```powershell
.\scripts\pnpm.ps1 exec vitest run apps/reference-supervisor/src/supervised-process.test.ts packages/research/src/index.test.ts
.\scripts\pnpm.ps1 check
git diff --check
```

Linux, from a private ext4 source stage with Node 24.19.0, pnpm 11.19.0, a compiler,
and the locked dependencies available offline:

```sh
pnpm install --offline --frozen-lockfile
pnpm typecheck
pnpm build:linux-peer-helper
pnpm exec vitest run apps/reference-supervisor/src/supervised-process.test.ts packages/research/src/index.test.ts
pnpm check
pnpm test:linux-platform
```

The stage contained tracked source from `e5b1217` plus the five changed source,
test, and fixture files. It contained no `.env.local`, enrolled credentials, or
copied ignored workspace state. It reused the retained Node 24 runtime and all
235 dependency packages offline, with no downloads.
The private test stage and temporary source archives were removed after verification.

| Check                                     | Windows                                           | Linux                                            |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Focused regressions                       | 2 files / 35 passed                               | 2 files / 35 passed                              |
| Complete Vitest suite                     | 72 files / 534 passed; 4 files / 10 tests skipped | 72 files / 538 passed; 4 files / 6 tests skipped |
| SQLite spike                              | 7 passed; 1 POSIX skip                            | 8 passed                                         |
| Reset planner                             | 2 passed                                          | 2 passed                                         |
| Dependency boundaries                     | 202 modules / 428 edges, no violations            | 202 modules / 428 edges, no violations           |
| Format, lint, typecheck, production build | Passed                                            | Passed                                           |
| Native Linux platform probes              | Separate Linux run                                | 2 passed                                         |

`git diff --check` passed. A read-only scan of local Markdown file links across
tracked documents plus this review found zero missing targets; remote URLs and
heading anchors were not part of that file-existence check.

WSL emitted a systemd-user-session startup warning during stage preparation.
The credential-free checks passed without requiring Secret Service. This review
does not infer current keyring readiness or invalidate the earlier user-operated
W26 evidence from that warning. It does not repeat credential enrollment.

## Prioritized pickup

1. Finish the concrete Linux provider IPC controls and intended-host containment
   evidence described above; preserve W26's completed credential bridge.
2. Prepare the exact Linux disposable GitHub ceremony, including enrollment,
   approvals, expected mutation, rollback, and cleanup, before protected execution.
3. Reconcile the remote issue/PR under explicit remote-write authority; retain
   the dependency audit as a required gate until it returns a result.
4. Finish only the missing C7 evaluation and worker-generated polluted-content
   evidence; then complete C8 WebAuthn and the single-invocation experience.
5. Resume hosted judge work at its recorded seam once the higher-priority gates
   permit it. Persistent plan grants remain a Goal; approval-friction policy in
   this repository is not runtime implementation evidence.

Focused owner effort was not separately measured, so no retrospective effort
estimate or revised delivery date is invented. C0-C5 retain their recorded
checkpoint status. Cross-cutting C8 components and hosted-budget work do not
constitute a passed C8-C11 checkpoint.
