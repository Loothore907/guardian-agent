# Session Git hygiene

Every source-changing session owns integration as part of its deliverable. A
milestone remaining open does not justify withholding completed slices from PRs.

## Start

Run `node scripts/session-hygiene.mjs start --remote`. Inspect the current branch,
dirty paths, upstream divergence, issue, PR and exact-head CI. Read the current
handoff and outstanding reviews. A merged feature branch is valid for closeout,
but the start check rejects resuming work on it; select current main and create
an appropriate issue-linked branch for the next change. Before feature work, either resolve inherited
integration debt or record its exact blocker, owning issue and next action. Never
stash, discard, overwrite or publish unrelated user work to obtain a clean result.

Name the issue, branch/base, deliverable, tests and integration actions in the
session plan. Reuse approved scope. If publication or merge authority is absent,
prepare a concrete proposal early instead of accumulating another unreviewed slice.

## During work

- Follow the [development loop](development-loop.md). Keep recoverable failures
  inside the approved outcome and boundaries. Diagnose and repair before retry;
  write one consolidated closeout after useful success or an actual stop boundary.
- Use one issue-linked branch per coherent change; open a draft PR once a useful
  checkpoint exists. Commit tested behavior with its tests and documentation.
- Treat factual documentation-only reconciliation of the current change's checks,
  merge state and handoff as closeout for the originating issue, including when it
  follows the merge. Reuse that issue reference without creating a new tracker or
  requesting separate authority. A correction becomes separate scope only when it
  introduces new requirements, behavior, claims, authority or operational bounds.
- Start independent work from current main. Use stacked PRs only for real
  dependencies; record the predecessor and review order. Do not use one milestone
  branch for unrelated completed features.
- Keep commits Conventional and PR titles Conventional. Include `Refs #N` (or an
  intentional closing keyword) for the issue in the branch name. Umbrella issues
  close only when their complete acceptance criteria pass.
- Review security boundaries and required checks at the exact candidate head.
  Failed, missing, skipped or stale required `build` results block integration.
  The build selects the tested prose or full-validation lane; steps belonging
  only to the other lane are intentionally inapplicable. Do not override the
  classifier or disable a required check to recover a backlog.
- Merge approved slices through the protected PR path, verify main CI, then
  reconcile dependent bases. Do not force-push, reset or delete branches as
  automatic cleanup. Preserve recovery refs until integration is verified.

## Close

Run `node scripts/session-hygiene.mjs close --remote` on the feature branch. The
check fails for dirty/unpublished work, wrong/missing upstream, divergence,
missing issue/PR, mismatched head or a build that is not green. Offline inspection
is available by omitting `--remote`, but returns failure because remote state is
unknown. These commands fetch origin and inspect GitHub; they do not commit,
push, merge, delete or change settings.

A merged PR whose exact head and build verify may close successfully after GitHub
deletes its remote feature branch. In that specific case, a missing upstream is
expected integration state rather than unpublished work; open PRs and unmerged
branches still require their exact upstream.

Report branch/head, commit/push status, issue/PR links, exact-head checks, review
and merge state, and remaining changed paths. A blocked draft is a legitimate
handoff only with its failure, owner, next action and required decision recorded.
It is not a successful closeout. Start the next session with that blocker before
new scope. Tests plus a prose handoff alone do not complete integration.

Deployment preparation must identify a reviewed source revision and explicit
manifest. Experimental unmerged snapshots require a bounded, recorded exception;
they must not become an implicit permanent deployment workflow.

## Enforcement and limits

The active main ruleset requires an up-to-date GitHub Actions `build`, PRs,
resolved review threads and squash/linear integration, with no bypass actors.
The build runs credential-free hygiene tests and checks PR title/branch/issue
reference syntax on pull-request events. Its change classifier routes only ordinary
Markdown prose to document validation without dependency installation. Changes to
runtime, executable/data fixtures, configuration, authority documents, or the
classifier itself retain the full suite, Linux boundaries and dependency audit.
It does not prove issue scope is correct,
human review happened, global instructions were followed or local work was pushed.
The local remote check additionally verifies the named issue exists and the PR's
exact head/build. It does not prove protected deployment readiness or replace
review. Sole-owner review remains an explicit solo-project limitation.

Global Codex guidance is installed separately in the user's Codex home. The
versioned template is [global-session-rules.md](global-session-rules.md). It is
instructional guidance, not a sandbox or automatic hook. Repository instructions,
scripts and GitHub rules provide distinct layers; none should be overstated.
