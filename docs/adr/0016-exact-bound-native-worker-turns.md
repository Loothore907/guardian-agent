# ADR-0016: Exact-bound native-worker turns

- Status: Accepted
- Date: 2026-09-01

## Context

ADR-0015 selects a provider-neutral native worker for the competition build, but
selection binding alone does not establish a safe inference boundary. A worker
provider must not receive reusable credentials from the supervisor, choose its
own model or authority, replay a turn, or turn model output directly into an
effect. Workspace persistence and Guardian tool execution are separate security
slices and must not be smuggled into the first provider integration.

## Decision

Guardian represents one worker turn as a strict, canonically digested envelope
bound to the session, caller, mission and profile versions, deterministic policy,
model policy, confirmed worker assignment, turn number, lifetime, allowed tool
names, and remaining budgets. The trusted supervisor creates this envelope only
after exact mission confirmation and runtime launch.

A short-lived worker-service child receives the envelope and a fresh opaque local
IPC capability through bounded stdin. IPC checks the exact session, turn ID,
number, digest, activation time, expiry, and one-use state before provider
invocation. The provider sees a smaller credential-free mission projection, not
trusted IDs or the turn digest.

The worker service is the only worker component permitted to resolve
`nebius/default`. Its adapter has one fixed Nebius Token Factory origin and the
policy-assigned `native_worker` model. The deterministic fake and Nebius adapter
implement the same provider interface.

Provider output has exactly two forms: a bounded credential-safe final response,
or one narrow typed Guardian tool request. Unknown fields, trusted binding fields,
arbitrary URLs or headers, shell-shaped command arguments, unsupported tools,
exhausted budgets, malformed output, model or policy mismatch, timeout, replay,
and provider failure fail closed with a bounded error code. W1 returns a typed
request as pending; it never creates a trusted proposal or executes the request.

## Consequences

- Provider credentials remain confined to the worker-service process and do not
  appear in bootstrap frames, process arguments, environment, provider context,
  IPC results, or public errors.
- The worker boundary is reviewable with deterministic CI before a live provider
  or effectful tool loop is connected.
- W1 is not a general coding-agent implementation and does not justify an
  `Enforced` worker claim.
- W2, now satisfied by ADR-0017, must materialize and persist a credential-safe
  session workspace without weakening the C4 sandbox. W3 must independently
  normalize, bind, authorize, meter, execute, and sanitize any pending typed
  request.
