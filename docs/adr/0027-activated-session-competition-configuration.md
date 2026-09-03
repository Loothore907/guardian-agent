# ADR-0027: Activated-session competition configuration

- Status: Accepted
- Date: 2026-09-02

## Context

W11 accepts a complete strict service bundle, but constructing that bundle at a
CLI or worker call site would let lower-authority input choose service lifetimes,
authority bindings, a credential-store handle, or the Guardian action-risk
envelope. Those fields must come from the session and authority state Guardian
already activated.

## Decision

Guardian adds a trusted asynchronous builder at the reference-supervisor
boundary. It accepts the launched session, the exact already-normalized
legitimate merge request, Guardian-owned broker and research authority bindings,
an authority-record client, and the public deployment client ID. It does not
accept a credential handle, service lifetime, risk floor, risk signals, Guardian
envelope, or process endpoint from CLI or mission input.

The builder requires current Enforced evidence from an active durable runtime and
an exact research-service binding to the same session, caller, mission, profile,
policy, and lifetime. It independently reads the durable session and attached
connections, requires the exact connection to remain active and merge-scoped to
the request repository, and derives the credential handle from that record. It
then creates fresh broker and Guardian IPC credentials and binds the Guardian
envelope to the canonical legitimate-request digest with the deterministic
`confirm` floor.

The reference supervisor captures the successfully launched session once. Its
public composition method builds the bundle with supervisor-owned bindings and
returns only W11's one-use fixed journey attachment. It fails before child startup
when no session has been activated and does not expose the bundle, credential
handle, or child-process controls. Concurrent or repeated attachment startup is
rejected, and supervisor shutdown closes an attachment that was started.

## Consequences

- CLI and mission text cannot select the GitHub credential handle or weaken the
  action-risk floor.
- Session, request, research, authority, connection, and lifetime substitution
  fail before W11 starts credential-holding children.
- A second launch cannot replace the captured activated session.
- At most one fixed journey attachment can be started by a supervisor instance.
- This slice provides the trusted attachment seam, not a user-facing CLI command,
  protected provider execution, or WebAuthn approval.
