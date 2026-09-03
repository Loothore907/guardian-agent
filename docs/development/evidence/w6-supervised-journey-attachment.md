# W6 supervised competition journey attachment evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Deterministic lifecycle attachment implemented locally; service-specific
  process startup, IPC, CLI exposure, protected evidence, review, and remote CI
  remain

## Implemented path

```text
already-started supervised research child + typed research client
already-started supervised broker child   + typed broker client
  -> distinct-process validation
  -> one-use ADR-0020 coordinator
  -> fail-closed child-exit race
  -> completed | interrupted | closed
```

The public factory accepts only the two typed clients and two narrow supervised
process handles. It does not accept an entrypoint, command, arbitrary environment,
provider endpoint, credential, or destination.

## Deterministic evidence

The focused suite passes nine tests covering:

- one successful attachment run followed by replay rejection;
- concurrent second-run rejection before approval can be reused;
- research-child exit before execution;
- broker-child exit during execution;
- fixed minimization of unexpected runner failure;
- invalid or identical process identity rejection;
- both-child shutdown and later execution denial;
- both shutdown attempts despite one private failure; and
- construction of the fixed ADR-0020 coordinator from typed clients.

Focused Prettier, ESLint, TypeScript project build, and Vitest pass. The completed
W6-W8 workspace gate passes 55 ordinary Vitest files / 316 tests, skips three
protected files / five tests, cruises 163 modules / 315 dependencies without a
violation, and passes formatting, lint, typecheck, SQLite/reset checks, and the
production Vite build.

## Residual limitations

- W6 attaches already-started process handles; it does not yet start the existing
  Tavily service or a broker IPC service.
- No provider credential, live research call, GitHub request, approval, or remote
  mutation was used by this deterministic slice.
- The CLI, WebAuthn, protected service-exit evidence, and complete end-to-end
  competition journey remain.
