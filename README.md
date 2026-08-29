# Guardian Agent

Guardian Agent is a capability firewall for AI agents. It lets an interaction agent propose useful authenticated actions without giving that agent raw credentials or unrestricted account authority.

The project is being developed for the Nebius x NVIDIA Global AI Hackathon in the **Best Apps and Agents** track. The competition prototype will demonstrate one narrow, inspectable authorization flow rather than claim production-grade credential security.

## Core proposition

The interaction agent proposes. Deterministic policy constrains. A guardian model interprets contextual risk. The user authorizes boundary crossings. A broker executes only the exact approved operation.

The model is not the root of trust.

## Current status

Guardian Agent is in specification and governance bootstrap. No security guarantee described in this repository should be treated as implemented until it appears in [Security claims](docs/security-claims.md) with corresponding evidence.

## Security boundaries

- Public agent interfaces must never return raw credentials or credential-equivalent material.
- Model output may maintain or increase a deterministic risk floor; it may never weaken one.
- Approval is bound to a canonical request digest, caller session, scope, expiry, and replay controls.
- Privileged execution is limited to typed adapter operations. Arbitrary authenticated HTTP and arbitrary shell execution are out of scope.
- Unknown, malformed, unsupported, or ambiguous operations fail closed.

See the [architecture](docs/architecture.md), [threat model](docs/threat-model.md), and [claims matrix](docs/security-claims.md).

## Repository map

- `docs/adr/` - architecture decision records
- `docs/competition/` - competition requirements and provenance
- `docs/development/` - repository and CI policy
- `.github/` - contribution and review templates
- `AGENTS.md` - repository guidance for coding agents and reviewers

Source directories and executable commands will be added only after the implementation stack is recorded in an ADR.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before proposing changes. Security-sensitive behavior requires tests and documentation in the same pull request.

## License

Licensed under the [Apache License 2.0](LICENSE).
