# ADR-0023: Session-bound Guardian action-risk IPC

- Status: Accepted
- Date: 2026-09-02

## Context

The broker invokes contextual Guardian risk review after deterministic scope checks
and before an authenticated provider operation. Running that evaluator in the
credential-holding broker process would combine the Nebius model credential and
GitHub execution credential in one failure domain. The existing one-use Guardian
service protocol covers mission setup only and does not bind an action envelope to
an activated session, caller, or canonical request digest.

## Decision

Guardian adds a separate one-turn local action-risk protocol. A trusted supervisor
preconfigures the service with one strict, credential-free risk envelope plus the
exact session, caller, canonical request digest, opaque capability, and service
lifetime. The client request repeats only those bindings and a timestamp; it cannot
submit a replacement envelope, arbitrary model prompt, model ID, provider endpoint,
header, credential, command, or URL.

The client refuses to cross IPC when the broker-supplied envelope differs from the
supervisor-bound envelope. The server uses a fixed Guardian named-pipe or temporary
Unix-socket pattern, constant-time capability comparison, bounded single-frame I/O,
server-owned time, exact pre-start and expiry checks, and one-use consumption. It
evaluates only its configured envelope. Malformed provider output and transport
failure become fixed failures without reflecting provider detail.

The shared contracts now own the strict action-risk envelope and evaluation schemas.
Untrusted excerpts are bounded, visible, normalized, and rejected when they contain
recognized secret-like material. The Guardian provider remains responsible for
applying the model recommendation through deterministic precedence, and the broker
independently recomputes that precedence before acting.

## Consequences

- The future broker child can use a narrow evaluator client without receiving the
  Nebius credential or co-hosting the Guardian provider.
- Replay cannot cause a second model call, and a caller cannot mutate the assessed
  proposal while retaining the configured request digest.
- Action-risk types no longer rely on separate hand-written parsers in the Guardian
  and broker packages.
- This slice does not start or supervise the Guardian child, start the broker child,
  prove OS peer identity, or run a protected/live model-through-broker journey.
