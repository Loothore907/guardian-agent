# ADR-0059: Durable worker denial-recovery evidence

- Status: Accepted, September 9, 2026
- Tracking: [issue #19](https://github.com/Loothore907/guardian-agent/issues/19)
- Refines ADR-0019, ADR-0048 and ADR-0058.

## Context

The bounded worker could continue after an ordinary denial, but the external-tool
composition collapsed eligible research and broker rejections to the same generic
worker result. The general audit table was not wired into that path, and a useful
final worker response left durable session authority `active`. Those gaps prevented
the runtime from proving the ordered denial/recovery story it returned publicly.

## Decision

An eligible external-tool rejection retains only an allowlisted cause and stage.
The worker still receives `request_denied`, the deterministic continue-or-revoke
disposition, policy binding and non-increasing budget. It may additionally receive
one of the closed denial causes and stages defined by the worker contract. Provider
text, retrieved payloads, credentials, arbitrary error strings and model reasoning
remain excluded. The native-worker provider projection carries only this minimized
classification and continues to omit trusted identifiers and internal policy data.

The trusted worker dispatcher records a production audit chain through a dedicated
worker authority capability. The authority service assigns event IDs, contiguous
per-session sequence numbers and service-clock timestamps. Worker audit events must
bind an already claimed or deterministically denied execution. The chain records the
typed proposal, deterministic decision, provider/adapter boundary disposition and
the exact result digest returned as worker feedback.

After an eligible `guardian.research` denial, the immediate continuation is
mechanically final-only: the supervisor supplies an empty tool catalog and the
worker boundary rejects any tool request when that catalog is empty, including
during bounded continuation. This prevents untrusted public content from converting
denial feedback into repeated outbound attempts. The denial disposition remains
`continue` because the worker may still return a useful final response; it does not
retain authority to propose another research action in that recovery turn.
Successful research results and non-research denials may continue under the original
bounded catalog until completion, exhaustion or the turn limit. During those
ordinary continuations, the trusted dispatcher remains the decision boundary for a
proposed tool outside the advertised catalog so it can return the existing typed
denial.

The native-worker provider timeout is 45 seconds and its supervised IPC client
timeout is 50 seconds, both bounded inside the existing 60-second worker-turn
deadline. Three merged-main evaluation attempts stopped around the prior 20-second
cutoff only on the evidence-bearing final turn, while the compact final-only
compatibility probe completed. A fourth attempt after increasing only the provider
timeout exposed the still-shorter IPC timeout, which preempted the provider window.
The aligned inner deadlines preserve the same outer deadline and fail-closed
behavior while allowing the larger context a useful completion window. Live useful
completion remains unproven until a newly authorized evaluation succeeds.

September 10 T1 correction: the server socket still retained a separate 20-second
idle timeout, so the provider/client alignment alone did not remove every shorter
cutoff. Worker IPC now separates the absolute request-framing limit from the
authenticated handler's turn deadline and rejects late results. This repairs a
reproduced local mechanism; it does not identify the historical provider failure.
See [the T1 evidence](../development/evidence/2026-09-10-t1-ipc-deadline.md).

A subsequent aligned-deadline run still returned generic `provider_unavailable`.
The provider already classified failures into a closed diagnostic set, but one-use
worker IPC discarded that classification. Provider-unavailable IPC failures may now
include only that validated enum and a bounded numeric HTTP status where applicable.
The trusted supervisor may observe it for private evaluation evidence. Provider
text, response bodies, headers, arbitrary error strings and credentials remain
excluded, and neither the worker nor the public result receives it.

Attempt 13 verified that propagation but narrowed its failed final turn only to
`worker_output_invalid`. That class now optionally carries a closed `rejection`
enum: response/model/choice/message shape, completion length or other non-stop
completion, non-string content, invalid request ID, invalid content JSON, invalid
outcome schema, credential-like outcome or disallowed transport content. No raw
finish reason, schema path, key, message, input value or provider content is copied.
Legacy class-only diagnostics remain valid. Rejection follows projection check
order; outcome refinements prefer the credential-like tag before the transport
tag when both apply. A category identifies a failed predicate, not its underlying
cause, and does not reconstruct the historical response. The strict validators,
public failure, mission prompt and final-only continuation remain unchanged.

September 11 clean-control correction: two independently bound migration packets
completed both approved research reads, then rejected the final answer as
`outcome_credential_like`. The raw provider answer is deliberately not retained,
so its exact text remains unknown. Prompt guidance alone did not change the second
result. Final-response validation therefore distinguishes a closed set of complete
negative status assignments, such as `authorization: not granted`, from credential
values. The exemption must end at punctuation, a line boundary or the end of the
answer; added trailing data keeps the whole assignment rejected. High-confidence
GitHub, AWS and private-key forms remain rejected, and the general mission, query,
path and tool-request filters are unchanged. A credential-like projection
diagnostic may additionally carry only the matched label category from a closed
enum. It never carries the matched value, surrounding text or schema path.

A third independently bound clean control passed the same seven readiness gates
and both approved research reads after that repair. The credential exception was
no longer the failure; the provider classified the final turn as
`worker_output_invalid / outcome_schema_invalid`. The worker request had supplied
the exact output schema in prompt text but asked Nebius only for an unconstrained
JSON object. A replacement packet then tested Nebius strict `json_schema`; the
provider returned HTTP 400 before its first worker turn. That capability is not
available to the pinned model/API path and the packet is invalid technical
evidence, not a model result.

The provider therefore retains supported JSON-object mode and Guardian's exact
post-generation schema, credential and transport validation. To make another
schema rejection diagnosable, only an explicitly configured judge evaluation may
write the rejected model content to a new local file below the repository's
ignored `tmp/` tree. The file is created with owner-only permissions where the
platform honors them, is never sent over worker IPC, and is absent on accepted
output. Production and ordinary local sessions do not configure the sink. This is
a development evidence exception, not a public logging policy.

That capture recovered the next clean control's exact rejected object. It had only
the required `kind` and `response` fields, and its 2,248-character response was a
useful migration diagnosis. The base `boundedVisibleText` contract rejected its
ordinary line feeds before the credential and transport refinements ran. Final
worker responses now use a dedicated multiline-visible contract: canonical LF is
allowed for paragraphs and lists; carriage returns, tabs, other C0/C1 controls,
hidden Unicode, non-NFC text, outer whitespace and the existing length bound still
fail closed. Other bounded text fields retain the single-line contract. Replaying
the captured object through the repaired schema succeeds without altering its
content.

For bounded continuation, a contract-valid final response must cross a new exact
completion boundary. The supervisor binds the final turn ID and digest plus a digest
of its validated result. The authority store atomically appends useful-completion
and terminal audit events and changes the durable session from `active` to
`completed`. Completion is one-way. Expired, revoked, interrupted, replayed or
otherwise inactive authority cannot be completed, and missing completion authority
fails closed. Existing expiry, revocation, interruption and violation meanings are
unchanged.

## Consequences

- Completed sessions cannot consume new worker, research, broker or approval budget.
- Audit order and timestamps are authority-store facts rather than caller-selected
  sequence metadata.
- Schema version 7 adds `completed` to the durable session state and migrates earlier
  databases without resetting session or child-table records.
- Early tool-catalog rejection remains an earlier, stronger boundary. It is recorded
  as a destination denial with no provider or adapter dispatch.
- A contained research denial now narrows the next turn to `final_response`; prompt
  wording is advisory, while the empty catalog and output validation enforce the
  restriction.
- Provider-unavailable evidence can distinguish the allowlisted transport, HTTP,
  response-envelope, worker-output and credential/internal classes without carrying
  raw provider diagnostics across the worker process boundary.
- The deterministic service-child journey is reproducible evidence for local
  composition only. It does not show that a live model generated the forbidden
  request, that a paid provider was contacted, or that hosted containment is
  Enforced.

This decision adds no arbitrary transport, destination, credential reader,
production dependency, grant expansion, deployment authority or provider spend.
