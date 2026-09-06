# ADR-0054: Bind operator budget updates to the service clock

Date: 2026-09-06

Status: Accepted

## Context

ADR-0053 moved queued admission and settlement onto the ledger clock, but operator
policy and price updates still required a caller-created timestamp to equal a
later ledger clock sample to the millisecond. A production IPC caller cannot
reliably predict that sample. Retrying until the clocks happen to match would be
unbounded and would still leave an ambiguous time contract.

Price evidence has two different times. `capturedAt` describes when the operator
obtained provider pricing; IPC receipt cannot truthfully replace it. `updatedAt`
describes when the authenticated operator formed the update proposal. Neither is
the trusted time at which the ledger commits the update.

## Decision

For `policy.update` and `prices.update`, the budget service samples its trusted
clock once after peer verification and exact capability/caller/deployment
binding. The service uses that same `evaluatedAt` value for capability-lifetime
validation and, after the role-operation allowlist passes, carries it through the
admission queue to the ledger. No caller-controlled execution timestamp reaches
the transaction.

The caller's `updatedAt` remains proposal metadata. It must be on or after the
capability's issuance, before its expiry, and no later than `evaluatedAt`. An
out-of-window or future proposal fails before ledger mutation. The ledger stamps
the operation with `evaluatedAt` and revalidates the typed update, exact expected
deployment and version, replacement model-policy binding, active-judge rules,
and durable state inside the transaction. Exact expected-version advancement
continues to make a successful proposal one-use; a replay fails closed.

For price updates, provider evidence keeps its original `capturedAt`. It must be
no later than the proposal time and its `expiresAt` must be after `evaluatedAt`.
The service never restamps old evidence to make it appear current. Direct ledger
methods retain the prior exact-clock contract for deterministic in-process use;
only the authenticated IPC path uses the service-owned execution time.

This change does not alter any policy limits, authorize a spending increase,
reset a ledger, broaden an operator capability, or establish the general Windows
inter-process clock contract tracked in issue #33.

## Rejected alternatives

- A millisecond tolerance would make the receiver accept caller-selected future
  execution time and would not define which clock controls expiry.
- Sampling the ledger clock again would retain a race between authentication and
  mutation.
- Replacing `capturedAt` at receipt would turn stale provider evidence into
  apparently fresh evidence.
- Removing proposal time entirely would lose its capability-lifetime binding.

## Evidence and limits

The budget package and IPC service tests cover advancing clocks, delayed valid
proposals, future/out-of-capability proposals, stale expected versions, future
and expired evidence, an unprivileged limit-expansion attempt, and unchanged
durable counters. `scripts/managed-demo-budget-operator-clock.test.mjs` launches
the production service child with real clocks, applies delayed policy and price
updates, rejects replay, restarts on the same ledger, and verifies zero spend and
admissions persist. It is part of `pnpm check`.

These tests establish the offline operator-update contract. They do not prove a
KC deployment, live provider prices, ingress, paid usage, billing reconciliation,
or complete C7 acceptance.
