# Session closeout and next-task entry point

For the reconciled pickup and WSL acceptance plan, read the
[current state review](state-review-2026-09-04.md). This closeout records the
prior executed session; its results were not rerun by the documentation review.

## Current state

The discovery, W27 IPC containment, protected Nebius recovery, and W28 GitHub
harness work remain uncommitted on `codex/13-c6-linux-provider-containment`, based
on `e5b1217`. Preserve all modified/untracked source and evidence. No source-repo
push or PR update occurred. The disposable fixture creation was explicitly approved
and completed: [demo PR 3](https://github.com/Loothore907/guardian-agent-demo/pull/3),
head `b8e2e559fe60d182566909fec47d3cd5d1d48243`, base
`7df353afe005b74811dfcd081ac98af5695a8170`. Only the fixture baseline line changed.
No merge has been authorized or performed.

Completed evidence: Windows 534 and Linux 546 Vitest cases; six keyring-preflight
cases and five supervised GitHub cases on each platform; SQLite/reset suites;
207-module/446-edge dependency boundaries; builds and Linux native probes. The
protected Qwen/Nemotron gate passed in 6.3 seconds using existing enrollment.
The real Linux GitHub read returned `connection_unavailable`; trusted CLI status
confirmed `github: missing`. No successful Linux GitHub read is claimed.

## Session usability repair and limits

Later [cgroup diagnosis](evidence/2026-09-04-wsl-cgroup-diagnosis.md) and the
[recovery procedure](wsl-session-recovery.md) supersede the earlier unknown-root-
cause pickup: warm restarts reproduced cgroup EBUSY; full-VM cold starts and
existing enrollment persistence passed. This closeout remains historical.

The repeated unlock friction has two observed causes: WSL's user manager failed
with `219/CGROUP`, and its service activation environment lacked WSLg display
variables. A targeted reset/start restored the manager; importing only `DISPLAY`
and `WAYLAND_DISPLAY` restored local display routing. A submitted Secret Service
prompt request does not prove a visible window. Native prompt completion and
unlocked collection metadata were subsequently observed.

`scripts/linux-credential-session.sh` makes the working-session mitigation
reproducible. It validates the normal user, active manager/bus, and fixed local WSLg
display, imports only those two display variables, then optionally holds a
foreground WSL process for up to 30 minutes. It stops if manager activity/PID changes or the bus socket is absent at a
poll; it does not validate bus identity or interrupt work in another terminal. It neither reads secrets nor unlocks/creates a collection. Invocation:

```sh
sh scripts/linux-credential-session.sh --hold 1800
```

Keep that terminal open while using separate terminals/tools for protected work.
The helper ends on Ctrl+C or expiry. It does not disable locking, store a password,
change PAM/system configuration, or survive reboot. It is an explicit session
hold, not a permanent fix for WSL cgroup failures or a hosted production launcher.
After a new login/WSL restart, a native user unlock can still be required.

Verification: shell syntax, invalid mode/durations, and nonlocal-display rejection
are checked in `scripts/linux-credential-session.test.sh`; the opt-in
`GUARDIAN_TEST_WSL_SESSION=1` adds a two-second intended-host hold/expiry smoke.
The normal-user intended-host smoke passed with no provider or credential access.

Microsoft documents that systemd services do not keep WSL alive:
[WSL systemd guidance](https://learn.microsoft.com/en-us/windows/wsl/systemd).
This supports using an explicit foreground session during the ceremony rather
than assuming a running keyring daemon preserves the distribution. A reported
[WSL 219/CGROUP issue](https://github.com/microsoft/WSL/issues/13188) resembles the
observed failure but does not prove this host's underlying root cause.

## Stoppers and priority

1. **Host-session durability:** the bounded hold/routing helper is tested; repeated
   clean-start/native-visible-prompt and crash/restart recovery still need evidence.
   Do not call the underlying WSL issue permanently fixed.
2. **Linux GitHub enrollment:** missing. Use the accepted user-operated App device
   flow, fixed repository ID `1352093544`, and the already documented public client
   ID. No Windows token copying or Nebius reenrollment.
3. **Real GitHub evidence:** after enrollment, run exact-head read of PR 3; prepare
   the separate exact-head squash review only after read succeeds. See
   [W28 commands](w28-github-handoff.md). Fixture-creation authority is already used
   and does not require asking again.
4. **Windows real-clock IPC:** receiver timestamps were 2–10 ms behind sender;
   strict rejection remains. Windows synthetic tests use fixed clocks; Linux uses
   real clocks. Resolve separately without silently weakening freshness checks.
5. **C6 closure and review:** broader intended-host credential/process/artifact and
   bypass corpus, current source-head CI/dependency audit, and coherent commit/PR
   review remain. Issue 13/PR 17's prior status is historical, not current-head CI.
6. **Later roadmap:** C7 worker-generated dispatch/evaluation, C8 WebAuthn/full
   coordinator, and hosted judge deployment remain subsequent slices. C6/C7 are
   In progress; no Enforced or production-ready promotion is justified.

## Handoff decision

This is a good handoff seam: the code has bounded local verification, the live
fixture is exact and reviewable, and the next work has explicit entry conditions.
Start the next task from this file and W28 evidence; do not reconstruct the long
historical handoff. Preserve the current worktree and the credential-free ext4
stage `/home/loothore907/guardian-w27-session-20260904`. Copy the new session helper
there before use if it is not present. No new task was created automatically.
