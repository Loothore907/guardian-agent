# ADR-0015: Nebius-native worker and judge runtime

- Status: Accepted
- Date: 2026-09-01
- Supersedes: ADR-0011 only where it requires a third-party coding scaffold as the competition worker

## Context

ADR-0011 correctly separated the working agent, Qwen mission dialogue, Nemotron
risk judgment, and deterministic authority. It assumed that Codex CLI, Claude Code,
or Cursor would supply the first worker. That adds a second paid provider, a
provider-specific launcher, judge-account friction, and another credential and
network boundary. None of those costs improve the Guardian demonstration.

The competition build must be usable by judges without their own paid account. It
must also make real Nebius or Nebius AI Cloud use and retain a real NVIDIA
open-source model role. The model assignments need to be upgradeable without
allowing a prompt or worker to choose its own model.

## Decision

The competition reference build uses a provider-neutral Guardian worker harness.
Its hosted configuration uses a coding model through Nebius Token Factory. The
initial versioned assignment is `Qwen/Qwen3-Coder-30B-A3B-Instruct`; a replacement
requires a new validated model-policy version and evidence.

The other roles remain separate:

- the native worker performs the delegated coding or research loop;
- Qwen mission dialogue reviews bounded pre-activation completeness and relays
  targeted questions;
- NVIDIA Nemotron performs minimized setup and action risk judgment;
- deterministic Guardian code alone compiles authority, enforces floors, meters
  budgets, binds confirmation, validates requests, and controls execution.

Nebius may therefore supply application compute and all model inference for the
judge deployment, with no OpenAI API key. Sharing one Nebius account does not merge
the roles: each call has a separate contract, process, context projection, model
assignment, token budget, and outcome schema. Provider credentials remain only in
credential-holding services and never enter worker or Guardian-model context.

Tavily and GitHub remain optional external typed capabilities. They are not model
hosts and do not turn the worker into an arbitrary authenticated HTTP client.

The deterministic reference worker remains available for ordinary CI, offline
demonstration, and failure tests. It must be labeled as a fixture, not as a general
coding model. Future Codex CLI, Claude Code, Cursor, local-model, or other worker
adapters may implement the same narrow worker contract; none is a permanent model
choice.

The exact worker kind, model-policy identifier, policy version, provider, role,
and model ID are part of the session preview and its human-confirmed digest. The
user prompt cannot set these values.

## Consequences

- The judge build has one hosting and inference vendor to provision and rate-limit.
- Judges do not need to supply OpenAI or another coding-provider credential.
- Nebius outage is a correlated availability risk, so invalid, unavailable, or
  malformed required calls fail closed; role separation is not described as
  provider independence.
- The native worker still receives no provider credential and may act only through
  Guardian's typed session capabilities.
- Enforced assurance depends on reproducible runtime, tool, filesystem, credential,
  and network evidence. A Nebius-hosted model assignment alone proves none of those
  controls.
- The hosted judge deployment is a funded, bounded competition surface, not the
  default custody model for general users.

## Current implementation status

The versioned policy and session contracts now represent the native worker, and
the exact assignment is bound into the confirmation digest. The credential-
isolated worker inference adapter and complete tool loop remain implementation
work; documentation must not describe them as verified until their tests and
evidence exist.
