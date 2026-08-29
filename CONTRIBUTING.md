# Contributing

Guardian Agent welcomes focused contributions that preserve its trust boundaries and keep the prototype auditable.

## Before opening a change

1. Read the [architecture](docs/architecture.md), [threat model](docs/threat-model.md), and [security claims](docs/security-claims.md).
2. Open or reference a GitHub issue for every meaningful change.
3. Record consequential architecture decisions in `docs/adr/`.
4. Keep the change narrow enough to review as one coherent security story.

## Branches and pull requests

- Do not commit directly to `main` after the bootstrap commit.
- Agent-created branches use `codex/<issue>-<slug>`.
- Human-created branches use `feat/`, `fix/`, `docs/`, `chore/`, or `security/`.
- Use a pull request and squash merge.
- Write the PR title in Conventional Commit form, for example `feat: bind approvals to caller sessions`.
- Do not enable auto-merge for security-boundary changes.

## Required change evidence

A pull request that changes authorization, policy, schemas, canonicalization, adapters, credentials, audit output, or model integration must include:

- the affected trust boundary;
- tests for intended and rejected behavior;
- a credential and logging exposure review;
- replay, expiry, scope, and mutation analysis where applicable;
- an update to security claims or an explicit statement that claims are unchanged; and
- documentation for any user-visible consequence.

## Dependencies

Explain every new production dependency in the pull request. Prefer small, maintained packages with clear licenses. Security-sensitive behavior must not be hidden behind an unreviewed convenience library.

## Secrets and data

- Never commit credentials, promo codes, API keys, tokens, private URLs, production identifiers, or user data.
- Use documented placeholders in examples.
- Keep local credentials outside the repository and inject them only into the privileged development process that requires them.
- If a secret is committed, stop work, revoke it, and follow the incident process before rewriting history.

## Verification

Canonical commands will be added after the implementation stack is selected. Until then, documentation changes must at minimum pass link, spelling, and Markdown checks when those checks become available.
