# Current development handoff

Last updated: 2026-09-03 (AKDT)

This is the single rotating pickup page for a fresh development session. Treat it
as context and sequencing guidance, not as the next session's goal by itself.
Durable choices live in ADRs, verified guarantees in `docs/security-claims.md`,
and checkpoint history in `docs/development/roadmap.md`.

## Start here

- **Active checkpoint:** C6 on issue
  [#13](https://github.com/Loothore907/guardian-agent/issues/13). PR
  [#17](https://github.com/Loothore907/guardian-agent/pull/17) remains on
  `codex/13-c6-linux-peer-credentials`; W26 is stacked on branch
  `codex/13-c6-linux-secret-service`.
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
  `f341b96`, W9-W11 in `f6087d4`, W12-W13 in `90da76b`, W14-W18 in `aa5e601`,
  the deterministic W19 boundary in `e8e054f`, W20-W23 in `48b082d`, and the
  generated lockfile correction in `9acab1f`. The Phase-1 implementation-review
  checkpoint is `ddf194c`. PR #14 squash-merged as
  `b69e9338d5464cac31d52cf8510256a2d9f21c33`; post-merge `main` CI passed in
  2m25s. W24 then squash-merged through PR #16 as `1893aef`; W25 is committed as
  `bb30574`, with the persistent-plan-authority documentation at `6dae2f9`.
  PR #17 is open and mergeable. Its required and native Linux checks passed on
  all three executions, but the npm advisory endpoint timed out three times per
  execution, so the required audit remains red. W26 now passes a real disposable
  Secret Service lifecycle in an isolated Linux user session. Issue #13 remains
  open. No merge, release, deployment, or publication followed.
- **Phase-1 review checkpoint:** review started from clean, synchronized head
  `b9497a9`. The approved branch update contains a fail-closed broker correction,
  its regression tests, the C6 review matrix, claim/roadmap reconciliation, and
  patch hygiene. Restarting Codex restored the approval bridge needed for the
  authorized checkpoint workflow. The update was pushed as `ddf194c`, its CI
  passed in 2m19s, and the handoff-only closeout followed as `c4df0e9`. PR #14 was
  then exact-head squash-merged with separate authorization.
  The current follow-up adds the commit-pinned public fixture configuration and a
  protected-live Search/Extract and no-effect denial harness. W20's first assembled
  attempt exposed the missing durable exposure-registration link and failed closed
  with `audit_unavailable`. ADR-0036 adds an atomic minimized research-exposure
  operation. The complete ordinary gate and protected `scope_mismatch` denial with
  minimized audit inspection now pass. W21 then exposed and corrected the nested
  live-risk timeout hierarchy in ADR-0037. Protected Nemotron-through-broker now
  passes with exact pre-effect `approval_mismatch` and minimized audit inspection;
  the complete ordinary gate passes 61 files / 362 tests. W22 then assembles live
  Tavily Search/Extract, exact pre-provider `scope_mismatch`, live Nemotron, exact
  post-model `approval_mismatch`, and durable minimized audit inspection in one
  enforced no-effect session. The protected run passes in 27,216.1275 ms; the
  exact read-only disposable-target refresh then passed after fresh device
  enrollment. W23 used a separately confirmed one-use development approval to
  squash-merge only demo PR #2 at exact head `36251caf778466a7d08670ad8210375daf8a9bcb`,
  producing `7df353afe005b74811dfcd081ac98af5695a8170`. Final C6 failure review and the
  bounded secret/artifact audit then passed with no blocking finding. The complete
  ordinary gate remains green at 61 files / 362 tests; this local W19-W23 slice is
  checkpointed as `48b082d`, pushed, and open for review in PR #14. The first CI
  run exposed stale workspace importer entries in `pnpm-lock.yaml` before tests.
  The lockfile-only correction passes offline frozen install and the exact
  `pnpm check` command locally. Pre-review handoff CI passed at `b9497a9` in 2m14s.
  PR #14 had no reviews or comments at the Phase-1 refresh and remained unmerged
  until the later exact-head governance step.
- **Secret caution:** `.env.local` is ignored development input. Never print,
  stage, copy, summarize, or use it as the installation design. Never print or
  export credential-store values.

## Session closeout: PR #17 audit review and W26

### Current state

- PR #17 branch `codex/13-c6-linux-peer-credentials` is synchronized with its
  remote at `bca4313`. The W26 lifecycle work is isolated on stacked branch
  `codex/13-c6-linux-secret-service`.
- PR [#17](https://github.com/Loothore907/guardian-agent/pull/17) is open,
  non-draft, and mergeable, with no external reviews. It remains intentionally
  unmerged because its required CI check has no successful dependency-audit
  result.
- Issue [#13](https://github.com/Loothore907/guardian-agent/issues/13) remains
  open and C6 remains **In progress**.

### Session summary

1. Reviewed issue #13 against the code, roadmap, claims, and remaining intended-
   Linux exit criteria instead of treating the earlier Windows evidence as C6
   completion.
2. Added Linux authority peer authentication using kernel `SO_PEERCRED`
   PID/UID/GID plus trusted supervised ancestry before request parsing. Added a
   fixed, fail-closed Secret Service credential adapter and minimal Linux
   credential-child environment forwarding in `bb30574`.
3. Passed the complete local gate (63 Vitest files / 376 tests), the active WSL2
   Node 24 peer/process probe (2/2), and the absent-`secret-tool` fail-closed
   credential probe. The GitHub Ubuntu workflow's complete required-check and
   native Linux boundary steps also passed on every execution.
4. The approved workflow exposed repeated-approval friction caused by a lossy
   repository rule and downstream approval interpretation. ADR-0039 and the
   repository working agreement now define confirmed plans as persistent,
   revocable, typed authority for enumerated bounded actions, while retaining
   step-up for scope/effect expansion. Runtime enforcement remains a Goal.
5. Pushed the feature branch and opened PR #17. CI run `33827057982` and its one
   bounded retry, followed by final-head run `33828103000`, all reached only the
   production dependency audit failure. Each audit made three attempts against
   npm's advisory bulk endpoint and received timeout error 23. A local read-only
   query reproduced the same endpoint timeout; no vulnerability assessment was
   returned.
6. Rechecked the npm advisory bulk endpoint with a minimal package request; it
   still timed out with zero response bytes while npm's lightweight ping endpoint
   remained responsive. Dependabot reports no open repository alerts. This is
   evidence of advisory-endpoint friction, not evidence that dependencies are
   vulnerability-free.
7. Installed `libsecret-tools` and `gnome-keyring` in the WSL development image.
   The existing login session timed out fail closed, while a disposable isolated
   user D-Bus session passed the complete real Secret Service lifecycle. The W26
   complete Linux gate passes 63 files / 379 tests, eight SQLite tests, two reset
   tests, 181 modules / 364 dependencies, build, and the 2/2 platform probe.

### Pending debt and next actions

1. **Required before PR #17 can be treated as green:** rerun the required CI
   audit once npm's advisory endpoint is responsive. Do not bypass, downgrade,
   or misreport an unavailable audit as a passing vulnerability check.
2. **Remaining issue #13 / C6 exit evidence:** W26 now passes a real disposable
   Linux Secret Service lifecycle in an isolated user session. Verify intended-host
   credential-service containment and a protected provider credential, then capture
   narrow protected Linux GitHub read/merge evidence with exact request and
   resource-version binding.
3. **Documented operational limitations:** GitHub automatic credential refresh
   still receives provider HTTP 500, with attended re-enrollment as the bounded
   fallback; the pinned `pnpm/action-setup` version emits a Node.js 20 deprecation
   warning while GitHub forces it onto Node.js 24.
4. **Later separately tracked evidence:** WebAuthn user verification,
   worker-generated research/GitHub dispatch, the complete single-invocation
   coordinator, and formal C7 reconciliation remain outside this W25 merge.
5. **New cross-cutting implementation debt:** implement and adversarially test
   ADR-0039 plan grants, including membership, expiry, exhaustion, revocation,
   policy change, context compaction, near-miss refs/destinations, and protected
   or destructive step-up behavior. Until then, the claim remains `Goal`.

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

For the current C6 section, the W19-W23 slice meets its local review-readiness
gate: the assembled no-effect journey, separately authorized exact disposable
effect, protected failure review, complete ordinary gate, bounded secret/artifact
audit, and final changed-surface review pass. Checkpoint `48b082d` is pushed and
PR #14 later squash-merged; its generated-lockfile correction and remote CI are
green.
Phase-1 review then identified one final approval-consumption transport exception
that escaped the broker's typed fail-closed result. The local correction returns
`audit_unavailable`, never issues the merge, preserves consumed state after a lost
response, rejects retry as replay, and sanitizes the injected secret fixture. The
review matrix now distinguishes the intended-Linux C6 blocker from later WebAuthn,
worker-dispatch, coordinator, and C7 evidence.

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
- Protected live pre-activation evidence.
- Protected end-to-end Tavily research, scope denial, separately approved GitHub
  merge, mutation/replay, and redaction evidence through the executable path.

Do not call any of these implemented, and do not label the future hosted worker
`Enforced` merely because it runs on Nebius. Enforced requires reproducible tool,
filesystem, credential, network, lifecycle, and authority evidence.

## Current C6 Linux exit plan

W24 fixes the SQLite WAL/SHM sidecar mode and actively verifies current-user
ownership and mode `0600` for the authority database files and Unix socket. W25
then authenticates authority peers with kernel `SO_PEERCRED` PID/UID/GID plus
supervised ancestry before parsing requests, and adds a fixed, fail-closed
`/usr/bin/secret-tool` adapter.

W26 installs the Linux client/service prerequisites in the WSL development image
and passes missing/write/isolation/status/rotation/scoped-use/zeroing/delete against
a real disposable GNOME Keyring Secret Service in an isolated user session. The
existing WSL login session could not start its systemd user session and the first
write timed out fail closed, so this is compatibility evidence rather than a claim
about a persistent production desktop keyring. Intended-host credential-service
containment, a protected provider credential, and narrow Linux GitHub read/merge
remain. C6 remains In progress and no wider Enforced claim is made.

## Completed W14-W23 execution history

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

W19 then refreshed the deterministic research boundary. The initial managed
command failed closed before provider invocation because that identity reported
`tavily/default` missing. A separate public fixture repository was subsequently
created at `Loothore907/guardian-agent-fixtures`, and the exact input was pinned
to commit `6feab5bfea4a4ea769972b0313978c9b7171ca1f`. The user-scoped protected run
then passed through the Windows credential-store child, authority, prepared
workspace, session-bound local IPC, real Tavily Search, and fixed Extract:
Search accepted two untrusted results and Extract accepted one untrusted result
in a 19,702.1099 ms test / 20,010.5296 ms total run. Neither the credential nor
fixture text was emitted. Focused deterministic verification remains 8 files /
76 tests. ADR-0035 records that Tavily exposes no redirect-control field:
Guardian rejects unlisted inputs before provider use and rejects a returned URL
mismatch, but does not claim pre-provider redirect assurance inside Tavily.

W20's first assembled continuation retained the W19 Search and Extract results and
started the real broker child, but the broker returned `audit_unavailable`. The
durable store correctly rejected provenance identifiers that had no prior
minimized exposure records. ADR-0036 corrects the missing production link with one
strict, batch-atomic `context.append_exposures` operation available only to the
research-service role. Focused verification passes 17 files / 101 tests. The
protected rerun then passed in 20,158.9634 ms test / 20,407.8812 ms total: two
Search results and one Extract result remained untrusted, the real broker returned
exact `scope_mismatch`, and the reopened durable store showed three minimized
exposures plus a decision with Guardian/provider and adapter/credential boundaries
not crossed and approval/tool consumption not consumed. No GitHub operation or
remote mutation occurred.

W21 next exercised one exact in-scope merge proposal without approval through the
real Guardian and broker children. The first assembled attempt returned
`guardian_unavailable`; the existing isolated protected model diagnostic passed,
showing the credential and current Nemotron policy were healthy. ADR-0037 records
the contradicted timing assumption: two bounded 20-second Super/Ultra attempts did
not fit inside the old 20-second Guardian and 15-second broker IPC windows. The
corrected 45-second Guardian / 55-second broker hierarchy is mechanically tested.
The protected rerun passed in 21,819.3798 ms test / 22,069.3476 ms total with
`approval_mismatch`. Durable evidence records the provider boundary as crossed
while approval, tool, adapter, and credential boundaries remained uncrossed or
unconsumed. No GitHub operation or remote mutation occurred.

W22 then assembled both live providers and both policy stages in one enforced
session and one durable store. Live Tavily Search accepted two untrusted results,
controlled Extract accepted one untrusted result, and the same three minimized
exposure IDs were bound first to an out-of-scope proposal and then to an in-scope
proposal without approval. The first request stopped at exact `scope_mismatch`
before the Guardian provider boundary; the second crossed the live Nemotron
boundary and stopped at exact `approval_mismatch`. The protected run passed in
27,216.1275 ms test / 27,461.6919 ms total. Reopened audit evidence confirmed no
approval, tool, adapter, credential, or GitHub effect. No remote mutation occurred.

W23 refreshed the exact disposable target before effect. Public metadata and the
protected broker read agreed that PR #2 was open, non-draft, `main`-based, and at
head `36251caf778466a7d08670ad8210375daf8a9bcb`. The first protected read failed
closed with `connection_unavailable`; fresh interactive device enrollment restored
the documented bounded credential path, and the same exact-head read then passed.
After separate operator authorization for only that repository, PR, head, and
squash method, the protected one-use merge run passed in 8.23 seconds test / 8.90
seconds total. GitHub's read-only final state records merge commit
`7df353afe005b74811dfcd081ac98af5695a8170` at `2026-09-03T13:48:55Z`. This is
development-issuer evidence, not WebAuthn. The merge was the only W23 remote
mutation.

**Phase-2 exit:** each boundary has an assumption/evidence record, the protected
journey completes or stops at a documented fail-closed boundary, and no credential,
private provider content, or credential-equivalent material appears in model
contexts, process arguments or environments, SQLite, logs, traces, audit records,
errors, or public results.

**Current session tracks and handoff:** Track A has live Qwen mission dialogue plus
Kimi final-response, exact typed-request, and denial-continuation evidence through
W15-W18. W19 now has both its deterministic controlled-content boundary and the
protected user-scoped Search/Extract result against the commit-pinned fixture.
W20's initial assembled attempt failed closed at the missing exposure record; the
atomic registration correction and protected `scope_mismatch` plus minimized-audit
rerun now pass. W21's live Nemotron-through-broker path also passes after correcting
the nested timeout hierarchy. W22's single-session assembled no-effect journey now
passes. W23's separately authorized exact disposable effect also passes. The
complete ordinary gate and bounded secret/artifact review are green with no
blocking finding. Checkpoint `48b082d` was pushed and opened as PR #14; the next
gate was Phase-1 review and merge governance. The correction was pushed at `ddf194c`,
its CI passed in 2m19s, and PR #14 later squash-merged as `b69e933`; post-merge
`main` CI passed in 2m25s. Track B is locked at the design level in ADR-0034: a public
fixed/rate-limited demo and a separate authenticated piloted demo over the same
enforcement core. OpenAI backup qualification and worker-visible research/GitHub
dispatch remain separate queued slices; neither was started in this session.

### Phase-1 PR review result

The 2026-09-03 review refreshed PR #14 at `b9497a9`: it was open, mergeable,
green, and had no reviews or comments. The review did not repeat W20-W23 protected
providers or any GitHub effect. The exact C6 disposition is recorded in
[`c6-pr14-review-matrix.md`](evidence/c6-pr14-review-matrix.md): seven criteria
pass, four are partial because their required evidence scope includes Linux or a
protected live corpus, and the intended-Linux criterion is open.

The code review found one actionable error path. A rejection from the authority
client during final atomic approval consumption could escape `GitHubBroker.execute`
instead of returning a typed denial. The local correction fails closed with
`audit_unavailable`, performs no merge, and covers both pre-commit failure and a
committed-consumption/lost-response uncertainty. A retry after the uncertain case
is rejected as `approval_replayed`.

The complete ordinary gate passes locally: Prettier, ESLint, TypeScript, 61
Vitest files / 364 tests, seven SQLite spike tests with the expected Windows POSIX
permission skip, two reset-planner tests, 176 modules / 354 dependency edges, and
the production Vite build. `git diff --check main` is clean. The review slice is
the approved Phase-1 branch checkpoint. PR #14's expanded description points
reviewers to the matrix and does not present C6 as Passed.

After explicit authorization, PR #14 exact-head squash-merged at `2026-09-03T16:47:14Z`
as `b69e9338d5464cac31d52cf8510256a2d9f21c33`. Post-merge `main` CI passed in
2m25s. Issue #13 remained open. The feature branch was retained.

### W24-W25 Linux transition

PR #16 exact-head squash-merged as
`1893aef525587d854443f27455032de2e1a5fa15` at
`2026-09-04T01:01:12Z`; post-merge `main` CI passed in 2m22s. W25 then added the
ADR-0038 peer boundary: a narrow C
helper receives only the accepted Unix socket on fd 3, reports kernel
`SO_PEERCRED`, and the authority accepts only its same-UID/GID process,
supervisor, or direct sibling before reading any request. The independent exact
capability remains mandatory. A valid-capability unrelated child is actively
rejected in the Linux platform probe.

The W25 platform credential selector uses Windows Credential Manager on Windows
and fixed `/usr/bin/secret-tool` Secret Service operations on Linux. Secrets use
stdin only, output is bounded and zeroed, helper diagnostics are sanitized, and
there is no fallback. Its initial WSL image had a session bus but lacked
`secret-tool`; the active non-secret status probe failed closed as designed. No
credential or provider was used. See
[`w25-linux-peer-and-credentials.md`](evidence/w25-linux-peer-and-credentials.md).
The W25 complete local gate passes 63 Vitest files / 376 tests, seven SQLite
spike tests, two reset tests, 180 modules / 362 dependencies, and the production
build.

W26 then installed the Secret Service prerequisites in the development image and
added a gated real-service lifecycle test. The existing login session could not
start its systemd user session and timed out fail closed; a disposable isolated
user D-Bus session passed the lifecycle and complete Linux gate. See
[`w26-linux-secret-service-lifecycle.md`](evidence/w26-linux-secret-service-lifecycle.md).

### Recommended next-session sequence

1. Keep issue #13 open unless every C6 exit criterion is satisfied or remaining
   criteria are explicitly split into named follow-up issues with roadmap/claim
   updates. A merged broker-core PR is not by itself proof that all of C6 passed.
2. Restore PR #17's required production audit once npm's advisory endpoint is
   responsive. W26 now proves a disposable real Secret Service lifecycle; next
   verify intended-host credential-service containment and a protected provider
   credential, then obtain separate protected authorization for the narrow Linux
   GitHub read/merge path. Do not silently defer that current C6 exit criterion.
3. Keep the reproducible GitHub refresh `HTTP 500` as an external blocker with
   fresh attended enrollment as the bounded fallback. Do not spin on retries or
   weaken the refresh contract. Keep WebAuthn in the later user-verifying approval
   slice, and keep worker-visible research/GitHub dispatch and the full
   single-invocation coordinator as separately scoped evidence.
4. C7 is now honestly marked **In progress**. After the C6 residual decision,
   implement only its missing evidence: worker-generated polluted-content
   dispatch, the false/missed-escalation report, intended-Linux containment, and
   hosted/repeated evidence. Do not rebuild already evidenced W8/W21/W22 behavior.
5. Schedule maintenance for the GitHub Actions warning that the pinned
   `pnpm/action-setup` action targets deprecated Node.js 20 and is currently being
   forced onto Node.js 24. It did not fail either Phase-1 or post-merge CI.

### Stop/go rules

- Do not repeat a live GitHub effect without a newly reset disposable fixture,
  refreshed exact resource state, and separate authorization bound to the exact
  repository, PR, head, and method.
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
- Last verified external demo state: public `Loothore907/guardian-agent-demo` is
  provisioned and squash-only. PR #1 passed the initial exact-head read and merge.
  W23 refreshed deterministic demo PR #2 at head
  `36251caf778466a7d08670ad8210375daf8a9bcb`, passed the protected read, and after
  separate exact authorization squash-merged it as
  `7df353afe005b74811dfcd081ac98af5695a8170` at `2026-09-03T13:48:55Z`.
- Last recorded domain state: `agentic-guardian.com` was registered and delegated
  to Cloudflare nameservers. This was not refreshed during W6-W14 and is not
  evidence of an application deployment, valid TLS, or WebAuthn origin.
- Main-repository PR #14 squash-merged from
  `codex/13-c6-durable-authorization-broker` at exact reviewed head `c4df0e9`.
  Immutable `main` commit `b69e9338d5464cac31d52cf8510256a2d9f21c33`
  has green post-merge CI. The feature branch remains available. Issue #13 remains
  open.
- Handoff PR #15 squash-merged as
  `ae49ebc2fc8f1cca4c4645abeeb93e76aac02d4f`. Its first post-merge CI run failed
  only when the npm advisory request timed out; the single bounded failed-job
  rerun passed in 6m16s without weakening the audit gate.

## Verification at this transition

The current ordinary component set passes on this Windows host:

- TypeScript build and typecheck;
- ESLint and Prettier checks;
- dependency boundaries: 176 modules and 354 dependencies, no violations;
- Vitest: 61 files and 364 tests passed; three protected files and five protected
  tests skipped, for 64 files / 369 tests total;
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

The Phase-1 `git diff --check main` is clean. The desktop `pnpm` wrapper's supply-chain
metadata check attempted blocked registry access, so the same frozen `check`
components were run directly with the pinned bundled Node and repository binaries;
all passed. The protected runtime passed unchanged during W4 with approved WSL
access and was not rerun for W5-W14 because those slices did not change the
executor path. The W6-W13 implementation tip is `90da76b`; W14-W18 are captured
in `aa5e601`, and deterministic W19 is captured in `e8e054f`. The W19 managed
baseline stopped before provider use, while the subsequent user-scoped protected
Search/Extract run passed. The separate public fixture repository was intentionally
created and pushed under the user's approval; no main-repository push, release, or
publication followed those earlier local checkpoints. W20-W23 were later
checkpointed as `48b082d`, pushed, and opened as PR #14; no main-repository merge,
release, deployment, or publication followed at that checkpoint. PR #14 later
squash-merged under the separate governance step described above.

A refreshed bounded review found no changed or untracked database, archive,
binary, log, key, certificate, environment, or other sensitive artifact files and
no unexpected untracked roots. `.env.local` remains ignored. The changed-line
secret-pattern scan found only one deliberate fake provider credential in a
research-service failure test; no production or documentation path matched.
Repository secret scanning and remote CI remain independent review signals;
PR #14's Phase-1 implementation-review CI passed at `ddf194c` in 2m19s; the
handoff-only branch head passed in 2m23s; and post-merge `main` CI passed at
`b69e933` in 2m25s. The post-merge run emitted a nonblocking warning that the
pinned `pnpm/action-setup` action targets deprecated Node.js 20 and is being
forced onto Node.js 24. The GitHub refresh endpoint's documented HTTP 500 remains
an operational limitation. W24 now actively passes the intended-Linux
database/socket permission probe and fixes the SQLite sidecar mode discovered by
its first run. W25 authenticates Linux authority peers before request parsing and
adds a fail-closed Secret Service adapter. W26 passes a real disposable lifecycle
in an isolated user session. Intended-host credential-service containment,
protected Linux provider-credential resolution, and narrow GitHub read/merge
remain the C6 blocker. WebAuthn and the single-invocation coordinator remain later
evidence slices; no broader guarantee is claimed.

PR #17's last completed CI evidence is at `a2f704c`. Across the original CI run,
one bounded retry, and that head's run, the required project checks and native
Linux boundary checks passed. The only failing step was `pnpm audit --prod
--audit-level high`: npm's advisory bulk endpoint timed out on all three internal
attempts in each execution, and a local query reproduced the same timeout. No
advisory result exists, so CI correctly remains red and no merge was attempted.

This session also exposed approval fatigue as a concrete product risk: a reviewed
plan explicitly required a feature-branch push and pull-request creation, but a
lossy repository rule and downstream approval reviewer repeatedly treated those
steps as new authority requests. ADR-0039 now defines the intended correction:
direct confirmation creates a persistent, revocable, typed plan grant; each
concrete action is still re-normalized and checked for membership, while only
scope or effect expansion triggers a new step-up. The repository working
agreement now follows that rule for bounded non-destructive workflow actions.
Runtime enforcement of plan grants remains a documented Goal, not an implemented
claim.

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
- [ADR-0035: Fixed controlled-content Extract boundary](../adr/0035-fixed-controlled-content-extract.md)
- [ADR-0038: Linux peer identity and Secret Service credential resolution](../adr/0038-linux-peer-identity-and-secret-service.md)
- [ADR-0039: Persistent plan-bound session authority](../adr/0039-persistent-plan-bound-session-authority.md)
- [W2 session workspace evidence](evidence/w2-session-workspace.md)
- [W3 worker tool round-trip evidence](evidence/w3-worker-tool-round-trip.md)
- [W4 denial containment evidence](evidence/w4-denial-containment.md)
- [W14 executable competition startup evidence](evidence/w14-executable-competition-startup.md)
- [W15 live Qwen boundary evidence](evidence/w15-live-qwen-boundary.md)
- [W16 live worker policy-correction evidence](evidence/w16-live-worker-policy-correction.md)
- [W17 live worker typed-request evidence](evidence/w17-live-worker-typed-request.md)
- [W18 live worker denial-continuation evidence](evidence/w18-live-worker-denial-continuation.md)
- [W19 controlled-content Extract evidence](evidence/w19-controlled-content-extract.md)
- [C6 authority service evidence](evidence/c6-authority-service.md)
- [C6 Linux platform permission evidence](evidence/c6-linux-platform-permissions.md)
- [W25 Linux peer and credential evidence](evidence/w25-linux-peer-and-credentials.md)
- [W26 Linux Secret Service lifecycle evidence](evidence/w26-linux-secret-service-lifecycle.md)
- [C6 terminal bootstrap evidence](evidence/c6-terminal-bootstrap.md)
- [C6 interaction boundary evidence](evidence/c6-interaction-boundary.md)
- [C6 process supervision evidence](evidence/c6-process-supervision.md)
- [C6 credential-isolated Nebius model evidence](evidence/c6-nebius-model-adapters.md)
- [C6 secret-corpus evidence](evidence/c6-secret-corpus.md)
