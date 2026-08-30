# ADR-0003: Implementation Stack and Package Boundaries

- Status: Accepted
- Date: 2026-08-29
- Decision owners: Earl Ray
- Checkpoint: C2 - Stack and session architecture

## Context

ADR-0002 requires one enforced reference Guardian Session and rejects treating MCP
as the isolation boundary. C1 proved that the current machine can run useful local
commands inside an unprivileged WSL 2 namespace with a temporary filesystem and no
direct public network path, host credential mounts, or provider environment. It
also proved a protected live chain in which a Nebius-hosted model proposed a typed
research action and the trusted launcher invoked Tavily without exposing either
credential to the worker.

The C1 code is deliberately a spike. It combines trusted responsibilities in one
launcher, uses ad hoc JSON lines instead of the final protocol, and runs the worker
as namespace root mapped to the invoking non-root WSL identity. The implementation
must retain the proven boundary while separating credentials, policy, providers,
privileged execution, and user experience.

## Proposed decision

### Language and workspace

Use a TypeScript pnpm workspace targeting Node.js 24 LTS (`>=24.19.0 <25`). Use ECMAScript modules,
strict TypeScript settings, explicit package exports, and a checked-in pnpm lockfile.

Use TypeScript for trusted orchestration and application code because the project
depends heavily on discriminated unions, exact protocol contracts, shared schemas,
and a polished web demonstration. Keep the small Linux namespace bootstrap in Bash
and permit fixture helpers in Python only where the runtime boundary makes them
materially simpler.

### Runtime architecture

The supported development reference runtime is Windows with WSL 2 and Ubuntu
22.04. The supported hosted runtime will use the equivalent Linux namespace
mechanism. C4 must either prove parity or explicitly define a separate hosted
profile and assurance label.

The interaction model is not the operating-system sandbox process. A trusted
session host owns the model loop, exposes only the mission-approved tool catalog,
validates every model proposal, and sends local command requests into a disposable
network-disabled executor. This keeps model-provider access outside the command
sandbox while ensuring model output has no ambient execution authority.

Run credential-bearing responsibilities as separate processes with minimal
environment variables:

- the research service alone receives the Tavily credential;
- the guardian service alone receives the Nebius guardian credential;
- the privileged broker alone receives or resolves the GitHub connection;
- the session host may receive a separate interaction-model credential; and
- the local executor and web client receive no provider or service credentials.

The trusted launcher creates those processes and their local communication
channels before the model loop starts. Child processes receive allowlisted
environment variables rather than inheriting the launcher environment.

### Protocols

Use MCP as the typed agent-facing capability protocol. MCP tool descriptions are
not policy and do not establish assurance. The session host derives the exposed
MCP catalog from the immutable mission and versioned session profile.

Use private local IPC for trusted service boundaries. Begin with framed JSON-RPC
over inherited standard input/output or local sockets; do not expose provider or
broker services on a public listener. Every message is schema validated on both
sides, rejects unknown fields, has a bounded size and timeout, and carries session,
caller, request, and policy identifiers where applicable.

Use HTTP only for the human control API and web interface. Bind development
listeners to loopback by default. Authenticated remote hosting and CSRF protection
must be decided before a public deployment.

### Contracts and validation

Define runtime contracts with strict Zod 4 objects and generate JSON Schema from
the same contracts for MCP inputs, internal messages, provider structured output,
fixtures, and documentation where safe. Never use passthrough objects at a trust
boundary. Parsing rejects unknown properties and does not silently grant defaults,
coerce security-relevant values, or remove attacker-supplied fields.

Use RFC 8785 JSON Canonicalization Scheme for digest input. Reject non-finite
numbers, unsafe integers, duplicate semantic fields, unsupported Unicode forms,
and values outside the contract before canonicalization. Domain-separate every
digest with the contract name and version.

Guardian/model output is parsed into a narrow schema and enters policy only as
untrusted evidence. It may preserve or increase the deterministic authorization
floor and may never convert denial to allowance.

### Persistence

Evaluate Node's built-in `node:sqlite` in the trusted broker process for prototype
approvals, nonce consumption, connections metadata, and audit events. As of this
decision it is a Node release-candidate API, not a production-stable dependency.
Adopt it only after targeted transaction, uniqueness, crash, restart, and supported
Node-version tests pass. Otherwise revise this ADR to use a reviewed SQLite adapter
or PostgreSQL rather than hiding the limitation. Use explicit transactions and
uniqueness constraints for one-time approval consumption. The database and any
credential-store handle remain outside the session filesystem.

Do not store reusable GitHub, Tavily, Nebius, or interaction-model secrets in
SQLite. `.env.local` is development-only. The supported demo connection mechanism
and operating-system or hosted secret store remain a C6 decision.

### Application and package layout

```text
apps/
  control-api/          trusted human mission, session, approval, and audit API
  web/                  React mission, activity, approval, and audit interface
  session-host/         interaction loop, MCP catalog, orchestration, assurance
  research-service/     credential-scoped Tavily process
  guardian-service/     credential-scoped Nemotron process
  broker-service/       credential resolution, final validation, execution
packages/
  contracts/            exact schemas, identifiers, protocol versions
  canonical/            normalization, RFC 8785 encoding, digests
  policy/               mission and deterministic authorization lattice
  session/              profiles, lifecycle, evidence, assurance states
  executor/             disposable local command runtime
  research/             bounded requests, provenance, journey events
  guardian/             risk envelopes, provider interface, precedence
  authorization/        exact approvals, expiry, replay, revocation
  broker/               final revalidation and typed execution orchestration
  adapter-github/       fixed GitHub read and merge capabilities
  audit/                 sanitized append-only event contracts and persistence
  test-support/          fake providers, fixtures, adversarial generators
spikes/
  enforced-session/     retained C1 evidence; never imported by production apps
```

