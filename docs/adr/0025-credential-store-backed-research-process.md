# ADR-0025: Credential-store-backed research process

- Status: Accepted
- Date: 2026-09-02

## Context

The Tavily adapter and durable research budgets were already bounded, but the
research application received serialized service configuration and a raw
`TAVILY_API_KEY` through its environment. That prevented the reference supervisor
from attaching the research child without observing or forwarding a reusable
credential, and made the environment itself credential-equivalent authority.

## Decision

Guardian replaces the production research entrypoint with one strict
`tavily_research` stdin-bootstrap contract. It combines the existing research IPC
configuration with an exact `research_service` authority client. Session/caller
bindings must match, the authority operation set must be exactly
`research.reserve` and `research.settle`, and the research lifetime must fit inside
the authority capability lifetime. Unknown and environment fields fail closed.

The child constructs `WindowsCredentialStore` locally. A credential-store Tavily
provider resolves `tavily/default` for one search callback, validates and invokes
the fixed Tavily transport within that callback, and returns only the existing
strict provider projection. The service never accepts a raw API key, arbitrary
provider endpoint, header, or transport configuration from bootstrap.

The protected live test now requires an enrolled `tavily/default`, starts durable
authority state, sends the strict configuration over stdin, and launches the child
with an empty environment rather than forwarding `.env.local` content.

## Consequences

- The supervisor can start the research child without possessing or forwarding a
  Tavily credential.
- Durable reservations remain mandatory in the production child; authority
  unavailability fails before credential resolution and provider use.
- Existing library-level environment construction remains for isolated tests and
  compatibility, but the production `main` no longer uses it.
- Linux credential-store parity, OS peer identity, supervised three-child
  attachment, and protected live rerun remain.
