# ADR-0021: Supervised competition journey attachment

- Status: Accepted
- Date: 2026-09-02

## Context

ADR-0020 fixes the research-to-denial-to-authorized-merge ordering, but its
coordinator intentionally accepts structural research and broker clients. The
reference runtime still needs lifecycle semantics before those clients can be
attached to credential-holding child processes. Process exit, concurrent use, or
replay must not produce a second privileged attempt or cause trusted services to
restart silently.

The attachment layer must remain distinct from service-specific IPC and credential
resolution. It must not accept arbitrary entrypoints, commands, destinations, or
environment variables.

## Decision

Guardian adds a `SupervisedCompetitionJourneyAttachment` in the trusted reference
supervisor. The fixed factory constructs ADR-0020's coordinator from one typed
research client and one typed broker client, then binds it to two already-started
`SupervisedServiceProcess` lifecycles.

The attachment enforces:

- distinct positive child-process identities for research and broker boundaries;
- one execution per attachment, with concurrent use and replay returning only
  `attachment_consumed`;
- no process restart;
- either child exiting or rejecting its exit signal before or during the journey
  transitions the attachment to `interrupted` and returns only
  `attachment_unavailable`;
- unexpected coordinator rejection is minimized to the same unavailable result;
- explicit close attempts both shutdowns, prevents later execution, and returns a
  fixed shutdown failure if either close fails; and
- service process IDs and private failure details are not included in journey
  results.

The wrapper is one-use even when deterministic input validation stops before a
provider call. A caller must create a new exact session and attachment rather than
retrying ambiguous state.

## Consequences

- The journey now has deterministic process-lifecycle, concurrency, replay, and
  shutdown semantics before real provider attachment.
- The trusted factory preserves ADR-0020's exact coordinator instead of allowing
  callers to rearrange its stages.
- This slice does not create the research or broker process, define new broker IPC,
  resolve credentials, expose CLI controls, or run live providers. Service-specific
  startup and protocol attachment remain later slices.
- The generic supervised-process primitive remains private; the new API cannot
  launch arbitrary code.
