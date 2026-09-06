# September 4 session execution: WSL readiness and current-source verification

Status: ordinary gates passed; WSL clean-start reliability failed. A healthy held
session and native user unlock are verified. Linux GitHub enrollment and the
protected exact-head read and separately approved squash effect passed.
C6/C7 remain In progress.

## Authority and source identity

The user directed execution of the reconciled session plan and explicitly allowed
three interruptions of Ubuntu-22.04 for restart sampling. No permanent host
configuration change or source commit/push/PR write was performed. The user
subsequently approved and the broker completed the exact disposable PR 3 merge.

Branch: `codex/13-c6-linux-provider-containment`; HEAD: `e5b1217`. Existing modified
and untracked implementation files were preserved. A sorted unique list from
`git ls-files --cached --others --exclude-standard -z`, restricted to
`apps/`, `packages/`, `scripts/`, `spikes/` and root JSON/YAML/TS/CJS/MJS files,
produced 306 source/build inputs. Every file's SHA-256 matched the retained ext4
stage `/home/loothore907/guardian-w27-session-20260904`. Ignored credentials,
generated output and dependencies were outside this comparison. This is not a
claim that every possible extra file in the retained stage was inspected.

The compact JSON array of sorted `{path,sha256}` entries had SHA-256
`be4f6b7818363d0f24087cf4b3ad94c356b2f463af51708f032c1bfee9a6b337`.
Local diagnostic scripts and the manifest are in ignored `tmp/`; the input
selection and digest here identify the tested implementation without including
credential files. Linux tests used Node 24.19.0 from the recorded pinned runtime.

## WSL restart samples

Follow-up [diagnosis](2026-09-04-wsl-cgroup-diagnosis.md) shows distribution
termination can retain the VM boot ID. These are warm distribution-restart
samples, not three proven cold VM boots. Later full shutdown/start recovery
passed with distinct boot IDs.

Read-only enumeration outside the agent sandbox found one distribution,
Ubuntu-22.04, initially Stopped. The earlier sandbox `E_ACCESSDENIED` did not
establish a host service failure. WSL is 2.6.1.0, kernel 6.6.87.2, WSLg 1.0.66;
Ubuntu reports systemd 249 (249.11-0ubuntu3.22).

Initial separate launches alternated between healthy service metadata and WSL's
user-session startup warning. The three explicitly authorized samples used
`wsl --terminate Ubuntu-22.04`, followed by normal-user startup and fixed checks
of `user@1000.service`, `/run/user/1000/bus`, the two-second session helper, and
the metadata-only keyring preflight, in that order.

| Sample | User manager | Bus | Session helper | Keyring preflight |
| --- | --- | --- | --- | --- |
| 1 | Failed; MainPID 0; ExecMainStatus 219 | Absent | Denied before credential work | Unavailable |
| 2 | Active; MainPID 631; Result success | Present | Passed and expired after two seconds | Existing default collection locked |
| 3 | Failed; MainPID 0; ExecMainStatus 219 | Absent | Denied before credential work | Unavailable |

Two failures in three samples mean clean-start usability is not resolved.
Failure handling worked: unavailable and locked stores stopped before provider
use. The samples establish recurrence of status 219, not its underlying cause.
No update, PAM change, linger setting, keyring recreation or service reset was
needed for the subsequent healthy session. A later boot's targeted service log
showed successful startup; it cannot explain the previous failed boots.

During the ordinary Linux suite a separate foreground helper successfully began
a bounded 1,800-second hold. The user confirmed visibility of the requested native
Secret Service unlock dialog and completed it. A follow-up metadata preflight
returned `keyring=ready`; trusted interactive CLI status returned `github: missing`.
No password or enrolled secret was read into agent output. Native visibility and
completion are evidenced for this held session only, not three successful starts.

## Fresh verification

