# C6 Terminal Bootstrap Evidence

- Status: Implemented locally; lower-assurance development confirmation only
- Date: 2026-08-31
- Scope: strict terminal draft, normalized reference preview, confirmation, and
  supervisor launch boundary

## Implemented slice

The first ADR-0007 slice adds a Guardian-owned `guardian` CLI bootstrap and a
reference-supervisor coordinator. An untrusted client can submit only bounded
objective text. The coordinator derives the complete reference constraints,
tool catalog, filesystem and network scope, side effects, duration, and volume
budgets. The client cannot submit human authorship, permissions, assurance
evidence, authority capabilities, or a revocation handle.

The coordinator returns a strict preview with a domain-separated canonical
digest. Launch requires the exact draft identifier and digest plus a fresh,
explicitly lower-assurance development confirmation. A mismatched digest, stale
confirmation, replay, unknown draft, caller-added field, or non-interactive CLI
invocation fails before launch. The draft is consumed before the launcher
boundary so an uncertain failure cannot make the same confirmation reusable.

The supervisor, not the CLI, injects the launcher authority capability. The
public bootstrap result contains session, mission, profile, assurance, expiry,
tool, and development-confirmation fields only. It excludes the authority IPC
endpoint, capability, and revocation handle. The integration contract rejects an
Enforced maximum for unrestricted tool-only mode.

## Reproducible checks

```powershell
vitest run packages/contracts/src/bootstrap.test.ts `
  apps/reference-supervisor/src/bootstrap.test.ts `
  apps/reference-supervisor/src/index.test.ts `
  apps/guardian-cli/src/index.test.ts

tsc -b packages/contracts apps/reference-supervisor apps/guardian-cli --pretty false

eslint "packages/contracts/src/bootstrap*.ts" `
  "apps/reference-supervisor/src/bootstrap*.ts" `
  "apps/reference-supervisor/src/index.ts" `
  "apps/guardian-cli/src/*.ts" --max-warnings=0

depcruise apps packages --config .dependency-cruiser.cjs
```

The focused test run passes 4 files and 14 tests. Dependency Cruiser passes 91
modules and 149 dependencies.

The complete ordinary `pnpm check` gate at this evidence point passed formatting,
ESLint, TypeScript, 25 Vitest files / 129 tests, the eight-case SQLite spike with the
expected Windows POSIX-permission skip, dependency boundaries, and the production
build. `pnpm test:reference-runtime` passes the host-specific production launcher
and WSL isolation probe when permitted to access the WSL service.

## Limitations

- The terminal confirmation is a development mechanism. Interactive TTY input
  does not prove a human gesture and is not equivalent to WebAuthn.
- No terminal-to-browser ceremony, authenticated return channel, account
  identity, or passkey issuer is implemented.
- This evidence record covers the bootstrap-only checkpoint. A subsequent local
  slice attaches the one-turn fake-provider runner documented in
  [C6 controlled interaction boundary evidence](c6-interaction-boundary.md).
- The selected reference profile has no public network or research capability
  and permits no privileged action.
- The current C4 empty disposable workspace remains; repository materialization
  is not implemented by this slice.
- No protected hosted-Linux CLI run or completed terminal-to-browser-to-terminal
  evidence exists.
