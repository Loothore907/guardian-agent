# ADR-0014: One-Use Pre-Activation Model Channels

- Status: Accepted
- Date: 2026-09-01
- Decision owner: Earl Ray
- Checkpoints: C6-C9
- Implements: ADR-0012 pre-activation model boundaries

## Context

The existing interaction IPC is created only after a session is confirmed. It is
bound to session, caller, mission, profile, policy, lifetime, and one post-launch
turn. Reusing that channel before confirmation would either invent session
authority too early or weaken its exact binding.

Mission dialogue and setup risk also have different inputs and authority. The
dialogue model sees an untrusted incomplete draft and may ask questions. Nemotron
sees only normalized completed facts and a deterministic floor. Passing free-form
dialogue or provider output directly between them would make model text an
implicit authority channel.

## Decision

Pre-activation model calls use two separate short-lived supervised service
processes and typed local IPC channels:

1. Mission-review IPC binds one exact draft ID, revision, review turn, model-policy
   ID/version, and expiry. Its output is only `ready` or bounded
   `needs_clarification`.
2. Setup-risk IPC binds one exact normalized request digest, draft revision,
   effective route, model-policy ID/version, deterministic floor, and expiry. Its
   output is a strict evaluated or unavailable result.

Each capability is generated in memory, transmitted to its child through bounded
stdin bootstrap, consumed before provider evaluation, and never returned in a
public result. Each child resolves `nebius/default` itself when a live provider is
selected and closes after the one call.

Human clarification produces a complete new untrusted draft revision. It does
not patch permissions from model output. Deterministic intake and authority
ceilings run again before another review.

Nemotron does not receive the dialogue transcript or Qwen rationale. Guardian
derives a minimized setup envelope from normalized facts, computes its digest,
and applies monotonic precedence locally. A lower recommendation preserves the
`confirm` floor. Unavailable, deny, mismatched, replayed, malformed, or currently
unsupported step-up results cannot produce a confirmable preview.

The deterministic fake modes exercise the same IPC and coordinator boundaries in
ordinary tests. Live Qwen and Nemotron modes require user-owned credentials and
protected evidence; fake success is not model-quality evidence.

## Consequences

- Pre-activation calls cannot reuse or imply post-activation session authority.
- Provider compromise cannot fill permissions or send authority directly to the
  second model.
- Common child supervision is reused, while message contracts remain role-
  specific and deliberately narrow.
- The CLI can continue after bounded clarification but fails closed when the
  review count, schema, expiry, authority ceiling, or setup-risk requirement fails.
- Fresh external-host launch remains a separate decision and evidence boundary.

## Rejected alternatives

- **Reuse post-confirmation interaction IPC:** creates circular session binding or
  weakens an already evidenced contract.
- **One long-lived two-model process:** increases credential and cross-role context
  exposure and makes per-call replay harder to reason about.
- **Pass Qwen prose to Nemotron:** treats untrusted model rationale as normalized
  mission evidence.
- **Compile on provider failure without setup risk:** silently omits a selected
  defense layer and creates a confirmable candidate after required judgment failed.

## Evidence required

Tests must cover exact binding, wrong capability/revision/digest, expiry, replay,
bounded frames, provider non-invocation on rejection, credential-free envelopes,
model-policy mismatch, clarification revalidation, monotonic floors, unavailable
and step-up failure, child shutdown, and public-result capability exclusion.
Protected live evidence remains separate from ordinary CI.
