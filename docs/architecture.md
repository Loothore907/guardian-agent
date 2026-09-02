# Architecture

## Purpose

Agentic Guardian mediates between an untrusted worker, public information sources,
and privileged service operations. The competition reference build uses a
provider-neutral native worker with a versioned Nebius-hosted coding model;
future Codex, Claude Code, Cursor, or local adapters may implement the same worker
contract. Guardian
protects credential confidentiality, limits credential-derived authority, and
constrains the host's external pathways where the documented runtime can enforce
them.

## Trust zones

1. **Human control zone** - trusted local setup and launcher confirmation, optional narrow web-origin ceremonies, WebAuthn challenge and assertion, approval, denial, revocation, and assurance display.
2. **Session-control zone** - trusted launcher, versioned session profile, tool allowlist, disposable filesystem scope, local command sandbox, network policy, task lifetime, and runtime evidence.
3. **Untrusted worker zone** - the selected coding or research model, prompts, plans, local command requests, retrieved documents, webpages, repository content, and agent-supplied rationale.
4. **Public research zone** - bounded Tavily search, map, crawl, and extract operations; source provenance; untrusted evidence normalization; and minimized research-journey events.
5. **Deterministic mediation zone** - schemas, normalization, canonicalization, mission scope, policy, data-egress checks, replay controls, and minimum authorization level.
6. **Contextual judgment zone** - constrained Nemotron inference receiving minimized, credential-free context and recommending preserved or increased scrutiny.
7. **Authorization zone** - consequence presentation, user-presence evidence, exact-request binding, expiry, denial, and revocation.
8. **Privileged execution zone** - central local authority service, user-owned local secret resolution, short-lived credential minting where supported, typed adapters, final validation, execution, response sanitization, and audit emission.

## Reference flow

1. The user delegates work to the selected worker and starts or requests a Guardian session. A prompt-level Guardian invocation may submit an untrusted task and policy draft, but it does not create authority.
2. Deterministic intake validates the draft envelope, rejects secret-like, malformed, or unsupported fields, and identifies mechanically missing requirements.
3. In the normal cloud `qwen_assisted` route, Qwen receives a bounded credential-free draft projection and returns either semantic readiness or structured missing-field codes and targeted human questions. Clarification answers re-enter deterministic intake. A deliberately selected structured route may bypass Qwen without changing authority semantics.
4. Guardian code revalidates the completed answers, normalizes and clamps them to supported capabilities, and produces the candidate mission and session profile. Qwen may explain the candidate but cannot validate or activate it.
5. When deterministic policy requires setup risk review, Nemotron receives a separate minimized mission-risk envelope and may preserve or increase scrutiny. It cannot widen or activate the candidate.
6. Guardian presents the exact normalized candidate and consequences; direct human confirmation of its digest binds the versioned mission and profile.
7. For Enforced mode, the trusted launcher starts a fresh worker process with no provider credentials, an explicit tool set, and default-denied public egress for local commands. Existing unrestricted hosts remain Observed or Unknown.
8. The worker performs bounded local work. In the competition configuration its versioned coding model is served by Nebius Token Factory; public research and authenticated operations remain available only through mission-approved Guardian capabilities.
9. Before a Tavily request, deterministic mediation checks mission relevance, destination, query shape, secret-like outbound content, traversal depth, volume, and remaining budget.
10. Guardian labels Tavily results untrusted, records minimized provenance events, and returns bounded evidence to the host agent.
11. The host agent submits a typed action proposal. Agent-supplied intent or rationale remains untrusted unless it matches the mission captured in the human control zone.
12. The system validates and normalizes the proposal, compares it with the mission, and computes an allow, deny, or minimum authorization floor.
13. At selected semantic-risk boundaries, Nemotron receives a minimized credential-free action-risk envelope containing normalized facts, bounded risk signals and excerpts, and the deterministic floor.
14. Structured guardian output may preserve or increase the required authorization level but never reduce it or override a deterministic denial.
15. If required, the human sees a consequence-oriented approval prompt bound to the exact canonical request and relevant resource version, then produces a user-verifying WebAuthn assertion over a short-lived bound challenge.
16. The central authority service verifies the assertion and records one exact authorization. It is the sole SQLite owner; trusted components reach it only through authenticated, typed local IPC.
17. The broker independently revalidates, re-normalizes, recomputes the digest, and checks mission, scope, caller, connection, expiry, nonce, use count, policy version, and current resource version.
18. A credential service resolves a short-lived or narrowly scoped GitHub credential just in time. A typed adapter performs the exact operation without exposing that credential to the host, research, session-command, guardian-model, database, or client zones.
19. The broker sanitizes the result and emits audit evidence without credential material or unnecessary public content. Qwen may explain a sanitized denial or consequence, but its explanation is not the decision record.

