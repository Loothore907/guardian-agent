# C6 residual and integration review

Current after the [September 4 executed gates](evidence/2026-09-04-session-readiness.md).
W28's intended-Linux enrollment/read/approved disposable merge is complete. C6
remains In progress. This document names the next bounded work; it grants no
commit, remote write, permanent host change, or checkpoint promotion authority.

## Residual disposition

| Criterion / concern              | Evidence now available                                                                                                                                  | Remaining work                                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intended-Linux GitHub path       | Accepted App enrollment; real read and exact-approved squash merge through separate authority/Guardian/broker children; remote and cleanup verification | Narrow W28 gate complete; retain fake-Guardian/development-approval limitation                                                                                                     |
| Peer and service containment     | W27 seven-protocol peer admission/listener verification; native tests and two platform probes; post-change protected Nebius consumption                 | Assemble intended-host process/credential/artifact inspection across the documented runtime; map coverage against every broad security claim                                       |
| Secret non-disclosure            | Ordinary fake-corpus process, database, model-envelope and public-result tests pass; no raw credentials in protected outputs                            | Complete intended-host corpus evidence without exporting real secrets; use distinct fixture markers and bounded sanitized observations                                             |
| Tool/network/filesystem bypasses | Fresh C1 spike and C4 production reference-runtime tests pass, including alternate tools/direct Git/network/credential routes                           | These are Windows-launched WSL reference tests, not proof of a fully Linux-native supervisor/command executor; identify and evidence the target composition before claiming parity |
| Durable audit                    | Existing deterministic SQLite/authority/broker corpus passes                                                                                            | W28 removes its private temporary database and returns only sanitized outcome; no retained live audit inspection was captured                                                      |
| WSL user experience              | Warm-restart EBUSY cgroup failure captured; 3 full-VM cold starts pass; cold-start-to-hold unlock and GitHub/Nebius persistence pass                    | Use the documented recovery procedure; permanent upstream fix/host choice remains separate                                                                                         |
| Windows real-clock IPC           | Strict future-time rejection retained; fixed-clock synthetic tests pass                                                                                 | Diagnose the 2–10 ms cross-process difference and define a security-preserving clock contract before changing behavior                                                             |
| Dependency audit / remote review | Fresh production audit passes locally; PR 17 CI previously passed ordinary/native checks but failed audit                                               | Current candidate still needs remote required checks and review; local audit does not rewrite old CI                                                                               |

Update after ADR-0049: `packages/executor/src/index.ts` now invokes the reference
boundary directly on native Linux and through WSL on Windows. Both runtime probes
passed in the September 5 launch validation, with Linux tested inside the staged
WSL guest. Native adaptation is implemented; separate cloud-host readiness and
provider-process containment remain unverified. The table's older Windows-only
evidence describes the September 4 checkpoint, not the latest executor coverage.

## Reviewable source integration sequence

1. Preserve the existing branch and all user-authored work. Review the 34 commits
   between PR 17 head and `e5b1217` before selecting a PR base. They include
   managed-demo and judge-ingress work as well as the credential bridge.
2. Review the current uncommitted changes as logical slices: supervisor/research
   discovery fixes; shared W27 IPC and ADR-0047; W28 harness and readiness tools;
   current evidence/docs. Keep tests with the behavior they cover.
3. Separate the decision to integrate the intervening managed-demo stack from
   the decision to publish the C6 containment slice. Do not blindly update PR 17
   or cherry-pick across its dependency chain without inspecting prerequisites.
4. Prepare exact commit/file grouping, base branch, destination branch and PR
   relationship. Obtain bounded source-integration authority under AGENTS.md
   before committing/pushing/updating a PR. The approved demo merge grants none.
5. Run the required suite on any changed candidate and verify remote CI/security
   review at its exact head. The current unchanged source already passed the
   recorded Windows/Linux ordinary and native checks; docs-only reconciliation
   does not require repeating those runtime suites.

## Next implementation boundary

[WSL diagnosis and recovery](wsl-session-recovery.md) now provide a tested
operational procedure. No preview runtime or permanent host modification was made.

Prioritize the intended-host C6 coverage map and Windows timing diagnosis. Keep
the held-session WSL workaround documented while diagnosing startup separately.
Do not reopen proven provider adapters, repeat enrollment or recreate a fixture
merely to regain context. Return to C7 worker-generated dispatch and evaluation
after C6 residuals have an explicit, evidence-backed disposition. C8 WebAuthn,
full coordinator and hosted deployment retain their own subsequent scope.
