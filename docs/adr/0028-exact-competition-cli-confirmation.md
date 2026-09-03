# ADR-0028: Exact competition CLI confirmation

- Status: Accepted
- Date: 2026-09-02

## Context

W12 can create the fixed service attachment from an activated session, but a CLI
must not receive an approval object, credential handle, authority binding, or
generic attachment control. Ordinary session confirmation also cannot authorize a
later merge whose repository, pull request, and head version were not shown to the
human.

## Decision

Guardian adds a separate controlled-competition CLI ceremony. It accepts only the
fixed research request and two already-normalized merge requests. Before prompting,
it validates their schemas, requires exact shared session/caller/connection/
mission/profile/policy bindings, and requires the unsafe and legitimate requests
to target different repositories.

The terminal displays the bounded research scope, expected denied target, exact
legitimate repository and pull request, expected head commit, squash method, and
canonical request digest. Only the exact phrase `AUTHORIZE <digest-prefix>` allows
the trusted supervisor call. Non-interactive, malformed, substituted, same-target,
or incorrectly confirmed input stops before that call.

The supervisor owns the remainder of the operation. It revalidates W12, derives
the active connection-scope digest from authority state, stores a fresh one-use
development approval, runs the W6 attachment once, closes it, and returns only the
typed minimized result. It also supplies the journey timestamp from its trusted
clock; neither time, approval, nor the generated W11 bundle comes from or crosses
back to the CLI.

## Consequences

- Session activation and merge authorization are visibly separate confirmations.
- The CLI cannot construct, retain, or replay the exact approval.
- The public supervisor operation completes the fixed journey rather than exposing
  a generic broker or process attachment.
- This slice does not yet wire `guardian competition` into the executable entrypoint
  or create the required bounded research-capable mission/session and connection.
  The confirmation remains lower-assurance development confirmation, not WebAuthn.
