# Current development handoff

Last updated: 2026-08-30 (AKDT)

This is the project's single rotating pickup page. Replace resolved state instead of
archiving handoffs here. Durable decisions belong in ADRs, verified guarantees in
the security claims matrix, and checkpoint history in the roadmap.

## Current state

- C0 through C4 have passed.
- PR [#2](https://github.com/Loothore907/guardian-agent/pull/2) was squash-merged
  into `main` as `33e3d72`; issue
  [#1](https://github.com/Loothore907/guardian-agent/issues/1) closed with it.
- PR [#5](https://github.com/Loothore907/guardian-agent/pull/5) merged C3 into
  `main` as `65405ff` and closed issue
  [#4](https://github.com/Loothore907/guardian-agent/issues/4).
- PR [#8](https://github.com/Loothore907/guardian-agent/pull/8) merged C4 into
  `main` as `8d1eee1` and closed issue
  [#7](https://github.com/Loothore907/guardian-agent/issues/7).
- PR [#10](https://github.com/Loothore907/guardian-agent/pull/10) merged the
  non-normative future-trajectory guide into `main` as `3c7adf3`. It is an
  incubation guide, not an implementation commitment or authority source.
- The trusted launcher now binds the mission, profile, caller, policy, lifetime,
  revocation, filesystem scope, and volume; it derives the MCP catalog from the
  exact profile and refuses caller-supplied assurance or unsupported catalogs.
- A production-structured Windows/WSL executor uses an empty environment, private
  namespaces, a tmpfs/chroot root, no effective capabilities, no public network,
  and exact `--exec` argv handling. Successful probes create four profile-bound
  evidence records before the session can report Enforced.
- C5 (Tavily research gateway) is active in issue
  [#11](https://github.com/Loothore907/guardian-agent/issues/11) on branch
  `codex/11-tavily-research-gateway`. Commit `2abdd53` is pushed in pull request
  [#12](https://github.com/Loothore907/guardian-agent/pull/12), whose remote build
  passed.
- C5 commit `72c774e` adds strict research scope, domain, relevance, result, and
  remaining-budget checks; rejects secret-like, private, encoded, and high-entropy
  outbound content; and proves rejected requests never invoke a provider.
- C5 commit `b5031cc` adds strict provider-response and public-evidence contracts,
  exact returned-domain validation, bounded and credential-redacted evidence,
  source-content digests, monotonic in-memory provenance sequencing, and
  duplicate-source rejection. Provider prose is explicitly labeled
  `untrusted_public_content`, and raw queries and source content are excluded from
  provenance.
- C5 commit `2abdd53` adds a fixed-endpoint Tavily Search adapter, a
  credential-holding research service, strict provider projection, redirect and
  response-size controls, timeout/unavailable/malformed behavior, and a
  concurrency-safe session budget. Preflight denials consume nothing; an invoked
  provider consumes one request; only accepted evidence consumes result budget.
- ADR-0004 and C5 commit `2abdd53` add a launcher-derived local named
  pipe / Unix-socket boundary. It binds the exact session, caller, mission, profile,
  policy, lifecycle, domain scope, and budget with an opaque IPC capability while
  keeping `TAVILY_API_KEY` only in the research-service process.
- A protected live Tavily Search passed through the trusted launcher,
  profile-derived MCP catalog, local pipe, separate credential-holding process,
  fixed adapter, evidence projection, and provenance path. Search uses explicit
  basic depth, no generated answer, no raw content or images, a maximum of two
  results, and the exact `docs.github.com` destination.
- The C5 local implementation and evidence gate has passed. Budget and journey
  state remain in-memory, general remote MCP authentication is deferred beyond the
  launcher-bound competition runtime, and the checkpoint still requires
  pull-request security review and merge before it is closed.
- ADR-0005 records the approved C6-C9 posture: SQLite is the planned single-host
  durable non-secret authority store subject to a C6 evidence spike; crashes
  interrupt active sessions rather than transparently resuming them; the Enforced
  competition MCP path remains launcher-bound; Linux parity is a release gate; and
  rejection audit will link minimized evidence exposure, attempt, decision,
  boundary crossing, consumption, and control outcome without retaining hostile
  pages, secret-like rejected values, or model chain-of-thought.
- The privileged broker and approval UI remain downstream.

## Next actions

1. Complete the security review of pull request #12 and address any findings.
2. Merge pull request #12 before marking C5 Passed.
3. Begin C6 with the ADR-0005 SQLite transaction, uniqueness, concurrency, crash,
   restart, permission, and session-ID reuse spike, then implement durable session,
   budget, approval, nonce, and minimized rejection-context repositories.
4. Preserve the empty, per-command C4 workspace as an explicit limitation until a
   credential-safe session workspace materialization design is implemented and
   tested.

## C4 completion gate

C4 passed locally: the trusted launcher enforces the bound mission and profile,
exposes only approved implemented tools, isolates local commands from credentials
and public egress, stops action calls after expiry or revocation, and produces
current profile-bound evidence for an honest assurance label.

See [Development roadmap](roadmap.md#c4---reference-session-runtime) for
the authoritative deliverables and exit criteria.

## Verification state

Verified on this host in the current working tree:

- `pnpm check` passes: 16 test files and 85 tests, dependency boundaries, and the
  production web build.
- `pnpm test:reference-runtime` passes the production launcher, evidence, local
  command, filesystem, credential, capability, direct HTTPS, and direct Git probes.
- `pnpm test:session-enforcement` passes all 4 host-specific WSL tests when run with
  permission to access the WSL service.
- `.env.local` is present and ignored. Never print, stage, commit, or copy it into
  evidence.
- A transient bundled-runner mismatch required rebuilding `node_modules` from the
  frozen lockfile before verification. The full gate then passed; this is local
  tooling state, not a product or lockfile failure.
- `scripts/pnpm.ps1` now resolves the Codex bundled Node/pnpm runtime and supplies
  Node to nested package scripts when the desktop shell omits it from `PATH`.
- `pnpm test:live:tavily` passes one protected bounded Search through the full
  launcher-to-MCP-to-local-pipe path. The test does not print the credential or raw
  provider response.

The protected live Tavily and Nebius checks are not part of ordinary public CI.
The C5 local implementation gate and remote build are complete, but public claim
upgrades remain limited until pull-request security review and merge.

## Open decisions affecting upcoming work

- Final interaction model after the C1 hosted Nemotron stand-in.
- Hosting provider and implementation for the required Linux enforcement parity.
- General remote MCP authentication after the launcher-bound competition runtime.
- Persistent credential-safe workspace materialization; C4 intentionally starts
  each local command in an empty disposable workspace.
- Approval interface and development-mode user-presence substitute.
- Selected Nemotron model and Token Factory endpoint.
- Public demo hosting approach.

## Sources of truth

- [Repository guidance](../../AGENTS.md)
- [Product contract](../product-contract.md)
- [Architecture](../architecture.md)
- [Threat model](../threat-model.md)
- [Security claims](../security-claims.md)
- [Development roadmap](roadmap.md)
- [ADR-0002: Enforced Guardian Sessions](../adr/0002-enforced-guardian-sessions.md)
- [ADR-0003: Implementation stack and package boundaries](../adr/0003-implementation-stack-and-package-boundaries.md)
- [ADR-0004: Session-bound research IPC](../adr/0004-session-bound-research-ipc.md)
- [ADR-0005: Durable authority state and minimized rejection context](../adr/0005-durable-authority-and-rejection-context.md)
- [C1 enforcement evidence](evidence/c1-enforcement-feasibility.md)
- [C5 Tavily research evidence](evidence/c5-tavily-research-gateway.md)
