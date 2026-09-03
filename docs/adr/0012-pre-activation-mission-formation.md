# ADR-0012: Pre-Activation Mission Formation and Boundary Failure Semantics

- Status: Accepted
- Date: 2026-09-01
- Decision owner: Earl Ray
- Checkpoints: C6-C9
- Refines: ADR-0011's bounded Qwen role and terminal-first reference flow

## Context

ADR-0011 restores Codex, Claude Code, Cursor, or another external host agent as
the worker and limits Guardian's cloud models to narrow internal roles. It leaves
the ordering of mission clarification, deterministic compilation, contextual
setup review, human confirmation, and fresh-host launch underspecified.

The intended product begins when a user invokes Guardian from a host prompt or
Guardian-owned CLI with a natural-language task. The host has the initial task
context and can draft a coherent proposed policy, but the host may be mistaken,
manipulated, or malicious. Qwen is useful for identifying semantic gaps and
formulating targeted questions, but model output cannot be the validator or root
of mission authority. The system also needs to distinguish containment of one
rejected action from interruption of the complete trusted runtime.

## Decision

### Invocation creates only an untrusted draft

A prompt-level Guardian call is an invocation signal. It may cause the host to
submit a natural-language objective and proposed policy through a typed Guardian
draft interface. It does not create a session, confirm human intent, grant a
capability, or make an already-running unrestricted host Enforced.

The host may use the published Guardian template and rules to prepare a coherent
draft. Guardian nevertheless treats the user text, host interpretation, proposed
constraints, and rationale as untrusted input.

### Deterministic intake precedes model review

Guardian code first validates the outer draft schema, rejects secret-like,
private, oversized, malformed, unsupported, or encoded fields, and identifies
mechanically missing requirements. It then creates a bounded credential-free
draft projection. A model never receives raw credentials, authority capabilities,
or an unrestricted host transcript.

### Qwen reviews completeness but does not validate authority

In the normal cloud `qwen_assisted` route, Qwen reviews the bounded draft for
semantic completeness and coherence. Its strict result is limited to:

- `ready`; or
- `needs_clarification` with bounded missing-field or conflict codes and targeted
  human-readable questions.

Qwen may not return a compiled mission, permission grant, tool proposal,
confirmation, activation result, authority capability, or executable instruction.
`ready` means only that Qwen found no remaining semantic question within its
bounded review; it is not proof that the policy is safe, supported, or authorized.

Clarification questions may be relayed through the host because no authority has
been created. Human answers return as untrusted draft input and pass through the
same deterministic checks. The number of review and clarification turns is
bounded by versioned policy. A deliberately selected structured integration may
bypass Qwen, and Qwen unavailability may use a deterministic missing-field or
consequence summary. Route selection and fallback are explicit and auditable.

### Deterministic code compiles the candidate mission

Only Guardian code normalizes and clamps the completed draft to supported tools,
destinations, filesystem and network scope, time, volume, side effects, assurance
requirements, and policy versions. Unknown, ambiguous, conflicting, or
unsupported values are clarified or rejected, never guessed. Neither the host nor
Qwen can widen the supported catalog or carry authority from a prior draft.

The compiler emits the candidate mission, session profile, normalized consequence
summary, and canonical preview digest. Qwen may explain that candidate but cannot
change it.

### Nemotron performs separate setup risk review

After deterministic compilation and before human confirmation, deterministic
policy may require Nemotron Super to assess a separate minimized credential-free
mission-risk envelope. The envelope contains only the normalized candidate facts,
deterministic floor, bounded signals, and bounded excerpts required for the
decision. It does not contain Qwen's free-form dialogue or the complete host
transcript.

Nemotron may preserve or increase scrutiny and may never widen permissions,
reduce a deterministic floor, compile the mission, converse with the human, or
activate the session. Structurally invalid Super output follows the recorded Ultra
quality-escalation rule from ADR-0011. Required judgment that remains invalid or
unavailable steps up or denies.

