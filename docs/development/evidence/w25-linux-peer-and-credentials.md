# W25 Linux peer identity and credential resolution evidence

- Date: 2026-09-03 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Branch: `codex/13-c6-linux-peer-credentials`
- Status: Peer identity implemented and actively verified; Secret Service adapter implemented and deterministic; protected Linux credential resolution remains

## Outcome

The Linux authority boundary now authenticates kernel-reported peer PID, UID,
and GID before reading any request. A narrow repository-owned C helper receives
only the already accepted Unix socket on file descriptor 3 and calls
`getsockopt(SO_PEERCRED)`. The TypeScript verifier accepts only the authority
process, its configured supervisor, or another direct child of that supervisor,
with the same UID and GID. The existing exact capability and caller/session
binding remains mandatory afterward.

The active test gives an unrelated child the valid authority capability and
endpoint. The connection is rejected before protocol handling because its parent
is the test process rather than the configured supervisor. Same-process test
clients, unknown-capability rejection, current-user socket/database modes, and
the earlier broad-mode and symbolic-link near misses also pass.

The credential-store package now selects Windows Credential Manager on Windows
and Linux Secret Service on Linux. The Linux adapter invokes only
`/usr/bin/secret-tool`, uses fixed typed attributes, sends secret bytes only over
stdin, bounds and zeroes lookup output, and provides no fallback. Provider-facing
service processes and the interactive setup command use this platform selector.

## Reproducible verification

Focused deterministic checks:

```powershell
node_modules/.bin/tsc.CMD -b --pretty false
node_modules/.bin/eslint.CMD "apps/**/*.{ts,tsx}" "packages/**/*.ts" "*.ts" --max-warnings=0
node_modules/.bin/vitest.CMD run `
  packages/linux-peer-identity/src/index.test.ts `
  packages/credential-store/src/index.test.ts `
  apps/authority-service/src/index.test.ts
```

The focused run passed 26 tests with the single existing POSIX-only authority
test skipped on Windows. The Linux platform probe used a checksum-verified,
temporary official Node 24.19.0 runtime and a private WSL2 Ubuntu 22.04 ext4
stage. The helper was a regular current-user-owned mode `0755` ELF, and both
platform tests passed, including the valid-capability unrelated-process denial.
The runtime and stage were removed after the run.

The Windows-mounted repository reports executable files as mode `0777`; Guardian
correctly rejected that DrvFS copy. No permission check was weakened for the
development mount.

The WSL image has a user session bus but no `/usr/bin/secret-tool`. An active
negative probe attempted only non-secret GitHub credential status and received
the fixed `CredentialStoreError` message. No credential was read or written, no
provider was contacted, and no fallback was used.

The complete local gate also passed: 63 Vitest files / 376 tests with three
files / eight tests skipped on Windows, seven SQLite spike tests with one POSIX
skip, two reset-planner tests, 180 modules / 362 dependencies, and the production
build. Formatting, ESLint, TypeScript, and `git diff --check` were clean.

PR [#17](https://github.com/Loothore907/guardian-agent/pull/17) runs the clean
Ubuntu workflow at head `6dae2f9`. Both the initial run and one bounded retry
passed the complete required-check step and the native Linux platform-boundary
step. Both then failed only because the npm advisory bulk endpoint timed out on
all three `pnpm audit` attempts with error 23. A local read-only audit query
reproduced the same endpoint timeout. No vulnerability finding was returned, no
third blind retry was issued, and the PR remains unmerged until the required
audit completes successfully.

## Claim boundary and next step

This evidence implements and actively exercises the authority peer check and
implements the Linux credential adapter. It does not show a real Secret Service
write/lookup/delete cycle or a protected Linux GitHub read/merge. Install and
configure `libsecret-tools` plus a Secret Service in the intended Linux user
session, then run disposable credential lifecycle and narrow provider evidence
under separate live authorization. Other trusted-service IPC peer checks,
service containment, and WebAuthn remain open. Issue #13 and C6 stay **In
progress**.