## Control and data planes

```text
Human control plane
  local setup -> OS credential store
  host/user draft -> deterministic intake -> Qwen completeness review
                              ^                  |
                              +-- clarification--+
                                      |
                                      v
                       deterministic mission compiler
                                      |
                       Nemotron mission-risk review
                                      |
                       normalized human confirmation
                                      |
                    fresh constrained worker launch
                                      |
                                      +-> optional narrow ceremony / WebAuthn
                                      |
                                      v
Guardian-controlled worker runtime
  Nebius-native worker -> pending typed Guardian request -> exact W3 dispatcher
       ^                                                     |
       +---------------- sanitized typed result -------------+
       |                    +-> Guardian public research -> Tavily
       |                    +-> deterministic policy
       |                    |      -> optional Nemotron action risk
       |                    |      -> authorization
       |                    +-> privileged broker
       |                           -> authority service (sole SQLite owner)
       |                           -> narrow credential -> typed GitHub adapter
       +<- sanitized result and optional Qwen explanation
  network-disabled command sandbox; no reusable provider credentials
```

MCP is the approved agent-facing protocol for Guardian capabilities. It does not establish the enforcement boundary by itself. The launcher, runtime restrictions, credential separation, policy, and broker establish that boundary together.

## Terminal-first session bridge

The reference product begins in the Guardian-owned terminal CLI or a supported
worker integration. A prompt-level Guardian call is an invocation signal only:
it asks Guardian to begin an untrusted draft flow. The host may propose a coherent
policy from the user's task, but Guardian does not trust that proposal merely
because it came from the host.

Deterministic intake screens and bounds the draft before any model call. In the
normal cloud route, Qwen reviews semantic completeness and formulates targeted
questions; it cannot compile or approve authority. Guardian code revalidates the
answers, produces the strict mission and profile, and presents their security-
relevant consequences. After direct human confirmation, the launcher starts or
wraps a fresh selected host process inside the documented runtime. The host may
later request expansion; it cannot activate a draft, confirm it, or bind a
stronger profile.

The canonical web origin is primarily a documentation, distribution, and
competition-demonstration surface, not the routine agent workspace or credential
store. If a narrow hosted ceremony is later used, the launcher uses a short-lived,
one-time handoff bound to the initiating request, user, caller, digest, nonce,
expiry, and return channel.
Opaque references rather than authority or credentials appear in URLs. A browser
click by the agent does not substitute for human confirmation or user-verifying
WebAuthn.

When Guardian tools are added to an already-running unrestricted harness,
Guardian can mediate its own capabilities but cannot rule out alternate network,
shell, browser, credential, or tool paths. That integration is Observed or
Unknown. Enforced requires the trusted launcher and verified reference runtime.

Provider secrets do not cross the bridge. A trusted local `guardian setup`
ceremony stores user-owned credentials in an OS credential store or documented
secured local alternative. Narrow credential-holding services resolve them for
fixed provider origins and typed operations; the runner receives only sanitized
results. Universal scaffold integration and a generic secrets vault remain
outside the competition scope. See [ADR-0007](adr/0007-terminal-first-session-bridge.md)
and [ADR-0015](adr/0015-nebius-native-worker-and-judge-runtime.md).

