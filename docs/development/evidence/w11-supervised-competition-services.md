# W11 supervised competition services evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Fixed three-child startup composed through W6; protected live journey,
  review, and remote CI remain

## Implemented path

```text
strict same-session/caller/lifetime service bundle
  -> supervised W8 Guardian child
  -> supervised W9 broker child using only the Guardian IPC client
  -> supervised W10 research child
  -> Guardian+broker monitored stack vs research process
  -> one-use W6 controlled-journey attachment
```

The returned object exposes neither process IDs nor generic process controls. The
only environment value is the trusted fixed Guardian provider selector; no raw
provider credential is forwarded.

## Deterministic evidence

The focused composition set passes two files and 12 tests. New tests cover:

- actual startup and shutdown of all three fixed child entrypoints;
- absence of process IDs on the returned attachment;
- W5 input fail-closed behavior through the composed attachment;
- cross-service session and exact-lifetime substitution before startup; and
- rejection of an untrusted Guardian provider selection.

Existing W6 tests cover pre/during child exit, replay, concurrency, runner failure,
and dual shutdown. The completed workspace gate passes 58 ordinary Vitest files /
326 tests, skips three protected files / five tests, cruises 171 modules / 345
dependencies without a violation, and passes formatting, lint, typecheck,
SQLite/reset checks, and the production Vite build.

## Residual limitations

- The deterministic test uses the fake Guardian provider and intentionally stops
  at invalid W5 input; it is process-composition evidence, not a live provider
  journey.
- Protected Tavily, Nemotron-through-broker, exact approval, demo merge, and audit
  inspection still need a safe controlled rerun.
- OS peer identity, Linux credential-store parity, CLI exposure, WebAuthn, review,
  and remote CI remain.
