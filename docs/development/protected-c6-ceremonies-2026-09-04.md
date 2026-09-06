# Protected C6 gates: prepared scope

Status: Linux Nebius gate passed after repairing user-session readiness and
unlocking the existing keyring. W28 synthetic composition and a failed real read
are recorded in the [W28 handoff](w28-github-handoff.md); no successful live Linux
GitHub effect is claimed. See [current execution](evidence/2026-09-04-session-readiness.md).
See the [session plan](session-plan-2026-09-04-c6-containment.md) and
[local evidence](evidence/w27-linux-provider-ipc-containment.md).

## First: bounded Linux Nebius regression

Use the existing normal-user Linux Secret Service enrollment. Do not retrieve,
export, copy, replace, or reenroll the key. The tested source stage is
`/home/loothore907/guardian-w27-session-20260904`. In a working normal-user WSL
session, with the existing user bus available, the proposed command is:

```sh
cd /home/loothore907/guardian-w27-session-20260904
export PATH=/home/loothore907/.cache/guardian-node-v24.19.0/bin:/usr/bin:/bin
DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus XDG_RUNTIME_DIR=/run/user/1000 GUARDIAN_TEST_NEBIUS_MODELS=1 pnpm test:live:nebius-models
```

This starts the real supervised Qwen mission and Nemotron setup-risk services
with fixed credential-free fixtures. Bound: one Qwen request (1,024 output tokens),
one Nemotron request and at most one configured escalation (512 output tokens
each): at most three paid requests and 2,048 requested output tokens. Provider
timeouts are 20 seconds per request. No dollar estimate is asserted. Stop on
failure; no automatic rerun, enrollment, or fallback store. Capture only sanitized
test outcome and timing, then verify child cleanup. An unavailable/locked user
store must fail closed; the earlier systemd warning requires no speculative repair.

The user explicitly approved this bounded run after preparation. One attempt on
September 4 built successfully, then failed after 15,173.9969 ms with the sanitized
`InteractionIpcError: provider_unavailable` during Qwen. Nemotron was not started.
No automatic retry was made. The result does not establish whether an external
request was sent or billed; no provider payload or credential was inspected.

The test awaits interaction-child shutdown in `finally`; a subsequent process-name
check found zero remaining Node/MainThread, secret-tool, or guardian-peer processes.
WSL reported a failed systemd user-session startup. `/run/user/1000/bus` was absent
on the first follow-up check and present on the next. The credential helper has a
15-second timeout, consistent with the observed duration, but this is a diagnostic
lead rather than a proven root cause. Establish stable normal-user Secret Service
readiness before preparing any retry. Preserve the existing enrollment. The
approved stop-on-failure rule remains in effect.

### Recovery and successful verification

The user directed continued diagnosis and repair. Systemd unit diagnostics then
identified `user@1000.service` failing with `219/CGROUP`. A targeted
`systemctl reset-failed user@1000.service` followed by
`systemctl start user@1000.service`, executed as root in this WSL distribution,
restored the existing user manager. No system configuration, provider credential,
or keyring file was changed. This repairs the observed failed service; it does not
establish why WSL originally lost its cgroup or guarantee persistence across boots.

Secret Service `ReadAlias(default)` identified the existing default collection;
its `Locked` property was true. A native Secret Service unlock prompt was opened.
The user completed it directly; metadata then reported unlocked. No password,
stored item, or credential value was exposed to the agent, and no reenrollment
was performed.

`scripts/linux-keyring-preflight.mjs` now runs inside the protected Nebius test
before service startup. On the documented Linux user-bus route it reads only
the default collection alias and locked state through fixed, bounded `busctl`
calls. Missing bus, missing collection, locked collection, malformed metadata,
and helper failures stop with sanitized actionable errors. It never unlocks,
creates, searches, or reads stored items. Other platforms bypass Linux tooling.
Six credential-free regression tests are included in `pnpm check`.

After the repair and native unlock, the bounded retry passed one protected test
in **6,326.040222 ms**. Both supervised Qwen and Nemotron completed successfully;
the Guardian result preserved the mandatory authorization floor. The retry used
`GUARDIAN_TEST_NEBIUS_MODELS=1 node --test scripts/nebius-models-live.test.mjs`
against the already built, previously verified stage with the new preflight.
No raw provider output was printed. Cleanup was awaited, and a follow-up found
zero remaining test-related processes and an unlocked keyring.

Complete Windows and Linux `pnpm check` gates also passed after this change,
including all six preflight cases on each platform. C6 still requires the wider
containment corpus and Linux GitHub gate. If WSL restarts, check session/keyring
readiness again; do not disable locking or recreate provider enrollment.

## Next: Linux GitHub harness and disposable effect

W28 has now implemented and locally verified the supervised harness described
below. Use the [W28 handoff](w28-github-handoff.md) for current commands, fixture
identity, and pickup order. The remaining paragraphs preserve the preparation
context; no live Linux GitHub effect has yet occurred.

Read-only inspection on September 4 found no open pull requests and no branch
named `guardian/demo-fixture-pr` in `Loothore907/guardian-agent-demo`.
Observed `main`: `7df353afe005b74811dfcd081ac98af5695a8170`.
The reset planner fixes repository ID `1352093544`, base `main`, branch
`guardian/demo-fixture-pr`, and file `fixtures/approved-change.md`.
These observations are a preparation snapshot and must be revalidated before
any write. The exact harmless content, commit message, and PR body are produced
without mutation by:

```sh
node scripts/demo-reset-plan.mjs 7df353afe005b74811dfcd081ac98af5695a8170
```

Before requesting fixture-creation authority, implement and test a Linux harness
using platform credential custody and the actual supervised authority/broker
composition. `apps/broker-service/src/live.integration.test.ts` currently directly
constructs `WindowsCredentialStore` and an in-process broker; it is not a valid
Linux IPC gate. Do not enable its forced-refresh metadata mutation as a workaround.

Then prepare separate exact authority for creating the fixture branch, writing
the single harmless file, and opening its PR. Bind the returned PR number and
head SHA, inspect the one-file diff, and recheck base/head immediately before the
protected read and separately approved single squash merge. Preserve exact
request/caller/session/connection/scope/expiry/nonce/policy binding. Developer
approval evidence must not be described as WebAuthn evidence.

Use existing platform enrollment if valid. Missing/expired enrollment requires
the accepted user-operated flow; never expose a token to the agent. Stop on
provider failure or changed state. No force push, retrying a merge, unrelated
repository operation, branch deletion, or credential refresh experiment is implied.
Branch cleanup requires named authority. If the harmless merge needs reversal,
prepare an ordinary reviewed revert; do not rewrite `main`.

After these gates, complete the remaining intended-host containment corpus,
reconcile current-head CI/review under bounded remote-write authority, then resume
C7 worker-generated dispatch/evaluation and C8 WebAuthn/coordinator work. C6 stays
In progress until its full exit criteria have reproducible evidence.