The implemented Guardian mission-brief slice remains narrower than the complete
interactive pre-activation UX. It binds one IPC capability to the exact session,
caller, mission, profile, policy version, and lifetime. The runner request cannot
carry a prompt or alter the fixed mission context. The provider service validates
strict output and permits only a bounded mission brief. It cannot return a tool
proposal. The first turn
is consumed before provider invocation, so retry cannot repeat it. The bootstrap
returns only the validated bounded outcome and provider request identifier, never
the IPC endpoint or capability; recognizable credential forms are redacted from
brief text. This slice uses a deterministic fake provider by default in a short-
lived supervised child and closes it after one turn; a protected current-policy
mission-brief path also passes. The separate pre-activation `ready` /
`needs_clarification` contract, bounded provider projection, deterministic mission
compiler, model-policy binding, explicit route metadata, exact-digest consumption,
and structured reference-bootstrap integration now pass locally. The assisted CLI
now relays bounded questions, revalidates complete revisions, invokes a separate
digest-bound setup-risk child, and refuses confirmation when required judgment is
unavailable, denies, or needs an unsupported step-up ceremony. Protected live
pre-activation compatibility, platform peer identity and containment, richer
transition explanations and a generalized native-worker loop remain pending.

## Native worker-turn boundary

The first provider-neutral worker boundary is implemented after exact mission
confirmation. Trusted code creates a canonical turn envelope bound to session,
caller, mission/profile versions, deterministic and model policies, confirmed
worker assignment, turn number, lifetime, allowed tools, and remaining budgets.
A fresh opaque capability permits exactly one local IPC turn; wrong bindings,
pre-activation use, expiry, replay, and oversized or malformed frames fail before
provider invocation.

The short-lived worker service is separate from the interaction, Guardian-risk,
authority, broker, and command-sandbox processes. Its deterministic fake and
Nebius implementations share one narrow interface. Only the Nebius worker-service
process resolves `nebius/default`, and it calls the fixed Token Factory origin
with the policy-assigned native-worker model. The provider context excludes the
credential, trusted IDs, and turn digest.

Strict output permits either a bounded credential-safe final response or one
typed request from the confirmed catalog. The model cannot provide a proposal ID,
session binding, approval or assurance state, arbitrary transport fields, or
shell-shaped command. W1 returns a validated request as pending and performs no
effect. See [ADR-0016](adr/0016-exact-bound-native-worker-turns.md).

W3 connects that pending request to exactly one result round-trip. Trusted code
creates a second canonical envelope binding the source turn and request digest,
exact session identity and policy, lifetime, assigned worker, and confirmed W2
workspace result. The dispatcher reparses it, rechecks the active runtime, and
supports only session status or the existing W2-bound local-command closure. A
dedicated authority role atomically records the unique execution ID/digest and
decrements the total and capability-specific durable budgets before an effect.

Sanitized bounded output is returned under an exact result digest. Multiline
stdout and stderr are represented in canonical inputs by byte length and SHA-256
digest while the worker receives the sanitized text. Turn 2 includes the result,
exposes no trusted bindings in its provider projection, has an empty tool catalog,
and must finish. A second request fails closed. This is a two-turn vertical slice,
not a persistent general loop or denial-containment implementation; see
[ADR-0018](adr/0018-exact-one-round-trip-worker-tool-execution.md).

## Session workspace boundary

The trusted supervisor now plans one credential-screened, Guardian-managed copy
from an explicit Git project root before it creates a confirmable preview. The
public selection contains only a project label, opaque source and snapshot
digests, bounded limits, the fixed `/workspace` mount, session persistence,
delete-on-close cleanup, and no-host-writeback policy. This selection is part of
the exact preview digest; the raw host path is never public.

After confirmation, the materializer independently revalidates the source-root
identity and complete Git-visible manifest, copies only tracked and non-ignored
untracked regular files outside the reserved `.guardian` state subtree, and
creates a fresh no-remote Git baseline with no
inherited credential helper. Unsafe paths, symlinks or junction ancestors,
credential-bearing filenames or high-confidence content, mutations, collisions,
limits, and target reuse fail closed.

