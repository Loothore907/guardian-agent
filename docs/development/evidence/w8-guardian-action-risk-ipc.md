# W8 Guardian action-risk IPC evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Separate one-turn protocol and Guardian-service routing implemented;
  supervised child startup, protected evidence, review, and remote CI remain

## Implemented path

```text
trusted supervisor binds exact session/caller/request digest/risk envelope
  -> broker-side evaluator client checks the exact envelope
  -> bounded one-use local IPC
  -> separate Guardian-service process owns the Nebius provider
  -> strict evaluation or fixed sanitized failure
  -> broker independently reapplies deterministic precedence
```

Neither the IPC frame nor the envelope contains a provider credential or an
arbitrary provider transport. The service main accepts a strict `action_risk`
bootstrap separately from its existing `mission_setup_risk` mode.

## Deterministic evidence

The focused suite passes nine real local IPC tests covering:

- exact supervisor-bound envelope evaluation;
- one-use consumption and replay denial;
- client-side envelope-mutation rejection before IPC;
- capability, session, caller, and request-digest mismatch;
- future, pre-start, client exact-expiry, and server exact-expiry behavior;
- malformed provider output and private-text non-reflection;
- secret-like untrusted-excerpt rejection; and
- rejection of a public HTTPS endpoint in place of a Guardian local endpoint.

The broader Guardian, broker, contract, and Guardian-service focused set passes 15
files and 78 tests. The completed W6-W8 workspace gate passes 55 ordinary Vitest
files / 316 tests, skips three protected files / five tests, cruises 163 modules /
315 dependencies without a violation, and passes formatting, lint, typecheck,
SQLite/reset checks, and the production Vite build.

## Residual limitations

- The reference supervisor does not yet start and bind the one-use Guardian child
  for the controlled journey.
- The broker-service application still needs a strict stdin-bootstrap main that
  combines the W7 broker server with this IPC client, not with the provider.
- Platform peer-identity evidence, protected real-child execution, CLI exposure,
  WebAuthn, and live Nemotron-through-broker evidence remain.
