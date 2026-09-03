# C6 SQLite Authority Spike Evidence

- Date: 2026-08-30 (AKDT)
- Runtime: Node.js 24.19.0 `node:sqlite`
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Local feasibility gate passed; production repository admission remains

## Question

Can the single-host competition runtime use Node's built-in SQLite API for durable
non-secret authority state without resetting sessions, replay state, or budgets
after concurrency, process failure, or restart?

The API remains release-candidate stability in the pinned Node line, so ADR-0005
requires evidence before production packages may depend on it. The spike is kept
under `spikes/sqlite-authority/`; production code does not import it.

## Configuration under test

The spike uses:

- one absolute `.sqlite` path outside disposable session workspaces;
- extension loading disabled;
- defensive mode enabled;
- double-quoted string literals disabled;
- foreign-key enforcement enabled;
- a five-second busy timeout;
- WAL journaling and `synchronous = FULL`;
- strict tables, primary keys, unique nonces, foreign keys, and non-negative budget
  checks; and
- `BEGIN IMMEDIATE` transactions for authority consumption.

No reusable credential, IPC capability, provider response, raw hostile content, or
rejected query is represented in the schema.

## Reproducible evidence

Run:

```powershell
.\scripts\pnpm.ps1 test:sqlite-spike
```

The Windows reference-host result passes seven active tests and skips one
POSIX-only permission-mode test:

1. A duplicate session identifier fails and its paired budget insert does not
   partially mutate existing state.
2. Reopening the database and running recovery changes active sessions to
   interrupted; the original identifier cannot be recreated with reset counters.
3. A child process exits with an open, uncommitted transaction; the inserted
   session is absent after recovery.
4. Eight competing processes consume one approval nonce exactly once.
5. Six competing processes reserve a one-request research budget exactly once and
   cannot overcommit result capacity.
6. A nonce consumption and research reservation committed immediately before a
   simulated lost response remain consumed after reopening.
7. Database placement inside a supplied disposable workspace is rejected, and a
   read-only connection cannot mutate an active session.
8. On POSIX hosts, group- or world-accessible state directories are rejected.

The spike is also included in `pnpm check`, so deterministic public CI will run it
on the configured Linux Node 24 host.

## Decision

**Go for the single-host competition prototype.** The spike is sufficient to begin
promoting narrow SQLite repository interfaces into the trusted C6 authority and
broker boundary. It does not admit arbitrary SQL, multi-host coordination, live
session resumption, or credential storage.

## Residual limitations

- `node:sqlite` is still a release-candidate Node API, not a production-stable
  portability guarantee.
- Windows mode bits do not prove a private ACL. The current host evidence covers
  placement and read-only failure; deployment-specific ACL configuration remains.
- Hosted Linux must run the POSIX permission test before release.
- The spike deliberately marks sessions interrupted on restart; it does not restore
  a live sandbox, identity channel, endpoint, or capability.
- The schema is evidence code. Production migration, compatibility, backup,
  corruption, audit-sequence, and data-retention behavior remain C6 work.

## Sources

- [Node.js 24.19.0 SQLite documentation](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)
- [ADR-0005](../../adr/0005-durable-authority-and-rejection-context.md)
