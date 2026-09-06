# WSL cgroup diagnosis and cold-start recovery

Date: 2026-09-04 (AKDT). Scope: host diagnosis, bounded restart/recovery tests,
metadata-only readiness and documentation. No permanent OS change, software
update, credential replacement, paid provider call, or remote repository mutation.

## Finding

The normal-user manager fails before Secret Service or Guardian starts:

```text
user@1000.service: Failed to attach to cgroup /user.slice/user-1000.slice/user@1000.service: Device or resource busy
user@1000.service: Failed at step CGROUP spawning /lib/systemd/systemd: Device or resource busy
user@1000.service: Main process exited, code=exited, status=219/CGROUP
```

Root's user manager also returned the same attachment error and status 219. The
failure is therefore not isolated to Guardian enrollment or a particular keyring.
The journal was captured while a fixed foreground process kept the failed
instance alive. No service reset or credential action preceded that capture.

Host: WSL 2.6.1.0, kernel 6.6.87.2, WSLg 1.0.66, Ubuntu-22.04, systemd 249
(249.11-0ubuntu3.22). One registered distribution was present. The healthy unit
used `/lib/systemd/system/user@.service`, with only the distribution-supplied
`/usr/lib/systemd/system/user@.service.d/timeout.conf` override. Cgroup v2 was
mounted with `nsdelegate`; the healthy unit had `Delegate=yes`.

In the failed instance, `MainPID=0`, `ControlGroup=` was empty, and the user bus
was absent. The expected `user@1000.service` cgroup directory was absent, while
its parent existed, reported `domain`, and had memory/pids subtree controllers.
Those observations establish the failed attachment, not the exact kernel race.

## Correction to the prior restart interpretation

The earlier three samples used `wsl --terminate Ubuntu-22.04`. They were
distribution restarts, not verified fresh VM boots. This session captured a
healthy start and a failed post-terminate start with the SAME kernel boot ID:
`6eb8b564-17b0-493f-8e6d-4b117d77e47a`. Consequently, describing those samples
as three cold boots would be incorrect. WSL retained VM-level state across them.

Some historical journal records persisted, but the previous boot's filtered
messages did not include the detailed failures. The current-instance capture
used both the exact unit log and a cgroup-error filter to include the child
systemd attachment message. Reading a later successful boot alone was insufficient.

## Upstream comparison

Microsoft [WSL PR 40519](https://github.com/microsoft/WSL/pull/40519) documents
shared cgroup trees between distribution systemd instances, with the same
user-manager `Device or resource busy` error. Its fix introduces per-distribution
cgroup isolation. This is a strong matching failure mechanism, but the public
example involves multiple distributions; our single-distribution warm-restart
case has not been proven identical by kernel tracing.

The [2.9.8 release notes](https://github.com/microsoft/WSL/releases/tag/2.9.8)
explicitly include PR 40519 and follow-up 41073, and label that release a
pre-release. At inspection, [GitHub's latest stable release](https://github.com/microsoft/WSL/releases/tag/2.7.13)
was 2.7.13; its notes concern an MDE-plugin startup issue, not this cgroup fix.
No evidence was obtained that an ordinary stable update alone fixes this fault.
No pre-release or stable update was installed. Do not infer fix availability
from a higher version number alone; verify the release's contents before choosing
an upgrade. External issue comments are evidence leads, not authority for host edits.

## Controlled recovery results

Three `wsl --shutdown` / normal-user startup samples each produced a distinct
kernel boot ID. Each then ran the existing session helper for two seconds and
the metadata-only keyring preflight.

| Cold start | Boot ID | Manager / bus | Helper expiry | Keyring |
| --- | --- | --- | --- | --- |
| 1 | `f8d4db71-7b6e-4248-8ac9-57c3d9dff4b5` | Active / present | Passed | Existing collection locked |
| 2 | `538aff83-fa33-471c-a69a-8692d6b84bcf` | Active / present | Passed | Existing collection locked |
| 3 | `6a94ab4e-2b01-41a3-9c08-0597fc5b0029` | Active / present | Passed | Existing collection locked |

Keyring preflight correctly returned nonzero for locked collections. That is
expected protection, not a failed manager-recovery sample. No native unlock was
attempted during these three metadata samples.

A subsequent unheld invocation again encountered failed user-manager startup;
the helper denied and a native-prompt attempt could not connect to the bus.
No prompt was shown or secret read by that failed attempt. This matters for the
procedure: start the foreground hold in the SAME first invocation after full
shutdown, rather than doing a short readiness command and leaving a gap.

A fourth full shutdown followed immediately by a 600-second foreground hold
produced boot ID `1c7eb79c-29e1-419c-a1aa-6ced85a255c5` and healthy bus/display
routing. A native user-operated unlock was requested in that held session.
The user confirmed native dialog visibility and completed unlock. The prompt
reported completion; metadata returned `keyring=ready`. Trusted interactive CLI
status returned `github: available` and `nebius: available`. Existing enrollments
survived the cold starts without re-enrollment or provider use.

## Reproduction and claim limit

The bounded diagnostic sequence is:

1. Read `systemctl show user@1000.service` with only state/result/PID/cgroup
   properties, test the fixed bus socket and record `/proc/sys/kernel/random/boot_id`.
2. Hold that exact instance using a bounded foreground process. As root, read
   `journalctl -b -u user@1000.service` and a bounded filter for cgroup attachment
   errors, then inspect only the relevant cgroup directories/controllers.
3. In an approved interruption window, compare distribution-only termination
   with full `wsl --shutdown`. Always record boot IDs; do not infer a cold boot
   from the distribution's Stopped label.
4. Start the normal-user session helper immediately after cold startup. Require
   separate native unlock and sanitized enrollment status before protected work.

See the [operator recovery procedure](../wsl-session-recovery.md). This is a
tested operational recovery, not a permanent repair of WSL 2.6.1 or evidence
for Enforced Linux parity. Three metadata successes and one held-session unlock
cannot establish general reliability or hosted credential containment. Existing
runtime gates from the prior session remain separate evidence.
