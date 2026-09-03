# ADR-0036: Atomic research exposure registration

- Status: Accepted
- Date: 2026-09-03
- Checkpoint: C6 / W20

## Context

The first assembled protected research-to-denial run reached the production
broker but failed closed with `audit_unavailable`. The durable authority store
correctly requires every evidence identifier on an attempted effect to reference
a prior minimized exposure record from the same live session. Search and Extract
were producing bounded evidence and provenance, but the credential-holding
research service persisted only budget state. No trusted IPC operation registered
the corresponding exposure records.

Passing provenance event IDs directly to the broker without those records cannot
produce the evidence-to-attempt-to-decision chain required by ADR-0005. Allowing
the broker to accept unknown IDs, inserting records directly from the harness, or
dropping the evidence association would weaken the production boundary and make
the protected demonstration unrepresentative.

## Decision

The research service receives one additional narrow authority operation:
`context.append_exposures`.

- The operation accepts one to three strict `EvidenceExposureRecord` values in
  one frame. It accepts no raw content, excerpts, queries, URLs, rationale, model
  output, credentials, or caller-selected database fields.
- Exposure IDs are the already-generated provenance event IDs. This preserves the
  existing coordinator contract in which only those opaque identifiers cross
  into the broker attempt.
- Each record contains only the session ID, one provenance event ID, source
  content digest, source domain, untrusted-content label, bounded signal codes,
  and retrieval time. Initial automatic research records use an empty signal set;
  later deterministic or model-assisted classification must be separately
  authorized and may only add bounded signal identifiers.
- The authority store validates the complete batch and inserts it in one immediate
  transaction. An invalid, duplicate, out-of-lifetime, or conflicting record
  rolls back the whole batch.
- Search or Extract does not return evidence when exposure registration fails.
  The request remains charged, unused result capacity is settled conservatively,
  and the operation fails closed.
- Only the `research_service` authority role receives this operation. Launcher,
  authorization, broker, worker, and public interfaces do not gain exposure-write
  authority.

## Consequences

- The broker can verify that every referenced public evidence item was available
  before an attempted effect while storing no hostile page body.
- A missing or unavailable authority service stops research before evidence is
  returned instead of creating an unauditable result.
- Search batches remain all-or-nothing at the durable exposure boundary.
- Exposure registration proves temporal availability, not model causation.
- Worker-visible research, signal classification, hosted audit presentation, and
  arbitrary exposure ingestion remain outside this decision.

