# W20 atomic research exposure registration evidence

- Date: 2026-09-03 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Protected no-effect denial and minimized audit inspection passed

## Architectural finding

The first assembled protected W20 attempt passed live Tavily Search and controlled
Extract, started the real broker child, and then returned `audit_unavailable`
instead of the required `scope_mismatch`.

This was a correct fail-closed result. The broker requires every evidence ID on an
attempt to reference a prior minimized exposure record in the durable authority
store. Search and Extract had produced bounded evidence and provenance, but the
research child had no authority operation that could atomically register those
records. The broker therefore stopped while appending the attempt, before
connection policy, Guardian evaluation, approval lookup, tool consumption, the
GitHub adapter, or credential resolution.

## Implemented correction

ADR-0036 adds only `context.append_exposures` to the `research_service` authority
role. The operation:

- accepts one to three strict minimized exposure records in one authenticated
  session-bound IPC frame;
- reuses each provenance event ID as its exposure ID so the existing coordinator
  forwards opaque identifiers only;
- stores source domain and content digest, never the URL, excerpt, page body,
  query, rationale, credential, or model output;
- validates and inserts the whole batch in one immediate transaction; and
- causes Search or Extract to fail closed before returning evidence when
  registration is unavailable, while conservatively retaining the request charge.

Automatic research records retain `untrusted_public_content` and initially use an
empty bounded signal set. Signal classification and model causation remain
separate, unclaimed work.

## Deterministic verification

Focused verification passes:

```text
17 Vitest files / 101 tests
TypeScript project build
```

The complete ordinary gate passes with 61 Vitest files / 360 tests, 7 SQLite
authority tests plus the expected Windows POSIX skip, 2 reset-planner tests, 176
modules / 354 dependencies with no boundary violation, formatting, lint,
TypeScript compilation, production build, and `git diff --check`.

The tests cover atomic rollback, strict role authorization, real local authority
IPC registration, broker-reference availability, Search and Extract exposure
projection, exact domain/digest/trust minimization, and fail-closed registration
failure.

## Protected verification

The user-scoped `pnpm test:live:tavily` rerun passed on Windows in
20,158.9634 ms for the test / 20,407.8812 ms total. The protected path:

1. resolved the enrolled Tavily credential only inside the research service;
2. launched the prepared Guardian session and session-bound local services;
3. accepted two bounded untrusted Search results and one bounded untrusted
   Extract result from the commit-pinned public fixture;
4. started the real broker child and returned exact `scope_mismatch` for the
   fixed fictional `guardian-agent-out-of-scope#404` proposal; and
5. reopened the durable authority store and verified three minimized exposure
   records linked to the rejected attempt by opaque IDs.

The persisted decision recorded `scope_expansion`, a `confirm` deterministic
floor, `guardianOutcome: not_assessed`, provider and adapter boundaries as
`not_crossed`, and approval and tool consumption as `not_consumed`. The remaining
tool budget confirmed that the two research operations were charged while the
pre-effect denial consumed no privileged tool use. The serialized authority
context contained neither the fixture URL nor the unsafe repository name; the
test and ordinary secret audit emitted no credential or retrieved fixture text.

This evidence validates the assembled research-to-deterministic-policy no-effect
path. It does not add a worker-visible GitHub capability, exercise Nemotron, use
an approval, invoke the GitHub adapter, resolve a GitHub credential, or perform a
remote mutation.
