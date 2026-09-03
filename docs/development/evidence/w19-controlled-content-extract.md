# W19 controlled-content Extract evidence

- Date: 2026-09-03 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Deterministic boundary passed; protected live evidence pending

## Implemented boundary

The research layer now supports one exact controlled public HTTPS page through a
fixed Tavily Extract adapter. Trusted configuration splits the mission research
budget into one Search request with two results and one Extract request with one
result. Both operations remain under the existing session-bound research IPC and
credential-holding child boundary.

The deterministic path covers:

- exact URL and domain allowlisting before provider invocation;
- rejection of HTTP, IP-literal, local, credential-bearing, query-bearing,
  fragment-bearing, and unlisted URLs;
- fixed Tavily endpoint, method, authorization placement, basic depth, plain-text
  format, response limit, and timeout;
- one successful provider result only;
- returned-URL mismatch, failed result, malformed response, timeout, and oversized
  response failure;
- child-local credential resolution;
- durable one-request/one-result reservation and settlement;
- exact session/caller/mission/profile/policy/capability/lifetime IPC binding; and
- bounded redacted evidence plus digest-only minimized Extract provenance.

Focused verification passed:

```text
8 Vitest files / 76 tests
TypeScript project build
```

The complete ordinary gate then passed with 61 Vitest files / 359 tests, 7 SQLite
authority tests plus the expected Windows POSIX skip, 2 reset-planner tests, 176
modules / 354 dependencies with no boundary violation, formatting, lint,
TypeScript compilation, production build, and `git diff --check`.

The focused files cover contracts, research guards and ledgers, local research
IPC, the credential-holding research service, process configuration, session
launch, trusted supervisor configuration, and strict competition deployment
input.

## Protected baseline result

The existing protected Tavily Search test was attempted from the managed command
identity. It failed closed before provider invocation because `tavily/default`
was reported as missing. This matches the previously documented separation
between the managed command sandbox and the user-scoped integrated terminal.
No provider call, retrieved content, or credential was emitted.

Windows UI automation was not used as a workaround because the Windows-control
policy prohibits automating terminals and the Codex UI. The unchanged protected
test must be run from the user-scoped integrated terminal.

## Remaining protected evidence

W19 is not a live completion claim. The next protected run requires:

1. the existing bounded Tavily Search command from the user-scoped terminal;
2. a reviewed, stable, non-redirecting public HTTPS fixture whose hostname is in
   the confirmed research scope;
3. one live Extract through the production credential-store child and local IPC;
4. minimized output containing only operation, result count, trust label,
   binding, budget, latency, and sanitized failure classification; and
5. the assembled deterministic scope denial with audit inspection.

Tavily does not expose a redirect-control field for Extract. Guardian rejects an
unlisted request before provider use and rejects a returned URL mismatch, but it
does not claim to prove that Tavily avoided an internal redirect before producing
its response. ADR-0035 records this limitation.

## Claim boundary

This slice establishes a locally tested fixed controlled-content retrieval
boundary. It does not establish a live Extract, model exposure, model causation,
worker-visible research, assembled scope denial, Nemotron-through-broker result,
GitHub credential non-use in the protected runtime, or hosted deployment.
