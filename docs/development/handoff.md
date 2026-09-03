# Current development handoff

Last updated: 2026-09-02 (AKDT)

This is the single rotating pickup page for a fresh development session. Treat it
as context and sequencing guidance, not as the next session's goal by itself.
Durable choices live in ADRs, verified guarantees in `docs/security-claims.md`,
and checkpoint history in `docs/development/roadmap.md`.

## Start here

- **Active checkpoint:** C6 on issue
  [#13](https://github.com/Loothore907/guardian-agent/issues/13), branch
  `codex/13-c6-durable-authorization-broker`.
- **Logical transition:** pre-activation mission formation, trusted worker
  assignment, W1 exact turns, the W2 credential-safe workspace, W3 exact
  one-tool/result execution, W4 contained denial/revocation, the W5 controlled
  competition coordinator, W6 supervised one-use attachment, W7 strict broker
  IPC, W8 separate Guardian action-risk IPC, W9 strict credential-holding
  broker-process startup, W10 credential-store-backed research-process startup,
  W11 fixed three-child supervision, W12 activated-session configuration, W13
  exact CLI confirmation, and W14 executable deterministic startup are locally
  implemented. Do not reopen the
  settled workspace-copy or exact W3 lifecycle while choosing the next slice.
- **W4 outcome:** an ordinary rejected action returns only an exact sanitized
  denial and can reach the mandatory final turn. Version-1 trusted policy contains
  the first two ordinary events in an inclusive five-minute window, revokes on
  the third, excludes older events, immediately revokes replay/binding near
  misses, and interrupts trusted boundary failure. Model output cannot supply
  severity, counts, thresholds, or disposition.
- **Critical sequencing decision:** the user selected the controlled
  research/GitHub journey before a generalized bounded worker loop.
  [ADR-0029](../adr/0029-end-to-end-architectural-validation.md) now makes the
  assembled end-to-end journey an architectural validation gate rather
  than a premature competition-readiness sprint. Use it to test assumptions,
  correct the design, and establish a stable base for later feature expansion.
  W5 preserves the fixed ordering and W3/W4's one-request, two-turn lifecycle.
- **Checkpoint state:** the repository now records W5 in `4a064a1`, W6-W8 in
  `f341b96`, W9-W11 in `f6087d4`, and W12-W13 in `90da76b`. The complete ordinary
  gate passed again after those checkpoints. No push, pull request, merge,
  publication, release, or other remote mutation followed.
- **Current worktree:** the W6-W13 implementation is locally checkpointed. W14
  adds the uncommitted executable competition path, strict public deployment
  input, trusted competition session/connection/research configuration, exact
  activation-bound requests, and ADR-0030 mission/worker-tool separation. The
  complete ordinary gate passes; staged protected provider evidence is next.
- **Secret caution:** `.env.local` is ignored development input. Never print,
  stage, copy, summarize, or use it as the installation design. Never print or
  export credential-store values.

## Development hygiene working agreement

The user is following the repository workflow recommended by the development
agent. The user should not have to prompt the agent after each slice to ask
whether it is time to commit or push. The agent owns that cadence and must make
the appropriate Git transition part of the normal development flow:

1. At the end of each coherent green slice, review the exact diff, run the
   proportionate focused checks, and create a small local checkpoint commit.
2. Do not allow multiple completed slices to accumulate as one large uncommitted
   worktree. If a slice cannot stand alone, state the dependency and checkpoint
   the smallest coherent stack as soon as it is green.
3. Do not push every local checkpoint. Push the feature branch and create or
   update its expected review pull request when the documented remote-readiness
   gate is met: the intended section is integrated, the complete ordinary gate
   passes, required protected evidence is captured, claims and handoff are
   current, and the bounded secret/artifact audit is clean.
4. Treat this as the user's standing direction for routine local checkpoint
   commits and the feature-branch push/review transition at that gate. Report the
   actions and results; do not shift responsibility for normal checkpoint timing
   back to the user through repeated permission prompts.

For the current C6 section, the remote-readiness gate is not yet met because the
protected live boundary sequence and complete protected journey remain. The next
session should continue locally through those steps, correct any architecture the
live evidence disproves, then push the completed branch and open or update its
review PR when the gate passes.

This standing workflow does not authorize merge, release, publication,
deployment, remote-setting changes, destructive recovery, credential disclosure,
or material scope expansion. Those actions still require specific direction.

## Current architectural validation gate

[ADR-0029](../adr/0029-end-to-end-architectural-validation.md) fixes the next
phase around one complete vertical journey through the real executable surface.
The purpose is to make the architecture encounter real
model behavior, provider latency and failure, hostile public content, durable
authority, and one controlled external effect. Competition demo hardening remains
later work.

The validation order is deliberate:

```text
deterministic executable journey
  -> live Qwen mission dialogue
  -> live native worker
  -> live Tavily research and controlled hostile content
  -> live Nemotron action-risk path
  -> assembled live path without a privileged effect
  -> one exact disposable GitHub merge
  -> mutation, replay, expiry, failure, and redaction review
  -> architecture findings and roadmap triage
```

For every stage, record:

1. the assumption being tested;
2. the deterministic control that remains authoritative;
3. the expected fail-closed behavior;
4. the observed compatibility, latency, and failure evidence; and
5. whether the result belongs to the validated core, a design correction, or an
   expansion candidate.

A cooperative live model is compatibility evidence, not enforcement evidence. If
a live boundary contradicts the design, stop at that boundary, record the finding,
change the design and tests, and re-run the affected earlier stages. Do not weaken
the boundary or special-case the scripted journey to keep it moving.

## Settled architecture

ADR-0015 supersedes ADR-0011 only where ADR-0011 assumed a third-party coding
scaffold would be the first competition worker. The separation of responsibilities
remains:

1. A human begins a Guardian flow with an untrusted task request. A prompt-level
   `@guard`-style invocation is only a signal to begin formation; it creates no
   authority.
2. Deterministic intake rejects malformed, secret-like, unsupported, or
   mechanically incomplete input.
3. Qwen receives a bounded credential-free projection and returns either
   readiness or targeted clarification questions. It cannot compile or approve
   authority.
4. Deterministic Guardian code revalidates the completed draft, clamps it to
   supported capabilities, and compiles the mission/profile candidate.
5. Nemotron receives a separate minimized setup-risk envelope. It may maintain or
   increase the deterministic floor; it may never reduce it or grant authority.
6. Guardian displays the exact mission, permissions, integration mode, and worker
   assignment. Direct human confirmation binds the complete preview digest.
7. A fresh constrained runtime starts only after confirmation.
8. The native worker performs the task and can request only typed Guardian
   capabilities. It never receives reusable provider credentials.
9. Deterministic policy, optional minimized Nemotron action-risk review,
   exact-request approval, the privileged broker, and typed adapters control every
   consequential boundary crossing.
10. An individual denial contains only the rejected action so
    permitted work can continue. Deterministic severity and bounded repeat rules,
    not model preference, decide revocation or interruption.

### Competition model and hosting policy

The current `competition-2026-09-01` version 2 policy assigns:

- native worker: `moonshotai/Kimi-K2.7-Code`;
- mission dialogue: `Qwen/Qwen3-235B-A22B-Instruct-2507`;
- primary contextual risk: `nvidia/nemotron-3-super-120b-a12b`;
- invalid-output escalation: `nvidia/Nemotron-3-Ultra-550b-a55b`.

Version 1 is retained as historical evidence and assigned
`Qwen/Qwen3-Coder-30B-A3B-Instruct` to the native worker. A protected 404 and
credential-isolated inventory showed that model absent from the current live
catalog, so ADR-0031 introduced version 2 rather than a runtime fallback. Built-in
policies resolve by exact identifier and version. These are versioned evidence
pins, not permanent model choices. A reviewed policy version may upgrade them.
Session prompts, retrieved content, workers, inventory responses, and model output
cannot choose arbitrary model IDs. Every competition policy must retain the
mechanically validated NVIDIA Nemotron presence.

The planned judge deployment uses Nebius AI Cloud for application hosting and
Nebius Token Factory for all model inference. It needs no OpenAI API key. Sharing
one Nebius account is a correlated availability risk, not a merger of roles: the
worker, Qwen dialogue, and Nemotron risk calls retain separate contracts,
processes, minimized contexts, budgets, and output schemas. Tavily and GitHub
remain separate optional typed integrations.

The judge deployment may use project-funded, rate-limited credentials and must be
free to judges during judging. General product custody remains local-first and
self-hosted with user-owned provider accounts. A hosted judge build is not the
default production trust model.

## What is implemented now

### Pre-activation and exact confirmation

- Strict objective-only and assisted mission drafts, deterministic screening,
  bounded clarification, revision limits, explicit assisted/structured/fallback
  routing, deterministic compilation, and minimized setup-risk review pass.
- Qwen draft review and Nemotron setup risk use separate one-use supervised child
  processes. Missing, malformed, mismatched, replayed, unavailable, denied, or
  unsupported step-up outcomes cannot create a confirmable preview.
- Qwen output is limited to readiness/questions before activation and a sanitized
  mission brief after activation. It cannot represent a tool proposal.
- Exact lower-assurance development confirmation is fresh, digest-bound, and
  one-use. WebAuthn remains a later competition requirement.

### Worker assignment and W1 boundary

- `GuardianModelPolicy` now includes the trusted `native_worker` role.
- Session previews and bootstrap results carry a strict worker selection:
  `deterministic_reference` or `nebius_native`.
- The Nebius selection binds provider, role, policy ID, policy version, and exact
  model ID.
- The final confirmation digest covers the mission-formation digest, integration
  assessment, and worker selection. Changing the worker or model assignment
  changes what the human must confirm.
- The reference supervisor accepts only trusted deployment configuration for
  worker mode. User task text cannot select it.
- The CLI displays the selected worker before and after launch.
- Tests cover default selection, Nebius selection, policy upgradeability, digest
  differences, malformed input, mutation, replay, and exact confirmation.
- Strict worker-turn contracts bind the confirmed session, caller,
  mission/profile versions, deterministic and model policies, worker assignment,
  turn, lifetime, allowed tools, and remaining budgets under a canonical digest.
- A one-use local IPC service rejects wrong capability/session/turn/digest,
  activation, expiry, replay, oversized frames, unsupported tools, and exhausted
  budgets before any effect can occur.
- Deterministic fake and fixed-origin Nebius Token Factory providers implement the
  same narrow interface. Only the short-lived worker-service process resolves
  `nebius/default`; provider context excludes credentials and trusted IDs.
- Provider output is limited to a credential-safe final response or one pending
  typed request. W1 does not create a trusted proposal or execute that request.
- `docs/security-claims.md` keeps the W1 inference claim separate from later
  trusted execution evidence.

### W2 session workspace boundary

- Session previews bind a strict workspace selection containing only the project
  label, source and snapshot digests, fixed `/workspace` mount, limits,
  session-persistence, no-writeback, and delete-on-close policy. Host paths are
  never public.
- The materializer selects tracked and non-ignored untracked regular files from
  an exact Git root while excluding reserved `.guardian` state. It rejects unsafe
  paths, symlink or junction ancestors,
  collisions, credential-bearing paths or high-confidence content, and bounded
  size/count excess.
- Preparation occurs only after exact confirmation and revalidates the source
  identity plus the complete path, metadata, and content manifest.
- The Guardian-owned copy receives a fresh no-remote Git baseline with inherited
  configuration disabled and an empty credential helper.
- Every local command binds the same exact-session copy at writable `/workspace`;
  the remaining chroot is disposable, network remains denied, and changes never
  write back automatically to the source checkout.
- Close deletes only the exact session root created by that lifecycle. Target
  reuse fails without deleting the pre-existing target.
- ADR-0017 and `docs/development/evidence/w2-session-workspace.md` record the
  decision, tests, protected Windows/WSL gate, and residual limits.

### W3 exact worker tool round-trip

- Trusted code wraps one pending W1 request in an execution envelope bound to the
  exact session/caller, mission/profile and policy versions, assigned worker,
  source turn/digest, request digest, lifetime, and prepared W2 workspace result.
- The exhaustive dispatcher supports only `guardian.session_status` and
  `guardian.local_command`. The command path is the already-bound W2 executor
  closure; neither the worker nor its model can supply a host path.
- A dedicated `worker_dispatcher` authority role can consume only exact worker
  status and local-command operations. Schema-v4 SQLite preserves the unique
  execution ID/digest in the same immediate transaction that decrements total and
  capability-specific budgets, so replay and mutation cannot repeat the effect.
- Command stdout/stderr are bounded, control-cleaned, recognizable-credential and
  host-path redacted, and then bound into result and turn digests through UTF-8
  byte lengths and SHA-256 digests.
- Turn 2 receives only the minimized sanitized result, has an empty tool catalog,
  and must return a final response. A second request fails closed.
- ADR-0018 and `docs/development/evidence/w3-worker-tool-round-trip.md` record the
  decision, near-miss coverage, and protected supervised Windows/WSL pass.

### W4 contained denial and deterministic revocation

- Worker results are a strict exact-digest-bound success/denial union. Denial
  exposes only `request_denied`, continue/revoked disposition, policy binding,
  and remaining budget; internal violation code, severity, count, threshold, and
  rejected data remain trusted-only.
- Schema-v4 authority state stores exact boundary events. The worker dispatcher
  can only request fixed record/interruption operations; it cannot submit
  severity or a lifecycle decision.
- Version 1 uses an inclusive five-minute window and threshold three for ordinary
  catalog, filesystem, timeout, and volume violations. Replay,
  execution/workspace binding mismatch, and malformed worker output revoke
  immediately. Events outside the window do not count.
- Ordinary denial reaches turn 2 with the existing empty catalog and must finish.
  Critical disposition updates durable and local state to revoked and stops
  before another worker-provider turn.
- Provider, authority, executor, and result-validation failures interrupt rather
  than becoming denials. If authority is unavailable, local interruption remains
  fail-closed and no durable-success claim is made.
- ADR-0019 and `docs/development/evidence/w4-denial-containment.md` record the
  policy, public minimization, threshold edges, lifecycle behavior, and limits.

### W5 controlled research and GitHub competition journey

- Trusted orchestration, rather than a wider worker loop, fixes the sequence:
  bounded research, out-of-scope GitHub merge denial, then a separately
  exact-approved legitimate merge.
- Research must return at least one unique provenance event bound to the same
  session as both normalized GitHub requests. Only provenance event IDs cross to
  the broker; hostile excerpts, URLs, provider prose, and credentials do not.
- Both GitHub requests share exact session, caller, connection, mission, profile,
  and policy bindings but must target different repositories.
- The first attempt carries no approval and only exact deterministic
  `scope_mismatch` permits the second attempt. Unexpected success, any other
  denial, malformed boundary output, or arbitrary broker error text stops safely.
- The legitimate approval is validated against the canonical request before
  research begins, and the successful merge result must bind the exact repository,
  pull request, and expected head.
- ADR-0020 and `docs/development/evidence/w5-controlled-competition-journey.md`
  record the decision and focused coordinator tests. W6-W14 now supply its local
  supervision, IPC, process composition, trusted configuration, and exact CLI
  confirmation/executable seams; protected end-to-end evidence remains.

### W6 supervised one-use journey attachment

- A fixed factory binds the ADR-0020 coordinator to typed research and broker
  clients plus two distinct already-started supervised child-process handles.
- Each attachment runs once. Concurrent use and replay stop with only
  `attachment_consumed`, before a second approval-bearing broker attempt can run.
- Either child exit before or during execution, a rejected exit signal, or
  unexpected coordinator failure transitions the attachment to interrupted and
  returns only `attachment_unavailable`; there is no restart.
- Explicit close attempts both child shutdowns, preserves a closed terminal state,
  and returns only a fixed failure if either close rejects.
- The attachment exposes no process ID and accepts no arbitrary entrypoint,
  command, environment, destination, provider credential, or URL.
- ADR-0021 and `docs/development/evidence/w6-supervised-journey-attachment.md`
  record the lifecycle decision and focused coverage.

### W7 strict session-bound broker IPC

- Strict contracts admit only a canonical GitHub read or squash-merge request, an
  optional exact merge approval, unique evidence-exposure IDs, fixed denial codes,
  and allowlisted snapshot/merge results.
- The local named-pipe or temporary Unix-socket frame is bounded and bound to an
  opaque capability, session, caller, and service lifetime. The server owns the
  evaluation clock; future, pre-start, and exact-expiry frames fail closed.
- The frame cannot express arbitrary authenticated HTTP, URL, header, command,
  environment, or credential values.
- Server and client independently revalidate successful results against the exact
  owner, repository, pull request, and resource/head version. Mutation or malformed
  handler output becomes only `service_unavailable`.
- ADR-0022 and `docs/development/evidence/w7-broker-ipc.md` record the protocol and
  real local IPC tests.

### W8 separate Guardian action-risk IPC

- Shared strict schemas define the credential-free action-risk envelope and
  evaluation; recognized secret-like excerpts are rejected before provider use.
- A trusted supervisor pre-binds one envelope to the exact session, caller,
  canonical request digest, opaque capability, and service lifetime.
- The broker-side evaluator refuses envelope mutation before IPC. The service
  consumes its configured envelope once; replay, wrong bindings, future time,
  pre-start use, and exact expiry fail closed.
- The local protocol cannot express an arbitrary prompt, model ID, provider
  endpoint, URL, header, credential, command, or environment value. Provider and
  malformed-output failures become only fixed sanitized errors.
- The Guardian-service main now routes strict `mission_setup_risk` and
  `action_risk` bootstrap modes while keeping provider ownership out of the broker.
- ADR-0023 and `docs/development/evidence/w8-guardian-action-risk-ipc.md` record the
  decision and real local IPC tests.

### W9 strict credential-holding broker process

- A strict `github_broker` process contract composes only W7 broker IPC, a
  broker-role authority client, the W8 evaluator client, one typed credential
  handle, and one validated public GitHub OAuth client ID.
- Broker, authority, and Guardian session/caller bindings must match. Broker
  lifetime must fit inside both authority and Guardian lifetimes.
- The child reads one bounded stdin frame, constructs the Windows credential
  store locally, starts only the typed broker server, and emits one fixed readiness
  line. Bootstrap authority is absent from arguments and environment.
- Raw credentials, Guardian providers, provider URLs, arbitrary headers, commands,
  model selection, and generic authenticated transport are not contract fields.
- An actual child startup test reaches W7 IPC and safely returns the fixed broker
  denial when its deliberately absent authority boundary is contacted.
- ADR-0024 and `docs/development/evidence/w9-broker-service-process.md` record the
  decision and focused evidence.

### W10 credential-store-backed research process

- The production research child now accepts one strict stdin frame combining the
  existing research service configuration and exact research-role authority
  client. Serialized environment configuration is no longer used by `main`.
- Session/caller bindings must match, authority operations must be exactly reserve
  and settle, and the research lifetime must fit inside the authority lifetime.
- Durable authority reservation occurs before `tavily/default` is resolved inside
  a child-local credential-store callback for the fixed Tavily call.
- Raw API keys, arbitrary provider URLs, headers, transports, and environment
  fields are not bootstrap fields. An actual empty-environment child test confirms
  safe authority-unavailable behavior before provider use.
- The protected live script now expects an enrolled Windows credential, durable
  authority, strict stdin bootstrap, and an empty child environment. It has not
  been rerun in this slice.
- ADR-0025 and `docs/development/evidence/w10-research-service-process.md` record
  the decision and focused evidence.

### W11 fixed three-child competition composition

- One strict bundle requires W9 broker and W10 research services to share the exact
  session, caller, start, and expiry; W9 already carries the exact W8 configuration.
- A trusted factory starts the fixed Guardian, broker, and research entrypoints in
  order through bounded stdin. Only the trusted `fake`/`nemotron` deployment choice
  enters the Guardian child environment.
- Guardian and broker form one monitored stack, so exit of either interrupts the
  existing W6 attachment. Closing attempts broker, Guardian, and research shutdown;
  startup failure attempts cleanup of every child already created.
- The returned surface is only the typed one-use W6 attachment. It exposes no
  process IDs, arbitrary entrypoint, command, environment, URL, credential, or
  restart control.
- ADR-0026 and `docs/development/evidence/w11-supervised-competition-services.md`
  record the decision and actual three-child startup evidence.

### W12 activated-session competition configuration

- A trusted builder requires the captured active durable session to report current
  Enforced evidence and binds the legitimate merge request to its exact session,
  caller, mission, profile, policy, research service, and lifetime.
- It independently reads the durable session and attached connections. The exact
  connection must remain active, target the request repository, and permit merge;
  its credential handle is derived from authority state and is not an input.
- The builder owns fresh broker/Guardian IPC credentials, the canonical request
  digest, deterministic `confirm` floor, and fixed risk envelope. It emits only a
  schema-validated W11 bundle inside the supervisor.
- The supervisor captures one successful launch and exposes only the W11 one-use
  attachment internally. Starting before activation or replacing the launch fails
  closed; concurrent/repeated attachment startup also fails, shutdown closes a
  started attachment, and the bundle and child controls are not returned. W13
  narrows the CLI-facing surface further to a complete run operation.
- ADR-0027 and
  `docs/development/evidence/w12-activated-competition-configuration.md` record
  the boundary and focused evidence. W13 adds the exact CLI ceremony and W14
  supplies executable dispatch and trusted competition-session startup.

### W13 exact competition CLI confirmation

- A separate CLI ceremony validates the fixed research and two merge requests,
  requires exact shared authority bindings and different repositories, and refuses
  non-interactive or inexact confirmation before invoking the trusted runner.
- The prompt shows the bounded research scope, expected denied target, exact merge
  repository/PR/head/method, and canonical digest. The human must type the exact
  `AUTHORIZE <digest-prefix>` phrase.
- The CLI forwards only the parsed requests and fresh confirmation. The supervisor
  revalidates W12, derives the active connection-scope digest, stores the one-use
  development approval, runs and closes the fixed attachment, and returns only its
  minimized result; approval and service configuration are not returned.
- ADR-0028 and
  `docs/development/evidence/w13-exact-competition-cli-confirmation.md` record the
  ceremony and focused evidence. W14 supplies executable dispatch and the trusted
  competition-specific session/connection launch.

### W14 executable competition startup

- `main.ts` now routes only the exact `guardian competition` shape into the fixed
  competition application flow; `setup` and ordinary `start` retain their
  existing routes.
- Strict named deployment inputs accept only a public GitHub client ID, bounded
  research query/domains/required terms, and two exact public pull-request
  versions. They accept no credential, credential-store handle, arbitrary URL,
  header, command, environment, model ID, or provider transport.
- The supervisor derives the credential-store handle from a fresh connection ID,
  owns research IPC credentials, and creates and attaches the narrow connection
  only inside exact-confirmed launch; declining the preview leaves no active
  connection authority behind. Canonical requests are constructed only after an
  active Enforced bootstrap result and bind its exact mission, profile, and policy
  versions.
- ADR-0030 separates the human-confirmed mission/session ceiling from a distinct
  digest-bound `workerTools` subset. The competition mission may use mediated
  research and an exact-approved merge, while the current worker sees only status
  and local command.
- The application-level deterministic test crosses exact command parsing, strict
  deployment parsing, session confirmation, request construction, W13 merge
  confirmation, the fake runner result, output, and cleanup. Existing W9-W11 tests
  retain the actual fixed-child composition evidence.
- ADR-0030 and
  `docs/development/evidence/w14-executable-competition-startup.md` record the
  decision, focused tests, complete ordinary gate, and protected-live residuals.

### Existing security and execution foundation

- The trusted launcher binds mission, profile, caller, policy, lifetime,
  revocation, filesystem scope, tool catalog, network policy, and volume.
- The Windows/WSL reference executor passes current isolation probes for reduced
  identity, credential absence, host-filesystem hiding, and direct public-network
  and Git-push denial. It now binds only the Guardian-owned session copy at
  `/workspace`, preserving changes across commands.
- The central authority service is the sole SQLite owner. Trusted components use
  bounded, role-specific, session-bound local IPC.
- Durable sessions, budgets, connections, approvals, nonces, minimized rejection
  context, and interruption-on-restart pass deterministic tests.
- The Tavily research service uses a fixed provider path, strict outbound checks,
  bounded evidence, provenance, and session budgets. Public content remains
  untrusted and cannot create authority.
- The GitHub path uses a narrow fixed-origin typed adapter, final re-normalization,
  exact-head binding, one-use approval, bounded results, and credential resolution
  only inside the privileged boundary.
- Qwen, Nemotron Super, and Nemotron Ultra already have credential-isolated Nebius
  adapters and protected compatibility evidence. Those services are not the
  worker loop.

## What is explicitly not implemented

- A persistent, bounded multi-turn worker state machine.
- User-verifying WebAuthn approval.
- Complete Linux runtime, credential-store, and IPC peer-identity parity.
- Public judge deployment, TLS validation, or hosted-runtime assurance evidence.
- Protected live pre-activation and Nemotron-through-broker evidence.
- Protected end-to-end Tavily research, scope denial, separately approved GitHub
  merge, mutation/replay, and redaction evidence through the executable path.

Do not call any of these implemented, and do not label the future hosted worker
`Enforced` merely because it runs on Nebius. Enforced requires reproducible tool,
filesystem, credential, network, lifecycle, and authority evidence.

## Current session execution plan

### Objective

Make the fixed controlled journey reachable from the executable CLI, prove the
complete path deterministically, and then test each live model and provider
boundary in increasing order of side-effect risk. Use the results to validate or
correct the architecture; do not optimize only for a polished demo.

### Phase 1: executable deterministic slice

**Status: implemented locally and ordinary gate green.** W14 completes the exact
dispatch, strict deployment configuration, trusted session/connection/research
attachment, activation-bound request construction, narrower worker catalog, and
application-level deterministic journey. The architecture correction is recorded
in ADR-0030 rather than hidden in the executable wiring.

1. Map the exact startup gap between `main.ts`, the activated session, durable
   connection attachment, fixed request construction, and the existing W13
   runner.
2. Add strict trusted competition deployment input. It may select only reviewed
   fixed values and must not accept credentials, arbitrary URLs, model IDs,
   headers, commands, environments, or generic provider transport.
3. Route only the exact `guardian competition` command to competition startup.
4. Construct the bounded research-capable mission and narrower worker profile,
   require exact session confirmation, attach the generated demo connection and
   research endpoint, and derive the unsafe and legitimate requests from the
   trusted input.
5. Run the journey through fake providers from the executable entrypoint. Add
   allowed-path and near-miss tests for routing, activation, bindings, denial,
   exact approval, result validation, cleanup, and replay.

**Phase-1 exit passed:** one ordinary executable test reaches the fixed completed result,
the unsafe request is denied at the expected boundary, no generic authority enters
the CLI surface, and the complete ordinary gate is green.

### Phase 2: live boundary validation

Introduce one live boundary at a time and preserve a deterministic fixture for
every observed contract:

1. Qwen mission dialogue: schema reliability, bounded clarification, latency,
   unavailable and invalid-output behavior.
2. Native worker: exact turn binding, typed request selection, malformed output,
   denial continuation, and final response.
3. Tavily: outbound screening, bounded provenance, controlled hostile content,
   timeouts, and private or secret-like request rejection.
4. Nemotron: minimized action-risk envelope, deterministic-floor monotonicity,
   Super-to-Ultra escalation, invalid output, timeout, and unavailability.
5. Assembled no-effect journey: cross-service bindings, process lifecycle,
   sanitized results, durable authority records, and audit minimization.
6. Disposable GitHub effect: refresh the exact demo state, verify the expected
   head, deny the out-of-scope attempt before execution, separately confirm the
   legitimate squash merge, and reject mutation and replay before a second
   provider effect.

**Current live result:** the first Qwen gate passed from the user-scoped Codex
integrated terminal. Windows Credential Manager supplied `nebius/default`, Qwen
returned the strict `mission_brief` contract, the minimized summary length was
158 characters, and provider latency was 1,823 ms. No summary content or
credential was printed. The managed agent command sandbox still sees that
credential reference as missing, exposing an execution-context separation that
the final trusted provider-child launch must handle deliberately. The ignored
`.env.local` file was not opened, printed, or imported. W15 records the evidence.

The first native-worker attempt then failed closed in approximately 1,899 ms. A
sanitized diagnostic rerun identified HTTP 404 in approximately 2,048 ms without
printing the provider body, headers, credential, or generated content. The fixed
inventory probe showed that the version 1 Qwen Coder worker was absent and that
`moonshotai/Kimi-K2.7-Code` was available. ADR-0031 and W16 record the correction:
version 1 remains historical, version 2 selects Kimi, exact policy-version lookup
is enforced, and there is no silent fallback. The rebuilt version 2 request
reached Kimi but failed closed with sanitized HTTP 400 in approximately 2,459 ms.
The credential-safe capability probe then separated plain text, JSON object, and
simple strict JSON-schema acceptance without emitting response bodies or generated
content. It passed all three modes. The failure is therefore the full union-heavy
Guardian schema, not general Kimi structured-output support. ADR-0032 changes the
adapter to JSON-object mode, supplies the exact schema as guidance, and retains
bounded parsing plus strict deterministic `WorkerOutcomeSchema` enforcement. The
corrected protected final-response rerun then passed: Kimi returned a strict
`final_response` with a 68-character
sanitized response in 2,159 ms provider latency, and the generated content was not
printed. W16 now closes the simple native-worker final-response sub-gate. The next
protected run also passed: Kimi selected the one exact permitted
`guardian.session_status` typed request in 2,138 ms provider latency, and neither
generated arguments nor provider content was printed. W17 records that this is a
pending request only; the provider neither authorized nor executed it. The next
protected two-turn run also passed. Kimi selected the exact status request in
2,106 ms, received a strict exact-bound sanitized `request_denied` / `continue`
result, and returned a 116-character final response in 1,573 ms without retrying.
No generated content or credential was printed. W18 records the important limit:
the denial was constructed by the protected test through production contracts,
not emitted by a live authority-service/dispatcher call. W4 separately proves
the deterministic denial mechanics locally. Full assembled live containment,
execution, and repeated reliability remain separate checks.

**Phase-2 exit:** each boundary has an assumption/evidence record, the protected
journey completes or stops at a documented fail-closed boundary, and no credential,
private provider content, or credential-equivalent material appears in model
contexts, process arguments or environments, SQLite, logs, traces, audit records,
errors, or public results.

**Current session tracks and handoff:** the clean handoff gate is reached. Track A
now has live Qwen mission dialogue plus Kimi final-response, exact typed-request,
and denial-continuation evidence through W15-W18. Its next boundary is live Tavily
research and controlled hostile content. Track B is locked at the design level in
ADR-0034: a public fixed/rate-limited demo and a separate authenticated piloted
demo over the same enforcement core. OpenAI backup qualification and
worker-visible research/GitHub dispatch remain separate queued slices; neither
was started in this session.

### Phase 3: findings and transition

1. Re-run the relevant ordinary and protected checks after every design correction.
2. Update ADRs, evidence, the claim matrix, architecture, roadmap, and handoff to
   match observed behavior without broadening claims.
3. Review the exact diff and bounded secret/artifact audit, then create the normal
   local checkpoint commit for each coherent green slice.
4. When the documented remote-readiness gate passes, push the feature branch and
   open or update its review PR. Do not merge, deploy, release, or publish without
   separate direction.
5. Triage follow-up work into validated core, design corrections, and expansion
   candidates. Resume controlled Extract/adversarial work, WebAuthn, Linux parity,
   C8 experience, and any admitted feature expansion in dependency and evidence
   order.

### Stop/go rules

- Do not perform the live GitHub effect until the deterministic executable path
  and earlier live no-effect boundaries pass.
- Do not print, export, copy, or summarize stored credentials or raw protected
  provider content while diagnosing a live failure.
- Do not call a hosted or live-model path `Enforced` without the documented tool,
  filesystem, credential, network, lifecycle, and authority evidence.
- Do not retry a provider failure indefinitely or relax a schema to obtain a happy
  path. Preserve the failure evidence and choose a bounded correction or fallback.
- Do not pull an expansion candidate into the session while an architectural
  contradiction or required vertical-slice control remains unresolved.

## External state and known blockers

- `nebius/default` is available in Windows Credential Manager. Never print or
  export it.
- `github/default`, `github/refresh`, and `github/metadata` are available in
  Windows Credential Manager. Never print or export them.
- Protected GitHub access, exact-head read, and one-use squash merge passed on the
  disposable demo repository. That used lower-assurance development confirmation,
  not WebAuthn.
- GitHub device-flow refresh reproducibly reaches the fixed provider endpoint but
  receives `HTTP 500` before an accepted response or local credential write.
  Deterministic failure behavior preserves or restores safe state. Do not spin on
  retries or weaken the response contract; fresh device enrollment is the bounded
  fallback until provider state changes.
- Last verified external demo state: public `Loothore907/guardian-agent-demo` was
  provisioned and squash-only; PR #1 passed exact-head read and merge, and the
  deterministic reset created open demo PR #2. This external state was not
  refreshed during W6-W14 and must be rechecked before a protected run.
- Last recorded domain state: `agentic-guardian.com` was registered and delegated
  to Cloudflare nameservers. This was not refreshed during W6-W14 and is not
  evidence of an application deployment, valid TLS, or WebAuthn origin.

## Verification at this transition

The current ordinary component set passes on this Windows host:

- TypeScript build and typecheck;
- ESLint and Prettier checks;
- dependency boundaries: 176 modules and 353 dependencies, no violations;
- Vitest: 61 files and 343 tests passed; three protected files and five protected
  tests skipped, for 64 files / 348 tests total;
- SQLite authority spike: seven passed and the expected POSIX permission test
  skipped on Windows;
- deterministic demo reset planner: two passed;
- production Vite build.

Previously captured protected Windows/WSL evidence remains green through W4: one
run covered the existing C4 isolation probe, persistent workspace, no source
writeback, hidden host paths, credential absence, direct-egress denial, and the
supervised exact W3 local-command/result/final-turn path with durable budget
consumption under the W4 success-result contract. It was not rerun for W5-W14.
The protected Tavily/Nemotron/GitHub journey was also not run in W6-W14.

The last `git diff --check` was clean. The desktop `pnpm` wrapper's supply-chain
metadata check attempted blocked registry access, so the same frozen `check`
components were run directly with the pinned bundled Node and repository binaries;
all passed. The protected runtime passed unchanged during W4 with approved WSL
access and was not rerun for W5-W14 because those slices did not change the
executor path. No live credentialed provider test ran during W6-W14. The W6-W13
implementation tip is `90da76b`; W14 is currently uncommitted. No push, publish,
release, or other remote mutation followed the local checkpoints.

A refreshed bounded commit-readiness audit found no changed or untracked database,
archive, binary, log, key, certificate, or environment files and no unexpected
untracked roots. `.env.local` remains ignored. A recognizable-secret pattern scan
reported only deliberate fixtures in six `*.test.ts` files; no production or
documentation path matched. This local check is not a substitute for repository
secret scanning and remote CI after the documented remote-readiness gate and
branch push. The GitHub refresh endpoint's documented HTTP 500 and the absence of
a new live-provider run are C6 residuals; they do not block a local checkpoint
because no broader guarantee is claimed.

Previously captured protected evidence still records successful Windows
Credential Manager isolation, Tavily research, Qwen mission brief, Nemotron
Super-to-Ultra compatibility, production WSL isolation, GitHub read, and exact
merge. Protected tests are intentionally outside ordinary public CI.

Use the bundled Node executable directly if the desktop shell omits it:

`C:\Users\looth\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`

Do not run dependency installation merely to satisfy the desktop dependency-status
wrapper when the frozen workspace is already usable.

## Non-negotiable implementation rules

- Public interfaces never return raw credentials or credential-equivalent data.
- Prompt instructions and model statements are not enforcement evidence.
- Model output may maintain or increase a deterministic floor; it may never lower
  one.
- Unknown, malformed, unsupported, ambiguous, expired, replayed, or expanded
  operations fail closed.
- Re-normalize and revalidate exact requests immediately before privileged
  execution.
- Approval binds the exact request, session, caller, connection, scope, resource
  version, policy, expiry, nonce, and use count as applicable.
- Adapters expose narrow typed capabilities. Do not add arbitrary authenticated
  HTTP, caller-controlled destinations/headers, arbitrary commands, or shell
  expansion.
- Retrieved content and worker rationale are untrusted and cannot create
  authority.
- Keep the worker/provider process outside the credential-holding privileged
  execution boundary; keep local command sandboxes outside all credential-holding
  provider processes.
- Add allowed behavior and near-miss rejection tests with every behavior change.
- Do not claim a security property until `docs/security-claims.md` identifies
  reproducible evidence.

## Sources of truth

- [Repository guidance](../../AGENTS.md)
- [Product contract](../product-contract.md)
- [Architecture](../architecture.md)
- [Threat model](../threat-model.md)
- [Security claims](../security-claims.md)
- [Development roadmap](roadmap.md)
- [ADR-0011: Host-agent and Guardian model roles](../adr/0011-host-agent-and-guardian-model-roles.md)
- [ADR-0012: Pre-activation mission formation](../adr/0012-pre-activation-mission-formation.md)
- [ADR-0013: Versioned model-role policy](../adr/0013-versioned-model-role-policy.md)
- [ADR-0014: One-use pre-activation model channels](../adr/0014-one-use-pre-activation-model-channels.md)
- [ADR-0015: Nebius-native worker and judge runtime](../adr/0015-nebius-native-worker-and-judge-runtime.md)
- [ADR-0016: Exact-bound native-worker turns](../adr/0016-exact-bound-native-worker-turns.md)
- [ADR-0017: Credential-safe session workspaces](../adr/0017-credential-safe-session-workspaces.md)
- [ADR-0018: Exact one-round-trip worker tool execution](../adr/0018-exact-one-round-trip-worker-tool-execution.md)
- [ADR-0019: Contained worker denial and deterministic revocation](../adr/0019-contained-worker-denial-and-deterministic-revocation.md)
- [ADR-0029: End-to-end architectural validation before feature expansion](../adr/0029-end-to-end-architectural-validation.md)
- [ADR-0030: Confirmed mission and worker-tool separation](../adr/0030-confirmed-mission-and-worker-tool-separation.md)
- [ADR-0031: Live-inventory-bound model policy v2](../adr/0031-live-inventory-bound-model-policy-v2.md)
- [ADR-0032: JSON-object provider mode and deterministic worker validation](../adr/0032-json-object-provider-mode-and-deterministic-worker-validation.md)
- [ADR-0033: Explicit model portability and provenance qualification](../adr/0033-explicit-model-portability-and-provenance-qualification.md)
- [ADR-0034: Bounded public and piloted demo modes](../adr/0034-bounded-public-and-piloted-demo-modes.md)
- [W2 session workspace evidence](evidence/w2-session-workspace.md)
- [W3 worker tool round-trip evidence](evidence/w3-worker-tool-round-trip.md)
- [W4 denial containment evidence](evidence/w4-denial-containment.md)
- [W14 executable competition startup evidence](evidence/w14-executable-competition-startup.md)
- [W15 live Qwen boundary evidence](evidence/w15-live-qwen-boundary.md)
- [W16 live worker policy-correction evidence](evidence/w16-live-worker-policy-correction.md)
- [W17 live worker typed-request evidence](evidence/w17-live-worker-typed-request.md)
- [W18 live worker denial-continuation evidence](evidence/w18-live-worker-denial-continuation.md)
- [C6 authority service evidence](evidence/c6-authority-service.md)
- [C6 terminal bootstrap evidence](evidence/c6-terminal-bootstrap.md)
- [C6 interaction boundary evidence](evidence/c6-interaction-boundary.md)
- [C6 process supervision evidence](evidence/c6-process-supervision.md)
- [C6 credential-isolated Nebius model evidence](evidence/c6-nebius-model-adapters.md)
- [C6 secret-corpus evidence](evidence/c6-secret-corpus.md)
