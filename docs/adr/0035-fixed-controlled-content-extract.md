# ADR-0035: Fixed controlled-content Extract boundary

- Status: Accepted
- Date: 2026-09-03
- Checkpoint: C6 / W19

## Context

The existing research boundary supports bounded Tavily Search, but ADR-0006 and
ADR-0029 require a controlled public page containing instruction-like hostile
content. Search results do not prove retrieval of one exact reviewed page, and a
generic URL fetch would add arbitrary network and redirect authority.

Tavily's current Extract API accepts one or more URLs and returns extracted page
content. The API does not expose a provider redirect policy that Guardian can
independently enforce before Tavily receives the request. Guardian therefore
cannot honestly claim general redirect-safe arbitrary URL extraction.

## Decision

Guardian adds only a fixed controlled-content Extract boundary under the existing
`guardian.research` authority family.

- Trusted session configuration contains one to four exact canonical public HTTPS
  URLs and their exact allowed domains. URLs with user information, query strings,
  fragments, IP literals, local hostnames, non-HTTPS schemes, or unlisted targets
  fail before provider invocation.
- The competition configuration reserves exactly one research request and one
  result for controlled extraction. Search retains its separate bounded request
  and result budget.
- The credential-holding research process alone constructs a fixed
  `https://api.tavily.com/extract` request. The caller cannot supply headers,
  credentials, extraction depth, format, timeout, redirect behavior, or provider
  transport options.
- The provider response must contain exactly one successful result. Guardian
  rejects failed, malformed, oversized, or returned-URL-mismatched responses.
- Raw extracted content is used only to compute a domain-separated digest and a
  bounded sanitized excerpt. Provenance stores the exact URL, digest, provider
  request ID, retrieval kind, and `untrusted_public_content` label; it cannot store
  the raw body.
- The local research IPC binds extraction to the same exact session, caller,
  mission, profile, policy, lifetime, and session capability as Search.

The controlled fixture must be separately reviewed as non-redirecting before a
protected live run. A returned URL mismatch fails closed after the public provider
call, but this is not evidence that Tavily avoided an internal redirect. General
mission-allowlisted extraction remains outside the current claim.

## Consequences

- Deterministic fixtures can now exercise the real contracts, fixed adapter,
  credential callback, durable research budget, local IPC, and minimized evidence
  projection.
- Worker-visible research remains unchanged. The fixed competition coordinator is
  still the only implemented orchestration route.
- A controlled live page, a user-scoped credential run, and the assembled
  extraction-to-denial evidence remain required before advancing the broader
  hostile-content claim.
- Map, Crawl, Research, multiple caller-selected URLs, query-focused Extract,
  arbitrary headers, and direct HTTP remain unsupported.

## Source

- [Tavily Extract API](https://docs.tavily.com/documentation/api-reference/endpoint/extract)
