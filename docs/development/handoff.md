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
- The next checkpoint is C3: Mission and deterministic contracts.
- C3 is tracked by issue
  [#4](https://github.com/Loothore907/guardian-agent/issues/4) on branch
  `codex/4-mission-deterministic-contracts`, based on `main` at `644328c`.
- Commits `f058d41`, `a295737`, and review fix `479c6c9` implement the complete C3
  contract surface. All C3 exit criteria and the commit-by-commit security review
  pass locally; PR
  [#5](https://github.com/Loothore907/guardian-agent/pull/5) remains to be reviewed,
  pass final remote CI, and merge before the checkpoint is closed.
- Provider integration, the privileged broker, and approval UI remain downstream of
  C3's exit criteria.

## Next actions

1. Review PR #5 against the C3 exit criteria and claims matrix.
2. Merge only after final remote CI passes and review finds no blocking issue.
3. Close issue #4 and begin the smallest reviewable C4 runtime plan from updated
   `main`.

## C3 completion gate

C3 is complete only when its roadmap exit criteria pass, including fail-closed
unknown and malformed input, canonical equivalence, mutation-sensitive digests,
non-grantable mission expansion, evidence-backed assurance, and deterministic
policy precedence over Guardian output.

See [Development roadmap](roadmap.md#c3---mission-and-deterministic-contracts) for
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
