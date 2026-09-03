# W22 assembled live no-effect evidence

- Date: 2026-09-03 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Protected single-session assembled no-effect path passed

## Boundary under test

W22 composes the previously separate protected boundaries inside one enforced
session and one durable authority store:

```text
live Tavily Search
  -> controlled commit-pinned Extract
  -> minimized untrusted exposure registration
  -> exact out-of-scope broker denial before model evaluation
  -> exact in-scope broker proposal without approval
  -> live Nemotron evaluation
  -> pre-effect denial
  -> durable minimized audit inspection
```

The same three opaque exposure identifiers bind both broker attempts. Retrieved
text remains untrusted and is never used to construct either canonical request.
The second request is in scope only so it reaches the Guardian action-risk
boundary; omission of approval guarantees that a preserved `confirm` floor cannot
reach the GitHub adapter.

## Harness design

The existing protected Tavily harness retains its standalone behavior. A separate
`assembled-no-effect-live.test.mjs` wrapper opts into the W22 continuation, starts
the real Nemotron child, binds its one-use risk envelope to the second request,
and performs both decisions through the same real broker child. This avoids
duplicating a second live harness and does not make the standalone Tavily command
depend on a Nebius credential.

The assembled mode accepts only the valid pre-effect live-model outcomes
`approval_mismatch`, `guardian_step_up`, or `guardian_denied`. Unavailability,
unexpected success, adapter access, tool consumption, malformed evidence, or an
audit mismatch fails the test.

## Protected result

The protected command is:

```powershell
pnpm test:live:assembled-no-effect
```

The run passed in 27,216.1275 ms for the test / 27,461.6919 ms total:

```text
[guardian-live] credential available
[guardian-live] Nebius credential available for assembled no-effect path
[guardian-live] session launched
[guardian-live] research service ready
[guardian-live] Search accepted 2 untrusted result(s)
[guardian-live] controlled Extract accepted 1 untrusted result
[guardian-live] Nemotron risk service ready for assembled path
[guardian-live] broker service ready
[guardian-live] unsafe proposal denied with scope_mismatch
[guardian-live] in-scope proposal remained pre-effect: approval_mismatch
[guardian-live] assembled audit confirms deterministic pre-model denial, live model evaluation, and no approval, tool, adapter, credential, or GitHub effect
```

The reopened store contained three minimized exposures, two attempts, and two
decisions. The unsafe decision recorded `scope_expansion`, `guardianOutcome:
not_assessed`, and no provider crossing. The in-scope decision recorded a crossed
provider boundary and a valid bounded Guardian outcome, then stopped at
`approval_mismatch`. Both decisions retained unconsumed approval/tool state and
an uncrossed adapter boundary. The tool budget reflected only the two research
operations. Serialized authority context contained neither fixture/target URLs
nor either repository name.

Static verification passes formatting, JavaScript syntax, TypeScript compilation,
`git diff --check`, lockfile integrity, and the bounded credential-pattern audit.
The complete ordinary gate immediately preceding this harness change passed 61
files / 362 tests, 7 SQLite tests plus the expected Windows skip, 2 reset-planner
tests, 176 modules / 354 dependencies, and the production build.

## Claim boundary

This is the assembled protected no-effect gate required by ADR-0029. It does not
use the effect-completing competition coordinator, a worker-generated GitHub
proposal, a human approval, the GitHub adapter, or a GitHub credential. It performs
no remote GitHub read or mutation. The exact disposable GitHub effect remains a
separate attended gate requiring refreshed external state and explicit user
authorization.
