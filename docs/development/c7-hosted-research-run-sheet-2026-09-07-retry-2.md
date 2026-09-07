# C7 protected hosted research retry 2 — September 7, 2026

- Status: approved for one execution in the active September 7 Codex session
- Tracking: issue #19
- Repository base: `main` at `a85477888a44d8d9f0b520b661d103af7f406f7d`
- Hosted source: `95648b58a871664ef6e29c9713bb2e7dacaa4f05`
- Cost class: R2, with one R3 invalid-output escalation only
- Maximum new exposure: USD 0.34 (USD 0.24 compute plus one USD 0.10
  journey reservation)

This sheet authorizes one KC research-only attempt in the absolute window below.
It does not authorize GitHub access or mutation, a second admission, an automatic
retry, a new VM, a new provider, a model-policy substitution, broader IAM, a
spending increase, public judging uptime or a security-claim promotion.

## Absolute window

| Gate | Absolute UTC time |
| --- | --- |
| Earliest replacement startup | 2026-09-07 20:00:00 UTC |
| Latest replacement startup | 2026-09-07 20:05:00 UTC |
| Admission closes | 2026-09-07 21:30:00 UTC |
| Guest shutdown begins | 2026-09-07 21:45:00 UTC |
| Both VMs cloud-confirmed stopped | 2026-09-07 22:00:00 UTC |

The independent cloud-stop fallback must be armed before replacement startup.
If this sheet is not merged or the replacement is not started by 20:05 UTC, the
window expires without execution. Starting earlier than 20:00 UTC or extending
any deadline is not authorized. Cleanup begins immediately after any terminal
settlement or earlier abort.

## Exact reviewed source

| Item | Bound value |
| --- | --- |
| Repository | `Loothore907/guardian-agent` |
| Git revision | `95648b58a871664ef6e29c9713bb2e7dacaa4f05` |
| Source archive SHA-256 | `de1584e28603873dc9a90fba9355664b65c844cb98537be4eefd86143dce8a12` |
| Lockfile SHA-256 | `9425effa8a472bbb356cea1472d33df3fd3c73a2d69f3ebb97576a5bac68f492` |
| Manifest | schema 1, `immutable_file_manifest`, 530 entries, 107,845 bytes |
| Archive | 3,993,600 bytes; no `.git` or `.env.example` entries |
| Runtime | Node `v24.19.0`; pnpm `11.19.0` |

Only documentation changed between the hosted revision and the repository base.
The same-session complete-repository `pnpm check` passed with 689 tests passed,
18 skipped, all standalone gates, dependency boundaries and the production build.
The retained ignored bundle is under `tmp/c7-acceptance/kc-retry-95648b5/`; its
archive digest was re-read and matched. Deploy only its exact tar and manifest.

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
credential named `guardian-c7-kc-retry-2-judge-bearer`. Copy only its lowercase
SHA-256 digest as a new primary version of the existing access-digest resource.
The bearer itself must not enter argv, environment, source, browser-visible logs,
model context, responses or retained evidence. Do not replace the fingerprint or
provider values. Delete the temporary credential after terminal settlement or
earlier abort and verify that it is missing.

Recheck the existing exact-resource payload-reader grants and the runtime group's
sole service-account membership. Unknown, missing, swapped, widened or newly
added readers fail closed. No credential is moved or revoked.

## Budget and call limits

The cumulative development allowance remains USD 25 with the existing USD 5
infrastructure reserve and no top-up. Reconcile current infrastructure, retained
resource charges, the earlier forfeited USD 0.10 reservation and provider usage
before startup. The USD 1.110945 conservative infrastructure estimate and the
provider dashboard's last recorded USD 1.01 compute total are historical floors,
not current balances.

| Control | Limit |
| --- | ---: |
| Replacement compute | until 22:00 UTC / USD 0.24 maximum |
| Journey admissions | 1 |
| Concurrent journeys | 1 |
| Queue | 0 |
| Journey reservation | USD 0.10 maximum |
| Mission-dialogue calls | 1 |
| Worker calls | 2 |
| Guardian-risk calls | 1 primary plus at most 1 invalid-output escalation |
| Tavily calls | 1 basic Search plus 1 basic Extract |
| Automatic provider retries | 0 |

## Ordered fail-closed execution

1. Confirm this run-sheet PR is merged, the hosted source/build is unchanged and
   the retained archive, lockfile and manifest match the bound values.
2. Query the cloud control plane. Both VMs must be stopped and resource, reader,
   billing and provider-usage state must match the retained record.
3. Prove the USD 0.34 maximum remains inside the unchanged allowance. Arm the
   independent cloud-stop fallback, then start only the replacement inside the
   permitted startup interval.
4. Transfer and hash-verify the exact bundle. Use the retained offline pnpm store.
   Start `pnpm start:judge-host` in `disabled` mode first.
5. On the reduced archive run only `pnpm test:linux-platform`,
   `pnpm test:reference-runtime` and the reviewed standalone process, peer,
   filesystem, metadata, credential-path, direct-network, alternate-tool and
   Git-push bypass probes. Missing development fixtures are expected and must not
   be restored or treated as a production failure.
6. Recheck Caddy locally and require 10 of 10 fresh operator-side TCP/TLS and
   negative-route requests over at least five minutes without an SSH tunnel. Any
   timeout or unexpected response blocks credentials and the journey.
7. Rotate only the access digest, verify both fixed ingress resources, recheck
   exact IAM and retrieve the existing provider slots through fixed readers.
   Verify redaction and transient-buffer cleanup.
8. Capture fresh authenticated availability and prices for the four fixed model
   IDs and reconcile Tavily usage. Install one versioned price snapshot and the
   time-bounded policy while admission remains disabled. Missing, stale, changed
   or unaffordable evidence blocks execution.
9. Enable only the reviewed `research_only` descriptor. Prove unauthenticated and
   malformed requests create no reservation and start no provider process.
10. Submit the exact two-fixture, no-GitHub, 300-second draft and explicitly
    confirm it. Prove admission precedes provider preparation. Retain only the
    sanitized answer, latency, per-role usage, Guardian decision, settlement and
    audit evidence. Once admitted, any outcome consumes the attempt; do not retry.
11. Disable admission, reconcile durable ledger and provider usage, stop all
    children, delete the temporary bearer and named deployment transients, and
    cloud-stop the replacement. Confirm both VMs stopped and pause the cutoff
    automation no later than the absolute deadlines.
12. Record only reproduced results on a separate issue-linked evidence branch.
    A runtime defect returns to an offline fix and is not patched live or retried.

## Integration scope

The approved repository actions are a Conventional commit, feature-branch push,
pull request, exact-head required CI and protected squash merge for this sheet,
followed after execution by a separate issue-linked evidence branch and the same
protected integration path. Failed, missing, skipped or stale checks may not be
bypassed. Source-code repairs, releases, deployments beyond the exact replacement
VM and protected-branch direct writes remain outside this sheet.
