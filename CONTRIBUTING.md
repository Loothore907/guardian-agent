# Contributing

Agentic Guardian welcomes focused contributions that preserve its trust boundaries and keep the prototype auditable.

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

A pull request that changes session enforcement, assurance state, public research, authorization, policy, schemas, canonicalization, adapters, credentials, audit output, or model integration must include:

- the affected trust boundary;
- tests for intended and rejected behavior;
- a credential and logging exposure review;
- alternate-path and outbound-data analysis where applicable;
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

Install the exact locked dependency graph and run the complete ordinary suite:

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs formatting, linting, strict type checking, deterministic tests,
package-boundary enforcement, and the production build. On the documented
Windows/WSL reference host, also run `pnpm test:session-enforcement` for changes to
the launcher, sandbox, executor, assurance evidence, or credential boundary.

Public pull-request checks must not receive Tavily, Nebius, GitHub, or interaction
model credentials. Live-provider verification is explicit and protected.
