# W3 one-round-trip worker tool execution evidence

Captured: 2026-09-02 (AKDT)

## Implemented boundary

- Exact request and execution digests bind session, caller, mission/profile,
  policy, assigned worker, source turn, request, lifetime, and the prepared W2
  workspace result.
- A narrow trusted dispatcher exhaustively supports `guardian.session_status` and
  `guardian.local_command`; it has no generic URL, header, HTTP, command string,
  shell expansion, or caller-selected host-path facility.
- A dedicated authority role records the unique execution ID/digest and consumes
  total-tool plus capability-specific budget atomically in schema-v3 SQLite.
- The W2 executor closure remains the only local-command path. Output is bounded,
  control-cleaned, recognizable-credential-redacted, and host-user-path-redacted.
- Exact result feedback is included in turn 2. Raw multiline output is bound by
  byte length and SHA-256 digest in canonical inputs. Turn 2 has an empty tool
  catalog and must finish.

## Reproducible tests

- `packages/worker/src/index.test.ts`: request/execution/result digest mutation,
  multiline output binding, exact turn binding, replay, catalog, budget, and
  second-request rejection.
- `apps/reference-supervisor/src/worker-execution.test.ts`: independent reparse,
  runtime authorization, exact workspace comparison, durable metering, replay,
  authority failure, secret-like result rejection, and both supported tools.
- `packages/authority-store/src/index.test.ts` and
  `apps/authority-service/src/index.test.ts`: schema migration, role restriction,
  atomic dual-budget consumption, exact execution replay/mutation, and fail-closed
  inactive/exhausted state.
- `apps/reference-supervisor/src/bootstrap.test.ts`: pending turn 1, exact tool
  result, final turn 2, and fail-closed second request.
- `packages/executor/src/index.test.ts`: credential and host-path redaction plus
  bounded control cleanup.
- `scripts/reference-runtime.test.mjs`: protected Windows/WSL test of the original
  C4/W2 isolation and persistent workspace probes plus the supervised authority,
  deterministic worker, exact local-command result, durable budget decrement,
  second worker turn, and no source writeback.

## Verification

- TypeScript, ESLint, and Prettier pass.
- Vitest: 51 files and 265 tests pass; three protected files and five protected
  tests skip, for 54 files / 270 tests total.
- Dependency boundaries: 151 modules and 279 dependencies, no violations.
- SQLite spike: seven pass and the expected POSIX permission test skips on
  Windows.
- Demo reset planner: two pass.
- Production Vite build passes.
- Protected Windows/WSL reference runtime: one pass, including W3.

## Deliberate limits

This evidence does not claim a general multi-turn worker, contained denial,
research or GitHub dispatch from the worker, protected live Nebius worker
inference, WebAuthn, Linux parity, or hosted `Enforced` assurance.
