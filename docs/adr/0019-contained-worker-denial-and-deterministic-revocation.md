# ADR-0019: Contained worker denial and deterministic revocation

- Status: Accepted
- Date: 2026-09-02

## Context

W3 treats every rejected worker request as a failed tool boundary. That is safe,
but it prevents the worker from receiving a bounded denial and finishing useful
otherwise-permitted work. It also leaves replay, binding substitution, repeated
scope violations, and trusted execution failure without distinct lifecycle
semantics.

The first containment slice must preserve W3's exact one-request/two-turn limit.
It must not let the worker, model output, or caller-supplied metadata select a
severity, threshold, window, or lifecycle transition. Internal violation detail
must not become a rationale channel back to the model.

## Decision

W4 adds a versioned deterministic worker-violation policy. Version 1 uses a
five-minute inclusive window and revokes on the third ordinary violation in that
window. Tool-catalog, filesystem-scope, timeout, and volume violations are
ordinary. Execution replay, execution/workspace binding mismatch, and malformed
worker output are critical and revoke immediately. Severity is derived from a
closed code-to-class mapping in trusted code; it is not accepted as IPC input.

The sole-owner authority service persists boundary events in schema-v4 SQLite.
It records the exact boundary ID and digest, internal code, derived severity,
policy identity/version, time, and deterministic disposition. Consumption,
replay detection, threshold counting, budget mutation, and revocation occur under
immediate transactions. The threshold query is session-bound and includes both
window endpoints. Events older than the configured window do not count.

An ordinary rejection returns an exact-digest-bound worker tool result containing
only the tool name, `request_denied`, `continue` or `revoked`, the policy binding,
and remaining budget. It contains no internal code, count, threshold, rationale,
trusted ID beyond the existing exact result binding, or rejected data. A
`continue` result becomes turn 2 input under the existing empty tool catalog, so
the worker must still finish rather than request another action. A `revoked`
result is returned without invoking another worker turn.

Critical disposition updates both durable authority state and the trusted local
runtime to `revoked`. A trusted provider, authority, executor, or result-
sanitization failure is not returned as an ordinary denial: the runtime becomes
`interrupted`, the authority service records the interruption when available,
and the worker boundary fails closed. If durable authority is unavailable, local
interruption still occurs and the result reports authority unavailability rather
than claiming durable success.

## Consequences

- One denied request can be contained without granting, executing, or retrying
  it, and the mandatory final turn can still complete.
- Replay and exact-binding near misses cannot be diluted into ordinary denials.
- Counts and severity remain deterministic and durable across trusted callers;
  model output can neither lower nor suppress the disposition.
- The worker-visible denial is intentionally less specific than the internal
  event. Debugging and audit use trusted records rather than model-visible
  rationale.
- W4 does not add a persistent multi-turn loop, worker research/GitHub dispatch,
  WebAuthn, protected live-worker evidence, Linux parity, or hosted assurance.
