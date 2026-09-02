# C6 Durable Authority Store Evidence

- Date: 2026-08-30 (AKDT); schema-v4 update 2026-09-02
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Schema-v4 repository, broker, W3 dispatch, and W4 lifecycle integration passed

## Implemented boundary

`@guardian/authority-store` is a narrow trusted infrastructure package backed by
the pinned Node 24 `node:sqlite` API. Dependency rules permit it to import only
strict contracts and prohibit research and guardian provider packages from
importing it.

The store owns no credential resolution, provider transport, policy judgment,
adapter operation, prompt interpretation, or arbitrary SQL interface. Its path is
selected by trusted orchestration and must be an absolute `.sqlite` file outside
supplied disposable workspace roots.

Schema version 4 stores:

- immutable session, caller, mission, profile, policy, lifecycle, and timestamp
  bindings;
- remaining global tool, local-command, research-request, and research-result
  counts;
- unique, one-time research reservations and settlement state;
- exact parsed approvals, unique nonces, and consumption time; and
- strict sanitized audit events with unique contiguous per-session sequences;
- scoped GitHub connection metadata with a non-secret protected-store handle and
  immutable session bindings; and
- minimized evidence exposures, typed attempts, decisions, boundary crossings,
  consumption, and control outcomes; and
- unique W3 worker execution IDs/digests bound to session, typed capability, and
  atomic total/capability-specific budget consumption; and
- exact W4 boundary events with trusted code, derived severity, deterministic
  disposition, policy binding, and bounded-window timestamps.

It does not store reusable credentials, credential-store values, IPC capabilities,
socket or pipe endpoints, raw provider output, hostile page content, rejected
queries, or model chain-of-thought.

## Security behavior

- New sessions must be active, strictly parsed, and paired with a budget bound to
  the same session ID.
- Session identifiers are primary keys and cannot be recreated with fresh budgets.
- Startup recovery uses the store clock to atomically mark active sessions
  interrupted; clock rollback before session creation fails closed.
- Research reservation uses the store clock, requires an active in-lifetime
  session, and atomically consumes one global tool call, one research request, and
  reserved result capacity.
- Every reservation receives a random unique identifier. Settlement is one-time,
  returns only unused result capacity, and never refunds the request or global tool
  attempt. A lost reservation response therefore remains conservatively charged.
- Worker execution consumption uses the store clock and atomically rejects replay
  or digest reuse while decrementing total-tool and, for local commands,
  local-command capacity in the same immediate transaction.
- Approval creation verifies exact session, caller, mission, profile, policy, and
  active connection bindings against the durable session.
- Approval consumption uses the store clock and atomically checks approval ID,
  nonce, request digest, session, caller, connection, policy, lifecycle, expiry,
  active bound connection, and prior consumption.
- Schema-v1, schema-v2, and schema-v3 databases migrate atomically without
  resetting existing authority.
- Evidence-to-attempt association verifies that every referenced exposure belongs
  to the same session and existed no later than the attempt. Strict records have
  no field for page bodies, rejected values, arbitrary rationale, or chain-of-thought.
- Audit insertion accepts only the strict sanitized contract and the next exact
  sequence number.
- Unknown database schema versions fail closed. Extension loading and
  double-quoted string literals are disabled; defensive mode, foreign keys, WAL,
  full synchronization, and a bounded busy timeout are enabled.

## Verification

`pnpm check` passes with:

- the current complete Vitest suite and the W3 authority-store/service tests;
- eight Node SQLite spike cases: seven pass on Windows and the POSIX-only mode test
  is skipped;
- dependency boundaries with no architecture violations; and
- formatting, lint, strict TypeScript, and the production web build.

The authority-store unit suite covers session reuse rollback, reopen and
interruption, store-clock rollback, research exhaustion, exact-expiry denial, and
one-time settlement,
approval binding, mismatch, exact consumption, replay, expiry, interruption,
strict audit ordering and field rejection, workspace exclusion, and unknown schema
version rejection. Cross-process concurrency, crash, and lost-response evidence is
recorded separately in the
[SQLite spike evidence](c6-sqlite-authority-spike.md).

## Claim boundary and remaining work

The central authority service now uses the store for startup interruption, scoped
connections, tool charging, exact approval consumption, and minimized attempt and
decision records. The broker reaches those operations only through authenticated
typed IPC. This does not yet prove complete reference-runtime persistence.
Accordingly:

- W4 worker revocation and trusted-boundary interruption update durable authority
  state and the bound local runtime; other future lifecycle sources require their
  own exact trusted operations;
- W3 status and local-command budgets and research-service budgets use trusted
  authority-service operations; other future worker capabilities require their
  own atomic operations;
- a protected-store resolver is injected at the broker-service boundary, but the
  competition host's concrete OS secret-store adapter remains to be selected;
- protected live GitHub read/merge evidence and remote CI remain; and
- the complete polluted-page journey remains a C9 evidence requirement.

## Sources

- [Node.js 24.19.0 SQLite documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [ADR-0005](../../adr/0005-durable-authority-and-rejection-context.md)