| Check | Result |
| --- | --- |
| Windows `pnpm check` | Passed: 534 Vitest cases / 18 skipped; SQLite 7/1 skipped; reset 2; preflight 6; supervised GitHub 5; format/lint/type/build and boundaries |
| Linux `pnpm check` | Passed: 546 Vitest cases / 6 skipped; SQLite 8; reset 2; preflight 6; supervised GitHub 5; format/lint/type/build and boundaries |
| Linux `pnpm test:linux-platform` | 2 passed |
| Both dependency boundaries | 207 modules / 446 edges; no violations |
| `sh scripts/linux-credential-session.test.sh` | Passed argument/display checks; successful intended-host two-second hold recorded in sample 2 |
| Windows/WSL `pnpm test:reference-runtime` | 1 passed in about 20.1 seconds; production workspace, credential-route, network and embedded isolation probes |
| Windows/WSL `pnpm test:session-enforcement` | 4 passed; alternate-tool denial, missing-provider fail closed, C1 direct-Git/network/filesystem isolation checks |
| `pnpm audit --prod --audit-level high --fetch-retries 0 --fetch-timeout 15000` | Passed once: no known vulnerabilities found |

These runtime checks use synthetic fixtures and do not replace intended-Linux
live provider/process/artifact inspection. No paid model or research call was
made. The successful local audit does not rerun or turn a failed remote CI job
green, and is not an assertion about development dependencies.

## Fresh remote inspection

- [Demo PR 3](https://github.com/Loothore907/guardian-agent-demo/pull/3) remains
  open, unmerged and mergeable; repository ID `1352093544`. Head
  `b8e2e559fe60d182566909fec47d3cd5d1d48243`, base
  `7df353afe005b74811dfcd081ac98af5695a8170`. The one-file diff changes only
  the harmless baseline SHA line (one addition/one deletion).
- [Issue 13](https://github.com/Loothore907/guardian-agent/issues/13) remains open.
- [PR 17](https://github.com/Loothore907/guardian-agent/pull/17) remains open at
  `bca431338035fd173a50074473eb62cb04dfcb53`, a different branch from the current
  containment work. Run `33828946554`, job `100887552540`, passed required and
  Linux platform checks and failed its production dependency-audit step. Prior
  evidence records its registry timeouts. Current local work is not remote CI.

## Remaining decisions and gates

User-operated GitHub App authorization completed. The trusted CLI stored the
expiring credential for the verified account and then returned `github: available`.
After fresh remote validation, one invocation of the already built live harness
returned `{"status":"passed","mode":"read","pullRequest":3,"headCommit":"b8e2e559fe60d182566909fec47d3cd5d1d48243"}`.
The command was `GUARDIAN_TEST_SUPERVISED_GITHUB=1 node scripts/github-supervised-live.mjs read 3 b8e2e559fe60d182566909fec47d3cd5d1d48243`
with the documented fixed Linux user-bus routing. A subsequent process-name-only
check found no Node/MainThread, secret-tool or guardian-peer processes remaining.
No raw credential/provider response or device authorization code is retained here.

The user approved the [exact squash review](../w28-exact-merge-review.md).
Fresh inspection confirmed unchanged repository/base/head/diff. One supervised
Linux merge invocation passed with merge SHA `5d78d261e024d9e93e59c30368c7c9797c765a2c`.
GitHub confirmed PR 3 closed/merged at `2026-09-05T06:47:18Z`, and `git ls-remote`
confirmed `main` at that SHA. The fixture branch was absent after the merge; no
branch-deletion command was issued and its removal mechanism was not inspected.
The post-run process-name check found no remaining Node/MainThread, secret-tool
or guardian-peer processes. No retry or paid model call occurred.

The harness cleans up its temporary
authority database; the live read does not supply a retained audit inspection.
Do not repeat fixture creation or Nebius enrollment.

WSL remains usable for this bounded held session, with poor restart reliability.
Further host repair should target captured failing-boot evidence and preserve
the existing stores. Keep the Windows wall-clock defect, broader Linux corpus,
and source integration/governance as named C6 residuals. Do not promote Enforced
assurance on the strength of ordinary suites or this held session.

## Source integration boundary

PR 17 head `bca431338035fd173a50074473eb62cb04dfcb53` is an ancestor of local
HEAD, with 34 subsequent commits covering Linux custody, managed-demo budgets,
judge ingress, accepted enrollment and handoffs. The uncommitted W27/W28 work
sits above those commits. Do not point PR 17 at this branch without reviewing
that enlarged scope. See the [C6 residual and integration review](../c6-residual-review.md).

## Session cleanup

After the protected read/merge and evidence capture, the session-owned foreground
hold was stopped by matching its normal-user UID, exact helper arguments and
retained-stage working directory. No other process was targeted. A later WSL
start can require native keyring unlock again; this cleanup does not change
credential enrollment or keyring configuration.
