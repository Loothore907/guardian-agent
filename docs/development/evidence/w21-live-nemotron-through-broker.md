# W21 live Nemotron-through-broker evidence

- Date: 2026-09-03 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Protected live model-through-broker no-effect path passed

## Boundary under test

W21 presents one exact in-scope GitHub merge proposal to the real broker without
an approval. The proposal references one minimized untrusted exposure. Its
deterministic authorization floor is `confirm`, so Nemotron may preserve or
increase scrutiny but cannot create an allow. No outcome can reach the GitHub
adapter without a separate exact approval.

The protected harness uses the enrolled `nebius/default` credential only inside
the Windows credential-store callback, a prepared enforced session, the real
Guardian action-risk child, the real broker child, and the durable SQLite
authority store. It prints no provider response, rationale, request identifier,
credential, or credential-store handle.

## Findings and corrections

The preliminary harness profile was correctly rejected before session launch
because it omitted C4's mandatory baseline mediated tools and `write_workspace`
declaration. The harness was aligned with the existing enforced-runtime contract.

The first assembled attempt then reached both service children but returned
`guardian_unavailable` in 16,132.3135 ms. An isolated protected diagnostic using
the same enrolled credential and current Qwen/Nemotron policy passed in
7,702.9002 ms. The remaining contradiction was the nested timeout contract:

- each provider attempt allowed 20 seconds;
- invalid Super structure could cause a second Ultra attempt;
- Guardian IPC allowed 20 seconds total; and
- broker IPC allowed only 15 seconds total.

ADR-0037 corrects the hierarchy to 45 seconds for setup/action Guardian IPC and 55
seconds for broker IPC, while retaining two 20-second maximum provider attempts.
Focused verification passes 5 files / 33 tests and TypeScript compilation. Tests
mechanically require the Guardian window to exceed the maximum provider sequence
and the broker window to exceed the Guardian action-risk window.

The complete ordinary gate also passes: 61 Vitest files / 362 tests, 7 SQLite
authority tests plus the expected Windows POSIX skip, 2 reset-planner tests, 176
modules / 354 dependencies with no boundary violation, formatting, lint,
TypeScript compilation, production build, and `git diff --check`.

## Protected result

The corrected protected command was:

```powershell
pnpm test:live:nemotron-broker
```

The direct corrected rerun passed in 21,819.3798 ms for the test / 22,069.3476 ms
total:

```text
[guardian-live] Nebius credential available
[guardian-live] enforced session launched
[guardian-live] minimized untrusted exposure registered
[guardian-live] Nemotron risk service ready
[guardian-live] broker service ready
[guardian-live] live Nemotron result remained pre-effect: approval_mismatch
[guardian-live] audit confirms model evaluation crossed, while approval, tool, adapter, and credential boundaries did not
```

The reopened authority store confirmed one exposure, one attempt, and one
decision. The provider boundary was `crossed`; Guardian produced a valid bounded
evaluation that did not lower the `confirm` floor. Approval and tool consumption
were `not_consumed`, and the adapter boundary was `not_crossed`. The complete tool
budget remained. The minimized context contained no repository name, credential
handle, or provider request identifier.

## Claim boundary

This proves one protected live Nemotron action-risk evaluation through the real
broker and durable audit path. It is no-effect evidence, not a GitHub operation:
no approval was supplied, no adapter was invoked, no GitHub credential was
resolved, and no remote read or mutation occurred. It does not yet prove the
worker-generated proposal path, a user-verifying approval ceremony, peer identity
or platform containment, hosted assurance, or the disposable GitHub effect.
