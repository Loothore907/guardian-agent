# C7 judge portal integration boundary

The portal API/UI and trusted supervisor adapter are implemented locally, with
synthetic runtime and actual service-child tests. See [ADR-0051](../adr/0051-bounded-worker-portal-runtime.md)
and [C7 evidence](evidence/2026-09-05-c7-runtime.md). The default host still exposes
only an unavailable scenario catalog pending protected-provider and hosted gates.

## Original implementation requirements (now covered by the local C7 slice)

1. Extend the existing worker execution/result contracts for bounded research,
   exact GitHub read and exact squash merge. Bind sanitized tool results to their
   originating request, turn, session and authority. Preserve legacy one-round-trip
   behavior unless an explicitly bound continuation profile enables more rounds.
2. Extend `TrustedWorkerToolDispatcher` through the existing research/broker service
   pathways. Re-normalize at the execution boundary, consume durable budgets and
   retain replay/expiry/revocation checks. Never bypass the broker with a connector
   or ambient CLI identity. Keep model risk above the deterministic floor.
3. Add bounded continuation to the existing bootstrap rather than a second worker
   loop. Feed untrusted tool content into subsequent turns, allow legitimate
   continuation after an eligible denial, and stop on uncertainty or exhausted
   budgets. Return an actual sanitized final answer as well as action evidence.
4. Make the seed content reachable through a typed tool result. C7 adds explicit
   `content: review` with bounded PR body, changed files and patch text; ordinary
   metadata reads retain their narrower output. Missing patches are incomplete,
   and oversized or inconsistent review sets fail closed. Public fixtures use the existing controlled
   content path after exact deployment URLs are configured.
5. Implement `prepareRuntime` with real supervisor preview verification, trusted
   connection resolution, durable grant activation before worker startup, immutable
   scope and independently validated final operations. Browser confirmation is
   currently development confirmation; shared access plus a source fingerprint is
   not per-person identity or WebAuthn. Seeded standing-consent execution remains
   separate from the custom piloted confirmation route.
6. Wire the real durable budget backend, typed evidence projection and persistent
   fixture pool into trusted host composition. Register scenarios only once those
   pathways exist. Never treat a successful synthetic callback test as evidence of
   live worker dispatch, durable session-grant activation or hosted isolation.

## Acceptance

Run allowed and near-miss cases for every new tool/result contract, request binding,
budget and denial continuation; test startup/worker/service failure and revocation.
Prove content exposure and a model-produced request through actual service children,
keeping deterministic injected-request tests separate. Complete applicable C6
provider-containment evidence and the full required suite before hosted acceptance.
External fixture creation, paid inference and deployment remain subject to the exact
resource/action plan. The previously approved local implementation direction remains
in force; this finding does not require a new product-direction decision.
