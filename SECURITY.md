# Security Policy

Agentic Guardian is an experimental security-oriented prototype. It is not a production credential manager, authentication provider, or authorization system.

## Supported versions

No production release is currently supported. Security support policy will be defined before the first tagged release.

## Reporting a vulnerability

Do not open a public issue for a vulnerability, suspected secret exposure, or exploit path.

Until GitHub private vulnerability reporting is enabled, contact the repository owner privately through the email address associated with the GitHub profile. Include:

- affected revision or version;
- prerequisite access and configuration;
- reproducible steps;
- observed and expected behavior;
- potential credential, authorization, privacy, or integrity impact; and
- any suggested mitigation.

Do not include live credentials, personal data, or unnecessary exploit data. The project will acknowledge a valid report, coordinate remediation, and credit reporters who request attribution when disclosure is safe.

## Security claims

Only properties marked **Implemented and tested** in [docs/security-claims.md](docs/security-claims.md) are asserted by the project. Design goals and planned tests are not guarantees.

## Scope boundaries

The hackathon prototype does not claim to defend against:

- compromised host operating systems or privileged local malware;
- compromised vaults, authenticators, model providers, or service providers;
- compromised adapters running inside the trusted execution boundary;
- arbitrary third-party agent harnesses that do not provide the documented Guardian Session restrictions;
- direct external pathways or credentials deliberately enabled outside Guardian;
- all prompt injection or social engineering;
- side channels outside the documented test environment; or
- production-grade biometric, hardware-backed, or cryptographic assurance unless specifically implemented and verified.
