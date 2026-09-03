# W10 credential-store research process evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Strict child-local credential resolution implemented; full supervised
  journey attachment, protected rerun, review, and remote CI remain

## Implemented path

```text
trusted supervisor
  -> strict research + exact research-authority stdin bootstrap
  -> research child with empty inherited configuration
  -> durable authority reservation
  -> child-local tavily/default credential callback
  -> fixed Tavily transport
  -> bounded evidence/provenance and durable settlement
```

No raw Tavily credential, provider URL, arbitrary header, or transport option is a
bootstrap field. Authority failure occurs before credential resolution.

## Deterministic evidence

The new process suite passes three tests covering:

- an actual child launched from strict stdin with an empty environment;
- safe `service_unavailable` behavior when deliberately absent authority is
  contacted before provider use;
- exact role/operation/session/lifetime binding; and
- rejection of an environment or arbitrary provider transport field.

An additional provider test resolves a credential inside the credential-store
callback, exercises the fixed transport, and verifies the public result does not
contain it. The focused research set passes four files and 40 tests. The completed
W6-W11 workspace gate passes 58 ordinary Vitest files / 326 tests, skips three
protected files / five tests, cruises 171 modules / 345 dependencies without a
violation, and passes formatting, lint, typecheck, SQLite/reset checks, and the
production Vite build.

## Residual limitations

- The W6 supervisor attachment does not yet start the W8 Guardian, W9 broker, and
  W10 research children as one controlled journey.
- The protected Tavily test is migrated but has not been rerun against the enrolled
  Windows credential in this slice.
- Linux credential-store parity, OS peer identity, CLI exposure, WebAuthn, and live
  end-to-end journey evidence remain.
