# ADR-0037: Nested Guardian risk timeout hierarchy

- Status: Accepted
- Date: 2026-09-03

## Context

The first protected Nemotron-through-broker attempt reached an enforced session,
registered minimized untrusted exposure, and started the real Guardian and broker
children, but returned `guardian_unavailable` after 16,132.3135 ms. The same
credential and model policy then passed the existing isolated protected Nebius
diagnostic in 7,702.9002 ms.

The assembled path exposed an invalid timeout hierarchy. A Nemotron provider call
had a 20-second bound, and structurally invalid Super output could trigger one
additional bounded Ultra call. The Guardian action-risk IPC allowed only 20
seconds for the whole sequence, while the enclosing broker IPC allowed only 15
seconds. A valid bounded quality escalation could therefore be reported as
unavailable by an outer local channel before its inner provider sequence had time
to complete.

## Decision

Keep the provider timeout at 20 seconds per call and the maximum provider attempts
at two. Set both one-use Guardian risk IPC windows to 45 seconds, providing five
seconds of bounded local-protocol margin outside the maximum 40-second provider
sequence. Set the enclosing broker IPC window to 55 seconds, providing another
ten seconds outside the Guardian action-risk window.

Export strict boundary metadata and test these inequalities mechanically:

```text
2 × 20-second provider calls < 45-second Guardian IPC < 55-second broker IPC
```

Timeout still fails closed. It does not create approval, consume a tool, invoke an
adapter, resolve a GitHub credential, or weaken the deterministic authorization
floor. The windows remain below the existing 60-second local-client maximum and
the fixed session lifetime.

## Consequences

- Super-to-Ultra quality escalation can complete through the assembled broker
  path without an outer channel expiring first.
- A stalled live risk evaluation may now take up to the larger bounded window
  before returning a fixed unavailable result.
- Setup-risk IPC receives the same correction because it uses the same possible
  two-attempt provider sequence.
- The protected rerun returned `approval_mismatch` after live evaluation and
  durable audit inspection, with no privileged effect.

## Evidence

- `apps/guardian-service/src/index.test.ts`
- `apps/broker-service/src/index.test.ts`
- `packages/guardian/src/action-ipc.test.ts`
- `packages/guardian/src/setup-ipc.test.ts`
- `packages/broker/src/ipc.test.ts`
- `docs/development/evidence/w21-live-nemotron-through-broker.md`
