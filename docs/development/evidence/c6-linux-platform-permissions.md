# C6 Linux Platform Permission Evidence

- Date: 2026-09-03 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Branch: `codex/13-c6-linux-reference`
- Status: Linux filesystem and socket-mode sub-gate implemented and active; peer identity and credential resolution remain

> Follow-up: W25 implements and actively verifies authority peer identity and
> adds deterministic fail-closed Linux Secret Service resolution. Protected
> credential lifecycle and GitHub evidence still remain; see
> [`w25-linux-peer-and-credentials.md`](w25-linux-peer-and-credentials.md).

## Outcome

The production authority boundary now verifies the current user and restrictive
mode of its Linux/Unix socket and SQLite files. A dedicated Linux probe runs as an
explicit CI step and can also be run on the intended Windows/WSL development
host. It covers the main database, WAL and shared-memory sidecars, socket type and
ownership, unknown-capability rejection, broad parent/file permissions, and a
symbolic-link database near miss.

The first active WSL run exposed a real defect: SQLite created the WAL and
shared-memory sidecars as mode `0644` before the existing code tightened only the
main database. The enclosing state directory was already mode `0700`, so another
user could not traverse to those files, but the file modes did not meet the C6
private-state contract. The implementation now changes every present SQLite file
to `0600` and verifies its type, owner, and final mode. Pre-existing broad or
non-regular database files fail before SQLite opens them.

The authority service likewise changes its Unix-domain socket to `0600`, then
verifies that it is a socket owned by the current user. If this post-listen check
fails, startup closes the listener and store and rejects instead of returning a
partially secured boundary.

## Reproducible verification

Windows deterministic checks:

```powershell
pnpm typecheck
node node_modules/vitest/vitest.mjs run `
  apps/authority-service/src/index.test.ts `
  packages/authority-store/src/index.test.ts
node --test scripts/linux-c6-permissions.test.mjs
```

The focused Vitest run passes 24 tests with the three POSIX-only tests skipped on
Windows. The standalone probe reports its two expected skips on Windows.

An active WSL2 Ubuntu 22.04 run used the repository-pinned Node `24.19.0` Linux
binary downloaded from `nodejs.org` into a temporary directory and verified
against the official `SHASUMS256.txt`. The final result was two of two tests
passing. The temporary runtime was removed after the run. No provider credential
was resolved and no external provider or GitHub operation was attempted.

`.github/workflows/ci.yml` now runs `pnpm test:linux-platform` after the complete
required check on `ubuntu-latest`, so pull requests and `main` cannot silently
skip this Linux-only sub-gate.

## Claim boundary and next decision

This evidence closes only the database/socket permission portion of the combined
C6 Linux exit criterion. It does not establish an authenticated OS peer. Node
24's public `node:net` socket API exposes Unix-domain sockets but no Linux
`SO_PEERCRED` accessor. Selecting a PID/UID peer verifier therefore requires a
small native boundary or a different supervised IPC topology and must be recorded
before implementation.

WSL currently has neither the repository-required Node 24 runtime nor
`secret-tool` installed by default. The temporary runtime was adequate for this
credential-free probe; it is not an installation design. Linux Secret Service
integration, a documented secured fallback, service-process identity and
containment, and protected Linux GitHub read/merge remain open. C6 stays **In
progress** and no Enforced claim is widened.
