# Current development handoff

Last updated: 2026-08-29 (AKDT)

This is the project's single rotating pickup page. Replace resolved state instead of
archiving handoffs here. Durable decisions belong in ADRs, verified guarantees in
the security claims matrix, and checkpoint history in the roadmap.

## Current state

- C0, C1, C2, and C3 have passed.
- PR [#2](https://github.com/Loothore907/guardian-agent/pull/2) was squash-merged
  into `main` as `33e3d72`; issue
  [#1](https://github.com/Loothore907/guardian-agent/issues/1) closed with it.
- PR [#5](https://github.com/Loothore907/guardian-agent/pull/5) merged C3 into
  `main` as `65405ff` and closed issue
  [#4](https://github.com/Loothore907/guardian-agent/issues/4).
- The next checkpoint is C4: Reference session runtime. No C4 issue or branch has
  been created.
- Provider integration, the privileged broker, and approval UI remain downstream of
  the C4 runtime boundary.

## Next actions

1. Create the focused C4 issue and branch from updated `main`.
2. Define the smallest production replacement for the C1 spike that binds one
   mission, profile, caller, policy version, lifetime, and revocation handle.
3. Prove the tool catalog, disposable filesystem, credential absence, network
   policy, expiry, revocation, and assurance evidence before provider work begins.

## C4 completion gate

C4 is complete only when the trusted launcher enforces the bound mission and
profile, exposes only approved tools, isolates local commands from credentials and
public egress, stops calls after expiry or revocation, and produces sufficient
evidence for an honest assurance label.

See [Development roadmap](roadmap.md#c4---reference-session-runtime) for
the authoritative deliverables and exit criteria.

## Verification state

Verified on this host at pickup:

- `pnpm check` passes: 9 test files and 33 tests, dependency boundaries, and the
  production web build.
- `pnpm test:session-enforcement` passes all 4 host-specific WSL tests when run with
  permission to access the WSL service.
- `.env.local` is present and ignored. Never print, stage, commit, or copy it into
  evidence.

The protected live Tavily and Nebius checks are not part of ordinary public CI.

## Open decisions affecting upcoming work

- Final interaction model after the C1 hosted Nemotron stand-in.
- Production hardening and hosted parity for the proven WSL/Linux namespace
  mechanism.
- Authenticated MCP transport and session-caller identity.
- Session evidence and runtime-attestation representation.
- Approval interface, persistence, and development-mode user-presence substitute.
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
- [C1 enforcement evidence](evidence/c1-enforcement-feasibility.md)
