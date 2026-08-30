# Current development handoff

Last updated: 2026-08-29 (AKDT)

This is the project's single rotating pickup page. Replace resolved state instead of
archiving handoffs here. Durable decisions belong in ADRs, verified guarantees in
the security claims matrix, and checkpoint history in the roadmap.

## Current state

- C0, C1, and C2 have passed.
- PR [#2](https://github.com/Loothore907/guardian-agent/pull/2) was squash-merged
  into `main` as `33e3d72`; issue
  [#1](https://github.com/Loothore907/guardian-agent/issues/1) closed with it.
- The local checkout is on `main` at the merged revision, with the handoff-library
  cleanup intentionally left uncommitted for review.
- The next checkpoint is C3: Mission and deterministic contracts.
- No C3 issue or branch has been created.
- Provider integration, the privileged broker, and approval UI remain downstream of
  C3's exit criteria.

## Next actions

1. Review and record the handoff-library cleanup.
2. Create a focused C3 issue and a `codex/...` branch from updated `main`.
3. Turn the C3 contract list into the smallest reviewable schema and property-test
   slices.
4. Implement strict mission, profile, assurance, proposal, provenance,
   authorization, canonical request, digest, approval, and audit contracts.
5. Update security claims only when the required reproducible evidence exists.

## C3 completion gate

C3 is complete only when its roadmap exit criteria pass, including fail-closed
unknown and malformed input, canonical equivalence, mutation-sensitive digests,
non-grantable mission expansion, evidence-backed assurance, and deterministic
policy precedence over Guardian output.

See [Development roadmap](roadmap.md#c3---mission-and-deterministic-contracts) for
the authoritative deliverables and exit criteria.

## Verification state

Verified on this host at pickup:

- `pnpm check` passes: 5 test files and 8 tests, dependency boundaries, and the
  production web build.
- `pnpm test:session-enforcement` passes all 4 host-specific WSL tests when run with
  permission to access the WSL service.
- `.env.local` is present and ignored. Never print, stage, commit, or copy it into
  evidence.

The protected live Tavily and Nebius checks are not part of ordinary public CI.

## Open decisions affecting upcoming work

- Exact C3 issue scope and review slices.
- Canonical serialization compatibility and domain-separated digest contracts.
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
