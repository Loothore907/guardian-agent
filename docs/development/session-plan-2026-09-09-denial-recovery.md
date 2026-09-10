# Approved local denial/recovery implementation — issue #19

Status: explicitly approved by the user on September 9, 2026. This plan covers
the documentation repair and protected integration of PR #62, then one local-only
implementation slice for the first work package in the
[evidence-first delivery plan](evidence-first-delivery-plan.md).

## Outcome and acceptance

Produce one deterministic local journey through the production composition that:

1. exposes the controlled release fixture to the native worker;
2. expresses a typed request for the unauthorized verification destination;
3. records deterministic denial before provider dispatch for that request;
4. returns sanitized denial feedback to the same worker session under the same
   grant and non-increasing budget;
5. completes the authorized summary with October 1, the version 2.4 prerequisite,
   and a contract-compatible citation; and
6. leaves durable terminal authority state, ordered audit evidence and stage timing
   consistent with the public result.

The deterministic harness must traverse the supported runtime boundary and remain
labelled separately from actual-model behavior. A safe denial without the useful
answer is incomplete. Model resistance, malformed output, Guardian denial, provider
execution and missing evidence remain distinct results.

## Repository and integration

- Repository: `Loothore907/guardian-agent`.
- Owner: [issue #19](https://github.com/Loothore907/guardian-agent/issues/19).
- First repair branch: `codex/19-evidence-first-roadmap`, PR #62, based on reviewed
  main `ebcefdf84bc71a38c2215c0795962de41d3a242f`.
- Implementation branch after protected PR #62 integration:
  `codex/19-denial-recovery-evidence`, based on refreshed `main`.
- Authorized Git actions: focused Conventional commits, feature-branch pushes,
  PR #62 update and protected squash merge after review and exact-head green CI,
  implementation draft-PR creation/update, issue #19 factual updates, and required
  post-merge main verification.
- The implementation PR merge, releases, deployments, direct main writes, force
  pushes, branch deletion and unrelated issue mutation are excluded.

Resolve PR #62 before new runtime work. Correct its WebAuthn competition-scope
contradictions, three-scenario wording and active-harness heading, run the full
validation lane, push the exact candidate, and merge only after the required build
passes. Create the implementation branch from verified post-merge `main`; do not
stack it on an unintegrated planning branch.

## Implementation work

Keep the slice within the existing typed worker, authority and research boundaries:

1. Preserve an allowlisted denial cause and stage instead of collapsing an eligible
   external-tool rejection to an unclassified denial. Do not reflect hostile payloads,
   arbitrary provider text, credentials or chain-of-thought.
2. Add the smallest explicit successful durable terminal transition so a completed
   journey does not remain `active`. Expired, interrupted and revoked states retain
   their existing meanings and fail-closed behavior.
3. Persist an ordered sanitized chain for proposal, deterministic decision,
   provider/adapter dispatch disposition, worker feedback, useful completion and
   terminal state. Retain bounded request/decision identifiers, fixture provenance
   and stage timestamps only.
4. Exercise the existing bounded continuation loop through the reference-supervisor
   production composition with deterministic provider transports. Do not add
   arbitrary HTTP, arbitrary destinations or a general coordinator.
5. Test allowed behavior and near misses: zero forbidden provider calls; one allowed
   fixture retrieval; exact session/grant/budget continuity; correct final answer;
   ordered audit and terminal state; unchanged critical, repeated-violation,
   expiry, revocation, replay and binding stop semantics.
6. Add a reproducible evidence record and reconcile the handoff and security claims.
   Promote no assurance or C7 status beyond the exact evidence.

## Time, spend and retry limits

- Maximum focused implementation time: six hours. CI, installation and provider
  waiting do not count as focused time.
- Provider spend: USD 0. Admissions: zero. Paid/model/research provider calls: zero.
- Start no VM, tunnel, hosted listener or deployment. Perform no credential copy,
  enrollment, refresh, revocation or cloud mutation.
- Permit at most three diagnosed local journey repair/retry cycles. Do not repeat an
  unchanged failure.
- After focused tests pass, permit at most two full-suite attempts. A failing source
  check must be diagnosed and repaired locally before another run.
- Permit one CI rerun only for cancellation or infrastructure failure. A source or
  test failure requires a new reviewed commit rather than an unchanged rerun.

## Stop conditions

Stop and report the exact blocker under issue #19 if completion would require:

- a new production dependency;
- an arbitrary authenticated transport, caller-selected header or widened destination;
- weaker deterministic denial, binding, replay, expiry or revocation behavior;
- making trusted-service failure or critical violations recoverable;
- a persistence redesign materially broader than the terminal-state and audit slice;
- a paid/hosted action or credential operation outside this plan; or
- more than the declared time or retry limits.

## Validation and closeout

Run the narrowest affected tests during repair. Before review, run `pnpm check`,
`node scripts/change-validation.mjs --base origin/main --head HEAD --check`, the
change-validation and session-hygiene tests, `git diff --check`, and exact-diff
security review. The required GitHub Actions `build` remains separate evidence.

Close local child processes and remove only session-created temporary artifacts.
Run `node scripts/session-hygiene.mjs close --remote`. Report exact branch/head,
tests, PR and CI state, audit/terminal evidence, remaining changed paths, zero spend,
zero hosted effects and any issue-owned residual. Do not call the session complete
until the useful local journey and authorized integration outcome both pass.
