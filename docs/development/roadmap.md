# Development Roadmap

## Purpose

This roadmap converts the Guardian Session product contract into evidence-backed build checkpoints. Calendar targets and effort ranges expose delivery risk; they never waive exit criteria.

The current vertical-slice work is an architectural validation gate, not a claim
that the project must become competition-ready immediately. The complete live
journey is used to test boundaries and assumptions against reality, feed findings
back into the design, and establish a stable base for later feature expansion and
competition hardening. See
[ADR-0029](../adr/0029-end-to-end-architectural-validation.md).

The competition deadline is October 30, 2026 at 10:00 a.m. Pacific time. The internal submission target is October 28, leaving two calendar days for recovery and submission issues. Recheck the [official rules](https://nebiusglobalaihackathon.devpost.com/rules) at every release checkpoint.

## How time is tracked

**Weekly capacity** means the focused hours the project owner can realistically contribute in an average week. It converts an effort estimate into a calendar forecast. For example, a 20-hour checkpoint requires roughly one week at 20 focused hours per week or four weeks at 5 focused hours per week.

The planning baseline is **20 focused hours per week**, accepted on August 29, 2026. Additional capacity is schedule buffer, not permission to add optional scope.
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
6. exact passkey authorization and final revalidation;
7. a real polluted-content denial followed by a separately authorized exact action; and
8. reproducible bypass, mutation, replay, expiry, and redaction evidence.

## Priority order

When scope or schedule conflicts occur, preserve work in this order:

1. Honest assurance boundaries and the enforcement feasibility result.
2. Credential isolation and removal of alternate authenticated pathways.
3. Human-authored mission, session profile, and deterministic fail-closed policy.
4. Exact passkey approval, resource-version binding, mutation rejection, replay rejection, and expiry.
5. One real narrow GitHub read and one exact privileged action against a disposable repository.
6. Bounded Tavily research and the minimized research journey.
7. Required Nebius and NVIDIA guardian inference with safe fallback.
8. Comprehensible mission, assurance, approval, and audit experience.
9. Reproducible evidence, clean setup, and submission consistency.
10. Optional breadth or interoperability.

No optional feature may delay or weaken a higher-priority outcome.

### Integrated validation and expansion rule

Before adding optional breadth, the fixed vertical journey must be reachable from
the executable surface and must exercise the relevant deterministic controls with
fake providers. Live providers are then introduced one boundary at a time, ending
with one exact effect against the disposable GitHub target. Each stage records the
assumption, authoritative deterministic control, expected failure behavior, and
observed evidence.

The integrated journey is a learning gate, not a permanent product scope or a
submission sprint. Contradicted assumptions return to design and test work before
the journey advances. Once the required path is stable, the roadmap review sorts
follow-up work into validated core, design corrections, and expansion candidates.
Optional expansion may use genuine schedule buffer only after the higher-priority
outcomes remain protected. Live model cooperation is compatibility evidence, not
enforcement evidence. See
[ADR-0029](../adr/0029-end-to-end-architectural-validation.md).

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

| Checkpoint                               | Provisional target |   Effort | Required outcome                                                                                                                                                                                                                                                |
| ---------------------------------------- | ------------------ | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C0 - Product contract                    | August 31          | 1-2 days | Freeze the mission, audience, promise, assurance levels, success metrics, non-goals, and reference demonstration.                                                                                                                                               |
| C1 - Enforcement feasibility             | September 4        | 2-4 days | Prove a host-agent loop with approved tools, isolated local command execution, failed direct network/Git bypass, and successful Guardian-mediated research.                                                                                                     |
| C2 - Stack and session architecture      | September 8        | 2-3 days | Accept ADR-0003; scaffold workspace, package boundaries, test runner, CI, and dependency enforcement around the proven spike.                                                                                                                                   |
| C3 - Mission and deterministic contracts | September 14       | 4-6 days | Strict mission, profile, assurance, proposal, canonicalization, digest, policy-lattice, and fail-closed input contracts pass unit and property tests.                                                                                                           |
| C4 - Reference session runtime           | September 21       | 4-6 days | Trusted launcher creates a disposable credential-free runtime with an enforced tool catalog, filesystem scope, lifetime, revocation, and network policy.                                                                                                        |
| C5 - Tavily research gateway             | September 26       | 3-5 days | Bounded live Search, outbound-data checks, untrusted provenance, journey ledger, failure behavior, and deterministic fixtures work end to end.                                                                                                                  |
| C6 - Authorization and GitHub broker     | October 2          | 5-7 days | A sole-owner authority service, durable state, authenticated local IPC, scoped GitHub connection, typed PR read, exact merge authorization, atomic replay protection, final revalidation, resource-version binding, and sanitized audit pass tests.             |
| C7 - Nemotron guardian                   | October 7          | 3-5 days | Token Factory runtime inference, constrained output, credential-free envelope, precedence, timeout/failure fallback, and evaluation fixtures pass.                                                                                                              |
| C8 - Product experience                  | October 12         | 4-6 days | The Guardian terminal CLI and launched or wrapped external host agent, normalized mission confirmation, assurance display, trusted web ceremonies, research journey, approval, denial, terminal resumption, revocation, and audit form one coherent experience. |
| C9 - Attack and claims gate              | October 17         | 4-6 days | Runtime bypass, egress, adversarial, mutation, replay, expiry, provider, redaction, and architecture evidence supports every showcased claim.                                                                                                                   |
| C10 - Release candidate                  | October 23         | 4-6 days | Clean self-hosted install/test build, optional rate-limited judge demo, full CI, dependency/license review, sensitive-data review, documentation, and timed video rehearsal pass.                                                                               |
| C11 - Submission lock                    | October 28         | 2-3 days | Final tag, judge-accessible build, repository, video, description, feedback, provenance, and Devpost entry agree on one tested revision.                                                                                                                        |

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

C5 and the early adapter portion of C6 may proceed in parallel only after C3 establishes shared contracts. Self-hosted Linux feasibility for authority IPC, local credential resolution, GitHub credentials, approval ceremonies, and sandbox controls begins during C6 and must inform C7-C8 rather than waiting for C10. No UI polish or optional integration may bypass the C1, C3, C4, or C6 evidence gates.

At the current C6 transition, the executable vertical journey crosses the nominal
C6-C8 component boundaries on purpose. It must first pass deterministically, then
introduce live mission dialogue, worker, research, Guardian-risk, and privileged
broker boundaries in increasing order of side-effect risk. Findings may revise
later checkpoint design without changing their evidence requirements.

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

1. Start one external host-agent loop with only a tiny approved tool catalog.
2. Execute a harmless local command in an isolated command environment.
3. Demonstrate that public `curl`, PowerShell web requests, or equivalent direct egress fail.
4. Demonstrate that direct `git push` has no credential and cannot reach an authenticated path.
5. Invoke a Guardian-owned research function that successfully reaches a fake provider, then a protected Tavily test call when credentials are available.
6. Capture the tool, filesystem, credential, and network configuration associated with the run.
7. Confirm that the host agent and Guardian models cannot read Guardian's GitHub,
   Tavily, or Nebius provider credentials.

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
- The external host agent sees only the mission-approved tool catalog.
- Local commands run in a disposable filesystem with no provider credentials or host credential mounts.
- Direct public egress and direct authenticated Git operations fail reproducibly.
- Session expiry and revocation stop new tool calls.
- Runtime evidence is sufficient to distinguish Enforced from Observed and Unknown without claiming host-compromise resistance.

### C5 - Tavily research gateway

Implement:

- mission-bound Search through a fixed provider operation;
- deterministic query length, shape, topic, destination, and result limits;
- secret-like, private, encoded, and oversized outbound rejection;
- bounded domains, excerpts, and total research budget;
- untrusted source labels and content digests;
- minimized journey events; and
- fake, captured, live, timeout, malformed, and unavailable provider behavior.

Exit criteria:

- A real runtime Tavily call materially contributes evidence to the reference mission.
- Removing Tavily makes the demonstrated research journey materially poorer.
- Search relevance is never presented as trust.
- Provider failure cannot lower authorization requirements.
- No credential, approval record, private audit history, or unnecessary private repository content reaches Tavily.

Extract is required only for the controlled hostile-page fixture selected in
ADR-0006. It remains a narrow typed operation over mission-allowlisted public
HTTPS URLs with private-network, redirect, credential, header, size, content, and
timeout controls. Map, Crawl, and general URL retrieval remain optional until
Search, Extract, privacy controls, and C9 evidence are stable.

### C6 - Authorization and GitHub broker

Implement:

- the ADR-0005 SQLite spike and a durable store outside disposable session
  workspaces;
- a central local authority service that is the sole SQLite owner, with trusted
  callers using authenticated typed named-pipe or Unix-socket requests and
  launcher-derived short-lived capabilities;
- immutable session bindings, interruption and revocation state, volume and
  research-budget state, sanitized audit events, and session-ID reuse rejection;
- a trusted local `guardian setup` slice and credential-store abstraction for
  user-owned Nebius, optional Tavily, and narrow GitHub credentials, with the
  reference platform adapter implemented before cross-platform expansion;
- credential-holding Qwen mission-dialogue and Nemotron guardian services that
  resolve secrets locally, call only fixed provider origins, and return strict
  sanitized results through session-bound IPC; the normal cloud route uses Qwen
  for bounded pre-activation completeness review and later explanations, while a
  deliberately selected structured route may bypass it without changing authority;
- one narrow GitHub connection for a dedicated disposable demo repository, with
  reusable material confined to the self-hosting user's credential store and a
  short-lived or narrowly scoped execution credential;
- typed PR read;
- typed PR merge with fixed endpoint and allowed merge methods;
- expected head commit binding;
- an opaque one-time authorization record ready for the C8 passkey issuer;
- atomic nonce consumption for the supported runtime;
- minimized evidence-exposure, attempt, decision, boundary-crossing, consumption,
  and control-outcome records using bounded signal and reason codes;
- final schema validation, normalization, digest comparison, scope, caller, connection, expiry, policy, and resource-version checks; and
- allowlisted result and audit fields.

Exit criteria:

- The external host agent, Guardian models, and command sandbox cannot retrieve the GitHub credential.
- The runner, models, MCP interface, authority database, process arguments, logs,
  traces, audit, and public results cannot retrieve any enrolled provider secret.
- Missing, revoked, rotated, or wrong-provider credentials fail closed and disable
  only the corresponding typed capability.
- No runtime component other than the authority service opens the SQLite database,
  and unknown, stale, restarted, or incorrectly bound IPC callers fail closed.
- The database contains no provider credential, GitHub token or private key, or
  IPC capability.
- Routine read works under the read-only mission.
- Unauthorized merge fails before adapter execution.
- Exactly approved merge succeeds against the dedicated test target.
- Changed head commit, mutation, replay, expiry, cross-session, cross-connection, and scope expansion fail.
- Transaction, uniqueness, concurrent budget, atomic nonce, crash, restart,
  uncertain-outcome, filesystem-permission, and session-ID reuse behavior is
  explicitly tested and documented.
- An unexpected trusted-process restart interrupts the active session and cannot
  reset authority, revocation, volume, research budget, or replay state.
- The intended self-hosted Linux environment proves the selected IPC peer checks,
  database permissions, local credential resolution, and narrow GitHub read/merge path
  early enough to revise the C7-C8 implementation if necessary.

### C7 - Nemotron guardian

Exit criteria:

- Cloud-mode Guardian roles use a trusted versioned model policy. The current
  competition policy assigns `Qwen/Qwen3-235B-A22B-Instruct-2507` only to bounded
  mission dialogue and `nvidia/nemotron-3-super-120b-a12b` to contextual risk,
  subject to live compatibility, latency, cost, and structured-output evaluation;
- reviewed policy upgrades are allowed, but session prompts cannot select model
  IDs and every hackathon policy retains distinct NVIDIA Nemotron primary and
  escalation risk roles;
- pre-activation Qwen output is limited to readiness or bounded clarification
  codes/questions; deterministic code screens inputs, compiles and clamps the
  candidate mission, and requires direct exact-digest human confirmation;
- setup-time and runtime Nemotron review receives separate minimized envelopes and
  may only preserve or increase the deterministic floor;
- structurally invalid Super output escalates visibly to
  `nvidia/Nemotron-3-Ultra-550b-a55b`; invalid or unavailable Ultra output denies;
- Codex, Claude Code, Cursor, or another external host remains the worker and does
  not transfer its coding or research loop to either Guardian model;
- the two roles receive separate projections and are documented as defense in
  depth, not independent security authorities;
- The application makes a documented runtime Token Factory call to an available NVIDIA open-source Nemotron model.
- The model receives only minimized credential-free risk envelopes.
- Output is strict, bounded, structured, and mapped through deterministic precedence.
- Fixtures include intent-action mismatch, untrusted imperative content, suspicious authority expansion, clean research, and ambiguous evidence.
- The deterministic fixture and a protected controlled live page exercise the
  same minimized polluted-content risk envelope without treating retrieval as
  proof of causation.
- Guardian assessments attach to minimized attempt records and may preserve or
  increase, but never lower, the deterministic authorization floor.
- Timeout, unavailability, malformed output, and uncertainty escalate or deny.
- Evaluation reports false escalation and missed escalation rather than claiming complete detection.
- Deterministic tests use a fake provider; live tests are isolated and protected.

### C8 - Product experience

The experience must show:

- session invocation from the Guardian CLI and a launched or wrapped external host agent;
- trusted local setup with user-owned Nebius access, optional Tavily access when
  research is enabled, and a narrow GitHub connection, without exposing secrets
  to the runner or models;
- natural-language mission drafting by the user or model followed by direct human
  confirmation of Guardian's normalized goal, resources, tools, destinations,
  lifetime, volume, filesystem and network scope, and side-effect consequences;
- proof that an unconfirmed host or model draft creates no session authority and
  that the external host executes inside the Guardian-controlled reference runtime;
- selected profile, lifetime, scope, and assurance level;
- useful agent progress without repeated authentication;
- Tavily-mediated research journey and source provenance;
- deterministic and Nemotron risk reasons;
- unexpected action denial;
- the ordered public evidence available before an attempt, structured suspicious
  content signals, the requested effect, the control decision, and whether a
  provider or adapter boundary was crossed;
- a user-verifying WebAuthn approval showing repository, PR, head commit, squash
  method, expiry, one-time use, and assurance level;
- short-lived, single-use terminal-to-browser handoffs only for ceremonies that
  cannot be completed safely and locally, followed by return to the initiating
  terminal session;
- local narrow GitHub enrollment without a secret entering the model, mission,
  command arguments, browser URL, or authority database;
- an explicit contrast between an injected denied attempt that consumes no
  approval or privileged operation and the independently authorized merge;
- execution result, revocation, and sanitized audit; and
- clear limitation language for Observed or Unknown environments.

Exit criteria:

- A new viewer can explain what the agent was allowed to do, what it encountered, what it attempted, why Guardian reacted, and what ultimately executed.
- A new user can begin and resume the complete reference flow from the supported
  terminal scaffold; the browser appears only for a clearly identified trusted
  ceremony.
- The UI and setup materials distinguish the Enforced launcher path from an
  Observed or Unknown tool-only integration in an unrestricted harness.
- The complete happy path and rejection story can be demonstrated in less than three minutes.

### C9 - Attack and claims gate

Exit criteria:

- Every required adversarial fixture in `docs/threat-model.md` has a reproducible expected result.
- Property tests cover canonicalization, mutation, replay, expiry, caller and connection binding, scope, assurance, outbound research, and redaction where appropriate.
- Tool-catalog, credential-path, direct-network, Git push, alternate-tool, and false-assurance tests pass in the documented reference runtime.
- Secret-like values injected through mission input, research queries, provider results, adapter results, failures, and diagnostics do not reach unauthorized outputs.
- A polluted-page fixture produces a reconstructable evidence-to-attempt-to-denial
  chain without persisting the hostile page, rejected secret-like values, or model
  chain-of-thought, and the UI does not claim temporal association proves causation.
- A protected self-hosted Linux run retrieves the controlled hostile page through the
  narrow provider path, denies its unsafe proposal before approval or adapter
  consumption, then completes a separately passkey-authorized exact squash merge
  using a locally resolved narrow GitHub credential.
- WebAuthn origin, challenge binding, user verification, mutation, expiry, and
  replay tests pass, as do authority-service peer, stale-capability, and direct
  database-boundary tests.
- Model-drafted mission activation, handoff mutation, wrong-user, wrong-caller,
  wrong-session, wrong-return-channel, expiry, replay, agent-click substitution,
  and false-Enforced tests pass.
- `docs/security-claims.md` names exact commands and evidence for every upgraded claim.
- Residual risks and prototype limitations are visible in the product and setup materials.

Feature freeze begins when C9 passes.

### C10 - Release candidate

Exit criteria:

- A clean documented environment can install and run the supported reference build.
- The public repository contains every required source file and no private material.
- The self-hosted test build, and any separately provisioned rate-limited judge
  demo, are stable and accessible under documented conditions.
- The selected revision passes deterministic, adversarial, runtime, provider, build, dependency, license, and sensitive-data review.
- The video script fits below three minutes and visibly demonstrates working modules.
- Submission claims, screenshots, setup instructions, self-hosted behavior,
  provider usage, judge access, and evidence match the candidate revision.

### C11 - Submission lock

Exit criteria:

- Final repository revision, tag, judge-accessible build, video, and Devpost description agree.
- NVIDIA, Nebius, Nemotron, Tavily, setup, feedback, provenance, and license details are present.
- The demo remains available through the required judging period.
- Credential, personal-data, trademark, asset-rights, and claim-integrity reviews pass.
- Submission is complete by the internal target; the final two days remain recovery buffer only.

## Scope controls

### Required

- One trusted mission-creation path.
- One terminal-first Guardian launcher and CLI that launch or wrap an external
  host agent inside the reference constrained runtime.
- One normalized mission confirmation and short-lived trusted web-ceremony
  handoff path.
- One reference constrained interaction-agent runtime.
- One network-disabled local command executor.
- One Guardian MCP capability surface.
- Tavily Search plus the narrow controlled-fixture Extract path with a research journey.
- One narrow locally enrolled GitHub connection, one typed read, and one typed
  squash merge.
- Central authority-service persistence, deterministic mission policy, exact
  WebAuthn approval, final revalidation, replay protection, and sanitized audit.
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
- Production multi-user credential vault, identity provider, or recovery features.
- Arbitrary provider-key ingestion, universal OAuth brokerage, or secrets entered
  through model, mission, MCP, browser URL, or command context. Narrow trusted
  local enrollment for the selected providers is required, not deferred.
- Purchases, payments, or financial transfers.
- Mobile-specific approval, universal biometric claims, and required hardware-backed authenticators.
- Advanced audit search, export, analytics, or long-term memory.

## Schedule controls

Review roadmap health weekly and whenever a checkpoint target is missed.

| State | Condition                                                                                                                  | Required response                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Green | Current checkpoint is on target and required evidence is being produced                                                    | Continue; do not pull optional scope forward.                                                   |
| Amber | Target is at risk, effort exceeds its upper estimate by 25%, or a critical decision is open for more than two working days | Remove optional work, split the checkpoint, and document recovery.                              |
| Red   | A target is missed, required integration is blocked, or a security invariant cannot be evidenced                           | Stop downstream feature work, choose a bounded fallback, and revise scope and dates explicitly. |

Mandatory reviews:

- **After C1:** decide Enforced reference runtime or documented lower-assurance fallback.
- **September 21:** if C4 has not passed, stop provider and UI breadth until the runtime boundary works.
- **October 2:** if exact read/merge does not work, stop all optional research and UI additions until C6 passes.
- **At C6 close:** the self-hosted Linux authority IPC, database-permission, local
  credential-store, narrow GitHub, and approval-ceremony feasibility review must pass or produce an
  explicit lower-assurance recovery plan before C8 UI freeze.
- **October 12:** if the complete experience is not demonstrable, freeze architecture and reduce the UI to the shortest coherent path.
- **October 17:** feature freeze after C9. Accept only evidence, reliability, setup, demo, submission, and critical defect work.
- **October 23:** release-candidate freeze. Use remaining time for rehearsal, recovery, and consistency.

## Time and evidence ledger

| Date       | Checkpoint  | Activity                                                                                                           |  Planned |                                                                         Actual | Evidence or output                                                                                                                                                                                   | Variance or blocker                                                                                                         |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | -------: | -----------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-29 | C1          | Namespace and mediation feasibility spike                                                                          | 2-4 days |                                                                   Not captured | `docs/development/evidence/c1-enforcement-feasibility.md`                                                                                                                                            | Passed ahead of September 4 target; time capture begins at C2                                                               |
| 2026-08-29 | C2          | ADR-0003, dependency review, workspace, tests, build, and CI scaffold                                              | 2-3 days |                                                        1.1h through 16:05 AKDT | `docs/adr/0003-implementation-stack-and-package-boundaries.md`; local `pnpm check`; [GitHub Actions run 33282416010](https://github.com/Loothore907/guardian-agent/actions/runs/33282416010)         | Passed well ahead of the September 8 target                                                                                 |
| 2026-08-29 | C3          | Mission, profile, assurance, action, provenance, canonical request, digest, approval, audit, and policy contracts  | 4-6 days |                                                        1.2h through 23:49 AKDT | Revision `65405ff`; PR #5; local and remote `pnpm check` with 9 test files / 33 tests                                                                                                                | Passed after commit-by-commit security review, review fixes, and green CI                                                   |
| 2026-08-30 | C4          | Trusted reference launcher, lifecycle, evidence, WSL isolation, exact MCP catalog, and typed local commands        | 4-6 days | Approximately 0.7h through 00:50 AKDT; exact start was not separately recorded | Revision `8d1eee1`; PR #8; local and remote `pnpm check` with 13 test files / 46 tests; `pnpm test:reference-runtime`                                                                                | Passed after clean-build dependency repair and green CI; empty per-command workspace is carried as an explicit limitation   |
| 2026-09-01 | C6 / W2     | Exact-confirmed credential-safe session workspace, persistent command mount, and ownership-safe cleanup            |      N/A |                                                        Not separately captured | ADR-0017; `docs/development/evidence/w2-session-workspace.md`; 53 Vitest files / 259 tests; protected Windows/WSL runtime pass                                                                       | W3 typed execution and result feedback remain                                                                               |
| 2026-09-02 | C6 / W3     | Exact one-request worker execution, atomic capability budgets, sanitized result feedback, and mandatory final turn |      N/A |                                                        Not separately captured | ADR-0018; `docs/development/evidence/w3-worker-tool-round-trip.md`; 54 Vitest files / 270 tests; protected supervised Windows/WSL round-trip pass                                                    | W4 contained denial and deterministic repeat handling followed                                                              |
| 2026-09-02 | C6 / W4     | Exact sanitized denial, deterministic windowed severity, revocation, and trusted-boundary interruption             |      N/A |                                                                      `2de8d21` | ADR-0019; `docs/development/evidence/w4-denial-containment.md`; 54 Vitest files / 284 tests; protected Windows/WSL success path                                                                      | General multi-turn state, worker research/GitHub dispatch, and live journey attachment remain                               |
| 2026-09-02 | C6 / W5     | Fixed research-to-scope-denial-to-separately-approved-merge competition orchestration                              |      N/A |                                                        Not separately captured | ADR-0020; `docs/development/evidence/w5-controlled-competition-journey.md`; 55 Vitest files / 294 tests; 154-module dependency gate                                                                  | Supervised service/CLI attachment, WebAuthn, protected journey evidence, review, and remote CI remain                       |
| 2026-09-02 | C6 / W6     | One-use distinct-child supervision for the fixed competition journey                                               |      N/A |                                                        Not separately captured | ADR-0021; `docs/development/evidence/w6-supervised-journey-attachment.md`; focused 9-test suite; W6-W8 full gate 55 files / 316 tests                                                                | Service-specific research/broker startup, CLI, protected journey, review, and remote CI remain                              |
| 2026-09-02 | C6 / W7     | Strict session-bound local broker protocol with exact successful-result revalidation                               |      N/A |                                                        Not separately captured | ADR-0022; `docs/development/evidence/w7-broker-ipc.md`; focused 9-test real local IPC suite; W6-W8 full gate 163 modules / 315 dependencies                                                          | Broker/research process startup, CLI, protected journey, review, and CI remain                                              |
| 2026-09-02 | C6 / W8     | Separate session-bound one-use Guardian action-risk IPC                                                            |      N/A |                                                        Not separately captured | ADR-0023; `docs/development/evidence/w8-guardian-action-risk-ipc.md`; focused 9-test real local IPC suite; W6-W8 full gate 55 files / 316 tests                                                      | Supervised Guardian/broker/research startup, CLI, protected journey, review, and CI remain                                  |
| 2026-09-02 | C6 / W9     | Strict credential-holding broker-service stdin bootstrap                                                           |      N/A |                                                        Not separately captured | ADR-0024; `docs/development/evidence/w9-broker-service-process.md`; actual-child suite; full gate 56 files / 319 tests and 166 modules / 326 dependencies                                            | Guardian/research supervision, CLI, protected journey, review, and CI remain                                                |
| 2026-09-02 | C6 / W10    | Credential-store-backed strict Tavily research child                                                               |      N/A |                                                        Not separately captured | ADR-0025; `docs/development/evidence/w10-research-service-process.md`; actual-child/callback tests; W6-W11 full gate 58 files / 326 tests                                                            | Protected rerun, activated-session builder, CLI, review, and CI remain                                                      |
| 2026-09-02 | C6 / W11    | Fixed supervised Guardian, broker, and research competition composition                                            |      N/A |                                                        Not separately captured | ADR-0026; `docs/development/evidence/w11-supervised-competition-services.md`; actual three-child suite; 171 modules / 345 dependency edges clean                                                     | Trusted activated-session builder, CLI, protected journey, review, and CI remain                                            |
| 2026-09-02 | C6 / W12    | Derived fixed competition services from activated session and durable connection authority                         |      N/A |                                                        Not separately captured | ADR-0027; `docs/development/evidence/w12-activated-competition-configuration.md`; two focused files / 8 tests; 173 modules / 347 dependency edges clean                                              | Fixed CLI journey, protected provider journey, review, and CI remain                                                        |
| 2026-09-02 | C6 / W13    | Bound exact competition merge confirmation to the CLI and complete trusted supervisor operation                    |      N/A |                                                        Not separately captured | ADR-0028; `docs/development/evidence/w13-exact-competition-cli-confirmation.md`; four focused files / 17 tests; 174 modules / 348 dependency edges clean                                             | Competition-session startup, executable dispatch, protected journey, review, and CI remain                                  |
| 2026-09-02 | C6 / gate   | Adopt the executable end-to-end journey as an architectural validation and learning gate                           |      N/A |                                                        Not separately captured | ADR-0029; updated roadmap, future-direction promotion rule, handoff, and current-session execution plan                                                                                              | Deterministic executable dispatch and staged live-boundary evidence begin next                                              |
| 2026-09-02 | C6 / W14    | Wire exact executable competition startup and separate the mission ceiling from the native-worker catalog          |      N/A |                                                        Not separately captured | ADR-0030; `docs/development/evidence/w14-executable-competition-startup.md`; six focused files / 42 tests; 61 ordinary files / 343 tests; 176 modules / 353 dependency edges clean                   | Staged live Qwen, worker, Tavily, Guardian, and GitHub evidence, then architecture triage, review, and CI remain            |
| 2026-09-02 | C6 / W15    | Validate the first live Qwen mission-dialogue boundary from the user-scoped credential context                     |      N/A |                                                        Not separately captured | `docs/development/evidence/w15-live-qwen-boundary.md`; strict `mission_brief`; 158-character minimized output; 1,823 ms provider latency; no raw output or credential emitted                        | Repeat/draft-review reliability and native-worker live validation are next; later provider and effect gates remain          |
| 2026-09-02 | C6 / W16    | Isolate live native-worker model drift and correct provider structured-output compatibility                        |      N/A |                                                        Not separately captured | ADR-0031; ADR-0032; `docs/development/evidence/w16-live-worker-policy-correction.md`; final response passed; 68 characters; 2,159 ms provider latency                                                | Exact typed request and denial-continuation gates, then Tavily                                                              |
| 2026-09-02 | C6 / W17    | Validate exact live native-worker selection of the one permitted typed request                                     |      N/A |                                                        Not separately captured | `docs/development/evidence/w17-live-worker-typed-request.md`; `guardian.session_status` selected; 2,138 ms provider latency; no generated arguments or provider content emitted                      | Denial continuation, then later provider and effect gates                                                                   |
| 2026-09-02 | C6 / W18    | Validate live native-worker continuation after one exact sanitized ordinary denial                                 |      N/A |                                                        Not separately captured | `docs/development/evidence/w18-live-worker-denial-continuation.md`; request in 2,106 ms; final response in 1,573 ms; 3,694 ms provider total; no generated content emitted                           | Test-generated contract-valid denial; assembled live authority/dispatcher containment remains; Tavily is the next live gate |
| 2026-09-03 | C6 / W19    | Add and live-validate exact controlled-content Extract through the protected research boundary                     |      N/A |                                                        Not separately captured | ADR-0035; `docs/development/evidence/w19-controlled-content-extract.md`; focused 8 files / 76 tests; protected Search accepted 2 untrusted results and commit-pinned Extract accepted 1 in 19,702 ms | Assembled deterministic denial and minimized audit inspection, then live Nemotron-through-broker remain                     |
| 2026-09-03 | C6 / W20    | Atomically register minimized research exposures before a provenance-linked authority attempt                      |      N/A |                                                        Not separately captured | ADR-0036; `docs/development/evidence/w20-atomic-research-exposure-registration.md`; focused 17 files / 101 tests; protected `scope_mismatch` denial and minimized audit passed in 20,158.9634 ms     | Live Nemotron-through-broker                                                                                                |
| 2026-09-03 | C6 / W21    | Validate live Nemotron through the broker and correct the nested risk timeout hierarchy                            |      N/A |                                                        Not separately captured | ADR-0037; `docs/development/evidence/w21-live-nemotron-through-broker.md`; focused 5 files / 33 tests; protected `approval_mismatch` no-effect audit passed in 21,819.3798 ms                        | Remaining assembled journey, then exact disposable GitHub effect                                                            |
| 2026-09-03 | C6 / W22    | Assemble live Tavily, deterministic policy, Nemotron, broker, and durable audit in one no-effect session           |      N/A |                                                        Not separately captured | `docs/development/evidence/w22-assembled-live-no-effect.md`; protected `scope_mismatch` then live-model `approval_mismatch`; no-effect audit passed in 27,216.1275 ms                                | Refresh the exact disposable target, then request separate authorization for one bounded GitHub effect                      |
| 2026-09-03 | C6 / W23    | Refresh and execute one separately authorized exact-head effect on the disposable GitHub target                    |      N/A |                                                        Not separately captured | `docs/development/evidence/w23-protected-disposable-github-effect.md`; protected read/effect and local gate passed; checkpoint `48b082d`; PR #14                                                     | Corrected remote CI rerun and review                                                                                        |
| 2026-09-02 | C8 / design | Separate the hosted judge experience into bounded public locked and authenticated piloted modes                    |      N/A |                                                        Not separately captured | ADR-0034; updated competition plan and handoff; both modes retain one enforcement core and deny anonymous mutation                                                                                   | Implement only after the current live denial-continuation handoff; worker research/GitHub dispatch remains gated            |
| YYYY-MM-DD | C#          | Concise work unit                                                                                                  |       0h |                                                                             0h | Issue, PR, test, ADR, or artifact                                                                                                                                                                    | None                                                                                                                        |

At checkpoint close, record:

- target and actual completion date;
- planned and actual focused effort;
- evidence links and exact verification commands;
- defects or risks carried forward;
- claims changed or explicitly unchanged;
- scope or assurance decisions made; and
- revised forecast based on measured pace.

## Current status

| Checkpoint                               | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gate 0 - Governance foundation           | Passed      | Repository, initial scope, trust boundaries, threat model, claims discipline, competition plan, and governance are established.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| C0 - Product contract                    | Passed      | The enforced-session pivot and consistency review are complete. The unavailable private concept document remains a recorded reconciliation task, not an implementation authority.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| C1 - Enforcement feasibility             | Passed      | Live Nebius proposal, live Tavily research, namespace, filesystem, credential, direct-egress, direct-Git, fake-provider, fail-closed, and tool-denial evidence pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| C2 - Stack and session architecture      | Passed      | ADR-0003 accepted; local dependency, workspace, MCP, format, lint, type, test, boundary, audit, license, and build checks pass; the first remote GitHub Actions run passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| C3 - Mission and deterministic contracts | Passed      | Strict contracts, scope enforcement, assurance evidence, canonical digests, exact bindings, policy precedence, unit/property tests, security review, and remote CI pass at `65405ff`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| C4 - Reference session runtime           | Passed      | The trusted launcher, exact catalog, lifecycle, profile-bound evidence, disposable command executor, host isolation probes, and remote CI pass at `8d1eee1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| C5 - Tavily research gateway             | Passed      | PR #12 passed local checks, protected live Tavily evidence, security review, and remote CI, then squash-merged as `6cd1645`; issue #11 is closed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| C6 - Authorization and GitHub broker     | In progress | Issue #13 and branch `codex/13-c6-durable-authorization-broker` are active. Local checkpoints through `e8e054f` capture W5 through W19's deterministic boundary. ADR-0029 makes the assembled live journey an architectural validation gate: validate Qwen, the worker, Tavily, Guardian, the no-effect assembly, and only then a disposable GitHub effect; correct contradicted design before considering feature expansion. W15-W18 record successful strict live Qwen mission dialogue plus Kimi final-response, exact typed-request, and sanitized denial-continuation behavior. W19 records protected real Tavily Search and fixed Extract through the Windows credential-store child and session-bound IPC against an immutable reviewed fixture. W20 records atomic minimized exposure registration, exact protected `scope_mismatch`, and durable no-effect audit evidence. W21 records live Nemotron-through-broker evaluation, corrects the contradicted nested timeout hierarchy in ADR-0037, and passes with `approval_mismatch` before approval, tool, adapter, credential, or GitHub effect. W22 assembles live Tavily Search/Extract, the deterministic pre-provider denial, live Nemotron evaluation, the post-model approval denial, and one durable minimized audit in a single enforced no-effect session. W23 refreshes the exact disposable target and, after separate operator authorization, passes the protected exact-head read and one-use squash merge of only PR #2. The complete ordinary gate, protected failure review, bounded secret/artifact audit, and final changed-surface review pass. W20-W23 are checkpointed as `48b082d`, pushed, and open in PR #14. Initial CI found stale lockfile importers before tests; the generated correction passes frozen install and exact `pnpm check` locally. Worker-visible research/GitHub dispatch remains a separate slice, so no model-generated unsafe proposal is claimed. ADR-0033 requires explicit model alternatives without silent fallback, while ADR-0034 keeps future public locked and piloted judge experiences at design level. Corrected remote CI/review, successful GitHub automatic refresh, WebAuthn, platform parity/containment, and eventual branch merge remain. The checkpoint is still materially ahead of its October 2 target. |
| C7-C11                                   | Not started | Later checkpoints remain dependency ordered.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
