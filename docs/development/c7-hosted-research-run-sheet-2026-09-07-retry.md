# C7 protected hosted research retry — September 7, 2026

- Status: approved for one execution in the active September 7 Codex session
- Tracking: issue #19
- Source base: `main` at `95648b58a871664ef6e29c9713bb2e7dacaa4f05`
- Cost class: R2, with one R3 invalid-output escalation only
- Maximum new exposure: USD 0.34 (USD 0.24 compute plus one USD 0.10
  journey reservation)

This sheet authorizes one second KC research-only attempt after the first sheet
was consumed by the failed-closed gitless workspace preparation. It does not
authorize GitHub access or mutation, a second admission, an automatic retry, a
new VM, a new provider, a model-policy substitution, broader IAM, a spending
increase, public judging uptime, or a security-claim promotion.

## Exact reviewed source

| Item | Bound value |
| --- | --- |
| Repository | `Loothore907/guardian-agent` |
| Git revision | `95648b58a871664ef6e29c9713bb2e7dacaa4f05` |
| Required exact-head build | GitHub Actions run 124 (`34097397041`), successful |
| Source archive SHA-256 | `de1584e28603873dc9a90fba9355664b65c844cb98537be4eefd86143dce8a12` |
| Lockfile SHA-256 | `9425effa8a472bbb356cea1472d33df3fd3c73a2d69f3ebb97576a5bac68f492` |
| Manifest | schema 1, `immutable_file_manifest`, 530 entries, 107,845 bytes |
| Archive | 3,993,600 bytes; no `.git` or `.env.example` entries |
| Runtime | Node `v24.19.0`; pnpm `11.19.0` |

The ignored local bundle is under `tmp/c7-acceptance/kc-retry-95648b5/`.
Deploy only its exact tar and manifest. Verify both hashes again after transfer
and before extraction. Never substitute a working-tree copy, add Git metadata,
or reuse the historical `0bee21f…` archive.

Offline verification at this revision passed `pnpm check`: formatting, lint,
typecheck, 689 tests passed / 18 skipped, all script gates, 242-module/558-edge
dependency boundaries and the production build. The generated archive digest
was independently re-read and matched the manifest.

## Fixed infrastructure and credential scope

| Item | Bound value |
| --- | --- |
| Nebius project | `project-u00h7t9mkc007dezqchqwv` |
| Replacement VM | `computeinstance-u00dkgrgnqdmy4vz67`, 4 vCPU/16 GiB |
| Original VM | `computeinstance-u00jbhqf6qg9jwag4g`; must remain stopped |
| Runtime service account | `serviceaccount-u00kxywmp8yn71epyz` |
| Nebius provider resource | `mbsec-u00vj1q4t557yq8zk4`; reuse unchanged |
| Tavily provider resource | `mbsec-u00cabt74nah2z9rp4`; reuse unchanged |
| Access-digest resource | `mbsec-u00mq5e5ndqw9g0y38` |
| Fingerprint resource | `mbsec-u00a9qnjp1bsqb5x64`; reuse unchanged |
| Public origin | `judge.agentic-guardian.com` |
| Fixture revision | `bd63c72aa1e697e4192f53ba19f833724efb6475` |

Generate one fresh bearer into a temporary Windows Credential Manager generic
credential named `guardian-c7-kc-retry-judge-bearer`. Copy only its lowercase
SHA-256 digest as a new primary version of the existing access-digest resource.
The bearer itself must not enter argv, environment, source, browser-visible logs,
model context, responses or retained evidence. Do not replace the fingerprint
key or provider values. Delete the temporary credential after the terminal
settlement or earlier abort and verify that it is missing.

The existing exact-resource payload-reader grants and the runtime group's sole
service-account membership must be rechecked. Unknown, missing, swapped, widened
or newly added readers fail closed. No credential is moved or revoked.

## Budget, calls and clock

The cumulative development allowance remains USD 25 with the existing USD 5
infrastructure reserve and no top-up. Reconcile current infrastructure, retained
resource charges, the earlier forfeited USD 0.10 reservation and provider usage
before startup. The recorded USD 1.044294 infrastructure estimate and last posted
USD 0.86 bill are historical floors, not current balances.

