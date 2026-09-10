# ADR-0059: Durable worker denial-recovery evidence

- Status: Accepted, September 9, 2026
- Tracking: [issue #19](https://github.com/Loothore907/guardian-agent/issues/19)
- Refines ADR-0019, ADR-0048 and ADR-0058.

## Context

The bounded worker could continue after an ordinary denial, but the external-tool
composition collapsed eligible research and broker rejections to the same generic
worker result. The general audit table was not wired into that path, and a useful
final worker response left durable session authority `active`. Those gaps prevented
the runtime from proving the ordered denial/recovery story it returned publicly.

## Decision

An eligible external-tool rejection retains only an allowlisted cause and stage.
The worker still receives `request_denied`, the deterministic continue-or-revoke
disposition, policy binding and non-increasing budget. It may additionally receive
one of the closed denial causes and stages defined by the worker contract. Provider
text, retrieved payloads, credentials, arbitrary error strings and model reasoning
remain excluded. The native-worker provider projection carries only this minimized
classification and continues to omit trusted identifiers and internal policy data.

The trusted worker dispatcher records a production audit chain through a dedicated
worker authority capability. The authority service assigns event IDs, contiguous
per-session sequence numbers and service-clock timestamps. Worker audit events must
bind an already claimed or deterministically denied execution. The chain records the
typed proposal, deterministic decision, provider/adapter boundary disposition and
the exact result digest returned as worker feedback.

For bounded continuation, a contract-valid final response must cross a new exact
completion boundary. The supervisor binds the final turn ID and digest plus a digest
of its validated result. The authority store atomically appends useful-completion
and terminal audit events and changes the durable session from `active` to
`completed`. Completion is one-way. Expired, revoked, interrupted, replayed or
otherwise inactive authority cannot be completed, and missing completion authority
fails closed. Existing expiry, revocation, interruption and violation meanings are
unchanged.

## Consequences

- Completed sessions cannot consume new worker, research, broker or approval budget.
- Audit order and timestamps are authority-store facts rather than caller-selected
  sequence metadata.
- Schema version 7 adds `completed` to the durable session state and migrates earlier
  databases without resetting session or child-table records.
- Early tool-catalog rejection remains an earlier, stronger boundary. It is recorded
  as a destination denial with no provider or adapter dispatch.
- The deterministic service-child journey is reproducible evidence for local
  composition only. It does not show that a live model generated the forbidden
  request, that a paid provider was contacted, or that hosted containment is
  Enforced.

This decision adds no arbitrary transport, destination, credential reader,
production dependency, grant expansion, deployment authority or provider spend.