Each WSL command receives the same writable copy at `/workspace` while the rest of
the chroot remains disposable and network-disabled. Source changes never write
back automatically. Supervisor close removes only the exact session root that
Guardian created. W3 can invoke this exact prepared closure but cannot supply or
replace its host path. See
[ADR-0017](adr/0017-credential-safe-session-workspaces.md) and
[ADR-0018](adr/0018-exact-one-round-trip-worker-tool-execution.md).

Model IDs are selected by a trusted versioned role policy under
[ADR-0013](adr/0013-versioned-model-role-policy.md). The current competition
policy is reproducibly pinned, but it is not permanent: a reviewed policy version
may upgrade mission dialogue or risk models. Session prompts cannot select model
IDs, and every hackathon policy mechanically retains distinct NVIDIA Nemotron
primary and escalation risk roles.

## Session assurance

Guardian reports:

- **Enforced** only when it launched the documented runtime and can associate the active session with verified tool, filesystem, credential, and network configuration.
- **Observed** when Guardian mediates its own calls but cannot rule out alternate tools, credentials, or network paths.
- **Unknown** when runtime evidence is insufficient.

Assurance state is part of the audit record and approval presentation. A lower-assurance session may require stricter policy, but it may not be silently presented as Enforced.

## Denial, revocation, and interruption

The target runtime distinguishes a rejected action from a failed trust boundary.
A policy, scope, budget, destination, or approval rejection contains that exact
attempt, records a sanitized decision, and normally returns a typed result so the
host can continue otherwise permitted work. Qwen may explain the sanitized result
but cannot alter it.

Deterministic policy may revoke or interrupt a session immediately for a defined
high-severity event or after a bounded pattern of repeated violations within a
configured window. Counts, severity classes, windows, and thresholds are versioned
policy—not model recommendations. Unexpected trusted-service or runtime failure
interrupts the session and requires explicit human creation of a fresh session;
it is not treated as an ordinary action denial. The current one-turn CLI does not
yet implement the continuing host loop or repeated-violation policy.

## Mission and session profile

A mission records trusted human intent and the desired outcome. A session profile defines enforceable limits, including:

- allowed Guardian and local tools;
- local filesystem and write scope;
- network and destination policy;
- allowed service connections and resources;
- time, action-count, search, and volume limits;
- read, prepare, and execute permissions;
- external-data egress restrictions;
- escalation and revocation behavior; and
- profile and policy versions.

The interaction agent may draft a mission or request a scope change. Model or
public prose remains untrusted until a human confirms Guardian's normalized
representation through the trusted control plane; the agent may not grant or
confirm authority.

## Public research journey

Tavily maps websites and retrieves public evidence; Guardian maps the agent's Tavily-mediated journey. Search relevance is not treated as trust or safety.

Research events should retain the minimum fields needed to explain decisions, such as task, sequence, operation, bounded domain or URL, content digest, trust label, deterministic signals, retrieval time, and provider request identifier. Full raw content should not be copied into durable audit storage unless a documented fixture requires it.

The research gateway must prevent the approved path from becoming an exfiltration channel. Query length, opaque encodings, secret-like material, private content, destinations, and traversal parameters require deterministic checks before any provider call.

In the reference runtime, the launcher binds each research-enabled session to one
local named pipe or Unix-domain socket and an opaque IPC capability. The session
host receives that capability but not the Tavily credential; the separate research
process receives the strict service configuration and credential. Both peers
validate bounded schemas and exact session, caller, mission, profile, policy, and
lifecycle bindings. See [ADR-0004](adr/0004-session-bound-research-ipc.md).

## Dependency direction

The exact package layout is deferred to ADR-0003. The intended dependency direction is:

```text
contracts <- mission and session policy <- trusted launcher/orchestration
contracts <- deterministic action policy <- application orchestration
contracts <- research gateway <- application orchestration
contracts <- interaction IPC <- credential-holding interaction service <- trusted orchestration
contracts <- credential store <- trusted setup and credential-holding services
contracts <- guardian provider <- application orchestration
contracts <- adapters <- privileged broker <- application orchestration
contracts <- audit
contracts <- authority client <- trusted control, research, and broker orchestration
contracts <- durable authority store <- central authority service
```

