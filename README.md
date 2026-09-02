# Agentic Guardian

Agentic Guardian is an open-source, local-first capability firewall and task-scoped
runtime for AI agents. It lets users bring their own providers and credentials
while preventing agents and model vendors from receiving broader authority than
the current task requires in the documented reference environment.

**Mission:** keep credentials and privileged actions behind deterministic policy,
exact-request approval, and auditable execution.

The canonical domain is [`agentic-guardian.com`](https://agentic-guardian.com).
Registration is complete; a public deployment is not yet claimed. The domain is
intended for documentation, downloads, release metadata, and the competition
demo—not routine credential custody.

The project is being developed for the Nebius x NVIDIA Global AI Hackathon in the **Best Apps and Agents** track. The competition prototype will demonstrate one narrow, inspectable authorization flow rather than claim production-grade credential security.

## Core proposition

The user delegates work to a Guardian worker. The competition reference uses a
provider-neutral native worker with a versioned coding model served by Nebius;
future Codex, Claude Code, Cursor, or local adapters can implement the same narrow
contract. The user or worker may draft a Guardian mission, bounded Qwen review may identify
semantic gaps and formulate targeted questions, and deterministic Guardian code
compiles and clamps the candidate policy. Nemotron may only preserve or increase
scrutiny. Direct human confirmation activates the exact mission; Guardian then
constrains the session and mediates public research and privileged proposals. The
user authorizes later boundary crossings, and a broker executes only the exact
approved operation.

The model is not the root of trust.

The selected competition experience is terminal-first: the Guardian-owned CLI
and trusted launcher start the native worker inside the constrained runtime. The
judge configuration uses Nebius for application hosting and all model inference:
the coding worker, Qwen mission dialogue, and NVIDIA Nemotron risk review. It
requires no OpenAI API key. The roles remain separated by contracts, processes,
context projections, and budgets. A user or worker may draft the task, but only direct human confirmation of Guardian's
normalized mission can activate or expand authority. Routine setup, session
control, and audit stay local. A narrow web handoff may be used later for a
human-authentication ceremony that genuinely needs an HTTPS origin, then the user
returns to the terminal. The local one-turn post-confirmation Guardian mission-
brief boundary is implemented. Strict pre-activation mission-draft and review
contracts, the deterministic compiler/state machine, a credential-scoped mission-
dialogue review call, interactive bounded clarification, setup-risk review, and
integration of both assisted and structured reference paths with the compiler are
implemented and tested locally. The model calls run in separate one-use supervised
children; missing or stronger-than-confirm setup risk fails closed. Protected live
pre-activation evidence, a generalized credential-isolated native-worker loop, trusted
ceremony design, and cross-platform assurance remain goals.

The installation, provider accounts, billing, credentials, policy, and audit data
belong to the user. The intended setup flow stores Nebius, optional Tavily, and
operation-specific credentials through a trusted local ceremony into the host
operating system's credential store. The runner and models receive typed results,
never reusable keys. The first infrastructure slice now provides provider-scoped
contracts, deterministic fakes, trusted setup orchestration, and a tested Windows
Credential Manager adapter. The Windows CLI now supports provider enrollment,
non-secret status, and exact-confirmation revocation. Enrollment verifies through
one fixed read-only provider endpoint before storage. The protected Nebius mission-
brief and Super-to-Ultra Guardian path passes; cross-platform credential-store
evidence remains pending. `.env.local` remains development-only.

## Current status

Agentic Guardian has completed its product contract, enforcement feasibility, mission
contracts, C4 reference-runtime gate, and C5 bounded Tavily Search gateway. The supported Windows/WSL launcher
now creates evidence-bound sessions with a profile-derived MCP catalog and a
credential-free, network-disabled disposable command executor. C5 has a bounded,
credential-holding Tavily Search service connected through a launcher-bound local
pipe and the profile-derived MCP tool catalog; PR #12 merged it as `6cd1645` after
local, live-provider, security-review, and remote-CI gates passed. C6 is active in
issue #13. Its SQLite feasibility spike, production authority store, scoped
GitHub connection metadata, sole-owner authority service, authenticated typed IPC,
fixed-endpoint PR adapter, and exact read/merge broker path pass deterministic
local tests. The broker no longer opens SQLite directly; the reference authority
supervisor generates in-memory role capabilities, makes durable authority mandatory
for sessions launched through it, and supplies a lower-assurance development
approval issuer over the authorization role. The user-verifying WebAuthn issuer,
Linux peer-identity evidence, successful protected GitHub automatic refresh,
review, and remote CI remain. A deterministic fake Guardian interaction provider now produces one
bounded mission brief behind a short-lived authenticated local IPC service. It
cannot propose tools. Model assignments now come from a trusted, versioned role
policy: the current competition policy pins Qwen for mission dialogue and
Nemotron Super-to-Ultra for contextual risk, while permitting reviewed future
policy upgrades and mechanically retaining NVIDIA Nemotron for the hackathon.
The protected compatibility path passes; the CLI now exercises the fake assisted
formation path by default while the same child boundaries support Qwen and
Nemotron modes. Protected pre-activation and Nemotron-through-broker evidence
remain. No broader
security guarantee should be treated as
implemented until it appears in [Security claims](docs/security-claims.md) with
corresponding evidence.

The first C6 credential slice adds strict Nebius, Tavily, and GitHub references,
a deterministic store, verification-before-write setup orchestration, dependency
rules preventing agent-side imports, fixed-origin read-only verification, an
executable setup command, and a Windows Credential Manager adapter.
The protected Windows probe passes with a generated credential target that is
deleted after the test. The deterministic application-visible credential corpus
now covers process arguments/environment, model context, SQLite, authority
records, current log/trace surfaces, and public read/merge results. Live Nebius
verification and successful automatic GitHub token refresh remain open. The
authority and one-turn interaction services now run as supervised child processes
with bounded stdin bootstrap and fixed readiness; platform peer identity and
containment remain open. Protected GitHub enrollment, read, and merge pass;
automatic refresh currently reaches GitHub's documented endpoint but receives a
provider `HTTP 500`, so fresh device enrollment is the bounded fallback.

[ADR-0006](docs/adr/0006-competition-authority-and-adversarial-demo.md) fixes the
next competition target: sole-owner authority-service persistence, a narrow local
GitHub credential boundary for a disposable demo repository, passkey-bound exact
approval, a controlled polluted-page denial flow, and Linux runtime parity.
The local authority-service boundary is now implemented; the remaining items are
accepted design goals, not yet implemented guarantees.

[ADR-0007](docs/adr/0007-terminal-first-session-bridge.md) fixes the interaction
boundary: model-assisted mission drafting is untrusted until direct normalized
human confirmation; only a Guardian-launched and verified scaffold can be
Enforced; and the competition build does not ingest user API keys through model,
mission, or general web-form context.

[ADR-0008](docs/adr/0008-local-first-self-hosting-and-user-owned-credentials.md)
fixes the deployment and custody model: Guardian is self-hosted, users bring and
pay for their own provider accounts, secrets remain in local credential-holding
services, and cloud models are replaceable adapters rather than a Guardian-
operated service. Two model roles are defense in depth, not independent roots of
trust; deterministic policy remains authoritative.

The first local bootstrap slice now accepts objective-only draft input, derives a
fixed no-network/no-privileged-action profile inside the supervisor, requires an
exact digest-bound lower-assurance development confirmation, and rejects stale,
mutated, replayed, caller-expanded, and non-interactive attempts. It does not yet
implement the trusted web ceremony. The CLI now
attaches a one-turn Guardian mission-brief service using a deterministic fake
provider. The provider receives only normalized mission context and cannot propose
or execute tools. A separate W1 native-worker boundary now accepts an exact-bound,
one-use turn and returns either a bounded final response or a pending typed request
through deterministic fake and fixed-origin Nebius adapters. W2 binds a
credential-screened, Git-visible snapshot into a Guardian-owned session copy. The
copy persists across isolated local commands, never writes back automatically,
and is deleted on session close. W3 now independently binds one pending status or
local-command request, reauthorizes it, atomically consumes durable authority,
executes only against the W2 copy, and returns a sanitized exact result to a
mandatory final second worker turn. W4 now returns an exact sanitized denial through
that same final-turn path, durably contains ordinary violations, revokes on the
third violation in a five-minute window, revokes replay/binding near misses
immediately, and interrupts trusted-boundary failures. A persistent general
worker loop remains unimplemented. W5 now fixes the competition ordering outside
that loop: bounded research must produce non-empty session-bound provenance, an
out-of-scope GitHub merge attempt receives no approval and must stop with the exact
deterministic `scope_mismatch` denial, and only then may a separately exact-approved
demo-repository merge proceed. The coordinator is locally tested; live service and
CLI attachment remain.

[ADR-0015](docs/adr/0015-nebius-native-worker-and-judge-runtime.md) selects the
provider-neutral Nebius-native worker for the competition build while preserving
ADR-0011's key separation: Qwen is a bounded non-authoritative Guardian dialogue
assistant, Nemotron evaluates minimized risk, and deterministic code owns authority.

[ADR-0012](docs/adr/0012-pre-activation-mission-formation.md) fixes the ordering:
untrusted host draft, deterministic intake, bounded Qwen completeness review and
clarification, deterministic mission compilation, separate Nemotron mission-risk
review, exact human confirmation, and fresh constrained host launch. It also
distinguishes contained action denial from trusted-runtime interruption.

The dedicated public demonstration target is
[`Loothore907/guardian-agent-demo`](https://github.com/Loothore907/guardian-agent-demo).
It is configured for squash-only merges. PR #1 supplied the protected read/merge
evidence, and the deterministic reset procedure created open PR #2 for the next
demonstration. The final user-verifying approval and complete protected journey
evidence remain.

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

On the Codex Desktop Windows host, if the bundled `pnpm` command is visible but
`node` is not on `PATH`, use the repository launcher instead. It resolves the
bundled runtime and supplies Node to nested package scripts without changing the
machine-wide environment:

```powershell
.\scripts\pnpm.ps1 check
```

Useful commands:

```sh
pnpm dev:web
pnpm start:control-api
pnpm start:session-host
pnpm test:reference-runtime
pnpm test:session-enforcement
# Protected and credentialed; never runs in ordinary public CI:
pnpm test:live:tavily
pnpm test:live:credentials
pnpm test:live:nebius-models
```

Build before using either `start` command. The reference-runtime and enforcement
tests are Windows/WSL host checks; ordinary public CI uses deterministic,
credential-free tests. Live provider checks are explicit protected local
operations and are not part of `pnpm check`. The GitHub probe reads only
`GUARDIAN_DEV_GITHUB_TOKEN`; it does not consume ambient `GITHUB_TOKEN` or
`GH_TOKEN` values.

Run the Guardian session prototype from the exact Git project root. The preview
binds a credential-screened snapshot of tracked and non-ignored untracked files,
excluding reserved `.guardian` state. Guardian works in a separate session copy;
it does not write changes back to the source checkout and deletes the copy when
the supervisor closes.

On the supported Windows development host, credential setup is interactive:

```powershell
guardian setup nebius
guardian setup status nebius
guardian setup revoke nebius
```

Enrollment sends the entered credential only to the provider's fixed read-only
verification endpoint, then stores it in Windows Credential Manager if the
response is valid. Tavily replaces `nebius` for its typed slot. GitHub enrollment
uses an expiring GitHub App device flow instead of pasted or ambient tokens:

```powershell
$env:GUARDIAN_GITHUB_APP_CLIENT_ID = "Iv23liP8Sq3ZEAyeIHju"
$env:GUARDIAN_GITHUB_REPOSITORY_ID = "1352093544"
guardian setup github
```

The GitHub App must be installed only on the intended repository with Contents
write and Pull requests read. Guardian shows the fixed verification URL and user
code, verifies the resulting account, and stores access and refresh tokens in
separate Windows Credential Manager slots. Status returns only `available` or
`missing`; revocation requires the exact provider-specific confirmation and
deletes all three GitHub slots. Automatic refresh is implemented and passes
deterministic failure/rotation tests, but GitHub currently returns `HTTP 500` to
the protected device-flow refresh request. Until provider refresh succeeds, an
operator must repeat `guardian setup github` after the roughly eight-hour access
token lifetime; this prevents unattended long-running GitHub operation but does
not block a freshly enrolled demo session. macOS and Linux setup remain
unimplemented. See [ADR-0009](docs/adr/0009-github-app-device-enrollment.md).

If GitHub requires a private key before enabling the initial installation,
generate it only as a temporary bootstrap, install the App, then immediately
delete that key from the App settings and delete the downloaded PEM. Guardian
does not use or accept the private key.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before proposing changes. Security-sensitive behavior requires tests and documentation in the same pull request.

## License

Licensed under the [Apache License 2.0](LICENSE).
