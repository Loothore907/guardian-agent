# W12 activated competition configuration evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Trusted activated-session builder and supervisor attachment implemented;
  CLI command and protected live journey remain

## Implemented path

```text
captured launched Enforced session
  + exact normalized legitimate merge request
  + supervisor-owned broker/research authority bindings
  + durable session and attached-connection lookup
  + trusted public GitHub deployment client ID
  -> exact session/research/lifetime/connection validation
  -> credential handle derived from the active authority record
  -> fresh W7/W8 IPC bindings and canonical request-risk envelope
  -> strict W11 service bundle
  -> one-use W6 journey attachment
```

Neither the builder nor the supervisor attachment method accepts a credential
handle, service lifetime, risk floor, risk signals, arbitrary process entrypoint,
or provider transport. The supervisor does not return the generated bundle.

## Deterministic evidence

The focused set passes two files and eight tests. New coverage proves:

- credential handle, lifetime, and Guardian envelope derivation;
- canonical legitimate-request digest binding;
- request identity substitution rejection;
- inactive durable session and repository-scope rejection;
- non-durable and non-Enforced activation rejection; and
- refusal to start a journey before session activation.

The supervisor also rejects concurrent or repeated attachment startup and includes
the started attachment in its shutdown set; W6 retains the attachment's own
run-once and replay protection.

The completed workspace gate passes 59 ordinary Vitest files / 330 tests, skips
three protected files / five tests, cruises 173 modules / 347 dependencies without
a violation, and passes formatting, lint, typecheck, SQLite/reset checks, and the
production Vite build.

## Residual limitations

- The user-facing CLI does not yet create the fixed research-capable session,
  connection, exact unsafe/legitimate requests, or later exact approval.
- Protected Tavily, Nemotron-through-broker, exact approval, demo merge, and audit
  inspection still need a safe controlled rerun.
- WebAuthn, OS peer identity, Linux credential-store parity, review, and remote CI
  remain.
