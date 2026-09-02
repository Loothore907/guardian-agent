# ADR-0008: Local-First Self-Hosting and User-Owned Credentials

- Status: Accepted
- Date: 2026-08-31
- Decision owners: Earl Ray
- Checkpoints: C6-C11
- Supersedes: the operator-provisioned credential and hosted-service assumptions in ADR-0006 and ADR-0007
- Corrected by: ADR-0011 for the external host-agent and internal Guardian model roles

## Context

Agentic Guardian is intended to reduce the authority that users must surrender to
agents and model vendors. A Guardian-operated service that receives customer API
keys would create a new credential custodian, a new billing and availability
dependency, and a high-value compromise target. It would also conflict with the
product's intended audience: people who already run agentic coding tools and want
an internal capability firewall under their own control.

The terminal-first launcher decision remains correct. What changes is the owner
and location of the deployment, provider accounts, credentials, policy, and audit
data. Cloud inference is currently necessary for the selected competition models,
but cloud use does not require Guardian's maintainers to possess users' accounts
or secrets.

## Decision

### Product and trust posture

Agentic Guardian is an open-source, local-first, self-hosted product. The user
owns and operates the Guardian installation, provider accounts, provider billing,
credentials, policy, sessions, and audit data. The project maintainers do not
provide routine credential custody or a shared production inference account.

The public domain is for documentation, downloads, release metadata, competition
demonstration, and narrowly scoped human ceremonies if they are later justified.
It is not the normal place where users enter provider secrets or construct every
session. A competition judge deployment may be separately provisioned and tightly
rate-limited, but it is demonstration infrastructure rather than the product's
trust architecture.

### Local setup and credential enrollment

`guardian setup` will be a trusted local ceremony. It will collect provider
credentials through hidden terminal input or a local-only user interface and
write them directly to an operating-system credential store or an explicitly
secured local alternative. It must not accept secrets from mission text, model
output, MCP tool arguments, browser URLs, shell command arguments, or the public
Guardian domain.

The supported target abstraction is:

- Windows Credential Manager;
- macOS Keychain;
- Linux Secret Service, with a documented secured local fallback only where a
  supported desktop secret service is unavailable.

`.env.local` remains a protected development convenience only. It is not the
installation, production, or judge credential mechanism.

Setup verifies a credential through its narrow provider adapter and returns only
non-secret status and account metadata. Rotation, replacement, revocation, and
capability disablement remain local user operations.

### Credential-holding provider services

The external host agent, Guardian model services, command sandbox, MCP client, and public UI
never receive a provider key, authorization header, credential-bearing URL, or
reusable secret handle. A typed local request is sent to a credential-holding
provider service. That service:

1. validates the exact session, caller, mission, profile, policy, lifecycle, and
   provider operation;
2. resolves the credential from the local store;
3. calls one fixed provider origin with service-owned headers and bounded input;
4. validates, bounds, and sanitizes the response; and
5. returns only the typed result and non-secret request metadata.

Provider adapters remain narrow. This decision does not authorize arbitrary
authenticated HTTP, arbitrary URLs, caller-controlled headers, or a generic
secrets proxy.

### Current provider requirements and future modes

The competition cloud mode currently requires a user-owned Nebius account and
credential for the interaction and guardian model calls. Tavily is required only
when the public-research capability is enabled. GitHub credentials or App
installation authority are required only when GitHub operations are enabled.
Missing credentials disable the corresponding capability; they do not widen or
silently reroute authority.

The Guardian-internal model roles are separate even when they share a Nebius account:

- the optional Qwen assistant receives normalized Guardian context and returns only
  a bounded mission brief or consequence explanation; it does not perform or
  propose the host agent's work;
- the Nemotron guardian receives a minimized, credential-free risk envelope and
  may preserve or increase the deterministic authorization floor.

Different roles, model families, and context projections reduce some correlated
failure modes but do not establish independent trust. Both cloud calls may share a
provider control plane, and transferable attacks remain possible. Deterministic
policy is the root of authority; model diversity is defense in depth only.

Provider choice will later be expressed through typed adapters. Planned operating
modes are cloud, hybrid, and fully local. A future small local guardian model may
remove its cloud dependency without changing the deterministic enforcement or
credential boundary. None of those future modes is claimed as implemented.

### Enforcement and MCP

MCP is the agent-facing interface, not the enforcement boundary. Enforced status
requires the Guardian-owned launcher or wrapper, verified runtime restrictions,
deterministic policy, credential-holding services, exact privileged broker, and
sanitized audit. Installing Guardian MCP tools in an unrestricted harness remains
Observed or Unknown because alternate network, shell, browser, tool, or credential
paths may exist.

## Consequences

- C6-C8 must add a local credential-store contract, a trusted setup path, narrow
  Nebius and Tavily resolution, and negative tests proving secrets never reach
  the runner, model context, CLI arguments, SQLite, logs, traces, audit, or public
  results.
- The current deterministic fake interaction provider and `.env.local` live-test
  drivers remain valid development evidence but are not an installable BYOK flow.
- Competition work must provide a clean self-hosted test build and may also
  provide a separately funded, rate-limited judge demo. General users must not
  depend on project-maintainer infrastructure.
- Documentation must disclose that selected prompts and minimized context leave
  the user's machine for Nebius in cloud mode, and that research queries leave for
  Tavily when research is enabled.
- ADR-0009 reconciles GitHub enrollment with local ownership through a
  repository-bound GitHub App device flow. Protected credential-path evidence is
  still required before the complete path is claimed implemented. The existing
  fixed typed adapter and exact-request broker remain valid.
- The domain deployment is no longer a prerequisite for routine session creation
  or provider credential enrollment.

## Rejected alternatives

- **Guardian-operated multi-tenant credential vault:** makes the project a
  custodian and central target and imposes operating cost on the maintainers.
- **Keys in agent-visible environment variables or config files:** permits the
  runner, tools, subprocesses, logs, or injected content to recover reusable
  credentials.
- **Pasting keys into a hosted Guardian page:** needlessly transfers trust and
  creates an online ingestion surface.
- **Treating two cloud models as independent security principals:** overstates
  protection against shared-provider failures and transferable attacks.
- **MCP installation as sufficient enforcement:** cannot exclude alternate paths
  in an unrestricted host process.

## Evidence required

Implementation claims require platform-specific credential-store tests; hidden-
input and local-UI secret-corpus tests; fixed-origin and caller-binding tests;
missing, revoked, rotated, wrong-provider, replayed, malformed, and oversized
request failures; process/environment/database/log/audit inspection; direct-
network and credential-path bypass tests in the reference runtime; and protected
live BYOK runs that expose no reusable secret to the interaction or guardian
model.
