# C6 Trusted Process Supervision Evidence

- Date: 2026-09-01
- Scope: authority-service and one-turn interaction-service child processes
- Status: implemented locally; platform peer identity and containment remain

## Outcome

ADR-0010 is implemented for the current reference composition. The Guardian CLI
asks the reference supervisor for a fixed interaction process instead of importing
or constructing a provider. The supervisor starts one authority child for its
lifetime and one short-lived fake-provider interaction child per controlled turn.

Each child has a fixed entrypoint, receives one bounded strict JSON frame over
stdin, and emits one exact credential-free readiness line. Capability-bearing
bootstrap is absent from argv and the supplied environment. Bootstrap buffers are
cleared after writing and parsing. Stderr, extra or oversized output, malformed or
oversized bootstrap, early exit, and readiness timeout produce only a fixed parent
failure. Explicit close awaits termination and escalates to forced termination
only after a bounded timeout.

An unexpected authority exit is observable through the supervisor. It is not
restarted, and subsequent authority calls fail unavailable. A future fresh
supervisor start retains the existing durable rule that interrupts prior active
sessions.

## Reproducible checks

```powershell
pnpm exec vitest run `
  apps/reference-supervisor/src/index.test.ts `
  apps/reference-supervisor/src/supervised-process.test.ts `
  apps/authority-service/src/index.test.ts `
  apps/interaction-service/src/index.test.ts `
  apps/guardian-cli/src/index.test.ts `
  apps/guardian-cli/src/setup.test.ts

pnpm test:reference-runtime
pnpm boundaries
```

The focused six-file process and CLI run passes 28 tests. The ordinary suite
passes 34 files / 179 tests, with five protected tests across three files skipped
in the 37-file / 184-test run. The SQLite spike passes seven cases with its one
expected Windows POSIX-permission skip; reset-planner tests, formatting, ESLint,
TypeScript, dependency boundaries, production build, and the production WSL
isolation probe pass.

## Claim boundary

This proves process lifecycle and bootstrap isolation in the local composition.
It does not establish an Enforced authority boundary on Windows or Linux. Windows
named-pipe ACL and peer-token evidence, Linux peer credentials and restrictive
socket ownership, dedicated service identities, credential-store placement,
child-tree containment, and protected live-model operation remain required.
