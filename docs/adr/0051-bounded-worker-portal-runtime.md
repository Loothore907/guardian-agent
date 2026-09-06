# ADR-0051: Bounded worker runtime behind judge confirmation

Date: 2026-09-05. Status: accepted for local implementation; protected and hosted
acceptance are separate gates.

## Context

The portal preview existed without an installed supervisor adapter. Worker proposals
named external tools, but the executable contract and bootstrap supported one local
tool round trip. A scripted competition journey could not establish model behavior.

## Decision

Extend the existing bootstrap. Legacy profiles retain one round trip; judge profiles
bind eight turns and a five-minute absolute session deadline. The preview digest
includes the continuation limit. Standing deployment consent additionally binds the
worker constraints/catalog/limit through `workerProfileDigest`. Public-only standing
consent binds a null GitHub plan; it cannot grant a GitHub tool implicitly.

Executable research supports the existing bounded search and exact controlled-source
Extract pathways. GitHub reads may explicitly request `content: review`, included in
the canonical request digest. Review content is limited to eight files, 2,000
characters per body/patch and fixed GitHub endpoints. Oversized/inconsistent file
sets fail closed; missing patches are explicitly incomplete. Metadata is reread to
check head, base commit/branch and body consistency. This is not an atomic remote
snapshot guarantee. Newlines in review text are projected to spaces.

Tool results bind execution/request/turn/session/caller/mission/profile/policy and
the applicable session-plan grant. External results have a 24,000-byte cap. Worker
context has a 48,000-byte cap, retaining at most three earlier results plus the
immediate result. Older results are dropped to fit; no clipped content is treated
as complete. The model receives sanitized content projections, not IPC capabilities.

Authority-store schema 6 adds an external execution category to the durable replay
table. Its claim does not charge a tool call: research/broker services already own
that charge. Replayed claims revoke under the existing deterministic violation
policy. Worker admission checks durable session availability and plan revocation.
Mutation allowance is read from the durable plan rather than reset by each result.

Research remains in its session-owned service; broker requests get separate exact-bound
Guardian and broker children. Cancellation/deadline closes children; unexpected exit
interrupts the runtime. No credentials or provider transports are introduced into
worker dispatch. Eligible deterministic denials permit continuation, while uncertain
Guardian results, step-up, expired authority and service failures stop execution.

The portal adapter verifies its supervisor preview against the requested scope,
activates durable authority before worker startup, and returns a sanitized final
answer separately from attempted/allowed/denied/exposure events. Shared access plus
source fingerprinting remains development confirmation, not per-person identity.
Seeded sessions require separate exact standing consent. A trusted host factory
composes the existing budget controller and persistent fixture pool; custom mutations
must reserve an exact provisioned fixture too. Default hosts still register no live
portal adapter or scenarios.

## Evidence and limits

See [C7 validation](../development/evidence/2026-09-05-c7-runtime.md). Tests through
real service children use in-memory fixture credentials and synthetic provider
transports. Their injected model requests are deterministic test cases, never live
attack observations. Paid inference, external fixtures, hosted containment and
unattended cold-boot acceptance need the separate exact resource/action plan.
Portal assurance remains Observed/Unknown. Existing C6 host/containment residuals
remain explicit; this ADR does not promote them to verified guarantees.
