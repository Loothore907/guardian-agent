# W26 Linux Secret Service lifecycle evidence

- Date: 2026-09-03; intended-host completion 2026-09-04 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Parent branch: `codex/13-c6-linux-peer-credentials`
- Branch: `codex/13-c6-linux-secret-service`
- Status: Disposable and intended-host persistent lifecycles, real enrollment,
  and protected Nebius provider consumption pass; broader containment remains

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

The first normal-user persistent lifecycle attempt was deliberately run with only
generated fixture material. Secret Service activated and requested its graphical
keyring prompt, but the agent-controlled test could not complete that human prompt.
The helper timed out after 15 seconds and the lifecycle failed closed at its first
write. No provider was contacted and no successful credential write was reported.
This demonstrates that lookup/preflight readiness is not persistent-write
readiness in the WSL login environment. A user-operated fake lifecycle must create
or unlock the collection before any real Linux credential is entered.

The user then ran the isolated integration lifecycle from their own WSL terminal
in the normal user session. One test passed in 126 ms, covering write, resolve,
rotation, temporary-buffer zeroing, and deletion through the fixed Secret Service
adapter. No provider credential was involved in that fixture lifecycle.

Before real enrollment, Guardian deleted one stale local `nebius/default` entry
whose provider-side key had already been revoked. Sanitized status then returned
`nebius: missing`. The user started the accepted Guardian browser surface and
confirmed its Linux Secret Service destination before creating a replacement
provider key. The displayed value traveled only from the provider modal to the
Guardian browser form. Guardian verified the fixed Nebius endpoint and reported
successful storage for the bounded account label. Sanitized intended-host status
then returned `nebius: available`.

With the provider modal retained until validation completed, the protected Linux
gate ran:

```sh
GUARDIAN_TEST_NEBIUS_MODELS=1 pnpm test:live:nebius-models
```

The production build passed and the one protected test passed in approximately
3.9 seconds. It proved that the supervised Qwen and Nemotron services resolved
the enrolled credential through the Linux Secret Service path. The harness
printed neither credential material nor raw model output and performed no
privileged external effect beyond paid inference usage.

## Claim boundary and next step

This is active evidence for disposable and normal-user persistent Secret Service
lifecycles, accepted real Linux enrollment, sanitized availability, and bounded
protected Nebius consumption through supervised credential-holding services. It
does not prove that every credential-holding service process is fully contained
on the intended Linux host, complete artifact/process secret-corpus exclusion, or
the narrow Linux GitHub read/merge path. Those C6 claims remain open.
