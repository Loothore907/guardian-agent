# W26 Linux Secret Service lifecycle evidence

- Date: 2026-09-03 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Parent branch: `codex/13-c6-linux-peer-credentials`
- Branch: `codex/13-c6-linux-secret-service`
- Status: Real disposable Secret Service lifecycle passed; protected provider credential and broader service containment remain

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

## Claim boundary and next step

This is active compatibility evidence for a real Linux Secret Service lifecycle
using disposable data. It does not prove that an operator's persistent desktop
keyring is correctly configured, that credential-holding service processes are
fully contained on the intended Linux host, or that a protected provider
credential can be resolved without leakage. Those claims remain open, followed
by the separately authorized narrow Linux GitHub read/merge evidence.
