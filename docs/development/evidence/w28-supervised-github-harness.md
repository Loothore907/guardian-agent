# W28: supervised Linux GitHub harness

Latest: [September 4 execution](2026-09-04-session-readiness.md) passes Linux
GitHub App enrollment, exact PR 3 read and separately approved squash merge
`5d78d261e024d9e93e59c30368c7c9797c765a2c`. GitHub state and cleanup were verified.
Earlier missing-enrollment/no-effect statements below describe prior attempts.


Date: 2026-09-04 AKDT. Uncommitted working tree based on `e5b1217`, branch
`codex/13-c6-linux-provider-containment`. Preserves the discovery/W27 work.

## Implemented seam

`scripts/github-supervised-live.mjs` provides a Linux-only protected command with
an explicit opt-in, required PR number and nonzero exact head SHA, fixed repository
`loothore907/guardian-agent-demo`, and separate read/merge modes. Merge additionally
requires an exact `guardian-agent-demo#PR@HEAD:squash` confirmation string. That
operator opt-in is not runtime WebAuthn evidence.

`scripts/github-supervised-harness.mjs` creates private temporary authority state
and starts separate supervised authority, Guardian, and broker children. Guardian
uses the existing fake provider and preserves the deterministic floor: this gate
tests GitHub execution and IPC, and makes no paid inference call. The production
broker child constructs the platform credential store from its BYOK descriptor.
Only its minimal user-bus routing is inherited on Linux; no token is passed in
bootstrap, environment, public result, or command arguments.

Each invocation has one tool use, a three-minute session, and a fresh exact request.
Merge uses the existing 120-second development approval, bound to the request and
connection scope. Broker revalidation, authority consumption, Guardian one-use
protocol, and W27 kernel peer admission remain mandatory. Children close in reverse
order before temporary authority files are removed, including on failure.

The live entry point accepts no transport, endpoint, store, fake credential, clock,
or entrypoint override. The imported harness has local test injection seams which
are not exposed by the live command. The old Windows in-process live test remains
available for its separate historical purpose; it is not relabeled Linux evidence.

## Reproducible local evidence

Run `pnpm check` (Windows: `./scripts/pnpm.ps1 check`). It now includes
`pnpm test:github-supervised`, after compiled modules and the Linux helper exist.
The new suite starts real child processes but injects an in-memory credential and
a fixed synthetic GitHub transport in a test-only broker entry point. No network
or OS store is accessed. A fixture secret in upstream bodies is absent from
returned read/merge data.

| Case                                  | Synthetic reads | Synthetic merges | Result                                              |
| ------------------------------------- | --------------- | ---------------- | --------------------------------------------------- |
| Exact-head read                       | 1               | 0                | Allowed, sanitized snapshot                         |
| Exact-approved squash plus replay     | 1               | 1                | First allowed; replay denied without another effect |
| Missing merge approval                | 0               | 0                | `approval_mismatch`                                 |
| Head changes before approved merge    | 1               | 0                | `resource_changed`                                  |
| Missing, malformed, or widened target | 0               | 0                | Rejected before startup                             |

All five cases passed on Windows and Linux. Complete required suites passed on
both platforms: existing Vitest totals remain 534 Windows and 546 Linux, plus six
keyring-preflight cases, five new supervised cases, SQLite (7 Windows + 1 skip;
8 Linux), reset planner (2 each), format/lint/typecheck/build, and dependency
boundaries (207 modules / 446 edges). Both native Linux platform probes passed.

## Windows clock finding

Initial Windows real-clock process runs intermittently rejected frames because
the receiving process observed a wall clock 2–10 ms behind the sender. A temporary
compiled-artifact diagnostic captured timestamps only; artifacts were subsequently
rebuilt from source. The strict future-time rejection was not relaxed.

Windows synthetic tests use fixed fixture clocks for broker/client/Guardian and
development approval. Linux tests use real clocks and the production Guardian
entry point. Therefore the Windows pass does not establish real-clock Windows
multi-process reliability. That issue needs a separate bounded design and regression
slice; tolerating future timestamps silently would weaken existing claims.

## Live status and handoff

No live GitHub read/merge, enrollment, provider call, or remote mutation occurred
in W28. Read-only inspection found no open PR and no `guardian/demo-fixture-pr`
branch in the disposable repository; `main` remains
`7df353afe005b74811dfcd081ac98af5695a8170`. The generated
[exact fixture plan](w28-disposable-fixture-plan.json) is a proposed action artifact,
not an executed operation. Recheck remote state before writing.

The [handoff](../w28-github-handoff.md) is the next-session entry point. C6 remains
In progress: actual Linux GitHub custody/read/merge and broader intended-host
containment remain unverified. The harness alone does not grant Enforced assurance.

## Subsequent approved fixture creation

The user approved the generated plan. After revalidating main/branch/PR state,
the fixture branch was created and its existing file updated against verified
blob `bb58ad0255e11b407e2127f7ab5e64f43f5f452d`.
[PR #3](https://github.com/Loothore907/guardian-agent-demo/pull/3) is open at
`b8e2e559fe60d182566909fec47d3cd5d1d48243`, based on
`7df353afe005b74811dfcd081ac98af5695a8170`. The fetched patch confirms only the
baseline SHA line in `fixtures/approved-change.md` changed. This is connector-based
fixture preparation, not evidence for Guardian's credential boundary.

The exact Linux read command reached keyring preflight and stopped before service
startup because the default collection was locked. The recurring WSL user-manager
failure was repaired with the same targeted reset/start; a native unlock prompt
was opened for the user. No GitHub merge was performed.

The user later reported that no prompt was visible. Display routing inspection
found WSLg variables present in the shell but absent from the user service manager.
Importing only `DISPLAY` and `WAYLAND_DISPLAY` repaired that transient activation
configuration. The native prompt reported completion and keyring metadata reported
unlocked. A following exact-head read passed preflight and returned
`connection_unavailable`; the trusted CLI's interactive status reported
`github: missing`. This is not successful GitHub read evidence. Linux GitHub App
device enrollment is the next prerequisite; existing Nebius enrollment was unchanged.
