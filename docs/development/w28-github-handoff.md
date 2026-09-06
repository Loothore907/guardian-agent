# W28 handoff: ready for the disposable Linux GitHub ceremony

## Current result: Linux enrollment, read and approved merge passed

The [current execution record](evidence/2026-09-04-session-readiness.md) records
accepted Linux GitHub App enrollment, sanitized `github: available`, and a passing
supervised exact-head PR 3 read. The target below was revalidated unchanged.
The [exact squash review](w28-exact-merge-review.md) was approved and executed
once. PR 3 is merged; `main` is `5d78d261e024d9e93e59c30368c7c9797c765a2c`.
The fixture branch is absent. Do not rerun the historical PR 3 commands.
Do not repeat enrollment or fixture creation. WSL restart reliability remains
unresolved (two of three samples failed with status 219); a held session and
user-confirmed native unlock passed.

## Earlier attempts and approved fixture creation

Latest readiness follow-up: the user reported no visible unlock prompt. The shell
had WSLg `DISPLAY=:0` and `WAYLAND_DISPLAY=wayland-0`, but the user service manager
had neither. Only these two non-secret variables were imported through
`dbus-update-activation-environment --systemd DISPLAY WAYLAND_DISPLAY`. The native
prompt subsequently reported completion and the default collection reported
unlocked. A submitted Secret Service prompt request alone must not be described
as a verified visible window.

The exact PR 3 read then passed preflight but returned sanitized
`connection_unavailable`. The trusted CLI, run in its required interactive PTY,
returned `github: missing`. Next action is user-operated Linux GitHub App device
enrollment, then the exact read. No merge has been attempted. Keyring unlock is
session state, not an intended per-secret-read password ceremony. WSL session
restarts and missing desktop activation routing remain host usability issues.

The user approved the exact fixture plan. Rechecking confirmed the expected
baseline and absent branch/open PR. The branch was created and the existing
fixture file was updated using its verified blob SHA (the file already existed
from the prior ceremony). Only its baseline SHA line changed.

- PR: [guardian-agent-demo #3](https://github.com/Loothore907/guardian-agent-demo/pull/3)
- Base: `main` at `7df353afe005b74811dfcd081ac98af5695a8170`
- Head: `guardian/demo-fixture-pr` at `b8e2e559fe60d182566909fec47d3cd5d1d48243`
- Changed file: `fixtures/approved-change.md`; one addition and one deletion.

The initial read stopped at locked-keyring preflight. After session repair and
native unlock, the later read reached the broker and failed with missing GitHub
connection state, as recorded above. These are separate attempts.

The source work remains uncommitted on `codex/13-c6-linux-provider-containment`,
based on `e5b1217`. The fixture creation is complete; no source-repository push,
PR update, or fixture merge is recorded. Remote values above are the last recorded
snapshot, not a fresh verification in the documentation review.

## Preparation sequence (enrollment and read now complete)

1. Preserve the worktree and verify that the retained ext4 stage matches the
   intended source and includes the session helper. Prior complete ordinary
   Windows/Linux checks passed; rerun required gates before source review.
2. Establish normal-user Linux bus/display/keyring readiness using the
   [WSL diagnosis and acceptance gates](state-review-2026-09-04.md#wsl-assessment).
   Preserve existing Nebius enrollment. A successful helper does not mean an
   unlocked keyring or an enrolled GitHub connection.
3. Use trusted interactive CLI status. The last result was `github: missing`;
   complete user-operated App device enrollment on Linux with public client ID
   `Iv23liP8Sq3ZEAyeIHju` and repository ID `1352093544`. Do not copy Windows
   tokens or substitute connector/ambient CLI authentication for broker evidence.
4. Revalidate existing PR 3: repository identity, open state, base/head SHAs, and
   the one-line fixture diff. Stop on changed state. Do not recreate the fixture.
5. Run the protected exact-head read below. Stop on denial and diagnose sanitized
   results. Existing bounded refresh is normal broker lifecycle; do not force
   expiry or mutate connection metadata to provoke it.
6. After a successful read, prepare the exact PR/head squash approval for the user.
   Only after that approval, recheck the target and run one merge invocation.
   Record the sanitized outcome and verify remote result and child cleanup.
   Branch deletion requires named authority; rollback is a reviewed revert.

## Commands in the retained ext4 stage

The credential-free source stage remains
`/home/loothore907/guardian-w27-session-20260904` and contains the W28 scripts.
Use the pinned runtime `/home/loothore907/.cache/guardian-node-v24.19.0/bin`.
The command placeholders below must be replaced with freshly verified PR/head values.
The last recorded target is PR 3 at the head above.

```sh
cd /home/loothore907/guardian-w27-session-20260904
export PATH=/home/loothore907/.cache/guardian-node-v24.19.0/bin:/usr/bin:/bin
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
export XDG_RUNTIME_DIR=/run/user/1000
node apps/guardian-cli/dist/main.js credentials status github
# Only if user-operated GitHub enrollment is required:
GUARDIAN_GITHUB_APP_CLIENT_ID=Iv23liP8Sq3ZEAyeIHju GUARDIAN_GITHUB_REPOSITORY_ID=1352093544 node apps/guardian-cli/dist/main.js credentials github
# After enrollment and exact target revalidation:
GUARDIAN_TEST_SUPERVISED_GITHUB=1 pnpm test:live:github-supervised read PR HEAD
# Only after exact approval for this PR/head and one squash merge:
GUARDIAN_TEST_SUPERVISED_GITHUB=1 GUARDIAN_GITHUB_EXACT_MERGE='guardian-agent-demo#PR@HEAD:squash' pnpm test:live:github-supervised merge PR HEAD
```

The live command preflights bus and keyring metadata before starting the three
services. Guardian is deliberately fake in this GitHub gate; development approval
is not WebAuthn. Only the broker resolves GitHub credentials. Successful read uses
one fixed GitHub GET; merge independently re-reads the head and performs at most
one fixed squash PUT, plus any existing bounded credential-refresh operations.

## Subsequent work

Finish the broader Linux containment corpus and current-head review/CI before
closing C6. Resolve the documented Windows inter-process wall-clock rejection
separately; Windows fixture-clock success does not erase that finding. Then resume
C7 worker dispatch/evaluation, followed by C8 WebAuthn and the full coordinator.
Hosted judge work remains paused at its recorded seam.
