# ADR-0022: Session-bound broker IPC

- Status: Accepted
- Date: 2026-09-02

## Context

W6 can supervise distinct research and broker child lifecycles, but the GitHub
broker had no narrow local protocol comparable to the existing research boundary.
Calling the broker application boundary in the supervisor process would keep
credential resolution and authenticated provider execution inside trusted
orchestration rather than a distinct credential-holding process.

The protocol must not become an authenticated HTTP proxy, accept arbitrary
transport fields, or trust a returned success merely because it matches a broad
result schema.

## Decision

Guardian adds strict broker execution and IPC contracts plus a local named-pipe or
temporary Unix-socket client/server in `@guardian/broker`.

The request contains only:

- an opaque IPC capability and exact session/caller binding;
- a trusted request timestamp;
- one canonical GitHub read or squash-merge request;
- an optional exact approval accepted only for a merge; and
- up to sixteen unique pre-existing evidence-exposure IDs.

The response is either one allowlisted GitHub snapshot/merge result or one fixed
broker denial code. Protocol failure is limited to fixed invalid, unauthorized,
not-active, expired, or unavailable codes. Arbitrary URLs, endpoints, headers,
commands, credentials, provider prose, and caller-selected transport options are
not fields in the protocol.

The server uses a fixed local endpoint pattern, constant-time capability
comparison, exact session/caller comparison against both the frame and canonical
request, bounded single-frame I/O, and server-owned lifecycle time. Future client
timestamps, pre-start calls, and exact-expiry calls fail closed. Successful read
and merge results are rechecked against the exact owner, repository, pull request,
and resource/head version on both the server and client sides.

## Consequences

- The W6 broker client can cross a typed local boundary without exposing provider
  credentials to the supervisor or coordinator.
- A compromised or malformed provider result cannot substitute a different pull
  request while retaining a valid broad schema.
- Broker denials remain safe fixed codes; malformed handler output becomes only
  `service_unavailable`.
- This slice does not start the broker application process, resolve the GitHub
  credential, attach the Guardian risk evaluator over IPC, prove OS peer identity,
  or run a live GitHub operation. Those remain process-specific gates.
