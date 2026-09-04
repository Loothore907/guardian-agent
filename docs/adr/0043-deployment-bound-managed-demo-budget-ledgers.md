# ADR-0043: Deployment-bound managed-demo budget ledgers

- Status: Accepted
- Date: 2026-09-04
- Extends: ADR-0041
- Supersedes: none

## Context

The funded Linux demo needs two different availability promises. Judge capacity
must survive public interest and abuse through the required judging window, while
public capacity may be increased or disabled as interest and funding change.
Provider-side account balances alone cannot enforce this distinction, especially
when multiple credentials ultimately share an operator billing account.

Counting only completed journeys is insufficient. A caller could repeatedly
abort or trigger failures after provider work begins, consuming money without
advancing a completion counter. Conversely, charging only a worst-case estimate
would hide actual cost and prevent evidence-based scaling.

## Decision

Each managed-demo deployment owns one durable SQLite budget ledger bound at
startup to exactly one deployment identity, credential pool, policy version, and
price snapshot. Public and judge deployments use different database files. The
admission request contains a journey identifier, a one-way source fingerprint,
and a timestamp; it contains no pool, model, price, credential, or requested
budget selector.

Every admitted journey atomically reserves a fixed maximum cost before provider
work begins. Total, daily, per-source, concurrency, cooldown, and availability
checks run in the same immediate transaction as the reservation. Admission counts
all attempts, not only successful completions, so aborts cannot bypass volume
limits.

Settlement accepts only bounded numeric provider usage tied to the exact
reservation and journey. Model identifiers and token counts must remain within
the fixed model-policy ceilings, and Tavily operations and credits must remain
within the fixed research ceilings. Costs use integer micro-USD with conservative
rounding. A reservation retains its captured price snapshot so later price
updates cannot alter prior work.

Missing usage on a failed journey, an expired reservation, malformed usage, model
substitution, token expansion, or cost beyond preauthorization never releases the
reservation optimistically. Known failed usage settles its measured cost;
unknown or expired usage forfeits the full preauthorization. Invalid settlement
stays reserved until expiry and operator reconciliation.

Operator policy and price changes use exact expected versions and advance one
version at a time. Public limits may move within the strict schema. Once the
judge window is active, an enabled judge policy cannot reduce availability or
capacity; the operator may disable the pool as an incident kill switch. Model-
policy substitution is not a budget update.

Queueing remains outside the ledger. A trusted admission service may hold a
bounded queue, but it must acquire a ledger reservation immediately before
starting provider work and must not infer capacity from a stale snapshot.

## Consequences

- Public traffic cannot select or debit a judge ledger through the admission
  contract.
- Restarts preserve spent, reserved, forfeited, source, and journey state.
- Abandoned and unmetered work consumes its conservative reservation rather than
  creating a retry subsidy.
- Price changes are explicit evidence updates and do not rewrite historical cost.
- A provider billing cap remains an outer containment layer; the local ledger is
  not evidence that the provider accepted or enforced an account limit.
- Source fingerprint construction, trusted-service IPC, queue enforcement,
  provider usage capture, and protected deployment evidence remain separate work.

## Rejected alternatives

- **One shared ledger with a request-selected pool:** permits substitution and
  makes public/judge isolation depend on every caller.
- **Completion-only limits:** allow failed and abandoned calls to consume
  unbounded provider capacity.
- **Release on missing usage:** treats uncertainty as free and creates an
  incentive to suppress metering.
- **Floating-point currency:** permits rounding drift and unstable comparisons.
- **Automatic traffic-triggered funding:** lets untrusted demand expand financial
  authority.
- **Mutable historical prices:** makes recorded spend non-reproducible.

## Evidence required

- strict contract tests for unknown models, stale prices, overflow, cross-journey
  usage, and request-supplied authority;
- restart, expiry, replay, exhaustion, source, concurrency, and cross-pool ledger
  tests;
- race tests using separate ledger connections;
- trusted service binding that never exposes a judge ledger to a public process;
- provider usage parsing and protected calibration evidence; and
- deployment inspection showing separate public and judge state, identities,
  credentials, and provider-side limits.
