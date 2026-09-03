# ADR-0018: Exact one-round-trip worker tool execution

- Status: Accepted
- Date: 2026-09-02

## Context

W1 can return one pending typed Guardian request, and W2 provides an
exact-confirmed session workspace, but neither boundary connects model output to
an effect. A useful first execution slice must not turn the worker service into a
privileged process, trust model-supplied session or workspace bindings, consume
only in-memory budgets, or introduce a general agent loop before denial
containment exists.

Local-command output also legitimately contains newlines. Guardian's canonical
JSON implementation rejects control characters, so raw stdout and stderr cannot
be placed directly into a canonical digest input.

## Decision

W3 permits exactly one tool/result round-trip. Trusted supervisor code reparses a
pending W1 request and creates a canonical execution envelope bound to the exact
session, caller, mission/profile and policy versions, worker assignment, source
turn and digest, request digest, lifetime, and prepared W2 workspace result. The
first W3 dispatcher supports only `guardian.session_status` and
`guardian.local_command`.

The dispatcher independently validates the envelope immediately before use,
compares the prepared workspace result, rechecks the active runtime and exact
identity bindings, and invokes the existing runtime authorization method. A
dedicated `worker_dispatcher` authority capability can consume only worker status
or local-command budgets. SQLite stores the unique execution ID and digest in the
same immediate transaction that decrements the budget. A local command decrements
both total-tool and local-command counts; status decrements only total-tool count.
Replay, digest reuse, exhausted budget, inactive session, and cross-binding use
return no authority.

Only the trusted W2-bound local-command closure can reach the executor; the model
cannot provide or replace its host path. Executor output is control-cleaned,
credential- and host-path-redacted, and bounded before it reaches the result
contract. The result binds the execution and source turn, sanitized typed output,
completion time, and remaining durable budget. For canonical result and turn
digests, stdout and stderr are represented by their UTF-8 byte lengths and
SHA-256 digests; the sanitized text remains available to the worker.

Guardian creates turn 2 with the exact result in its turn digest, a minimized
provider projection, and an empty tool catalog. Turn 2 must return a final
response. Any second tool request fails closed as malformed provider output.

## Consequences

- The deterministic reference path now proves pending request, authorization,
  durable metering, exact W2 execution, sanitized result feedback, and final
  response end to end.
- Worker and model-provider processes remain outside the authority and command
  execution boundaries and never receive host workspace paths or authority
  capabilities.
- A lost response after durable consumption does not refund authority; replay
  cannot repeat the effect through the same execution binding.
- W3 is deliberately not a general multi-turn state machine. It supports only
  session status and local commands, and exactly one request may execute.
- Ordinary denial containment, repeat-violation revocation, research/GitHub worker
  dispatch, WebAuthn approval, Linux parity, and hosted-runtime assurance remain
  later work.
