# ADR-0032: JSON-object provider mode and deterministic worker validation

- Status: Accepted
- Date: 2026-09-02

## Context

The first Kimi K2.7 Code request under model policy v2 failed closed with HTTP
400. A credential-safe capability probe then established that the model accepted
plain text, JSON-object mode, and a simple strict JSON schema. The failure was
therefore not model availability or a blanket lack of structured output. It was
specific to the full Guardian worker schema, which contains nested and top-level
`oneOf` branches for final responses and typed tools.

Provider JSON-schema dialects and supported subsets vary by model and inference
engine. Treating provider-side schema acceptance as a security control would also
conflict with Guardian's rule that model behavior and prompt instructions are not
runtime enforcement.

## Decision

The Nebius native-worker adapter requests `json_object` output and derives bounded
worker-outcome guidance from the turn's exact `allowedTools` catalog. Tools not in
that catalog are omitted from model-visible guidance. The provider response is
still bounded before parsing. Guardian then parses the generated JSON and strictly
validates it with `WorkerOutcomeSchema` before returning any outcome to the worker
dispatcher, which independently enforces the turn catalog.

Provider-side JSON formatting is a reliability mechanism only. Deterministic
local validation remains the enforcement boundary. Missing, malformed,
extra-field, credential-like, oversized, wrong-model, non-stop, or unsupported
outcomes fail closed as `NativeWorkerProviderError`. A typed tool request remains
pending and cannot execute or claim approval merely because a model emitted it.

This decision does not introduce fallback output parsing, arbitrary tool names,
arbitrary authenticated transport, or prompt-derived authority.

## Consequences

- The adapter no longer depends on a provider's support for Guardian's union-heavy
  JSON-schema dialect.
- The exact output schema remains visible to the model, but that visibility is
  explicitly guidance rather than evidence of enforcement.
- The model-visible tool branches are limited to the exact confirmed turn catalog;
  a global provider schema cannot silently widen them.
- Ordinary tests must prove the request uses JSON-object mode and that local
  parsing rejects malformed, extra-field, credential-like, and mismatched output.
- A protected Kimi final-response call must pass before the adapter is described
  as live-compatible. Typed request and denial-continuation behavior require
  separate protected gates.
- A future provider-native function-calling adapter remains possible, but it must
  preserve the same typed request, pending-only, exact-binding, and fail-closed
  semantics.
