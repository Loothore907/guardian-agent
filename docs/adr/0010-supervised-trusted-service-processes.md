# ADR-0010: Supervised Trusted Service Processes

- Status: Accepted
- Date: 2026-09-01
- Decision owners: Earl Ray
- Checkpoints: C6-C9
- Extends: ADR-0005, ADR-0007, and ADR-0008

## Context

The first authority and interaction service slices crossed authenticated local
IPC but were started inside the trusted supervisor process. That demonstrated
strict contracts and ownership direction, not OS-process separation. Moving them
into children introduces consequential choices about how authority-bearing
configuration crosses the process boundary, how readiness is recognized, what a
crash means, and whether an interrupted active session may resume.

Command arguments and inherited environment are poor bootstrap channels. They are
commonly observable through process inspection and are easy to copy into logs or
child processes. Readiness output is also a potential disclosure surface if it
echoes configuration or provider diagnostics. Transparent restart conflicts with
ADR-0005 because an active sandbox, peer binding, and ephemeral capabilities
cannot yet be reconstructed as the same Enforced session.

## Decision

The reference supervisor starts the authority service as one child for the
supervisor lifetime and starts the interaction service as a short-lived child for
one controlled turn.

- Each child has one fixed entrypoint and receives exactly one bounded JSON frame
  over stdin. Bootstrap configuration never enters child argv.
- The supervisor supplies a minimal explicit environment. Windows may add its
  process baseline variables; neither capability-bearing bootstrap nor provider
  credentials may appear in them.
- A child becomes usable only after one exact, credential-free readiness line.
  Stderr, extra stdout, oversized output, early exit, malformed bootstrap, or a
  readiness timeout fails startup with a fixed parent error.
- Bootstrap buffers are cleared after the stdin write completes. Child parsers
  bound the frame, accept exactly one newline-terminated frame, validate it with
  strict schemas, and clear their byte buffers.
- The supervisor explicitly terminates and awaits each child. A bounded graceful
  shutdown is followed by forced termination only if required.
- An unexpected authority exit is observable and is not automatically restarted
  for an active session. New calls fail closed. A later fresh supervisor start
  applies the existing durable interruption rule.
- The current interaction child supports only the deterministic fake provider.
  Live provider configuration and credential resolution must remain inside that
  trusted child when implemented; they may not be added to runner argv or
  environment.

This is process supervision, not a complete Enforced claim. Windows named-pipe
ACL/peer-token evidence and Linux peer credentials, service identity, socket
directory ownership, credential-store integration, and child-tree containment
remain platform gates.

## Consequences

- The Guardian CLI no longer imports or constructs the interaction provider. It
  requests the fixed supervised fake interaction process from the reference
  supervisor.
- Authority capabilities exist only in trusted supervisor memory, the one stdin
  bootstrap frame, and trusted authority-process memory. They remain absent from
  argv, public results, logs, and SQLite.
- A crash may interrupt work, but cannot silently recover authority or replay the
  first interaction turn.
- Future Qwen, Nemotron, GitHub, and Tavily credential-holding processes must use
  the same bounded bootstrap/readiness discipline or record a superseding ADR.

## Rejected alternatives

- **Capability-bearing command arguments:** visible to process inspection and
  commonly retained by launchers and diagnostics.
- **Capability-bearing inherited environment:** unnecessarily exposes authority
  to descendants and environment capture.
- **Free-form readiness or provider logs:** can reproduce configuration, secrets,
  or untrusted provider prose.
- **Automatic restart of an active authority session:** would imply reconstruction
  of runtime and peer evidence that the current implementation does not perform.
- **Long-lived interaction provider process:** widens credential lifetime and
  permits unintended multi-turn reuse before that behavior is designed.

## Evidence required

Deterministic evidence must cover stdin-only bootstrap, argv/environment
inspection, bounded input and output, fixed readiness, sanitized startup failure,
separate process identity, one-turn interaction shutdown, authority crash without
restart, explicit close, capability absence from SQLite and public results, and
the complete ordinary repository gate. Platform Enforced evidence additionally
requires the Windows and Linux gates listed above.
