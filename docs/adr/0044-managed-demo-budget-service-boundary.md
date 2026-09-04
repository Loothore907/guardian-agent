# ADR-0044: Managed-demo budget service boundary

- Status: Accepted
- Date: 2026-09-04
- Extends: ADR-0038, ADR-0041, and ADR-0043
- Supersedes: none

## Context

The managed-demo ledger and admission queue must not be opened by the public
interaction process or selected by an inbound request. Provider services need to
record numeric usage after a paid call, while the journey controller needs to
reserve capacity before work and settle it afterward. Giving every caller direct
database access would make public-to-judge substitution and incomplete metering
hard to exclude mechanically.

## Decision

Run one trusted managed-demo budget service process per deployment. Its bootstrap
binds exactly one deployment identifier, pool policy, price snapshot, SQLite
ledger path, local IPC endpoint, and capability set. Public and judge processes
receive different bootstraps and database files. No IPC operation accepts a pool,
credential, model assignment, provider price, or requested budget value.

The process owns the durable ledger, bounded FIFO admission queue, and in-memory
per-reservation usage collectors. A journey controller may request admission and
settlement. Each provider process may report only its assigned sanitized usage
kind: mission-dialogue Qwen, contextual-risk Nemotron, native-worker Kimi, or
Tavily Search/Extract. An operator capability may read the sanitized budget
snapshot or submit exact-version policy and price updates.

Every request carries an unguessable capability and exact caller role, caller
identifier, and deployment identifier. The service checks those fields against
its bootstrap binding, capability lifetime, role-operation allowlist, and fixed
deployment. Provider roles are also checked against the observation type. A
reservation and journey must match the server-owned collector.

On Linux, the service uses the existing peer-credential helper to admit only the
supervisor, the service itself, or a direct same-user child of the supervisor. Its
Unix socket and ledger files are owner-only. IPC frames are one bounded JSON line.
Usage callbacks are awaited before provider results are released, so an
unavailable budget service fails the paid call path closed rather than creating
unmetered continuation.

An in-memory collector is intentionally not recovered after a budget-service
crash. The durable reservation remains and expires to its full preauthorization;
the system does not infer missing usage or recreate a cheaper settlement.

## Consequences

- The dependency graph permits only the budget-service app to open the ledger.
- A copied public capability cannot select or debit a judge deployment.
- Provider processes receive an IPC client, never a database path or operator
  capability.
- Queue waiters are lost on service restart, but no queued waiter has started
  provider work or acquired a reservation.
- The capability is a bearer value within the local peer-identity boundary; its
  bootstrap delivery and process environment must remain supervisor-controlled.
- Supervisor composition, source-fingerprint derivation, deployed Linux
  inspection, and provider-side spend caps remain separate evidence work.

## Rejected alternatives

- **Caller-selected pool in one service:** lets untrusted request data choose the
  financial reserve.
- **Direct SQLite access from provider processes:** widens credential-adjacent
  processes into persistence authorities and defeats role-specific operations.
- **Fire-and-forget metering:** can release a provider result before its usage is
  durably accepted.
- **Recover missing collector state optimistically:** can undercharge a journey
  after a crash; expiry forfeiture is the safe deterministic outcome.

## Evidence required

- strict schemas reject request-supplied pool, price, model, and money fields;
- service tests cover capability lifetime, exact deployment binding, role
  widening, reservation/journey binding, and provider-role substitution;
- provider tests show asynchronous usage-record failure prevents continuation;
- Linux runtime tests inspect peer credentials and owner-only socket/database
  permissions; and
- supervisor composition proves public and judge receive distinct deployments,
  credentials, ledgers, and capability sets.
