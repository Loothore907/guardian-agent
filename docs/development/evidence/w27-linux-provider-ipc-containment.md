# W27: Linux provider-service IPC containment

Date: 2026-09-04. Local uncommitted implementation on `e5b1217`, branch
`codex/13-c6-linux-provider-containment`; includes the preserved September 4
discovery fixes. Decision: [ADR-0047](../../adr/0047-linux-provider-service-ipc-containment.md).

## Implemented and verified scope

The shared `packages/linux-peer-identity/src/service-ipc.ts` transport now guards
interaction, mission review, Guardian setup/action risk, worker, research, and
broker IPC. Linux servers verify kernel PID/UID/GID and supervised ancestry before
protocol parsing. Clients authenticate listeners before sending capability-bearing
frames. Owner-only socket permissions, endpoint identity checks, missing-helper
failure, bounded admission, and idempotent shutdown are enforced. Protocol-specific
capability, session, digest, expiry, and replay checks remain in place.

Eight real Linux tests in `packages/linux-peer-identity/src/service-ipc.test.ts`
cover an allowed caller and wrong capability, an unrelated caller holding a valid
fixture capability, an impersonating grandchild listener receiving zero client
bytes, occupied file/symlink and unsafe-directory rejection, permission drift,
disconnect/shutdown, missing helper, and close racing bind. Existing peer tests
cover wrong UID/GID and ancestry deterministically. Existing service suites cover
successful calls and protocol rejection paths across all seven integrations.

The first native run exposed a real allowed-path regression: passing the socket
to the peer helper pauses Node's socket. Clients now attach their response reader
and resume before writing. Both allowed and adversarial paths then passed.

## Reproduction and results

Use the repository-pinned Node/pnpm runtime. On Windows run
`./scripts/pnpm.ps1 check`. On a clean ext4 Linux checkout, install the frozen
lockfile, then run `pnpm check` and `pnpm test:linux-platform`. Linux requires the
native helper built by the normal check pipeline. No protected-test flags were set.

| Check                                     | Windows                                           | Linux / WSL2 Ubuntu 22.04                        |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Complete Vitest suite                     | 72 files / 534 passed; 5 files / 18 tests skipped | 73 files / 546 passed; 4 files / 6 tests skipped |
| SQLite authority spike                    | 7 passed; 1 POSIX skip                            | 8 passed                                         |
| Disposable reset planner                  | 2 passed                                          | 2 passed                                         |
| Dependency boundaries                     | 207 modules / 446 edges; no violations            | 207 modules / 446 edges; no violations           |
| Format, lint, typecheck, production build | Passed                                            | Passed                                           |
| Native Linux platform probes              | Not applicable                                    | 2 passed                                         |

All eight new native tests are skipped on Windows. Dependency changes add only
five existing workspace-package links; no third-party package was introduced.
The Linux test stage was `/home/loothore907/guardian-w27-session-20260904`, copied
from nonignored source and installed from cached dependencies. No enrolled
credential, provider response, or credential-bearing environment was inspected.
The credential-free ext4 source stage is retained for the proposed protected
regression; temporary archive and debug files were removed. Final local Markdown
file-target validation found zero missing targets, and `git diff --check` passed.
Remote URLs and heading anchors were outside that file-target check.

## Remaining gates

This is evidence for local Linux service IPC admission, not complete provider
containment or an Enforced session. Protected post-change Nebius consumption,
broader intended-host credential/process/artifact and bypass evidence, and the
narrow Linux GitHub read/merge remain open. Windows pipe ACL/peer-token enforcement,
privileged same-user filesystem manipulation, and descendant-tree confinement are
not established here. WSL emitted a systemd user-session warning; credential-free
tests do not establish current Secret Service readiness.

The existing live GitHub test directly constructs `WindowsCredentialStore` and
an in-process broker. Running it on Linux would not evidence this service boundary.
The [protected-gate preparation](../protected-c6-ceremonies-2026-09-04.md) records
the missing harness composition and the exact disposable target inspected read-only.
No paid call, remote mutation, commit, push, or credential enrollment occurred.

## Subsequent approved protected attempt

After the local checkpoint, the user approved the prepared Linux Nebius run.
Build passed; the single live test failed during Qwen after 15,173.9969 ms with
sanitized `provider_unavailable`. Nemotron was never started. Cleanup was awaited;
a follow-up process-name check found no remaining test-related processes. No retry
or enrollment change was made. Whether an external request was sent or billed is
not established by this result. The WSL user bus was absent on one follow-up and
present on the next; the matching 15-second credential-helper timeout is a lead,
not a proven cause. See the [ceremony record](../protected-c6-ceremonies-2026-09-04.md).
The protected post-change gate remains unpassed; ordinary suite evidence above
is unchanged.

## Recovery follow-up: protected gate passed

The subsequent user-directed recovery found a failed WSL user manager
(`219/CGROUP`) and, after its targeted restart, a locked default keyring.
The user unlocked the existing collection through its native prompt. A bounded
retry with a new metadata-only preflight passed both supervised Qwen and Nemotron
in one test, 6,326.040222 ms. Cleanup verification found no remaining test-related
processes. No key was replaced, reenrolled, or revealed. This supersedes the
unpassed protected-gate status immediately above, while preserving its history.

Six new preflight regressions pass on Windows and Linux and are included in the
ordinary required suite. Both complete `pnpm check` runs passed after the change;
existing Vitest, SQLite, reset, and dependency-boundary counts remain unchanged.
See the [recovery and exact commands](../protected-c6-ceremonies-2026-09-04.md).
This adds post-change protected provider consumption evidence, not complete
intended-host containment or the Linux GitHub effect gate.