The dependency graph will be enforced in CI. `contracts` and `canonical` are at the
base. Domain packages may depend on them but not on applications. Provider packages
must not import broker, adapter, authorization-persistence, or credential-resolution
internals. Adapters must not import interaction, research, or guardian packages.
The local executor must not import any provider, adapter, broker, or credential code.

### API, UI, and testing

Use Fastify for the narrow control API and React with Vite for the web interface.
Use platform `fetch` for Tavily, Nebius, and GitHub instead of broad provider SDKs;
each provider wrapper fixes its base URL, method, headers, request shape, response
allowlist, timeout, and maximum body size.

Use Vitest for unit and integration tests and fast-check for canonicalization,
mutation, replay, expiry, binding, scope, and redaction properties. Use Prettier for
formatting, ESLint with TypeScript-ESLint for linting, and dependency-cruiser for
mechanical package-direction checks. Biome was evaluated and rejected because this
Windows Application Control policy blocks its downloaded native executable in the
OneDrive workspace. Keep deterministic fake providers sufficient for public
pull-request CI; live-provider checks run only in protected workflows or explicit
local commands.

### Initial dependency budget

Production dependencies proposed for the scaffold:

- `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, and `zod` for the
  modular MCP v2 stdio surface and shared strict runtime contracts;
- `json-canonicalize` for RFC 8785 canonical JSON;
- `fastify` for the trusted control API; and
- `react` and `react-dom` for the demonstration interface.

Development dependencies proposed for the scaffold:

- `typescript` and Node/React type packages;
- `vitest` and `fast-check`;
- `vite` and `@vitejs/plugin-react`;
- `prettier`, `eslint`, `@eslint/js`, and `typescript-eslint`; and
- `dependency-cruiser`.

No dependency is installed until this ADR is accepted and the dependency set is
approved under the repository working agreement. Pin exact versions in the
lockfile and review licenses, transitive dependencies, maintenance, and known
vulnerabilities before the first commit.

## Consequences

- Trust zones are visible as processes and packages rather than naming conventions.
- The interaction model can remain hosted or later become local without changing
  the capability boundary.
- WSL 2 is a real development prerequisite; Linux hosting parity becomes an
  explicit release risk.
- Direct provider API wrappers require more small validation code but avoid broad
  SDK capability and make outbound behavior auditable.
- The workspace is larger than a conventional hackathon application, but most
  packages begin as thin contracts and make prohibited dependencies reviewable.
- Built-in SQLite may avoid a native database dependency, but its release-candidate
  status is a recorded C3/C6 risk and the prototype remains limited to a single
  trusted broker instance until a later persistence decision.
- The C1 spike remains reproducible evidence and is not silently promoted into
  production architecture.

## Rejected alternatives

- **One full-stack framework process:** convenient, but it collapses UI, model,
  provider, and credential-bearing execution boundaries.
- **Python-only application:** viable for model integration but weaker for the
  shared browser/runtime contract workflow and not justified by the current team
  or spike.
- **Hosted interaction model with unrestricted tools:** repeats the bypass problem
  rather than demonstrating Guardian.
- **Model process inside a credential-bearing shell:** exposes credentials and
  makes arbitrary model-generated commands materially dangerous.
- **TypeBox plus a direct Ajv dependency:** credible, but it duplicates the Zod 4
  schema stack already required by the modular MCP v2 SDK. Strict Zod contracts can
  generate the JSON Schema needed at other boundaries with fewer direct dependencies.
- **Provider SDKs for Tavily, Nebius, and GitHub:** broader dependency and capability
  surfaces than the few fixed HTTPS operations required by the demonstration.
- **Docker as a current local prerequisite:** no Docker or Podman runtime is
  installed; C1 already proved the required namespace primitive directly.
- **In-memory approvals and replay state:** cannot support atomic one-time
  consumption or honest restart behavior.
- **Production claims from the C1 spike:** the spike lacks the final identity,
  protocol, lifecycle, audit, and hosting controls.

## Acceptance conditions

Accept this ADR only after:

1. the production and development dependency budget is approved;
2. the workspace scaffold enforces the documented package direction;
3. fake-provider tests run without live secrets;
4. the C1 runtime proof remains reproducible from a canonical command;
5. local and CI Node, pnpm, WSL/Linux, and hosting prerequisites are documented; and
6. unresolved public-hosting and GitHub-connection decisions are assigned to their
   later checkpoints rather than implied complete.

## Decision confirmation

Accepted on August 29, 2026 after:

- explicit approval of the production and development dependency budget;
- creation of 18 application and package projects with TypeScript project references;
- a passing dependency-cruiser graph over 31 modules and 12 internal dependencies;
- a real MCP v2 in-memory integration test that discovers and calls the sole
  scaffolded read-only tool;
- a passing local `pnpm check` covering format, lint, typecheck, eight tests,
  dependency direction, and production build;
- a production dependency audit with no known vulnerabilities;
- a production license inventory containing only MIT, ISC, and BSD-3-Clause
  dependencies; and
- a lockfile that passes the configured pnpm supply-chain release-age policy with
  no exceptions.

The GitHub Actions workflow is configured but cannot provide remote-run evidence
until this uncommitted branch is explicitly committed and pushed. C2 remains open
for that evidence even though this ADR is accepted.