### Direct confirmation activates the exact candidate

Guardian presents the exact normalized plan and security-relevant consequences
through a trusted surface. Direct human confirmation is bound to the candidate
digest, caller, user, policy version, expiry, and other applicable context. Any
clarification, mutation, or model result after preview generation invalidates that
preview and requires a new digest and confirmation.

For Enforced mode, Guardian then launches or wraps a fresh external host-agent
process inside the evidenced constrained runtime. The intake host cannot promote
its existing unrestricted process into Enforced by invoking an MCP tool. A
tool-only integration remains Observed or Unknown unless it supplies equivalent
reproducible runtime evidence.

### Action denial is distinct from runtime interruption

At runtime, deterministic policy validates every typed boundary request. A policy,
scope, budget, destination, or approval rejection contains that exact attempt,
records a sanitized decision, and normally returns a typed result so the host can
continue otherwise permitted work. Qwen may explain a sanitized transition but
cannot change the decision or suppress the deterministic reason.

Versioned deterministic policy may revoke or interrupt a session immediately for
a defined high-severity event or after a bounded pattern of repeated violations
within a configured window. Severity classes, counts, windows, and thresholds are
not chosen by Qwen, Nemotron, public content, or host rationale.

Unexpected trusted-service or runtime failure interrupts the session and requires
explicit human creation of a fresh session under ADR-0005. It is not an ordinary
action denial and is never transparently resumed.

### Reference state flow

```text
untrusted draft
  -> deterministic intake
  -> Qwen ready | needs_clarification
  -> deterministic mission compilation
  -> optional policy-selected Nemotron mission-risk review
  -> exact human confirmation
  -> fresh constrained host launch
  -> active host work
       -> deterministic action preflight
       -> optional policy-selected Nemotron action-risk review
       -> allow | deny | approve | revoke
       -> sanitized Qwen explanation when useful
```

## Consequences

- The current one-turn post-confirmation `mission_brief` remains valid evidence
  for its narrow implemented contract but is not the target mission-formation UX.
- C6 needs a separate pre-activation draft-review contract and coordinator state
  machine before the host-wrapper experience is frozen.
- The normal cloud route includes bounded Qwen review; structured integrations and
  deterministic outage fallback remain explicit alternatives rather than silent
  model omission.
- Qwen cost is bounded setup dialogue and occasional transition explanation, not
  a second task loop. Nemotron cost is event-driven by deterministic setup and
  runtime routing.
- Continued work after an ordinary denial becomes the target behavior. Repeated-
  violation revocation requires deterministic policy and tests before it can be
  claimed.

## Rejected alternatives

- **Codex policy becomes authority:** the host is inside the untrusted zone and may
  be manipulated by the task or retrieved content.
- **Qwen validates or compiles authority:** model output would become an authority
  source and could silently widen the session.
- **Qwen passes authority directly to Nemotron:** the two-model chain would still
  lack a deterministic compiler and human binding.
- **A prompt or MCP call marks the current host Enforced:** tool installation does
  not establish filesystem, credential, shell, browser, or network containment.
- **Every denial kills the session:** this prevents useful bounded autonomy and
  conflates a contained request with failure of the trusted runtime.
- **A model-selected strike threshold:** untrusted contextual judgment cannot own
  revocation semantics.

## Evidence required

Tests must prove that draft submission creates no session or authority; Qwen
output cannot compile, confirm, activate, grant, or propose a tool; clarification
answers are revalidated; turn and question bounds fail closed; explicit structured
and deterministic-fallback routes preserve identical authority semantics;
candidate mutation invalidates confirmation; setup and runtime Nemotron output
cannot lower deterministic floors; Enforced requires fresh-host launch evidence;
ordinary denial permits only otherwise authorized continuation; deterministic
severity and repeated-violation policies cannot be weakened by either model; and
trusted-runtime failure interrupts rather than transparently resumes the session.
