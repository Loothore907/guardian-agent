# ADR-0013: Versioned Guardian Model-Role Policy

- Status: Accepted
- Date: 2026-09-01
- Decision owner: Earl Ray
- Checkpoints: C6-C9
- Refines: ADR-0011 and ADR-0012

## Context

Guardian needs reproducible model evidence for the hackathon without turning the
models used during C6 into permanent product architecture. Provider availability,
model identifiers, structured-output compatibility, price, latency, and quality
change independently. A silent substitution would make audit records and human
confirmation ambiguous; a session-selected model identifier would let an
untrusted host alter a trusted boundary.

The competition story also requires an actual NVIDIA open-source model through
Nebius. Guardian therefore needs both upgradeability and a mechanically retained
NVIDIA Nemotron role during the hackathon.

## Decision

Guardian selects models by a trusted, versioned **model-role policy**, not by
permanent constants and not from session prompts. Each policy binds:

- one Nebius mission-dialogue role for bounded completeness review,
  clarification, and sanitized explanation;
- one NVIDIA Nemotron primary contextual-risk role;
- one distinct NVIDIA Nemotron quality-escalation role; and
- an immutable policy identifier and positive version.

The active competition policy currently assigns Qwen to mission dialogue,
Nemotron Super to primary contextual risk, and Nemotron Ultra to structurally
invalid-output escalation. These are evidence pins for that policy version, not
forever choices.

A trusted release may add or activate a newer policy after verifying the exact
provider-returned model identifier, role compatibility, strict structured output,
context minimization, failure behavior, deterministic precedence, latency, and
cost. Model inventory and price are operational evidence captured at evaluation
time; they are not security authority and are not assumed stable.

During the hackathon, every accepted competition policy must keep NVIDIA
Nemotron in both contextual-risk slots. The mission-dialogue role may change to a
validated Qwen, GLM, or other suitable model without altering the authority
architecture. After the competition, a new ADR may relax the sponsor-specific
constraint while preserving role separation and deterministic precedence.

The host, human task text, retrieved content, model rationale, environment
variables, and ordinary MCP requests cannot supply an arbitrary model ID or
weaken the competition requirements. Draft-review envelopes, compiled candidates,
confirmation digests, diagnostics, and audit evidence bind the selected policy
identifier and version. Unsupported or mismatched policy references fail closed.

There is no accepted `GLM 3.5` assignment in this repository. Before considering
the reported model, the team must obtain its exact live Nebius identifier from
the authenticated inventory and run the same compatibility and security suite.
Nebius documents a model-list endpoint and exposes model metadata and pricing,
but availability and price must be rechecked when an upgrade is proposed.

## Consequences

- Provider classes consume a validated policy supplied by trusted application
  configuration; compatibility aliases retain earlier Qwen-named C6 interfaces.
- Changing one model requires a new reviewed policy version and new evidence, not
  a source-wide rename or a user prompt parameter.
- Existing sessions remain bound to the policy version they confirmed.
- A provider outage cannot silently substitute another model. Fallback is an
  explicit, typed, auditable route with fail-closed semantics.
- Sponsor presence is mechanically testable instead of relying on documentation.

## Rejected alternatives

- **Permanent model constants:** reproducible today but needlessly blocks safe
  upgrades and provider evolution.
- **User- or host-selected model IDs:** lets untrusted input change a security-
  relevant boundary and defeats reproducible evidence.
- **Silent “best available” routing:** makes cost, behavior, and audit evidence
  non-deterministic and can remove the required Nemotron role.
- **Provider marketing names as identifiers:** names may be ambiguous; policy uses
  the exact provider-returned ID tested for that version.

## Evidence required for an upgrade

An upgrade record must include authenticated inventory capture, exact provider
identifier, model-policy schema tests, strict-output request/response capture,
credential-exclusion checks, malformed/unavailable behavior, deterministic-floor
precedence for risk roles, latency and pricing observations, focused regression
tests, and the complete repository check. Public provider references include the
[Nebius model-list API](https://docs.tokenfactory.nebius.com/api-reference/models/list-models),
[playground and pricing fields](https://docs.tokenfactory.nebius.com/ai-models-inference/playground),
and [deprecation information](https://docs.tokenfactory.nebius.com/other-capabilities/deprecation-info).
