# C6 / PR #14 review matrix

Date: 2026-09-03 (AKDT)

Review base: PR #14 head `b9497a9b7518a71c403dc10b4ee96b205a267502`

Scope: read-only review of issue #13, PR #14, the C6 code and tests, and the
claim/roadmap/handoff state. Already captured W20-W23 protected providers and the
disposable GitHub effect were not repeated. No main-repository merge, remote
effect, credential read, or provider call was part of this review.

Status meanings:

- **Passed**: the criterion has deterministic and, where required, protected
  evidence on the current reference path.
- **Partial**: a substantial implementation and evidence base exists, but the
  criterion's stated platform or evidence scope is incomplete.
- **Open**: the roadmap explicitly requires evidence that has not been captured.

## Exit-criterion disposition

| C6 exit criterion                                                                                                                                                           | Status  | Evidence and remaining gap                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| External host, Guardian models, and command sandbox cannot retrieve the GitHub credential                                                                                   | Partial | Windows Credential Manager callback isolation, process-contract tests, WSL containment, secret-corpus tests, W21 no-effect audit, and W23 protected read/merge all support the reference Windows path. Intended-Linux OS peer identity and credential isolation remain unproved.                       |
| Runner, models, MCP, database, process arguments, logs, traces, audit, and public results cannot retrieve enrolled provider secrets                                         | Partial | Deterministic corpus and redaction tests cover application-visible surfaces; W19-W23 return only bounded outputs and audit codes. A protected live corpus inspection and intended-Linux peer/containment proof remain.                                                                                 |
| Missing, revoked, rotated, or wrong-provider credentials fail closed and disable only the corresponding typed capability                                                    | Passed  | Credential-store and provider-service tests cover missing, rotation, revocation, wrong binding/provider, cleanup, and sanitized failure. GitHub automatic refresh currently receives provider `HTTP 500`; it preserves safe state and attended re-enrollment remains the bounded operational fallback. |
| Only the authority service opens SQLite; unknown, stale, restarted, or incorrectly bound IPC callers fail closed                                                            | Partial | Dependency direction, sole-owner design, capability/lifetime/binding tests, and restart rejection pass. The selected Unix peer-identity control is not implemented or evidenced.                                                                                                                       |
| SQLite contains no provider credential, GitHub token/private key, or IPC capability                                                                                         | Passed  | The strict schema, authority-context projection, database inspection tests, and secret-corpus review exclude reusable secrets and IPC capabilities.                                                                                                                                                    |
| Routine read works under the read-only mission                                                                                                                              | Passed  | W23 records a protected exact-head read against the disposable repository before any approval or effect.                                                                                                                                                                                               |
| Unauthorized merge fails before adapter execution                                                                                                                           | Passed  | Broker tests plus W20-W22 prove `scope_mismatch`/`approval_mismatch` before GitHub credential or effect boundaries.                                                                                                                                                                                    |
| Exactly approved merge succeeds against the dedicated test target                                                                                                           | Passed  | W23 records one separately confirmed, exact-head, one-use squash merge of disposable PR #2.                                                                                                                                                                                                            |
| Changed head, mutation, replay, expiry, cross-session, cross-connection, and scope expansion fail                                                                           | Passed  | Broker, approval, canonicalization, IPC, and authority-store tests cover each near miss; resource-head revalidation occurs immediately before atomic approval consumption.                                                                                                                             |
| Transaction, uniqueness, concurrent budget, atomic nonce, crash, restart, uncertain outcome, filesystem permission, and session-ID reuse behavior are tested and documented | Partial | Store and SQLite-spike suites cover transactions, uniqueness, concurrency, nonce, crash/restart, uncertain post-adapter outcomes, and ID reuse. The POSIX permission test is skipped on Windows and has not passed in the intended Linux deployment.                                                   |
| Unexpected trusted-process restart interrupts the session without resetting durable authority                                                                               | Passed  | Authority service/supervisor/store tests cover prior-instance capability rejection, no automatic authority restart, interruption, preserved budgets/revocation/replay, and session-ID non-reuse.                                                                                                       |
| Intended self-hosted Linux proves IPC peer checks, database permissions, local credential resolution, and narrow GitHub read/merge                                          | Open    | This is the remaining explicit C6 exit criterion. It is not satisfied by Windows protected evidence or WSL command-sandbox isolation.                                                                                                                                                                  |

## Review findings

1. **Fixed locally — final approval-consumption transport failure.** The broker
   previously allowed an authority-client rejection during the last atomic
   `consumeApproval` call to escape as an exception. It now returns the sanitized
   fail-closed `audit_unavailable` result, performs no merge request, leaves the
   approval available, and excludes the injected secret fixture from durable
   context. A second test covers the uncertain case where consumption commits but
   its response is lost: no merge is attempted and a retry is rejected as replay.
   The focused broker suite passes 12 tests.
2. **Claims reconciled.** Guardian IPC and broker-process claims were reduced from
   **Implemented and tested** to **Implemented** because their own evidence plans
   require OS peer identity. The narrow showcased GitHub credential path was
   raised from **Goal** to **Implemented** because protected Windows read/merge now
   exists, while the missing Linux and live-corpus evidence stays explicit.
3. **C7 reconciled.** W8, W21, and W22 mean C7 is **In progress**, not unstarted.
   The versioned Nemotron policy, minimized projections, deterministic floor,
   strict output, Super-to-Ultra escalation, failure behavior, live Token Factory
   call, and broker integration exist. Worker-generated polluted-content dispatch,
   the evaluation report, intended-Linux containment, and hosted/repeated evidence
   remain.
4. **Patch hygiene fixed.** The two trailing-blank `git diff --check` findings in
   ADR-0020 and ADR-0036 were removed.

## Scope classification after review

- **Blocks C6 close:** intended-Linux peer identity, database permissions, local
  credential resolution, and narrow GitHub read/merge evidence.
- **Operational limitation, not a reason to weaken the contract:** GitHub automatic
  refresh `HTTP 500`; attended re-enrollment remains the fallback.
- **Later product/assurance work:** WebAuthn belongs to C8; worker-visible
  research/GitHub dispatch, the full effect-completing coordinator, and the C7
  evaluation report need separately named evidence slices.
- **Governance:** PR #14 remains open and unmerged. Its breadth (284 changed files,
  13 commits at review start) and absence of human review make review/merge
  governance important, but do not change the technical exit criteria.

## Decision

Keep issue #13 open. PR #14 can be considered for merge as the reviewed C6
implementation stack only after the local review fix and complete ordinary gate
are green and the branch/PR description is updated. Merging it must not mark C6
Passed; either complete the Linux criterion next or split that exact criterion
into a named, traceable follow-up before closing issue #13.

## Verification

- Focused broker/service boundary: 5 files and 35 tests passed.
- Vitest: 61 files and 364 tests passed; 3 protected files and 5 protected tests
  skipped, for 64 files / 369 tests total.
- SQLite spike: 7 passed; the intended POSIX permission test skipped on Windows.
- Demo reset planner: 2 passed.
- Dependency boundaries: 176 modules and 354 dependencies, no violations.
- Prettier, ESLint, TypeScript, production Vite build, and `git diff --check main`
  passed.
