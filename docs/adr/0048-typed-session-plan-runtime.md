# ADR-0048: Typed session-plan runtime

- Status: Accepted, local implementation
- Date: 2026-09-05
- Extends: [ADR-0039](0039-persistent-plan-bound-session-authority.md)

## Decision

The first runtime slice covers the existing typed GitHub PR read and squash-merge
capabilities. A trusted application confirms an immutable plan once. It binds the
session, caller, mission/profile/policy versions, connection, exact repository,
PR number, head SHA and observed base branch. Limits include a maximum 24-hour
plan window clamped to the active session and issuer capability, logical action
count, mutation count and zero mutation retries. These are ceilings, not defaults
or permission to extend a session.

The authorization role alone can store, inspect and revoke grants. Each explicit
replacement uses the next version and a new grant ID. SQLite schema 5 retains
prior grants. Older binaries reject schema 5, so a deployed upgrade needs a
private authority-state backup and coordinated broker/authority rollout; broker
capabilities now require `plan.check`. This session migrated only disposable test
stores. The broker always checks the latest grant; an existing invalid grant
cannot fall back to an exact approval. Legacy sessions with no plan retain the
exact-approval path. Adding a plan during an operation invalidates its earlier
no-plan inspection.

The confirmation is explicitly `development_confirmation`: trusted application
code supplies the human principal and fresh timestamp. This is not a verified
WebAuthn ceremony, a public authorization endpoint, or proof of user presence.
A worker cannot invoke the issuer or grant itself plan-control operations.

Before an adapter call, the broker re-normalizes the concrete request and checks
its digest, current grant, session, connection and limits after credential
resolution. Merge preconditions are read again after the final credential lookup.
SQLite atomically consumes an attempt immediately before the final effect.
Failed or uncertain effects do not refund authority. Request IDs cannot replay,
and a second merge of the same session/connection/PR/head is rejected even with a
new request ID or replacement grant. A merge is one logical action with internal
preflight reads; the existing session tool budget remains an additional ceiling.

The grant satisfies an explicitly covered deterministic confirmation floor. It
cannot reduce that floor, override model uncertainty/denial/step-up, or authorize
new tools, destinations or effects. A model recommendation supplies no grant.

Authority-boundary refusals and Guardian escalations are stored as immutable,
typed proposals, bounded to 32 entries and less than 48 KiB per session. Overflow
does not evict earlier entries or authorize execution; the broker's ordinary
attempt/decision history still records the refusal. The queue contains no
credential values or model rationale. Confirmation alone never drains it. A
subsequent execution must be normalized and checked against current authority
and resource state. The trusted issuer exposes inspection and revocation methods.

## Recovery and limits

Grant persistence is independent of credential availability and process lifetime.
Authority-service restart still interrupts active sessions; a persisted grant does
not resurrect them. Hosting, service identity and token renewal are separate
integration requirements. The desktop keyring remains interactive after some cold
starts, and the WSL warm-start cgroup defect is not repaired by this change.

GitHub's merge request includes an expected head SHA. Base-branch and open/draft
checks are preflight observations; this adapter cannot atomically guard a remote
base change between that read and GitHub's merge. No atomic base-branch guarantee
is claimed. Future derived commit heads, pushes, PR creation, releases, deployment,
arbitrary authenticated HTTP, generalized worker continuation and a production
confirmation UI remain outside this slice.

## Evidence

See [session-authority evidence](../development/evidence/2026-09-05-session-authority.md)
and the [security claims](../security-claims.md). Broader ADR-0039 workflow support
and hosted judging remain incomplete.
