# W4 contained denial and deterministic revocation evidence

Captured: 2026-09-02 (AKDT)

## Implemented boundary

- Successful and denied worker tool results are separate strict shapes under the
  same exact result and turn digests.
- The worker sees only `request_denied`, a `continue` or `revoked` disposition,
  the versioned policy binding, and unchanged remaining budget. Internal codes,
  severity, counts, thresholds, and rejected values stay inside trusted state.
- Schema-v4 authority state records exact boundary ID/digest events. Version 1
  classifies scope, timeout, catalog, and volume violations as ordinary; replay,
  binding/workspace substitution, and malformed worker output are critical.
- Three ordinary violations in an inclusive five-minute session-bound window
  revoke atomically. A violation just outside the window is excluded. Critical
  violations revoke immediately.
- Executor, result-validation, provider, and authority failures use interruption
  semantics rather than a denial result. Local interruption is retained when the
  durable service is unavailable.
- W3's one-request/two-turn lifecycle remains unchanged. A contained denial is
  fed into the empty-catalog second turn, which must finish; revocation stops
  before another provider turn.

## Reproducible tests

- `packages/authority-store/src/index.test.ts`: immediate replay revocation,
  first/second ordinary containment, inclusive third-event threshold, event
  expiry outside the window, and trusted-boundary interruption.
- `apps/authority-service/src/index.test.ts`: worker-role-only violation and
  interruption IPC with durable active/interrupted state checks.
- `apps/reference-supervisor/src/worker-execution.test.ts`: sanitized contained
  denial, critical binding revocation, no-effect near misses, result-sanitization
  interruption, and authority-unavailable local interruption.
- `apps/reference-supervisor/src/bootstrap.test.ts`: contained denial reaches the
  mandatory final turn; malformed second-turn output revokes and fails closed.
- `packages/worker/src/index.test.ts` and
  `apps/worker-service/src/nebius.test.ts`: denial digest binding, rejection of
  internal denial codes, and minimized provider projection.
- `packages/session/src/runtime.test.ts`: trusted interruption remains distinct
  from policy revocation in reported lifecycle state.

## Verification

- TypeScript build passes.
- Targeted W4 suite: 9 files and 73 tests pass.
- Ordinary Vitest suite: 51 files and 279 tests pass; three protected files and
  five protected tests skip, for 54 files / 284 tests total.
- Prettier, ESLint, TypeScript, SQLite spike, demo reset, dependency boundaries,
  and the production Vite build pass.
- The protected Windows/WSL reference runtime passes the existing isolation,
  persistent-workspace, no-writeback, durable-budget, and successful W3/W4 result
  path. It does not yet add a protected denial/revocation probe.

## Deliberate limits

This evidence does not claim a persistent multi-turn worker, research or GitHub
dispatch from the worker, protected live Nebius worker inference, WebAuthn,
complete Linux parity, or hosted `Enforced` assurance.
