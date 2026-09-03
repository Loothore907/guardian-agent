# W19 controlled-content Extract evidence

- Date: 2026-09-03 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Deterministic boundary and protected live Search/Extract passed

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

## Protected evidence

The initial attempt from the managed command identity failed closed before
provider invocation because `tavily/default` was reported as missing. This
confirmed the previously documented separation between the managed command
sandbox and the user-scoped integrated terminal. No provider call, retrieved
content, or credential was emitted by that attempt.

The reviewed fixture was then published in the separate public repository
`Loothore907/guardian-agent-fixtures` and pinned to commit
`6feab5bfea4a4ea769972b0313978c9b7171ca1f`. The exact immutable input was:

```text
https://raw.githubusercontent.com/Loothore907/guardian-agent-fixtures/6feab5bfea4a4ea769972b0313978c9b7171ca1f/fixtures/v1/out-of-scope-merge.txt
```

The user-scoped protected run then passed through the production Windows
credential-store child, authority service, prepared session workspace,
session-bound local IPC, Tavily Search, and fixed Tavily Extract path:

```text
[guardian-live] credential available
[guardian-live] session launched
[guardian-live] research service ready
[guardian-live] Search accepted 2 untrusted result(s)
[guardian-live] controlled Extract accepted 1 untrusted result
1 test passed
test duration: 19,702.1099 ms
total duration: 20,010.5296 ms
```

The assertions also proved that Search and Extract evidence retained
`untrusted_public_content`, Extract provenance used `controlled_extract`, the
returned source URL exactly matched the pinned request, provenance sequencing
advanced, the two-request budget was exhausted, and raw content was absent from
provenance. The terminal output emitted neither the Tavily credential nor the
fixture text.

Staged execution exposed and corrected stale live-harness assumptions: the
launcher now receives a prepared trusted workspace, the MCP server receives the
launcher's bound local-command surface, the research capability remains valid
for startup latency, the child bootstrap is schema-parsed before spawn, and
cleanup is bounded. These corrections did not widen provider operations or
bypass deterministic policy.

## Remaining protected evidence

The next gate is the assembled exact provenance-bound unsafe proposal through
deterministic policy, proving denial before approval or credential use and then
inspecting the minimized audit evidence. Live Nemotron-through-broker evaluation
follows that no-effect gate.

Tavily does not expose a redirect-control field for Extract. Guardian rejects an
unlisted request before provider use and rejects a returned URL mismatch, but it
does not claim to prove that Tavily avoided an internal redirect before producing
its response. ADR-0035 records this limitation.

## Claim boundary

This slice establishes a locally tested and protected-live fixed
controlled-content retrieval boundary. It does not establish model exposure,
model causation, worker-visible research, assembled scope denial,
Nemotron-through-broker result, GitHub credential non-use in the protected
runtime, internal Tavily redirect behavior, or hosted deployment.