The command sandbox must not import or receive provider credentials. Agent-facing
interaction and guardian domain packages must not import credential resolution or
privileged adapter internals; only their credential-holding application services
may resolve the narrow provider slot. Privileged adapters must not interpret
prompts, public prose, or model output.

The first credential-store slice supports only Nebius, Tavily, and GitHub
references. Its Windows adapter uses fixed Credential Manager targets and sends
secret input to a static native-API helper through stdin, never argv or the helper
environment. Status is non-secret, and temporary resolved byte copies are scoped
to credential-holding callbacks and zeroed afterward. The trusted setup
orchestrator verifies the exact provider before writing and emits only bounded
account metadata. The executable Windows CLI supports enroll, non-secret status,
and exact-confirmation revoke. Enrollment calls only the fixed read-only Nebius
Token Factory models, Tavily usage, or GitHub authenticated-user endpoint, rejects
redirects and oversized or malformed responses, and sanitizes every failure.
Protected live verification, process supervision, and Linux/macOS adapters remain incomplete; see the
[C6 credential-enrollment evidence](development/evidence/c6-credential-enrollment.md).

The C6 single-host authority store is a narrow SQLite infrastructure package that
depends only on strict contracts. The central authority service is its sole
runtime owner. Provider, interaction, adapter, command-sandbox, launcher,
research, and broker packages may not open the database; trusted orchestration
uses a narrow authenticated authority client. Credentials, WebAuthn private
material, and ephemeral IPC capabilities never enter the schema. Existing direct
broker-store integration has been removed: the broker depends on an asynchronous
authority-client interface and its application boundary constructs an authenticated
local IPC client. The launcher and research service support their narrow durable
operations. The reference authority supervisor now generates the four role
capabilities in memory, starts the sole authority owner, injects authority into
sessions launched through it, and exposes a development-confirmation issuer over
only `approval.store`. ADR-0010 moves the authority owner into one supervised child
and the fake interaction provider into one short-lived child per turn. Both use a
bounded stdin bootstrap, minimal environment, exact readiness, bounded shutdown,
and fail-closed no-respawn behavior. Platform peer identity and containment and
the user-verifying WebAuthn issuer remain C6-C8 work.

The credential-isolated model slice currently pins the post-confirmation Qwen
mission-brief assistant and Nemotron guardian
to the fixed Token Factory chat-completions origin. Each adapter resolves only the
`nebius/default` slot inside its own service callback; neither the supervisor nor
the typed model context carries the credential. Qwen receives normalized mission
context and cannot propose or perform host work. This does not yet implement the
pre-activation completeness-review contract. Nemotron receives a separate minimized envelope containing the proposal,
deterministic floor, bounded risk signals, and bounded untrusted excerpts. Strict
projection and deterministic precedence reject malformed output and prevent a
lower recommendation from weakening policy. Provider failure denies.
Structurally invalid Super output triggers a recorded quality escalation to
`nvidia/Nemotron-3-Ultra-550b-a55b`; invalid or unavailable Ultra output denies.
The protected live inference path passes. The broker now requires a trusted
Guardian evaluator, strictly reparses its result, recomputes deterministic
precedence, and records minimized outcomes; a protected model-through-broker run
remains incomplete.

The final GitHub broker resolves one non-secret connection reference inside the
self-hosted credential-holding service. Resolution is callback-scoped: the broker
never receives a reusable credential value, and temporary credential bytes are
cleared after the typed adapter operation completes. ADR-0009 selects a GitHub App device flow
using only a public client ID and immutable repository ID. The trusted setup
process requires expiring user and refresh tokens, verifies the account, and
stores both in provider-scoped OS credential targets without exposing them to the
agent. The resolver performs serialized, fail-closed rotation at GitHub's fixed
token endpoint and commits non-secret expiry metadata last. Deterministic refresh
evidence passes; one protected metadata-less migration failed closed and required
re-enrollment. A later protected request, including immediately after fresh
device enrollment, reached the documented token endpoint but received GitHub
`HTTP 500` before any accepted response or local write. A strictly validated
provider correlation ID is retained for support. Successful protected live
refresh therefore remains incomplete; device re-enrollment is the bounded
fallback and unattended GitHub operation beyond the access-token lifetime is not
claimed. A
protected broker read using a freshly enrolled token passes against the installed
demo repository. The
adapter has a fixed GitHub API origin,
typed pull-request read and squash-only merge operations, bounded responses, and
no arbitrary URLs or headers. Before merge, the broker re-parses and re-digests
the request, checks durable session and connection scope, reads the current head,
atomically consumes the exact nonce, and sends the expected head SHA to GitHub's
merge endpoint. The nonce remains consumed when the post-boundary result is
uncertain.

