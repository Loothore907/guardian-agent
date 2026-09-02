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
  one-tool/result execution, W4 contained denial/revocation, and the W5 controlled
  competition coordinator are locally implemented. Do not reopen the settled
  workspace-copy or exact W3 lifecycle while choosing the next slice.
- **W4 outcome:** an ordinary rejected action returns only an exact sanitized
  denial and can reach the mandatory final turn. Version-1 trusted policy contains
  the first two ordinary events in an inclusive five-minute window, revokes on
  the third, excludes older events, immediately revokes replay/binding near
  misses, and interrupts trusted boundary failure. Model output cannot supply
  severity, counts, thresholds, or disposition.
- **Critical sequencing decision:** the user selected the controlled
  research/GitHub competition journey before a generalized bounded worker loop.
  W5 implements that fixed ordering in trusted orchestration while preserving
  W3/W4's one-request, two-turn lifecycle.
- **Checkpoint state:** the user authorized and the repository created local
  commit `2de8d21` (`feat: contain worker denials and revoke deterministically`)
  for W4 on top of checkpoint `0dd3323`. No push, pull request, merge,
  publication, release, or other remote mutation followed.
- **Current worktree:** W5 coordinator code, tests, ADR-0020, evidence, and
  documentation are intentionally uncommitted pending complete verification,
  review, and explicit commit direction.
- **Secret caution:** `.env.local` is ignored development input. Never print,
  stage, copy, summarize, or use it as the installation design. Never print or
  export credential-store values.

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

The `competition-2026-09-01` version 1 policy currently assigns:

- native worker: `Qwen/Qwen3-Coder-30B-A3B-Instruct`;
- mission dialogue: `Qwen/Qwen3-235B-A22B-Instruct-2507`;
- primary contextual risk: `nvidia/nemotron-3-super-120b-a12b`;
- invalid-output escalation: `nvidia/Nemotron-3-Ultra-550b-a55b`.

These are versioned evidence pins, not permanent model choices. A reviewed policy
version may upgrade them. Session prompts, retrieved content, workers, and model
output cannot choose arbitrary model IDs. Every competition policy must retain
the mechanically validated NVIDIA Nemotron presence.

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
  record the decision, focused tests, and remaining live attachment work.

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
- CLI and supervised credential-holding service attachment for the W5 coordinator,
  plus protected end-to-end research/denial/merge evidence.

Do not call any of these implemented, and do not label the future hosted worker
`Enforced` merely because it runs on Nebius. Enforced requires reproducible tool,
filesystem, credential, network, lifecycle, and authority evidence.

## Next implementation slices

1. Complete the W5 full local gate, review the diff, and create a local checkpoint
   only after explicit user authorization. Stop before any remote operation unless
   separately directed.
2. Attach the existing durable Tavily research client and credential-holding
   GitHub broker to the W5 coordinator under supervised reference execution, then
   expose the minimized journey state in the CLI.
3. Capture protected live worker, pre-activation, journey, and
   Nemotron-through-broker
   evidence without logging provider content or credentials.
4. Resume the controlled Extract/adversarial journey, WebAuthn ceremony, Linux
   parity, and C8 experience work in dependency order.

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
- Public `Loothore907/guardian-agent-demo` is provisioned and squash-only. PR #1
  passed exact-head read and merge. Deterministic reset created open demo PR #2 for
  the next exact-approval demonstration.
- `agentic-guardian.com` is registered and delegated to Cloudflare nameservers.
  This is not evidence of an application deployment, valid TLS, or WebAuthn origin.

## Verification at this transition

The current ordinary component set passes on this Windows host:

- TypeScript build and typecheck;
- ESLint and Prettier checks;
- dependency boundaries: 154 modules and 288 dependencies, no violations;
- Vitest: 52 files and 289 tests passed; three protected files and five protected
  tests skipped, for 55 files / 294 tests total;
- SQLite authority spike: seven passed and the expected POSIX permission test
  skipped on Windows;
- deterministic demo reset planner: two passed;
- production Vite build;
- protected Windows/WSL reference runtime: one passed, including the existing C4
  isolation probe, persistent workspace, no source writeback, hidden host paths,
  credential absence, direct-egress denial, and the supervised exact W3 local-
  command/result/final-turn path with durable budget consumption under the W4
  success-result contract.

The last `git diff --check` was clean. The desktop `pnpm` wrapper's supply-chain
metadata check attempted blocked registry access, so the same frozen `check`
components were run directly with the pinned bundled Node and repository binaries;
all passed. The protected runtime passed unchanged during W4 with approved WSL
access and was not rerun for W5 because this slice does not change the launched
runtime or executor path. No live credentialed provider test ran during W5. The
current local checkpoint commit is `2de8d21`; no W5 commit, push, publish, release,
or remote mutation was performed.

A commit-readiness audit at this handoff found no untracked database, archive,
binary, log, key, certificate, or environment files. `.env.local` remains ignored.
A pattern scan of the complete proposed file contents found no private-key block,
GitHub-token, AWS-access-key, JWT, or bearer-token pattern. This is a bounded
local readiness check, not a substitute for repository secret scanning and remote
CI after an explicitly authorized commit and push. The GitHub refresh endpoint's
documented HTTP 500 and the absence of a new live-provider run are C6 residuals;
they do not block this local checkpoint because no broader guarantee is claimed.

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
- [W2 session workspace evidence](evidence/w2-session-workspace.md)
- [W3 worker tool round-trip evidence](evidence/w3-worker-tool-round-trip.md)
- [W4 denial containment evidence](evidence/w4-denial-containment.md)
- [C6 authority service evidence](evidence/c6-authority-service.md)
- [C6 terminal bootstrap evidence](evidence/c6-terminal-bootstrap.md)
- [C6 interaction boundary evidence](evidence/c6-interaction-boundary.md)
- [C6 process supervision evidence](evidence/c6-process-supervision.md)
- [C6 credential-isolated Nebius model evidence](evidence/c6-nebius-model-adapters.md)
- [C6 secret-corpus evidence](evidence/c6-secret-corpus.md)
