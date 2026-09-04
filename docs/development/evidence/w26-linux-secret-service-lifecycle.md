# W26 Linux Secret Service lifecycle evidence

- Date: 2026-09-03 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Parent branch: `codex/13-c6-linux-peer-credentials`
- Branch: `codex/13-c6-linux-secret-service`
- Status: Real disposable lifecycle and intended-host fake enrollment review pass;
  protected provider credential and broader service containment remain

## Outcome

The Linux credential adapter now has an opt-in integration test against the real
`/usr/bin/secret-tool` client and GNOME Keyring Secret Service. The test creates
an isolated user D-Bus session and disposable keyring home, then verifies an
exact randomized provider slot through missing status, write, provider-slot
isolation, available status, rotation, callback-scoped lookup, temporary-buffer
zeroing, deletion, and final missing status. Cleanup removes the temporary
keyring home after the D-Bus session exits.

The first attempt against the existing WSL login session failed closed during
the first write after the adapter's 15-second timeout. WSL reported that its
systemd user session could not start, and the unattended keyring could not be
unlocked. No raw helper diagnostic or credential value was emitted. The
reproducible harness therefore supplies its own user D-Bus session and unlocks
only a disposable test keyring with a fixed non-production fixture. This proves
real client/service compatibility without treating the development login
session as production containment evidence.

## Reproducible verification

Ubuntu 22.04 prerequisites:

```sh
sudo apt-get install libsecret-tools gnome-keyring
```

From a Linux checkout with Node 24 and locked dependencies installed:

```sh
pnpm test:live:linux-credentials
```

The protected development run used a checksum-verified official Node 24.19.0
runtime and a private WSL2 ext4 stage containing only tracked source plus the
new integration test. `.env.local` and ignored files were not copied. Results:

- real Secret Service lifecycle: two files / 13 tests passed;
- complete ordinary Linux gate: 63 files / 379 tests passed, with four files /
  six opt-in tests skipped;
- SQLite authority spike: eight passed;
- demo reset planner: two passed;
- dependency boundary scan: 181 modules / 364 dependencies, no violations;
- production build: passed; and
- native Linux authority platform probe: two passed.

The subsequent PR review found two transient helper-output copies that were not
explicitly zeroed on oversized and successful collection paths. The narrow fix
adds oversized-diagnostic rejection coverage. The parent branch complete Windows
gate passed, and the combined W26 head repeated the real 2-file / 13-test Secret
Service lifecycle successfully as `306a52f`.

No enrolled credential was read or written, no provider was contacted, and no
GitHub operation occurred. The temporary keyring directory and test daemon were
absent after the run.

On 2026-09-04 the intended WSL2 host was rechecked with systemd PID 1, the active
current-user manager, installed `secret-tool`/GNOME Keyring tooling, and the exact
ADR-0040 `/run/user/1000/bus` route. A clean tracked-source-only ext4 stage used
the retained checksum-verified Node 24.19.0 runtime and lockfile-verified offline
dependencies. Sanitized status returned `nebius: missing`, proving the normal user
Secret Service was reachable without the disposable harness. The user then
completed the fake-only browser review successfully. No real credential was
entered, stored, or sent to a provider during that review.

The Linux-activation source then passed the complete clean-stage gate: 72 Vitest
files / 528 tests passed, with four files / six protected or other-platform tests
skipped; all eight SQLite cases passed; both reset-planner tests passed; 201
modules / 427 dependency edges had no violation; and formatting, lint, TypeScript,
the Linux peer-helper build, and the production web build passed. The corresponding
Windows gate passed 72 files / 524 tests with four files / ten protected or
other-platform tests skipped.

## Claim boundary and next step

This is active compatibility evidence for a real disposable Linux Secret Service
lifecycle plus successful intended-host preflight and fake enrollment interaction.
It does not prove a real persistent credential write, that credential-holding
service processes are fully contained on the intended Linux host, or that a
protected provider credential can be resolved without leakage. Those claims remain
open, followed by the separately authorized narrow Linux GitHub read/merge evidence.
