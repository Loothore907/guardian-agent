# Session plan: prepare the next bounded KC hosted retry

Date: 2026-09-07. Tracking: issue
[#19](https://github.com/Loothore907/guardian-agent/issues/19).

Status: approved for documentation and protected Git integration only. This
session does not authorize starting either VM, changing cloud resources or IAM,
creating or copying credentials, calling providers, admitting a journey, or
spending against the development allowance.

## Repository scope

| Item | Bound value |
| --- | --- |
| Repository | `Loothore907/guardian-agent` |
| Base | `main` at `971ef17f1bb39195d03dbf401a963b1e302efd58` |
| Branch | `codex/19-kc-hosted-retry-2` |
| Issue | #19, C7 guardian runtime and acceptance evidence |
| Deliverable | This plan and a current-handoff link |
| Required local check | Complete-repository `pnpm check` |
| Integration | Conventional commit, feature-branch push, pull request, exact-head required CI, protected squash merge |

The remote-aware start check passed from clean, synchronized `main`. GitHub had
no open pull requests or inherited integration debt. Exact-head main CI run
[`34147680727`](https://github.com/Loothore907/guardian-agent/actions/runs/34147680727)
passed.

## Reviewed source and operational baseline

The last reviewed hosted-source revision remains
`95648b58a871664ef6e29c9713bb2e7dacaa4f05`. Only run-sheet, retry-evidence and
handoff documentation changed between that revision and this plan's base. The
retained credential-free archive under `tmp/c7-acceptance/kc-retry-95648b5/`
still matches its recorded SHA-256
`de1584e28603873dc9a90fba9355664b65c844cb98537be4eefd86143dce8a12`.
This planning session does not regenerate or deploy it.

Both KC VMs are last recorded authenticated `STOPPED`; that is retained evidence,
not a new cloud query in this session. The prior retry window expired without an
admission, credential activation or provider request. Its missing-fixture results
came from running the complete development suite inside the intentionally reduced
deployment archive. They are not a product defect and do not justify adding the
excluded fixtures to the production manifest.

## Work in this session

1. Record this bounded plan and link it from the current handoff.
2. Run `pnpm check` only in the complete repository.
3. Inspect the exact diff and branch head.
4. Commit with a Conventional issue-linked message, push the feature branch and
   open a pull request containing `Refs #19`.
5. Require the exact-head `build` check to pass. Inspect the final PR head and
   unresolved review state before a protected squash merge.
6. Verify post-merge `main` and its exact-head CI, then run the repository closeout
   check or record its exact blocker.

No run sheet with live timestamps is created in this session. Absolute admission,
guest-shutdown and cloud-stop times are meaningful only after an execution window
is selected, and they must be integrated before either VM is started.

## Proposed next hosted-execution slice

A later approved session should create and integrate a fresh run sheet from then-
current `main`. It may reuse the reviewed runtime candidate only after reconfirming
that no runtime-relevant source changed and rechecking the exact archive, manifest,
lockfile and exact-head build.

The fresh sheet should retain the existing narrow scope unless the user explicitly
changes it:

- issue #19 and repository `Loothore907/guardian-agent`;
- replacement VM `computeinstance-u00dkgrgnqdmy4vz67` only, with original VM
  `computeinstance-u00jbhqf6qg9jwag4g` remaining stopped;
- the existing exact Nebius, Tavily, access-digest and fingerprint resources and
  exact-resource readers, with no IAM widening;
- one temporary local bearer credential, copying only its lowercase SHA-256 digest
  into the existing access-digest resource, then deleting and verifying removal of
  the local credential after settlement or abort;
- no GitHub access or mutation, no new VM or provider, one admission, no queue,
  no automatic retry, and the same fixed model and Tavily call caps;
- at most two replacement-VM hours and USD 0.34 of new exposure inside the
  unchanged cumulative USD 25 allowance and USD 5 infrastructure reserve, subject
  to current billing and remaining-funds reconciliation;
- fresh absolute admission-close, guest-shutdown and cloud-stop timestamps, with
  an independent cloud-stop fallback armed before replacement startup.

## Hosted gates for that later session

The later run must fail closed in this order:

1. Reconfirm repository, exact source/build, archive, manifest and lockfile; run
   complete `pnpm check` in the full repository, not on the VM archive.
2. Authentically verify both VM states, retained resources/readers, billing,
   provider usage and available allowance while both VMs remain stopped.
3. Arm cloud-stop fallback, start only the replacement and bind the absolute clock.
4. On the reduced archive, run only `pnpm test:linux-platform`,
   `pnpm test:reference-runtime` and the reviewed standalone process, peer,
   filesystem, metadata, credential-path, direct-network, alternate-tool and
   Git-push probes.
5. Require 10 of 10 fresh operator-side TCP/TLS and negative-route requests over
   at least five minutes, without an SSH tunnel, before credential activation.
6. Recheck exact IAM, credential retrieval/redaction, authenticated prices and
   policy while admission remains disabled. Any changed, missing, stale or
   unaffordable evidence blocks execution.
7. Enable only the reviewed research-only descriptor, prove authentication and
   schema near misses create no reservation or provider process, then submit and
   explicitly confirm the exact two-fixture, no-GitHub journey once.
8. After success, failure or ambiguity, disable admission; reconcile durable
   settlement and provider usage; stop children; delete the temporary bearer and
   named transients; cloud-stop the replacement; confirm both VMs stopped; and
   pause the cutoff automation.

Public HTTPS reliability is the first still-open hosted gate. A passing loopback,
SSH-forwarded request, local model call, admission or reference-runtime test does
not establish public availability, a successful hosted journey or an `Enforced`
assurance state.

## Later evidence integration

After the hosted window, use a separate issue-linked evidence branch and protected
PR to record only reproduced facts in issue #19, the cost record, evidence, security
claims and current handoff. A runtime defect returns to a separate offline fix; it
must not be patched live or retried inside the bounded window.
