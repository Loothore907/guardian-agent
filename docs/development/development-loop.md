# Development loop and validation lanes

Use one useful outcome as the unit of work. The context atlas locates sources;
this loop governs execution; validation checks the resulting change. They share
the current handoff and repository evidence instead of maintaining parallel plans.

## Prepare once, then execute

At the start, identify the repository/issue/base, measurable success evidence,
allowed action classes and destinations, time/spend/admission limits, integration
scope, and real stop conditions. Keep this in the existing session plan or concise
conversation agreement; do not require another form, issue or commit per attempt.

Run `node scripts/guardian-context.mjs current`, then a targeted `search-docs`,
`claim`, `decision` or `impact` query when it resolves the current question.
Check the reported head and read the relevant cited sources and tests. Atlas reads
committed HEAD; inspect the working diff separately while editing. Use the
[practical Atlas patterns](guardian-context-atlas.md#daily-development-patterns)
for query choice, bounded fallback and source freshness. If the CLI is unavailable
in an older checkout or reduced archive, use targeted tracked-file searches and
the current handoff. No atlas packet, memory or old run sheet grants authority or
proves live remote state. Optional hooks are not required for this workflow.

Before paid or external execution, validate the actual setup payload and expected
output against the production contracts. Use the intended fixture and launch path.
Identify an expected answer before the first admission; a denied request or a
documented failure is not success for a task that asks for a useful answer.

After a recoverable failure, retain the smallest useful diagnostic, identify a
cause or falsifiable hypothesis, repair the fixture/code/setup within the grant,
run the relevant check, and retry. Do not repeat an unchanged failing attempt or
stop solely to document it. If evidence is insufficient, improve diagnosis before
spending another admission. Preserve and reconcile side effects and reservations.

Continue until the outcome passes, a declared limit is reached, the user stops
work, an unresolved safety boundary blocks it, or a material action needs missing
authority. Request only that missing scope, with a concrete proposal. Existing
in-scope repair, commit and integration authority persists. Never interpret
persistence as permission to widen scope, weaken controls or extend budgets.

Close once: report useful output and evidence, actual limitations, costs where
applicable, cleanup, and integration state. An incomplete outcome needs an owning
issue and next action. Consolidate factual handoff updates with the completed
slice; avoid a separate approval/PR for each failure or metadata correction.

## End relevant responses with next-step guidance

End user-facing responses about ongoing work, plans, reviews, readiness or project
status with a concrete recommended next action. State what should happen next and
why; identify any decision or missing authority the user actually needs to supply.
Prefer one recommendation over an unranked menu or a generic offer to continue.
When asked whether work is ready, distinguish verified readiness from remaining
preparation and give the recommended sequence, including the applicable bounds.

If the next action is already authorized and needed for the active outcome,
perform it rather than stopping to ask again; end the eventual response with the
next useful guidance. A recommendation does not grant execution authority or
extend a session's limits. When no relevant work remains, say so instead of
inventing follow-up work. Simple acknowledgments or self-contained answers with
no useful follow-up do not need a next-step footer.

## Development and frozen evaluation

Use the [testing roadmap](testing-roadmap.md) to select the next missing evidence
within the [delivery plan](evidence-first-delivery-plan.md). Keep one primary slice
active; required runtime/access diagnosis and submission preparation are supporting
work, not permission to add another capability. The current handoff carries the
active gate, exact source, exhausted/remaining authority and next action.

1. Pick up current evidence and remote hygiene; select one useful outcome and its
   owning issue. Record expected allowed output, forbidden effects and stop rules.
2. Map existing tests before adding coverage. Reproduce offline through production
   contracts/composition and add focused regression checks with the repair.
3. Validate the candidate in its required lane, inspect the diff, and integrate
   through exact-head PR/main checks within the existing integration authority.
4. Before a live evaluation, freeze source, model/policy, fixture, mission, expected
   output and sample/count limits; verify exact resources, grant and cleanup.
5. Evaluate boundary behavior and useful completion independently. Inspect audit,
   terminal state, budgets and external effects; retain only allowed diagnostics.
6. Close once with all attempted and unrun cases, focused time, costs/uncertainty,
   cleanup, integration and the next gate. Update the handoff with the consolidated
   result, not a new plan for every attempt.

Development repair/retry remains inside its grant. A frozen evaluation has stricter
rules: stop at the first failure when specified, make no between-run changes, and
report the batch as incomplete. Diagnose offline, integrate any repair, and prepare
a separately identified evaluation within remaining explicit authority or a fresh
exact grant. Never silently restart a stopped batch or pool changed configurations.
Passing a suite admits preparation of the next supported boundary, not automatic
spend, mutation, capability expansion or security-claim promotion.

Review capacity and milestone risk weekly using actual focused hours, useful
outcomes, failure classes, attempts before success and missing evidence. Protect
judge access, containment verification and submission time; cut showcased breadth
before weakening evidence. Documentation supports those outcomes and is not itself
runtime progress.

## Mechanically selected validation

For a committed candidate, use exact revisions:

```text
node scripts/change-validation.mjs --base origin/main --head HEAD --check
node --test scripts/change-validation.test.mjs scripts/session-hygiene.test.mjs
```

The classifier reads both sides of the Git diff, including deletions and type
changes. Run it again after the candidate changes. Before committing, run narrow
tests while iterating; if classification is uncertain, run the full suite.

- **Docs:** non-executable regular Markdown under `docs/` or root `README.md`.
  Validate diff whitespace, document size/NUL bounds, and repository-relative
  inline/reference link targets, plus routing tests and session/PR hygiene.
- **Full:** all other or mixed changes, including JSON/data fixtures, source,
  dependencies, workflows, `.codex/`, `.agents/`, `AGENTS.md`, architecture,
  threat/claim documents, ADRs, session plans and development-loop policies.
  Run `pnpm check`; CI also runs Linux platform boundaries and dependency audit.
  Unknown or empty diffs select full; unavailable/malformed revisions fail.

The same required CI job is named `build` in both lanes. It always classifies and
validates the diff, tests routing/hygiene, validates PR metadata, and checks that a
known lane completed. Docs jobs do not install production/development dependencies.
No branch-rule bypass, changed required-check name or label-based opt-out exists.

Link validation checks local target existence in the candidate Git tree, not
external availability or anchor accuracy. It does not prove factual or security
claims; review still checks those against evidence. JSON is deliberately excluded
because this repository consumes executable fixtures and policy data from docs.

## What is enforced

CI and the required `build` gate mechanically enforce the validation selection and
successful checks. Tests cover mixed changes, deleted/renamed source, symlinks,
missing refs and broken links. Guardian's runtime budgets and authority checks
enforce their separately documented execution boundaries.

The outcome-first loop and atlas usage are agent instructions. They do not prove
that an agent will persist, choose the right repair, or respect a conversational
grant. A stronger future session controller would need machine-readable authority,
observed attempts and verified completion evidence; a prose receipt or hook cannot
substitute for that. Judge this workflow by useful outcomes, attempts before
success, time to first test, and repeated approval requests—not document volume.
