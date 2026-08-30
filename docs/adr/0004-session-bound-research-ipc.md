# ADR-0004: Session-Bound Research IPC

- Status: Accepted
- Date: 2026-08-30
- Decision owners: Earl Ray
- Checkpoint: C5 - Tavily research gateway

## Context

ADR-0003 requires Tavily credentials to remain in a separate research-service
process and calls for bounded local IPC between trusted services. The C5 Search
adapter, outbound guard, evidence projection, provenance ledger, and session budget
were initially implemented without a production session-host transport.

Importing the credential-holding service directly into the session host would
collapse the intended process boundary. A loopback HTTP listener would add an
unnecessary network surface and conflict with the current decision to reserve HTTP
for the human control API and web interface.

## Decision

Use one launcher-selected local named pipe on Windows and one temporary Unix-domain
socket on Linux for each research-enabled Guardian Session.

The trusted launcher:

1. validates the human-authored mission and exact session profile;
2. derives the public-domain allowlist and research request/result budget;
3. generates a random local endpoint and opaque IPC capability;
4. binds the service configuration to the exact session, caller, mission and
   version, profile and version, policy version, start, and expiry; and
5. gives the session host only the endpoint and IPC capability while the research
   process alone receives `TAVILY_API_KEY`.

The pipe protocol accepts exactly one bounded newline-delimited JSON frame per
connection. Both peers strictly parse the request and response. The service uses a
constant-time capability comparison, rejects mismatched bindings, and rechecks
start and expiry before its handler. The session host deterministically checks
outbound content, lifecycle, revocation, tool authority, domain scope, and global
tool volume before IPC. The research service owns the authoritative request and
result counters and reserves result capacity across asynchronous provider calls.

The provider adapter remains fixed to Tavily Search. It does not accept an arbitrary
URL, method, header, query parameter, or provider operation from the interaction
agent.

## Consequences

- The interaction model, MCP result, and command sandbox never receive the Tavily
  credential or the credential-bearing Authorization header.
- A deterministic denial occurs before IPC and consumes no research budget.
- A request is charged only when the research service invokes the provider; only
  accepted evidence consumes result capacity.
- Concurrent requests cannot overcommit result capacity.
- Expired, wrong-caller, wrong-session, wrong-profile, wrong-policy, and invalid
  capability frames fail before provider invocation.
- The local IPC capability is credential-equivalent and must not appear in public
  results, logs, audit events, process arguments, or committed fixtures.
- Budget, journey, endpoint, and capability state remain in-memory and single-host
  for C5. Restart recovery and durable audit persistence remain C6 work.
- Authenticated remote MCP transport and hosted Linux parity remain separate open
  decisions. This ADR does not claim resistance to a compromised local host.

## Rejected alternatives

- **Direct session-host import of the Tavily service:** collapses the
  credential-holding process boundary.
- **Loopback HTTP:** adds routing, header, listener, and request-forgery surfaces
  that are unnecessary for one local session.
- **Caller-selected pipe or socket paths:** permits endpoint confusion and widens
  the local destination surface.
- **Passing the IPC capability in command-line arguments:** exposes it through
  process inspection; the process configuration is passed in an allowlisted child
  environment instead.
- **Trusting MCP caller fields:** lets the interaction side assert identity. The
  launcher, not a tool request, supplies every binding field.

## Evidence

Acceptance is supported by the C5 evidence record in
[`docs/development/evidence/c5-tavily-research-gateway.md`](../development/evidence/c5-tavily-research-gateway.md).
