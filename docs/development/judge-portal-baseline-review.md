# Judge portal source baseline review

2026-09-05. Local branch `codex/13-c6-linux-provider-containment`, HEAD `e5b1217`.
No commit, push, remote inspection or source integration was performed in this review.

The local history contains 34 commits after the recorded PR 17 head `bca4313`.
Inspection of the commit subjects and affected paths identifies these dependencies:

- Linux Secret Service lifecycle and routing: `3c4ae55` through `97ec1b6`.
- Managed/BYOK custody and fixed SecretStash resolution: `841ec4a` through `431cdbe`.
- Durable demo budgets, metering and journey admission: `a0e3c0b` through `e658209`.
- Hosting decisions and authenticated judge ingress: `0b0bd90` through `86a1c17`.
- Accepted enrollment flows and protected Linux evidence: `37be246` through `e5b1217`.

The portal depends on the managed-demo ingress and budget stack. Publishing it as
an isolated patch onto PR 17's recorded head would omit prerequisites. Prefer
reviewing/integrating that stack, then stacking the portal change on the reviewed
result. This is a dependency disposition, not a full security review of 34 commits.
Remote heads and CI have not been refreshed.

## Proposed review grouping

1. Existing supervisor/research discovery fixes and W27 peer containment, including
   their tests, workspace package metadata and ADR-0047.
2. Existing W28 harness, readiness/recovery tools and evidence; keep protected live
   outcomes distinct from deterministic tests.
3. Existing typed session-plan authority and launch/headless implementation,
   ADR-0048/0049, tests and evidence. Some files overlap the earlier groups; inspect
   hunks rather than blindly assigning whole files to commits.
4. Judge portal contracts, API lifecycle and budget adapter, fixture pool, web UI,
   tests, ADR-0050 and scenario specifications.

Before any source publication, turn these into an exact hunk/file manifest, select
the destination branch and PR relationship, and obtain the bounded integration
authority described in AGENTS.md. Preserve existing uncommitted work throughout.

## Runtime findings

- The previous web entry was a C2 foundation-status screen.
- `HeadlessJudgeSessionExecutor` runs a fixed deterministic competition workflow.
  Its unsafe action is scripted; it is not evidence of a model taking the bait.
- Worker proposal schemas include research and GitHub names, but runtime execution
  envelopes/results and `TrustedWorkerToolDispatcher` support session status and
  local commands only. Bootstrap currently performs one tool round trip.
- A real piloted portal adapter consequently needs the C7 external-tool execution
  contracts, dispatch and bounded continuation. Wiring a card to the scripted
  journey does not satisfy the accepted model-interaction requirement.
- ADR-0049 supplies native Linux executor adaptation tested inside WSL. The C6
  residual document's older adaptation requirement has been reconciled; separate
  cloud-host and provider-containment evidence remains required.
