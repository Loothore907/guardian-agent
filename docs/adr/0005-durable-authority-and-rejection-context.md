# ADR-0005: Durable Authority State and Minimized Rejection Context

- Status: Accepted
- Date: 2026-08-30
- Decision owners: Earl Ray
- Checkpoints: C6-C9

## Context

The C4 session runtime and C5 research gateway keep live lifecycle, revocation,
volume, research-budget, and provenance-sequence state in their owning processes.
That is sufficient for a non-resumable local evidence slice, but a restart could
otherwise forget a revocation, reset a budget, or make one-time authorization and
audit behavior ambiguous.

Indirect prompt injection also creates an observability requirement. Public
content may precede an unsafe agent proposal without being its provable cause. A
useful audit must show the evidence exposure, attempted effect, policy decision,
and control outcome without retaining secrets, full pages, rejected queries, or
model chain-of-thought.

## Decision

### Persistence boundary

Use SQLite as the single-host competition build's durable authority and audit
store, subject to a C6 spike proving the pinned Node runtime's `node:sqlite`
transaction, uniqueness, concurrency, crash, restart, and filesystem-permission
behavior. Keep repository interfaces narrow enough to replace SQLite with a
reviewed adapter or PostgreSQL later.

The durable store lives outside every disposable agent workspace. It may contain:

- immutable session, mission, profile, caller, connection-reference, and policy
  bindings;
- lifecycle, interruption, revocation, volume, and research-budget state;
- canonical request digests, resource versions, exact approvals, and atomic nonce
  consumption;
- minimized research provenance and structured audit events; and
- allowlisted execution outcomes and error codes.

It must not contain reusable provider credentials, IPC capabilities, local socket
or pipe endpoints, raw provider responses, full retrieved pages, raw rejected
queries, credential-bearing URLs or headers, or model chain-of-thought. Connection
records contain only non-secret metadata and protected credential-store handles.

### Restart semantics

The competition runtime does not transparently resume an active session after an
unexpected session-host, broker, or credential-service restart. It durably marks
the session interrupted and fails closed. Continuing work requires an explicit
human action that creates a new session identifier and fresh ephemeral
capabilities. An existing session identifier cannot be recreated with reset
counters.

Charge a research request durably immediately before provider invocation and
reserve result capacity before the asynchronous call. Clearly failed calls may
release result capacity but retain the request charge. An uncertain crash outcome
remains charged. A privileged-operation nonce is atomically consumed before the
adapter boundary and remains consumed when execution outcome is uncertain.

### Rejection context

Persist a minimized evidence-to-attempt-to-decision chain:

1. Evidence exposure records identify the session, ordered provenance event IDs,
   public source digests and domains, trust label, retrieval time, and bounded
   structured signal categories.
2. Attempt records identify a generated attempt ID, typed operation, effect class,
   destination class, exact authority bindings, and a canonical digest only when
   safe canonicalization succeeds.
3. Decision records identify deterministic reason codes, authorization floor,
   guardian escalation or uncertainty when available, provider or adapter boundary
   crossing, consumption outcome, and the control that stopped or authorized the
   attempt.

The relationship is described as evidence that was available before an attempt,
not as proof that the evidence caused it. Signal categories are bounded identifiers
such as instruction-like content, claimed authority, mission override, credential
or private-data request, external upload, unexpected tool use, side-effect request,
obfuscation, hidden text, and redirect behavior.

Rejected secret-like material is represented by detector categories and safe size
or shape classes, not by the value or an ordinary value digest. Synthetic fixtures
may retain a short sanitized display excerpt when explicitly marked as fixture
data; live third-party content does not do so by default.

### Runtime and release scope

The Enforced competition runtime remains launcher-bound and local. General remote
MCP authentication is deferred; caller identity is derived by trusted orchestration,
not accepted from tool arguments. Self-hosted Linux enforcement parity is a release
gate. A deployment that cannot reproduce the documented tool, filesystem,
credential, and network evidence must report Observed or Unknown rather than
Enforced.

## Consequences

- C6 must implement and test durable authority repositories before claiming atomic
  replay or honest restart behavior.
- C7 adds constrained guardian assessment to the rejection chain without allowing
  model output to reduce the deterministic floor.
- C8 presents the minimized exposure, attempt, decision, and outcome chain.
- C9 evaluates hostile-content fixtures, missed escalations, false escalations,
  redaction, and evidence-to-attempt association.
- Crash recovery favors safety over uninterrupted agent continuity in the
  competition build.
- The prototype remains single-host until a later database and distributed
  coordination decision.

## Rejected alternatives

- **Reset counters after restart:** permits budget, revocation, and replay state to
  be bypassed by process failure.
- **Transparent session resumption now:** requires restoring runtime evidence,
  sandbox state, identity, reservations, and ephemeral capabilities beyond the
  competition need.
- **In-memory approval and nonce state:** cannot prove atomic one-time use or honest
  restart behavior.
- **Persist raw hostile content for diagnosis:** turns the audit store into a
  sensitive-data and persistent-injection surface.
- **Treat temporal association as causation:** overstates what the runtime can
  observe about model behavior.
- **General remote MCP for the reference runtime:** adds transport authentication
  and identity-mapping surface without improving the required local proof.

## Evidence required

Implementation acceptance requires transaction and uniqueness tests, forced-crash
and restart tests, wrong-permission database tests, session-ID reuse rejection,
atomic nonce races, research-budget reservation races, uncertain-outcome behavior,
secret-corpus redaction, and an end-to-end polluted-content fixture whose unsafe
proposal is denied and reconstructable from minimized records.

The first feasibility gate is recorded in the
[C6 SQLite authority spike evidence](../development/evidence/c6-sqlite-authority-spike.md).
It admits narrow single-host prototype repositories but does not itself implement
production persistence or upgrade a security claim.

The initial isolated production repository is recorded in the
[C6 durable authority store evidence](../development/evidence/c6-authority-store.md).
The scoped adapter, broker, minimized rejection chain, and broker restart path are
recorded in the
[C6 GitHub broker evidence](../development/evidence/c6-github-broker.md). Protected
live GitHub evidence and launcher/research durable-budget integration remain.
