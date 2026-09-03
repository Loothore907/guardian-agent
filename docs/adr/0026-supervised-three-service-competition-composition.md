# ADR-0026: Supervised three-service competition composition

- Status: Accepted
- Date: 2026-09-02

## Context

W6 defines a one-use journey attachment, while W8-W10 provide strict Guardian,
broker, and research child entrypoints. Starting these independently at call sites
would duplicate ordering and cleanup logic, expose generic process controls, and
risk mismatched sessions, callers, lifetimes, or provider selection.

## Decision

Guardian adds one strict competition service bundle and a private-entrypoint
supervisor factory. The bundle contains only the complete W9 broker configuration
(including its exact W8 Guardian client) and W10 research configuration. Both
services must share the exact session, caller, start, and expiry.

The factory accepts one trusted deployment choice, `fake` or `nemotron`, for the
Guardian child. It starts the fixed Guardian, broker, and research entrypoints in
that order through the existing bounded stdin supervisor. The broker and Guardian
children are wrapped as one monitored broker stack: exit of either interrupts W6,
and closing the stack attempts both shutdowns. Startup failure attempts cleanup of
every child already created.

The factory returns only `SupervisedCompetitionJourneyAttachment` with typed W7
and research clients. It does not return process IDs, child handles, an arbitrary
entrypoint, environment, command, URL, credential, or restart control.

## Consequences

- The fixed controlled journey now has one production-shaped three-child startup
  path without combining Tavily, GitHub, and Nebius credentials.
- Cross-service session/caller/lifetime substitution fails before any child starts.
- Guardian exit is treated as broker-stack exit even though W6 retains its original
  research-versus-broker attachment surface.
- This slice proves real child composition and fail-closed lifecycle, not a live
  Tavily/Nemotron/GitHub journey, OS peer identity, or CLI exposure.
