# W9 broker service process evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Strict credential-holding child bootstrap implemented; full journey
  supervision, protected evidence, review, and remote CI remain

## Implemented path

```text
trusted supervisor
  -> one bounded strict stdin bootstrap
  -> credential-holding broker child
       -> broker-role authority IPC client
       -> W8 Guardian evaluator IPC client
       -> Windows credential-store callback
       -> fixed GitHub adapter
       -> W7 broker IPC server
```

The child receives no raw GitHub or Nebius credential, provider URL, arbitrary
header, command, model provider, or generic authenticated transport. The only new
package edge is the internal workspace dependency from the broker application to
the W8 Guardian IPC client; no third-party dependency was added.

## Deterministic evidence

The W9 process suite passes three tests covering:

- an actual child launched from one strict stdin frame and reached through W7 IPC;
- safe fixed `audit_unavailable` behavior when the deliberately absent authority
  service is contacted;
- authority-role, authority-operation, Guardian caller, and lifetime substitution;
  and
- arbitrary bootstrap transport-field rejection.

The focused W7-W9 set passes four files and 22 tests with Prettier, ESLint, and the
TypeScript project build. The complete workspace gate passes 56 ordinary Vitest
files / 319 tests, skips three protected files / five tests, cruises 166 modules /
326 dependencies without a violation, and passes formatting, lint, typecheck,
SQLite/reset checks, and the production Vite build.

## Residual limitations

- The reference supervisor does not yet start the W8 Guardian child and W9 broker
  child as one attachment.
- The Tavily research child still needs credential-store-backed strict supervised
  startup before the full W6 attachment can avoid environment-carried secrets.
- Platform peer identity, protected real-provider execution, CLI exposure,
  WebAuthn, and live end-to-end journey evidence remain.
