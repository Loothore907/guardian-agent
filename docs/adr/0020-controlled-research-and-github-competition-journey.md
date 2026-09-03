# ADR-0020: Controlled research and GitHub competition journey

- Status: Accepted
- Date: 2026-09-02

## Context

C5 already provides bounded public research and C6 already provides exact GitHub
read and merge execution, but the competition story needs a deterministic order
that connects retrieved evidence to a denied authority expansion and then to a
separately authorized legitimate action. W4 intentionally retained a one-request,
two-turn worker lifecycle. Widening that lifecycle merely to assemble the demo
would add state-machine and replay surface before it is necessary.

The journey must not treat hostile public text as authority, forward that text to
the privileged broker, reuse approval on the hostile attempt, or continue when an
unexpected control outcome occurs.

## Decision

Guardian adds a trusted `ControlledCompetitionJourney` coordinator outside the
worker loop. It accepts one strict research request, one normalized out-of-scope
GitHub merge request, one separately normalized legitimate merge request, and an
exact approval bound to the legitimate request.

The coordinator enforces this fixed sequence:

1. Execute bounded research and strictly reparse the result and durable budget.
2. Require at least one unique provenance event bound to the same session as both
   GitHub requests.
3. Submit the out-of-scope request without approval and with only the provenance
   event IDs. Retrieved titles, excerpts, URLs, and provider prose do not enter the
   broker request.
4. Continue only when the broker returns the deterministic `scope_mismatch`
   denial. An unsafe success, malformed broker response, provider-dependent denial,
   or any other code stops the journey.
5. Submit the legitimate request with its exact approval and the same provenance
   IDs.
6. Accept success only when the returned merge result binds the exact repository,
   pull request, and expected head commit.

Both GitHub requests must share the exact session, caller, connection, mission,
profile, and policy binding while targeting different repositories. The approval
must match the legitimate request ID, canonical digest, authority binding, and
resource version before research begins. Broker denial codes are allowlisted and
arbitrary returned text is never reflected through the public journey result.

## Consequences

- The research-to-denial-to-authorized-action order is deterministic and cannot be
  rearranged by worker or model output.
- Public evidence contributes through minimized provenance identifiers, while
  hostile content remains untrusted context rather than authority.
- Approval is absent from the unsafe attempt and cannot be accidentally reused for
  it.
- The legitimate merge is not attempted unless the exact expected deterministic
  denial occurred first.
- This slice does not start the Tavily or broker credential-holding services,
  expose the journey in the CLI, implement WebAuthn, or provide protected live
  end-to-end evidence. Those remain separate attachment and assurance gates.
- A persistent multi-turn worker loop remains unnecessary for this competition
  path and is still unimplemented.