## Competition implementation

The competition build proves one enforced PR-review mission:

- a terminal-first session request whose normalized read-only mission and worker assignment are confirmed directly by the user before the native worker launches;
- bounded local analysis and GitHub reads without reusable credential exposure;
- Tavily-mediated public research with a visible provenance trail;
- hostile public content attempting to create authority;
- direct public network and Git push bypass rejection in the reference runtime;
- an unauthorized merge denied by mission policy;
- Nemotron contextual risk analysis that cannot weaken deterministic controls;
- a later legitimate request authorized by a user-verifying passkey bound to the
  exact repository, PR head commit, squash method, expiry, and nonce;
- just-in-time narrow GitHub execution against a dedicated, disposable demo
  repository, with the credential unavailable to the agent;
- post-approval mutation, expiry, and replay rejection; and
- an audit view connecting mission, runtime assurance, research, policy, guardian, approval, execution, and sanitized outcome.

The hostile content is retrieved from a controlled live public page through a
narrow bounded Extract operation, with a deterministic fake-provider equivalent
in CI. The unsafe proposal is genuinely denied before approval, credential
minting, or GitHub mutation. The subsequent merge receives independent human
authority; public content never creates or expands it. See
[ADR-0006](adr/0006-competition-authority-and-adversarial-demo.md).

## Open implementation decisions

- operating-system credential-store adapters, trusted local setup UX, and the
  supported local IPC peer-identity mechanism;
- canonical serialization format and compatibility policy;
- general authenticated remote MCP transport after the launcher-bound competition
  runtime;
- session evidence and runtime-attestation representation;
- reset/provisioning mechanics for the dedicated demo repository; and
- protected Guardian-model-through-broker verification.

[ADR-0005](adr/0005-durable-authority-and-rejection-context.md) selects SQLite,
subject to a C6 evidence spike, for durable non-secret authority and audit state.
It also selects fail-closed session interruption rather than transparent restart
recovery and defines the minimized rejection-context chain that C6-C9 must
implement and evaluate.

[ADR-0006](adr/0006-competition-authority-and-adversarial-demo.md) selects a
central authority-service owner, a narrow GitHub credential boundary, passkey-
bound approval, a dedicated demo repository, controlled hostile-page retrieval,
and an earlier Linux parity gate. ADR-0008 supersedes its operator-custody
assumption. These are accepted targets until the claims matrix names
implementation evidence.

[ADR-0007](adr/0007-terminal-first-session-bridge.md) selects a terminal-first
launcher, untrusted model drafting with direct normalized human confirmation,
short-lived web-ceremony handoffs where justified, and a Guardian-owned CLI that
launches a controlled worker. ADR-0015 selects the Nebius-native competition adapter.

[ADR-0012](adr/0012-pre-activation-mission-formation.md) defines the
pre-activation draft, Qwen completeness review, deterministic compilation,
Nemotron mission-risk review, exact confirmation, fresh-host launch sequence, and
the distinction between action denial and trusted-runtime interruption.

[ADR-0008](adr/0008-local-first-self-hosting-and-user-owned-credentials.md)
selects local-first self-hosting, user-owned provider accounts and billing,
trusted local credential enrollment, typed credential-holding provider services,
and cloud, hybrid, and local modes without treating model diversity as a root of
trust.

Longer-horizon ideas that are not part of the competition architecture or current
security claims are recorded in [Future Directions](future-directions.md).
