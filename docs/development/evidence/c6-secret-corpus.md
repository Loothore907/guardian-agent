# C6 Credential Secret-Corpus Evidence

- Date: 2026-08-31
- Scope: deterministic setup, callback-scoped GitHub read/merge, runner and model
  projections, SQLite, authority context, diagnostics, and public results
- Status: application-visible corpus passes; OS-process supervision and protected
  live corpus inspection remain separate requirements

## Outcome

The bounded credential fixture is accepted only through trusted setup input or a
credential-store callback. Deterministic tests demonstrate that it is absent from
setup and management output, helper arguments and environment, interaction-model
context, Guardian Session command environment, SQLite files, authority
attempt/decision records, console log/debug/warn/error/trace capture, broker
service metadata, sanitized errors, and public GitHub read and merge results.

The credential-holding adapter still places the credential in the fixed GitHub
authorization header at the provider boundary; that is its intended narrow use.
Credential-polluted GitHub response fields are discarded by strict projections.
The callback's temporary byte copy is zeroed after use. A missing GitHub slot
fails that typed use while independently enrolled Nebius and Tavily slots remain
available.

## Reproducible checks

```powershell
pnpm exec vitest run `
  packages/credential-store/src/index.test.ts `
  apps/guardian-cli/src/setup.test.ts `
  apps/interaction-service/src/index.test.ts `
  packages/adapter-github/src/index.test.ts `
  packages/broker/src/index.test.ts `
  apps/broker-service/src/index.test.ts

pnpm test:reference-runtime
```

The broker-service corpus test crosses authenticated authority IPC for one
routine read and one exact-approved squash merge. It uses a provider response
polluted with the credential fixture, inspects every SQLite/WAL/SHM file present
during the run as raw bytes, captures the current console logging surfaces, and
serializes the public results and boundary metadata. The lower-level broker test
also inspects the persisted authority attempt and decision projection after the
allowed merge and rejected replay.

The setup tests cover hidden-input enrollment, status, revocation, device-flow
slot separation, zeroing, rollback, sanitized failure, and helper argv/environment
projection. Interaction tests prove the provider receives only normalized mission
context and that malformed or credential-bearing output fails closed or is
redacted. The production reference-runtime probe verifies the command sandbox has
an empty provider-credential environment and no host credential paths.

## Limitations

- Authority and interaction services still run under trusted in-process
  orchestration in the current development path. This evidence does not replace
  OS-process supervision, peer-identity, or Linux credential-store evidence.
- Console capture covers the logging and trace surfaces implemented today. There
  is no production telemetry exporter yet; one must receive its own corpus test
  before it can be enabled.
- The deterministic credential uses a recognizable bounded fixture. Protected
  Windows Credential Manager and live-provider checks prove narrow real paths but
  intentionally do not copy real credentials into a comparison corpus.
- This does not claim protection from privileged host inspection, memory forensics,
  swap, crash dumps, or covert channels outside the documented reference runtime.
