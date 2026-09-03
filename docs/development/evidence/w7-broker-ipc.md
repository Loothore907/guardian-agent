# W7 broker IPC evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Strict local protocol implemented; broker-process startup, Guardian risk
  IPC, protected evidence, review, and remote CI remain

## Implemented path

```text
trusted journey coordinator
  -> strict canonical broker execution request
  -> bounded session/caller/capability-bound local IPC
  -> broker handler in a future credential-holding child
  -> strict denial or exact target/head-bound GitHub result
```

The protocol contains no arbitrary authenticated HTTP fields and no provider
credential. The client is structurally compatible with W5/W6's broker client
surface.

## Deterministic evidence

The focused suite passes nine real local IPC tests covering:

- one exact request-bound pull-request snapshot;
- fixed `scope_mismatch` denial transport;
- wrong capability before handler invocation;
- cross-session rejection in the client before IPC;
- future, pre-start, client exact-expiry, and server exact-expiry behavior;
- successful-result pull-request mutation;
- malformed handler output and private-text non-reflection;
- duplicate evidence-exposure identifiers; and
- rejection of a public HTTPS endpoint in place of a Guardian local endpoint.

Focused Prettier, ESLint, TypeScript project build, and Vitest pass. The completed
W6-W8 workspace gate passes 55 ordinary Vitest files / 316 tests, skips three
protected files / five tests, cruises 163 modules / 315 dependencies without a
violation, and passes formatting, lint, typecheck, SQLite/reset checks, and the
production Vite build.

## Residual limitations

- The broker-service application does not yet have a supervised stdin-bootstrap
  main that owns this server.
- W8 now supplies the separate credential-isolated Guardian action-risk IPC
  boundary; the broker child still needs to receive that client through strict
  supervised startup without merging trust zones.
- Platform peer-identity evidence, protected real-child execution, CLI exposure,
  WebAuthn, and live provider evidence remain.
