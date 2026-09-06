# ADR-0053: Use the ledger clock for queued admission and settlement

Date: 2026-09-06

Status: Accepted; synthetic production-child verification passed on KC.

## Context

KC's production budget IPC preflight returned `budget_unavailable` because the
ledger required client timestamps to equal its clock at millisecond precision.
Controlled-clock tests hid the latency between the client and ledger. Reading
the clock separately in the queue and ledger would retain the same race.

## Decision

The admission queue uses `admitNow` and `settleNow`, which validate the complete
typed request, sample the ledger's trusted clock once, and stamp the operation
before the existing transaction logic runs. Queue deadlines originate from the
ledger's admission-evaluation timestamp. Delayed queue admission obtains a fresh
ledger timestamp. Direct `admit` and `settle` retain their exact-clock contract.

Caller timestamps cannot open an expired window, extend a reservation, or avoid
expiry forfeiture. Usage timestamps and all existing reservation, model, volume,
replay, and cost checks remain validated. This decision does not change operator
policy/price update timestamp contracts or establish their real-clock readiness.

## Evidence and limits

Budget tests use a clock that advances on every read and reject attempts to use
caller timestamps to reopen admission or backdate an expired settlement. The
KC continuation evidence records the production-child IPC check and required
suite outcome. No live-provider or full hosted-containment claim follows.