| Control | Limit |
| --- | ---: |
| Replacement compute | two hours / USD 0.24 maximum |
| Journey admissions | 1 |
| Concurrent journeys | 1 |
| Queue | 0 |
| Journey reservation | USD 0.10 maximum |
| Mission-dialogue calls | 1 |
| Worker calls | 2 |
| Guardian-risk calls | 1 primary plus at most 1 invalid-output escalation |
| Tavily calls | 1 basic Search plus 1 basic Extract |
| Automatic provider retries | 0 |

Let `T0` be the authenticated cloud timestamp at which the replacement becomes
running. Arm the independent cloud-stop fallback before startup; install the
guest shutdown immediately after boot. Close admission by `T0 + 90 minutes`,
guest shutdown by `T0 + 105 minutes`, and confirm both VMs stopped by
`T0 + 120 minutes`. After any terminal settlement, disable admission and begin
cleanup immediately.

## Ordered fail-closed execution

1. Confirm the source PR, exact build, clean integration state and bundle hashes.
2. Query the cloud control plane. Both VMs must be stopped and resource, reader,
   billing and provider usage state must match the retained record.
3. Prove the new USD 0.34 maximum remains inside the unchanged allowance. Arm
   the cloud-stop fallback, start only the replacement, and establish `T0`.
4. Inventory the expired bootstrap descriptors, one-off helpers and prior
   deployment files left by the first attempt. Record exact absolute paths and
   hashes in ignored evidence. Delete only that explicit list, without globs or
   broad recursive targets. Preserve `/home/guardianops/guardian-c7-private/`,
   its durable ledger/configuration, `/srv/guardian-fixtures/bd63c72aa1e6`, and
   all sanitized evidence.
5. Transfer and hash-verify the exact bundle. Start `pnpm start:judge-host` in
   `disabled` mode first. Run Linux, production, process, peer, filesystem,
   metadata, credential-path, direct-network, alternate-tool and Git-push bypass
   probes. Any failure blocks credential use.
6. Recheck Caddy locally and require 10 of 10 fresh operator-side TCP/TLS and
   negative-route requests over at least five minutes, without an SSH tunnel.
   Any timeout or unexpected response blocks the journey. This is a narrow run
   gate, not a hosted-availability claim.
7. Rotate only the access digest, verify both fixed ingress resources, recheck
   exact IAM, and retrieve the existing provider slots through their fixed
   readers. Verify redaction and transient-buffer cleanup.
8. Capture fresh authenticated availability and prices for the four exact model
   IDs in `c7-cost-baselines.md`; reconcile the Tavily plan. Install one new
   versioned price snapshot and time-bounded policy while admission is disabled.
   Missing, stale, changed or unaffordable evidence blocks execution.
9. Enable only the reviewed `research_only` descriptor. Prove unauthenticated and
   malformed requests create no reservation and start no provider.
10. Submit the exact two-fixture, no-GitHub, 300-second draft and explicitly
    confirm it. Prove admission precedes provider preparation. Retain only
    sanitized answer, latency, per-role usage, Guardian decision, settlement and
    audit evidence. Once admitted, any failure consumes the attempt; do not retry.
11. Disable admission, reconcile the durable ledger and provider usage, stop all
    children, delete the temporary bearer and approved transient deployment
    files, and cloud-stop the replacement. Confirm both VMs stopped and pause the
    cutoff automation.
12. Update issue #19, evidence, costs, security claims and current handoff only to
    the reproduced result. A runtime defect returns to a separate issue-linked
    offline fix; it is not patched live or retried in this window.

## Integration scope

The approved repository actions are a Conventional commit, feature-branch push,
pull request, required exact-head CI and protected squash merge for this run
sheet, followed after execution by a separate `codex/19-kc-retry-evidence`
documentation branch and the same protected integration path. No failed, missing,
skipped or stale check may be bypassed. Source code repairs, releases, deployments
beyond this exact VM, and protected-branch direct writes are outside this sheet.
