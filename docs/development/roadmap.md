# Development Roadmap

## Purpose

This roadmap converts the Guardian Session product contract into evidence-backed build checkpoints. Calendar targets and effort ranges expose delivery risk; they never waive exit criteria.

The competition deadline is October 30, 2026 at 10:00 a.m. Pacific time. The internal submission target is October 28, leaving two calendar days for recovery and submission issues. Recheck the [official rules](https://nebiusglobalaihackathon.devpost.com/rules) at every release checkpoint.

## How time is tracked

**Weekly capacity** means the focused hours the project owner can realistically contribute in an average week. It converts an effort estimate into a calendar forecast. For example, a 20-hour checkpoint requires roughly one week at 20 focused hours per week or four weeks at 5 focused hours per week.

The planning baseline is **20 focused hours per week**, accepted on August 29,
2026. Additional capacity is schedule buffer, not permission to add optional scope.
Record actual focused effort from C2 onward and recalibrate dates after C4. C0 and
C1 were completed before session-level time capture began, so their actual effort
is intentionally recorded as unavailable rather than reconstructed. Do not count
unattended model, build, provider, or deployment waits as focused effort.

For forecasting, one roadmap effort day represents four focused hours. The current
35-54-day estimate therefore represents roughly 140-216 focused hours, or 7-11
weeks at the 20-hour baseline. The lower-to-middle range fits the internal deadline;
the upper range does not. The schedule is therefore **amber by scope**, while
checkpoint progress is currently green because C1 passed before its target. This
range includes implementation, tests, documentation, review, and demo preparation
but excludes unknown provider onboarding delays.

## Product outcome

The competition build must prove:

> A Guardian Session gives an AI agent bounded autonomy inside a task-scoped runtime where public research and authenticated actions are forced through observable, policy-controlled pathways.

The judged experience must demonstrate:

1. credential isolation;
2. enforced mission boundaries in the documented reference runtime;
3. low-friction reuse of a scoped service connection;
4. bounded Tavily research with visible provenance;
5. Nemotron contextual judgment that cannot weaken deterministic policy;
6. exact authorization and final revalidation; and
7. reproducible bypass, mutation, replay, expiry, and redaction evidence.

## Priority order

When scope or schedule conflicts occur, preserve work in this order:

1. Honest assurance boundaries and the enforcement feasibility result.
2. Credential isolation and removal of alternate authenticated pathways.
3. Human-authored mission, session profile, and deterministic fail-closed policy.
4. Exact approval, resource-version binding, mutation rejection, replay rejection, and expiry.
5. One real GitHub read and one exact privileged action.
6. Bounded Tavily research and the minimized research journey.
7. Required Nebius and NVIDIA guardian inference with safe fallback.
8. Comprehensible mission, assurance, approval, and audit experience.
9. Reproducible evidence, clean setup, and submission consistency.
10. Optional breadth or interoperability.

No optional feature may delay or weaken a higher-priority outcome.

## Checkpoint rules

- A checkpoint passes only when every exit criterion has reproducible evidence.
- A target date is a risk signal, not an alternate exit criterion.
- Security behavior and its tests land in the same change.
- Only properties with completed evidence may advance in `docs/security-claims.md`.
- A failed checkpoint is repaired, explicitly descoped, or converted into a documented lower-assurance mode.
- Every checkpoint records planned effort, actual effort, completion date, evidence, and residual limitations.
- Live-provider secrets are never required for public pull-request checks.
- The deterministic and fake-provider suites must remain sufficient for ordinary public verification.

## Actionable checkpoint map

| Checkpoint | Provisional target | Effort | Required outcome |
| --- | --- | ---: | --- |
| C0 - Product contract | August 31 | 1-2 days | Freeze the mission, audience, promise, assurance levels, success metrics, non-goals, and reference demonstration. |
| C1 - Enforcement feasibility | September 4 | 2-4 days | Prove an interaction loop with approved tools, isolated local command execution, failed direct network/Git bypass, and successful Guardian-mediated research. |
| C2 - Stack and session architecture | September 8 | 2-3 days | Accept ADR-0003; scaffold workspace, package boundaries, test runner, CI, and dependency enforcement around the proven spike. |
| C3 - Mission and deterministic contracts | September 14 | 4-6 days | Strict mission, profile, assurance, proposal, canonicalization, digest, policy-lattice, and fail-closed input contracts pass unit and property tests. |
| C4 - Reference session runtime | September 21 | 4-6 days | Trusted launcher creates a disposable credential-free runtime with an enforced tool catalog, filesystem scope, lifetime, revocation, and network policy. |
| C5 - Tavily research gateway | September 26 | 3-5 days | Bounded live Search/Extract, outbound-data checks, untrusted provenance, journey ledger, failure behavior, and deterministic fixtures work end to end. |
| C6 - Authorization and GitHub broker | October 2 | 5-7 days | Scoped connection, typed PR read, exact merge approval, atomic replay protection, final revalidation, resource-version binding, and sanitized audit pass tests. |
| C7 - Nemotron guardian | October 7 | 3-5 days | Token Factory runtime inference, constrained output, credential-free envelope, precedence, timeout/failure fallback, and evaluation fixtures pass. |
| C8 - Product experience | October 12 | 4-6 days | Mission creation, assurance display, agent activity, research journey, approval, denial, result, revocation, and audit form one coherent experience. |
| C9 - Attack and claims gate | October 17 | 4-6 days | Runtime bypass, egress, adversarial, mutation, replay, expiry, provider, redaction, and architecture evidence supports every showcased claim. |
| C10 - Release candidate | October 23 | 4-6 days | Clean install, hosted demo, full CI, dependency/license review, sensitive-data review, documentation, and timed video rehearsal pass. |
| C11 - Submission lock | October 28 | 2-3 days | Final tag, hosted build, repository, video, description, feedback, provenance, and Devpost entry agree on one tested revision. |

## Critical path

```text
C0 Product contract
  -> C1 Enforcement feasibility
    -> C2 Stack and session architecture
      -> C3 Mission and deterministic contracts
        -> C4 Reference session runtime
          -> C5 Tavily research gateway
          -> C6 Authorization and GitHub broker
            -> C7 Nemotron guardian
              -> C8 Product experience
                -> C9 Attack and claims gate
                  -> C10 Release candidate
                    -> C11 Submission lock
```

C5 and the early adapter portion of C6 may proceed in parallel only after C3 establishes shared contracts. No UI polish or optional integration may bypass the C1, C3, C4, or C6 evidence gates.

## Checkpoint details

### C0 - Product contract

Deliverables:

- `docs/product-contract.md`;
- ADR-0002;
- updated architecture, threat model, claims, competition plan, and roadmap; and
- a recorded list of implementation decisions deferred to C1 and ADR-0003.

Exit criteria:

- The reference user, mission, service, routine capability, privileged capability, and public-research role are explicit.
- Enforced, Observed, and Unknown have distinct meanings.
- Commerce is a future use case, not prototype scope.
- The private concept document is reconciled when available; until then, public accepted decisions remain authoritative for implementation.

### C1 - Enforcement feasibility

Build the smallest disposable spike capable of answering the architecture's hardest question.

Required proof:

1. Start one interaction-model loop with only a tiny approved tool catalog.
2. Execute a harmless local command in an isolated command environment.
3. Demonstrate that public `curl`, PowerShell web requests, or equivalent direct egress fail.
4. Demonstrate that direct `git push` has no credential and cannot reach an authenticated path.
5. Invoke a Guardian-owned research function that successfully reaches a fake provider, then a protected Tavily test call when credentials are available.
6. Capture the tool, filesystem, credential, and network configuration associated with the run.
7. Confirm that the interaction model cannot read Guardian's GitHub, Tavily, or Nebius provider credentials.

Go/no-go rule:

- **Pass:** adopt the proven mechanism in ADR-0003 and continue toward Enforced mode.
- **Bounded fallback:** if the mechanism cannot pass within four focused days, document the blocker, retain an Observed MCP mode, reduce public claims, and choose the smallest alternative reference runtime before continuing.

The spike must not become production architecture by accident. Record what was learned and deliberately replace or accept each temporary choice.

### C2 - Stack and session architecture

Exit criteria:

- ADR-0003 records interaction loop, runtime, command sandbox, workspace, schemas, canonicalization, persistence posture, and rejected alternatives.
- Package boundaries mechanically separate contracts, session control, local execution, research, policy, guardian, authorization, broker, adapter, audit, and UI.
- Formatting, linting, type checking, unit tests, dependency checks, and build run locally and in CI.
- Provider secrets are unavailable to public pull-request jobs and fake providers cover normal checks.
- Canonical developer commands and supported platform prerequisites are documented.

### C3 - Mission and deterministic contracts

Implement contracts before providers or UI:

- `Mission` and immutable human-authored intent;
- `SessionProfile` and version;
- `AssuranceLevel` and supporting evidence reference;
- allowed tools, filesystem scope, network mode, destinations, time, volume, and side-effect permissions;
- typed action proposals and resource versions;
- research requests and provenance events;
- authorization lattice;
- canonical request and digest;
- approval and audit event schemas; and
- strict unknown-field rejection.

Exit criteria:

- Unknown, ambiguous, unsupported, malformed, hidden-Unicode, and scope-expanded input fails closed.
- Equivalent requests produce the same digest and material mutations produce different digests.
- The agent can request but cannot grant mission expansion.
- Missing or malformed assurance evidence never yields Enforced.
- Guardian output cannot reduce the deterministic floor or override deterministic denial.

### C4 - Reference session runtime

Exit criteria:

- The trusted launcher binds one mission, profile, caller, policy version, lifetime, and revocation handle.
- The interaction model sees only the mission-approved tool catalog.
- Local commands run in a disposable filesystem with no provider credentials or host credential mounts.
- Direct public egress and direct authenticated Git operations fail reproducibly.
- Session expiry and revocation stop new tool calls.
- Runtime evidence is sufficient to distinguish Enforced from Observed and Unknown without claiming host-compromise resistance.

### C5 - Tavily research gateway

Implement:

- mission-bound Search and Extract first;
- deterministic query length, shape, topic, destination, and result limits;
- secret-like, private, encoded, and oversized outbound rejection;
- bounded domains, pages, excerpts, and total research budget;
- untrusted source labels and content digests;
- minimized journey events; and
- fake, captured, live, timeout, malformed, and unavailable provider behavior.

Exit criteria:

- A real runtime Tavily call materially contributes evidence to the reference mission.
- Removing Tavily makes the demonstrated research journey materially poorer.
- Search relevance is never presented as trust.
- Provider failure cannot lower authorization requirements.
- No credential, approval record, private audit history, or unnecessary private repository content reaches Tavily.

Map and Crawl remain optional until Search and Extract, privacy controls, and C9 evidence are stable.

### C6 - Authorization and GitHub broker

Implement:

- one scoped GitHub connection suitable for a dedicated demo repository;
- typed PR read;
- typed PR merge with fixed endpoint and allowed merge methods;
- expected head commit binding;
- opaque one-time approval;
- atomic nonce consumption for the supported runtime;
- final schema validation, normalization, digest comparison, scope, caller, connection, expiry, policy, and resource-version checks; and
- allowlisted result and audit fields.

Exit criteria:

- The interaction model and command sandbox cannot retrieve the GitHub credential.
- Routine read works under the read-only mission.
- Unauthorized merge fails before adapter execution.
- Exactly approved merge succeeds against the dedicated test target.
- Changed head commit, mutation, replay, expiry, cross-session, cross-connection, and scope expansion fail.
- Restart and persistence limitations are explicitly tested and documented.

### C7 - Nemotron guardian

Exit criteria:

- The application makes a documented runtime Token Factory call to an available NVIDIA open-source Nemotron model.
- The model receives only minimized credential-free risk envelopes.
- Output is strict, bounded, structured, and mapped through deterministic precedence.
- Fixtures include intent-action mismatch, untrusted imperative content, suspicious authority expansion, clean research, and ambiguous evidence.
- Timeout, unavailability, malformed output, and uncertainty escalate or deny.
- Evaluation reports false escalation and missed escalation rather than claiming complete detection.
- Deterministic tests use a fake provider; live tests are isolated and protected.

### C8 - Product experience

The experience must show:

- human mission creation before agent execution;
- selected profile, lifetime, scope, and assurance level;
- useful agent progress without repeated authentication;
- Tavily-mediated research journey and source provenance;
- deterministic and Nemotron risk reasons;
- unexpected action denial;
- exact approval showing repository, PR, head commit, method, expiry, and one-time use;
- execution result, revocation, and sanitized audit; and
- clear limitation language for Observed or Unknown environments.

Exit criteria:

- A new viewer can explain what the agent was allowed to do, what it encountered, what it attempted, why Guardian reacted, and what ultimately executed.
- The complete happy path and rejection story can be demonstrated in less than three minutes.

### C9 - Attack and claims gate

Exit criteria:

- Every required adversarial fixture in `docs/threat-model.md` has a reproducible expected result.
- Property tests cover canonicalization, mutation, replay, expiry, caller and connection binding, scope, assurance, outbound research, and redaction where appropriate.
- Tool-catalog, credential-path, direct-network, Git push, alternate-tool, and false-assurance tests pass in the documented reference runtime.
- Secret-like values injected through mission input, research queries, provider results, adapter results, failures, and diagnostics do not reach unauthorized outputs.
- `docs/security-claims.md` names exact commands and evidence for every upgraded claim.
- Residual risks and prototype limitations are visible in the product and setup materials.

Feature freeze begins when C9 passes.

### C10 - Release candidate

Exit criteria:

- A clean documented environment can install and run the supported reference build.
- The public repository contains every required source file and no private material.
- The hosted demo or test build is stable and accessible under documented conditions.
- The selected revision passes deterministic, adversarial, runtime, provider, build, dependency, license, and sensitive-data review.
- The video script fits below three minutes and visibly demonstrates working modules.
- Submission claims, screenshots, setup instructions, hosted behavior, provider usage, and evidence match the candidate revision.

### C11 - Submission lock

Exit criteria:

- Final repository revision, tag, hosted build, video, and Devpost description agree.
- NVIDIA, Nebius, Nemotron, Tavily, setup, feedback, provenance, and license details are present.
- The demo remains available through the required judging period.
- Credential, personal-data, trademark, asset-rights, and claim-integrity reviews pass.
- Submission is complete by the internal target; the final two days remain recovery buffer only.

## Scope controls

### Required

- One trusted mission-creation path.
- One reference constrained interaction-agent runtime.
- One network-disabled local command executor.
- One Guardian MCP capability surface.
- Tavily Search and/or Extract with a research journey.
- One GitHub connection, one typed read, and one typed merge.
- Deterministic mission policy, exact approval, final revalidation, replay protection, and sanitized audit.
- Nebius Token Factory and Nemotron integration.
- Mission, assurance, research, approval, denial, and audit UI.
- Reproducible adversarial evidence and clean-environment setup.

### Deferred unless C9 passes early

- Tavily Map and Crawl beyond the reference mission's need.
- Arbitrary third-party terminal-harness enforcement.
- Multiple interaction-agent providers.
- Additional service adapters.
- Adapter SDK or plugin marketplace.
- Multi-user or production multi-tenant administration.
- Production credential vault, identity provider, or recovery features.
- Purchases, payments, or financial transfers.
- Mobile, biometric, passkey, or hardware-backed approval.
- Advanced audit search, export, analytics, or long-term memory.

## Schedule controls

Review roadmap health weekly and whenever a checkpoint target is missed.

| State | Condition | Required response |
| --- | --- | --- |
| Green | Current checkpoint is on target and required evidence is being produced | Continue; do not pull optional scope forward. |
| Amber | Target is at risk, effort exceeds its upper estimate by 25%, or a critical decision is open for more than two working days | Remove optional work, split the checkpoint, and document recovery. |
| Red | A target is missed, required integration is blocked, or a security invariant cannot be evidenced | Stop downstream feature work, choose a bounded fallback, and revise scope and dates explicitly. |

Mandatory reviews:

- **After C1:** decide Enforced reference runtime or documented lower-assurance fallback.
- **September 21:** if C4 has not passed, stop provider and UI breadth until the runtime boundary works.
- **October 2:** if exact read/merge does not work, stop all optional research and UI additions until C6 passes.
- **October 12:** if the complete experience is not demonstrable, freeze architecture and reduce the UI to the shortest coherent path.
- **October 17:** feature freeze after C9. Accept only evidence, reliability, setup, demo, submission, and critical defect work.
- **October 23:** release-candidate freeze. Use remaining time for rehearsal, recovery, and consistency.

## Time and evidence ledger

| Date | Checkpoint | Activity | Planned | Actual | Evidence or output | Variance or blocker |
| --- | --- | --- | ---: | ---: | --- | --- |
| 2026-08-29 | C1 | Namespace and mediation feasibility spike | 2-4 days | Not captured | `docs/development/evidence/c1-enforcement-feasibility.md` | Passed ahead of September 4 target; time capture begins at C2 |
| 2026-08-29 | C2 | ADR-0003, dependency review, workspace, tests, build, and CI scaffold | 2-3 days | 1.1h through 16:05 AKDT | `docs/adr/0003-implementation-stack-and-package-boundaries.md`; local `pnpm check`; [GitHub Actions run 33282416010](https://github.com/Loothore907/guardian-agent/actions/runs/33282416010) | Passed well ahead of the September 8 target |
| 2026-08-29 | C3 | Mission, profile, assurance, action, provenance, canonical request, digest, approval, audit, and policy contracts | 4-6 days | 0.8h through 23:27 AKDT | Commits `f058d41` and `a295737`; draft PR #5; local `pnpm check` with 9 test files / 32 tests | Exit criteria pass locally; checkpoint remains in review until PR merge |
| YYYY-MM-DD | C# | Concise work unit | 0h | 0h | Issue, PR, test, ADR, or artifact | None |

At checkpoint close, record:

- target and actual completion date;
- planned and actual focused effort;
- evidence links and exact verification commands;
- defects or risks carried forward;
- claims changed or explicitly unchanged;
- scope or assurance decisions made; and
- revised forecast based on measured pace.

## Current status

| Checkpoint | Status | Notes |
| --- | --- | --- |
| Gate 0 - Governance foundation | Passed | Repository, initial scope, trust boundaries, threat model, claims discipline, competition plan, and governance are established. |
| C0 - Product contract | Passed | The enforced-session pivot and consistency review are complete. The unavailable private concept document remains a recorded reconciliation task, not an implementation authority. |
| C1 - Enforcement feasibility | Passed | Live Nebius proposal, live Tavily research, namespace, filesystem, credential, direct-egress, direct-Git, fake-provider, fail-closed, and tool-denial evidence pass. |
| C2 - Stack and session architecture | Passed | ADR-0003 accepted; local dependency, workspace, MCP, format, lint, type, test, boundary, audit, license, and build checks pass; the first remote GitHub Actions run passed. |
| C3 - Mission and deterministic contracts | In review | All exit criteria pass locally on PR #5; remote CI and merge remain before checkpoint close. |
| C4-C11 | Not started | Advancement depends on the preceding checkpoint evidence. |
