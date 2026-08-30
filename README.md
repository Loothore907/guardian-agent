# Guardian Agent

Guardian Agent is a capability firewall and task-scoped runtime for AI agents. It lets an interaction agent research and propose useful authenticated actions without receiving raw credentials, unrestricted account authority, or unobserved external pathways in the documented reference environment.

The project is being developed for the Nebius x NVIDIA Global AI Hackathon in the **Best Apps and Agents** track. The competition prototype will demonstrate one narrow, inspectable authorization flow rather than claim production-grade credential security.

## Core proposition

The user defines a mission. A constrained interaction agent researches and proposes. Deterministic policy limits authority. A guardian model interprets contextual risk. The user authorizes boundary crossings. A broker executes only the exact approved operation.

The model is not the root of trust.

## Current status

Guardian Agent has completed its product contract, enforcement feasibility, mission
contracts, and local C4 reference-runtime gate. The supported Windows/WSL launcher
now creates evidence-bound sessions with a profile-derived MCP catalog and a
credential-free, network-disabled disposable command executor. No broader security
guarantee should be treated as
implemented until it appears in [Security claims](docs/security-claims.md) with
corresponding evidence.

## Security boundaries

- Public agent interfaces must never return raw credentials or credential-equivalent material.
- A session is labeled Enforced only when Guardian has evidence for its tool, filesystem, credential, and network restrictions.
- Prompt instructions do not substitute for runtime enforcement.
- Model output may maintain or increase a deterministic risk floor; it may never weaken one.
- Approval is bound to a canonical request digest, caller session, scope, expiry, and replay controls.
- Privileged execution is limited to typed adapter operations. Arbitrary authenticated HTTP and arbitrary shell execution are out of scope.
- Unknown, malformed, unsupported, or ambiguous operations fail closed.

See the [product contract](docs/product-contract.md), [architecture](docs/architecture.md), [threat model](docs/threat-model.md), and [claims matrix](docs/security-claims.md).

## Repository map

- `docs/adr/` - architecture decision records
- `docs/competition/` - competition requirements and provenance
- `docs/development/` - repository and CI policy
- `apps/` - separately scoped control, session, provider, broker, and web processes
- `packages/` - contracts and trust-zone-specific domain libraries
- `spikes/` - disposable feasibility evidence that production code must not import
- `.github/` - contribution and review templates
- `AGENTS.md` - repository guidance for coding agents and reviewers

The accepted implementation decision is [ADR-0003](docs/adr/0003-implementation-stack-and-package-boundaries.md).

## Development

Prerequisites:

- Node.js 24 LTS, version 24.19.0 or later but below 25;
- pnpm 11.19.x; and
- for the C1 isolation proof, Windows with WSL 2 and an Ubuntu 22.04 distribution.

Install and run the complete ordinary verification suite:

```sh
pnpm install --frozen-lockfile
pnpm check
```

Useful commands:

```sh
pnpm dev:web
pnpm start:control-api
pnpm start:session-host
pnpm test:reference-runtime
pnpm test:session-enforcement
```

Build before using either `start` command. The reference-runtime and enforcement
tests are Windows/WSL host checks; ordinary public CI uses deterministic,
credential-free tests. Live Tavily and Nebius checks are explicit protected local
operations and are not part of `pnpm check`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before proposing changes. Security-sensitive behavior requires tests and documentation in the same pull request.

## License

Licensed under the [Apache License 2.0](LICENSE).
