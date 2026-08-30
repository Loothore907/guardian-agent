# C5 Tavily Research Gateway Evidence

- Date: 2026-08-30 (AKDT)
- Supported reference host: Windows with WSL 2 and Ubuntu 22.04
- Branch: `codex/11-tavily-research-gateway`
- Status: Local implementation gate passed; commit, remote CI, pull-request review,
  and merge remain pending

## Implemented path

```text
human-authored mission and profile
  -> trusted launcher
  -> profile-derived guardian.research MCP tool
  -> deterministic outbound and lifecycle checks
  -> session-bound local named pipe / Unix socket
  -> credential-holding research-service process
  -> fixed Tavily Search request
  -> strict response projection
  -> bounded untrusted evidence and minimized provenance
```

The launcher derives the exact public-domain allowlist and session request/result
budget. The interaction request cannot supply its own session, caller, mission,
profile, policy, endpoint, IPC capability, provider credential, or Tavily options.

The Tavily request fixes:

- endpoint `https://api.tavily.com/search`;
- `topic: general` and `search_depth: basic`;
- `auto_parameters: false`;
- `include_answer: false`;
- `include_raw_content: false`;
- `include_images: false`;
- the guarded query, maximum result count, and exact approved domains only; and
- a ten-second provider timeout and 256 KiB response limit.

## Budget semantics

- Schema, mission relevance, domain, private-data, secret-like, encoded,
  high-entropy, and exhausted-budget denials occur before provider invocation.
- Pre-provider denials consume neither the research request nor result budget.
- Provider invocation consumes one request, including timeout, unavailable, or
  malformed responses.
- Result capacity is reserved before the asynchronous call and released on failure.
- Only accepted, validated evidence consumes result capacity.

## Deterministic evidence

`pnpm check` passes with:

- 16 test files and 85 tests;
- strict TypeScript, formatting, and lint checks;
- 64 modules and 74 dependency edges with no boundary violations; and
- the production web build.

Relevant fixtures cover:

- rejected outbound secrets, private paths, opaque encodings, and irrelevant text;
- empty and expanded domain lists;
- provider non-invocation on deterministic denial or exhausted budget;
- concurrent result-capacity reservation;
- malformed, unavailable, timeout, oversized, extra-field, credential-bearing URL,
  duplicate-source, and off-domain provider behavior;
- allowlisted evidence, content digests, untrusted labels, minimized provenance,
  and monotonic sequence numbers;
- wrong IPC capability, caller, profile, session bindings, pre-start, and expiry;
- lifecycle and revocation denial before the session host calls IPC; and
- credential exclusion from results and fixed public error messages.

## Host and live evidence

- `pnpm test:reference-runtime` passes the supported production WSL executor,
  filesystem, credential, capability, direct HTTPS, and direct Git probes.
- `pnpm test:session-enforcement` passes all four retained C1 host checks.
- `pnpm test:live:tavily` passes one protected live Search through the trusted
  launcher, profile-derived MCP catalog, local pipe, separate credential-holding
  process, fixed Tavily adapter, evidence projection, and provenance path.

The live command reads the ignored `.env.local` only in the protected test driver.
The spawned research process receives an allowlisted environment containing the
strict service configuration and `TAVILY_API_KEY`. The credential and raw provider
response are never printed or written into evidence.

## Residual limitations

- Only Tavily Search is implemented. Extract, Map, Crawl, and Research remain out of
  scope unless separately admitted by the roadmap.
- Research budgets, journey sequence, pipe endpoint, and IPC capability are
  in-memory and do not survive restart.
- The development live test uses an in-memory MCP client transport after the real
  launcher; authenticated remote MCP caller identity remains unresolved.
- Hosted Linux namespace and Unix-socket parity are not yet evidenced.
- The current evidence does not claim protection from privileged local malware or
  host compromise.
- Public claim status should not advance beyond the exact evidence until the branch
  is committed, remote CI is green, and the C5 security review is complete.
