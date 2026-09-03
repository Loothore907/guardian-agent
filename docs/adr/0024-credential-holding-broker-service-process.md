# ADR-0024: Credential-holding broker service process

- Status: Accepted
- Date: 2026-09-02

## Context

W7 defines the broker protocol and W8 defines a separate Guardian action-risk
protocol, but neither starts the credential-holding GitHub broker child. Starting
the broker with ad hoc environment configuration, a provider object, or a generic
authenticated transport would widen the boundary and could combine GitHub and
Nebius credentials in one process.

## Decision

Guardian adds one strict `github_broker` process contract and stdin-bootstrap
entrypoint. The bootstrap contains only:

- the W7 broker endpoint, capability, session/caller binding, and lifetime;
- a broker-role authority-client endpoint and capability;
- the W8 action-risk client configuration and credential-free bound envelope;
- one typed GitHub credential-store handle; and
- one validated public GitHub OAuth client ID used only by the fixed refresh flow.

The contract requires the broker, authority, and Guardian session/caller bindings
to match and admits only the exact broker-role authority operation set. The broker
lifetime must fit inside both the authority capability and Guardian evaluator
lifetimes. Unknown fields fail schema validation.

The child creates a `WindowsCredentialStore` locally, constructs only the fixed
authority client, W8 evaluator client, typed GitHub broker, and W7 server, and
emits one fixed readiness line. Bootstrap authority travels as one bounded stdin
frame, not in arguments or environment. Provider endpoints, arbitrary URLs,
headers, commands, model providers, and raw credentials are not configurable.

## Consequences

- The credential-holding broker can run as a distinct supervised child without
  receiving the Nebius credential or Guardian provider implementation.
- GitHub credential values remain callback-scoped inside the broker child and are
  not fields in the process contract.
- Authority, Guardian, and service lifetime substitution fail before the server
  listens.
- This slice does not start the Guardian child, attach the research child, prove OS
  peer identity, or execute a protected/live GitHub operation through the process.
