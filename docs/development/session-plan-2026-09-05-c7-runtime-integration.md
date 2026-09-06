# C7 runtime integration session plan

Date: 2026-09-05. Status: local implementation and verification complete; final results
recorded in [C7 evidence](evidence/2026-09-05-c7-runtime.md).
The user approved all in-scope actions after reviewing this plan. The observations
below describe the planning baseline, not the resulting implementation. External
operations remain subject to the separate exact gate at the end of this plan.

## Outcome and validation

Connect portal confirmation to the existing supervised worker runtime. Confirmed
five-minute missions must consume typed research/GitHub results, continue within
immutable authority and budgets, and return sanitized answers and honest evidence.

Sources: [handoff](handoff.md), [integration boundary](c7-judge-portal-integration.md),
[action plan](judge-portal-action-plan.md), [scenarios](../competition/judge-scenarios.md),
[prior evidence](evidence/2026-09-05-judge-portal.md), [C6 residuals](c6-residual-review.md).

- Branch/HEAD match the handoff: `codex/13-c6-linux-provider-containment`, `e5b1217`.
  Substantial tracked/untracked prerequisite work remains and must be preserved.
- Worker proposal schemas name research/GitHub tools, but execution/result schemas
  in `packages/contracts/src/worker.ts` admit only status and local commands.
- Bootstrap performs one tool round trip and removes tools from turn two.
- Portal preparation remains an injected runtime seam; the headless host composes
  a deterministic journey, not the required portal/model adapter.
- GitHub metadata cannot support the specified changed-file review.
- Prior evidence reports Windows 604 passed/18 skipped and Linux 616 passed/6
  skipped. Tests were not rerun during planning. Remote heads, credentials, live
  providers and hosted readiness were not checked.

The five proposed steps are valid. Add explicit durable budget/fixture composition,
legacy compatibility and bounded GitHub review content. Separate local integration,
protected-provider evidence and hosted acceptance.

## Ordered implementation and acceptance

### 1. Capture baseline and gate ownership

Record starting tracked/untracked source state and inspect overlapping hunks. Map
C6 residuals to the proposed C7 pathways before dispatch changes. Retain existing
review groupings and prepare a distinct C7 slice; read adjacent tests first.

Acceptance: reproducible source baseline and gate matrix identifying local controls,
missing integration, intended-host containment gaps and external prerequisites.
Do not stage, reset or clean up accumulated work.

### 2. Add typed external execution/results

Extend contracts, worker digest validation and research/GitHub outputs. Bind results
to request/execution, turn, session, caller, mission/profile/policy and applicable
grant/connection scope. Sanitize and bound content before model, response, error,
trace or audit exposure.

Implement an exact-target GitHub review read with bounded PR body and changed-file
information, including bounded patch content where needed to explain the fixture
change. Specify byte/item limits, truncation/pagination and head/base consistency.
Incomplete content cannot establish a complete review. Record consequential contract
and continuation decisions in an ADR. Add no generic authenticated HTTP or arbitrary
headers, commands or transport destinations.

Acceptance: allowed fixtures plus malformed, oversized, secret-like, wrong-target,
changed-head/base, cross-session, mutated-digest and replay cases. Preserve existing
one-round-trip profiles.

### 3. Dispatch through existing services

Extend `apps/reference-supervisor/src/worker-execution.ts` through research/broker
IPC. Re-normalize final operations and validate exact authorization at execution.
Consume durable call/research/action budgets without duplicate charging; retain
deterministic risk floors, expiry, nonce and revocation checks.

Acceptance: synthetic transports prove allowed research/read/exact merge and denial
before provider invocation for invalid outbound requests or unauthorized effects.
No ambient Git/CLI credential route. Uncertain mutations cannot trigger automatic
retries or release reserved fixtures.

### 4. Extend existing bootstrap continuation

Bind maximum turns, tool calls, provider usage and an absolute five-minute deadline
in a trusted continuation profile. Never restart the deadline per turn. Recheck
time/authority before each turn and operation; interrupt in-flight work on expiry
or cancellation. Feed sanitized results as untrusted content with bounded history.
Continue only after eligible contained denials.

Stop on final response, revocation, malformed/uncertain output, unavailable
enforcement or exhausted budgets. Return an actual sanitized answer separately
from action evidence; interruption cannot masquerade as successful completion.

Acceptance: multi-tool completion, denial then useful work, legacy compatibility,
in-flight deadline, budget exhaustion/manipulation, cancellation, service/worker
failure and restart/replay rejection.

### 5. Compose portal authorization and durable resources

Implement trusted `prepareRuntime` with supervisor preview verification and trusted
connection resolution. Activate the exact durable grant before worker startup.
Wire real budget admission/reporting/settlement, typed evidence and persistent
exclusive fixture reservations into host composition. Keep seeded standing consent
separate from custom piloted confirmation. Shared access/source fingerprints do
not establish per-person identity or WebAuthn.

Acceptance: actual local service-child tests prove no worker before grant,
caller/preview/scope binding, concurrent replay rejection, altered/expired
confirmation denial, single settlement and cleanup on startup/runtime failure.
Restart cannot resume unconfirmed previews or reuse uncertain fixtures. Default
live catalog remains unavailable while required dependencies or gates are missing.

### 6. Evaluate scenarios and close security gates

Exercise all three scenarios through actual service children with synthetic
provider transports first. Record exposure only when seed content reaches a worker
turn. Separate deterministic injected requests from real provider-model observations.
Distinguish exposure, refusal, attempted action, boundary denial, escalation and
useful completion. A model need not take the bait to pass.

Run focused tests per change, then `pnpm check` on Windows and the verified Linux
stage, `pnpm test:linux-platform` on Linux, applicable reference-runtime and
session-enforcement probes, and production dependency audit. Verify stage source
identity before synchronization. Cover direct-network, credential-path,
alternate-tool and Git-push bypasses. Map process/IPC/artifact/redaction coverage
to C6 residuals; use fixture secrets rather than exporting real credentials.

Acceptance: required local gates pass, unavailable protected/hosted evidence is
explicit, and claims link reproducible evidence. Update architecture, threat model,
scenario/setup docs and handoff. Local completion is not live/hosted readiness.

## Subsequent exact external gate

Before paid inference, fixture creation/publication, GitHub effects or deployment,
prepare exact provider/project, host, App installation/connection, repository,
PR/head/base, URLs, fixture counts, request/spend caps, expiry and cleanup effects
for bounded approval. Never reuse merged PR 3. Commits/pushes/PR updates need their
own exact base, destination and reviewed hunk manifest under AGENTS.md.

Under that authority, prove real model-produced requests and sanitized answers
through provider/service children, then actual-host cold boot, unattended repeated
judging, isolation, failure, revocation and pool exhaustion. Complete applicable
C6 containment and required review/CI before enabling live sessions. Retain
Observed/Unknown unless documented evidence justifies stronger assurance.

## Deliverables and scope

1. Reviewable C7 source/tests preserving the accumulated baseline.
2. Contract/continuation ADR and service-child evaluation harness.
3. Evidence matrix with exact commands, outcomes and unresolved gates.
4. Updated claims/handoff and a concrete external plan when prerequisites are known.

No new production dependency, permanent WSL repair, longer mission profile,
WebAuthn expansion or deployment is included in this local slice.
