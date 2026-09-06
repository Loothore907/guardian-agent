# Repository hygiene recovery — September 6

Current session scope: source integration and global session rules first. No cloud
startup, credential operation, paid provider call or hosted execution belongs to
this session. The original hosted-research plan is preparation-only and deferred
until the source backlog has an explicit disposition.

## Failure and correction

At pickup, main was `1893aef`, the local containment head was `e5b1217`, and 38
commits plus 188 changed/untracked paths had accumulated. PR #17 and issue #13
were the only open review and tracking entries. Repeated handoffs recorded source
integration as unfinished while additional features were implemented.

The active ruleset required PRs and squash/linear integration but did not require
the Actions build. No classic branch protection supplied that missing rule. The
ruleset now requires an up-to-date `build` from GitHub Actions, retaining all prior
rules and its empty bypass list. Required CI was not weakened.

PR #17's audit timeout passed on one unchanged rerun. Fresh checks of later
snapshots found synthetic service-startup tests depending on the CI runner's
desktop-bus format. Two fixtures now provide a valid deterministic local descriptor;
they do not resolve credentials or weaken production validation. Linux real-clock
and real-child coverage remains intact.

## Preserved source and review order

The initial working tree was saved to an ignored source archive and binary patch
before staging. Original local branches and commits remain intact. Recovery uses additive commits
and named feature branches; no reset, force-push or manual branch deletion was
performed. GitHub already had automatic remote-branch deletion after merge enabled.
Merged remote branches may therefore disappear; local recovery refs and the archive
remain available. No private operational state is part of that public source.

| PR | Slice | Dependency |
| --- | --- | --- |
| [17](https://github.com/Loothore907/guardian-agent/pull/17) | Linux authority peers and Secret Service | main |
| [22](https://github.com/Loothore907/guardian-agent/pull/22) | W26 lifecycle and cleanup | 17 |
| [23](https://github.com/Loothore907/guardian-agent/pull/23) | Fixed custody profiles and initial enrollment | 22 |
| [24](https://github.com/Loothore907/guardian-agent/pull/24) | Durable managed budgets and judge ingress | 23 |
| [25](https://github.com/Loothore907/guardian-agent/pull/25) | User-operated enrollment hardening | 24 |
| [26](https://github.com/Loothore907/guardian-agent/pull/26) | W27 IPC and W28 harness | 25 |
| [27](https://github.com/Loothore907/guardian-agent/pull/27) | Durable plan authority and broker credentials | 26 |
| [28](https://github.com/Loothore907/guardian-agent/pull/28) | Budget server clock and bounded usage capacity | 27 |
| [29](https://github.com/Loothore907/guardian-agent/pull/29) | Bounded supervisor/worker runtime | 28 |
| [30](https://github.com/Loothore907/guardian-agent/pull/30) | Portal HTTP/UI and explicit host factory | 29 |
| [31](https://github.com/Loothore907/guardian-agent/pull/31) | Session Git-hygiene checks and workflow rules | independent main-based |
| [32](https://github.com/Loothore907/guardian-agent/pull/32) | Evidence, current handoff and archived chronology | 30 |
| [36](https://github.com/Loothore907/guardian-agent/pull/36) | Current CI selection and merged-branch start guard | independent main-based |

Tracking: [18 recovery](https://github.com/Loothore907/guardian-agent/issues/18),
[19 C7](https://github.com/Loothore907/guardian-agent/issues/19),
[20 custody](https://github.com/Loothore907/guardian-agent/issues/20),
[21 budgets](https://github.com/Loothore907/guardian-agent/issues/21), and existing
[13 C6](https://github.com/Loothore907/guardian-agent/issues/13).

All product slices (#17 and #22–#30) and governance PRs #31/#36 are merged
after their updated exact-head checks. The evidence/handoff closeout is #32. These merges do not establish milestone
acceptance. Intermediate snapshots were separately checked by CI. Some recovery
PRs were larger than the desired steady-state size: shared supervisor
bootstrap methods bind launch authority and continuation, and the older budget
history spans a real contracts-to-service dependency chain. Their PR descriptions
name review seams; do not manufacture an untested split to meet a line-count target.

The W28 harness's later `plan.check` capability was removed only from its earlier
containment branch, where the schema does not yet support it; it remains in the
later authority/runtime source. This is a recovery-boundary correction.

## Verification at recovery

- Fresh full Windows check: 667 tests passed, 18 skipped; required scripts,
  boundaries and production build passed.
- New hygiene checks: seven Node tests pass, including temporary real Git states.
- Existing cost/fixture helper checks: three Node tests pass.
- Recovery comparison checked 265 code/script/style files against the initial
  archive (normalizing CRLF only). The only differences were the two test fixture
  corrections above. This comparison does not claim a comprehensive secret scan.
- A narrow credential-pattern scan found only existing synthetic test fixtures;
  ignored private state and operator helpers were not staged.
- `git diff --check` passed. Exact remote heads, CI and merge state must be checked
  live; passing results from another head are not transferable evidence.

Global session instructions were installed in the existing empty Codex-home
`AGENTS.md`, with no global override present. The versioned template and executable
checks are in PR #31. File installation is verified; automatic compliance by future
models is not claimed. Codex discovers global guidance when a new run starts.

## Review and integration discipline

The recovery review inspected credential ownership and enrollment boundaries,
Linux peer/socket identity and shutdown behavior, durable plan and broker
revalidation, budget admission/settlement, worker dispatch/risk-context binding,
and portal confirmation/host composition. This was agent review in a solo-owner
project, not independent human approval or a new security certification. Existing
hosted and platform limitations remain in the security claims and owning issues.

Squash integration required ancestry reconciliation in the older stacked branches.
For predecessor reconciliation, the incoming main tree was verified identical to
the just-reviewed predecessor tree; the resulting candidate tree was checked
unchanged before commit. Governance reconciliation separately verified unchanged
incoming baseline blobs. Conflicts were not resolved by blindly choosing a side.
Every updated candidate still required its fresh protected build before merge.

The hygiene follow-up handles an older cancelled check and a newer successful
check on the same SHA. It selects the latest timestamp and rejects missing,
pending, failing, skipped or ambiguous latest results. It cannot use an old
successful run to mask a newer failure. Start also rejects reuse of an already
merged feature branch, while close permits the completed PR to be verified.

## Remaining work

This final documentation PR completes the recovery record. Its closeout requires
fresh protected CI, merge, a passing remote close check and clean current main. Recovery
issue #18 closes only after that verification. Custody source review #20 is closed;
C6 #13, C7 #19 and budget/hosted #21 remain open for their evidence gates. Platform
debt is explicit in #33 (Windows IPC clocks) and #34 (WSL restart); hosted BYOK
and typed credential-copy design is #35.

Then resume offline budget-update/startup preparation from the
[hosted research plan](session-plan-2026-09-06-hosted-research.md). Cloud execution
and its new bounded run window belong to a later session. Last recorded KC state
is stopped; it was not queried or changed during this repository cleanup.
