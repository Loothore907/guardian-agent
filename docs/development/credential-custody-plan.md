# Credential custody implementation plan

- Status: Active local implementation plan
- Date: 2026-09-03
- Authority: user-directed credential-enrollment priority and ADR-0041
- Remote state: pushes, pull-request changes, merges, releases, deployments, and
  provider mutations remain outside this plan

## Outcome

Deliver a Linux managed-demo credential path and a reusable BYOK credential core
without routing raw secrets through an agent, model, MCP request, public
application, command argument, environment variable, repository file, log, trace,
audit record, or public error.

The managed demo uses project-owned credentials from Nebius SecretStash and
separate judge/public pools. BYOK uses a Guardian-owned local enrollment surface
and the user's OS credential store. Both paths expose only typed connection
capabilities to assignments and typed sanitized results to workers.

## Current inventory

### Providers, slots, verification, and consumers

| Provider | Current slots | Enrollment/verification | Credential-holding consumers |
| --- | --- | --- | --- |
| Nebius | `default` | Pasted credential; fixed Token Factory models endpoint | interaction, Guardian-risk, and native-worker services |
| Tavily | `default` | Pasted credential; fixed usage endpoint | research service |
| GitHub | `default`, `refresh`, `metadata` | Fixed GitHub App device flow; authenticated-user verification | GitHub broker |

`metadata` is non-secret JSON but currently shares the credential-store
abstraction. The future registry must identify it as credential-associated
metadata rather than silently treating it as the same kind of secret as access
and refresh material.

### Current stores

| Store | Status | Important limits |
| --- | --- | --- |
| In-memory | deterministic tests | not persistent or a product store |
| Windows Credential Manager | implemented and protected locally | Windows-only; replacement semantics need explicit evidence |
| Linux Secret Service | deterministic adapter and disposable lifecycle pass | intended persistent user session and enrollment UX unproven |
| macOS Keychain | absent | selected by ADR-0008 but not implemented |
| Nebius SecretStash | deterministic fixed-resource adapter and consumer-bound bootstrap routing implemented | protected IAM, deployment, and retrieval evidence pending |

### Current setup and protected paths

- `guardian credentials [enroll|review|status|revoke] <provider>` is the stable
  management surface; `guardian setup` remains a compatibility alias.
- Nebius and Tavily no longer use the failed raw-terminal reader. The one-use
  browser composition is compiled. The first Windows review exposed an unwanted
  password-generation hint; real enrollment is disabled pending a corrected-field
  recheck. Linux remains pending its platform review.
- Review mode preflights the actual platform store, then accepts and discards an
  obvious fake value without provider access or a store write.
- GitHub uses a browser device flow and stores an access token, refresh token,
  and expiry metadata.
- Protected scripts directly assume `nebius/default`, `tavily/default`, or the
  GitHub slots already exist. They must consume enrollment; they must not become
  enrollment interfaces.
- Credential-holding service bootstraps now carry a strict non-secret custody
  profile, deployment pool, intended runtime, target store, and allowlisted
  SecretStash resources. Local BYOK defaults remain OS-selected; store preflight
  status still needs richer typed states.
- Status currently reports only `available` or `missing`; it does not distinguish
  unavailable store, invalid configuration, wrong runtime, or verification state.

### Current host paths

- Windows development host with Credential Manager;
- Windows/WSL2 Ubuntu reference sandbox;
- native Linux services and Secret Service adapter;
- planned Nebius-hosted Linux judge/public deployment;
- planned macOS BYOK path.

The worker-facing contracts can remain portable. Store resolution, trusted IPC,
process identity, filesystem permissions, network restrictions, and assurance
evidence remain platform-specific.

## Settled implementation decisions

1. Use the explicit `managed_demo` and `byok` custody profiles from ADR-0041.
2. Use Nebius SecretStash for hosted project-owned secrets; do not invent a
   Guardian encrypted file for the hackathon deployment.
3. Provision public and judge credentials separately and bind them to separate
   fixed pool identifiers, service identities where practical, and budgets.
4. Keep SecretStash writes outside the running public application. Initial
   operator provisioning and provider-side rotation use an authenticated Nebius
   operator surface; Guardian runtime access is fixed-resource and read-only.
5. Keep BYOK on OS-native credential stores. Headless Linux fallback and macOS
   support are later explicit adapters, not silent fallbacks.
6. Share lifecycle, registry, verification, status, redaction, and broker
   behavior; do not share secrets or storage identifiers between profiles.
7. Keep GitHub device authorization distinct from pasted-secret acquisition while
   using the common transactional lifecycle.
8. Do not request another real credential until the fake-secret setup surface,
   preflight, cancellation, replacement, and redaction gates pass and the user
   reviews the exact interaction.

## Worktree handling

The current branch contains checkpointed W27 containment, custody, budget, and
judge-ingress work. The failed launcher prototypes are absent. Preserve those
coherent commits while completing only the credential bridge needed to resume
the roadmap.

- Salvage only containment work that remains valid under ADR-0041.
- Do not run or recommend either failed `run-linux-nebius-provider-live` launcher.
- Remove or replace failed prototypes only after their useful diagnostics and
  cleanup behavior are captured in tests or evidence.
- Do not include unrelated paused npm, PR, issue, merge, release, or deployment
  work in credential-custody commits.

## Execution slices

Progress through 2026-09-04: slices 0 and 1 are complete locally; the
verify-before-commit and prior-value-preservation core of slice 2 is complete;
slice 4 has deterministic contracts, a fixed CLI resolver, callback zeroing,
read-only behavior, consumer projection, and strict service-bootstrap wiring.
Protected IAM/retrieval evidence and the remaining slices are intentionally not
claimed. Slice 3 now has a hardened one-time loopback browser modal, stable CLI
alias, actual-store preflight, a provider-free/store-read-only review mode, and a
deterministically tested real enrollment composition. Windows submission and
cancellation are accepted, but activation awaits a short recheck after removing
the generated-password hint. Linux/WSL interaction review is still required
before Linux enrollment is enabled or claimed usable.

### Slice 0: Reconcile the contract and inventory

Deliverables:

- ADR-0041 and this inventory/plan;
- update the ADR index;
- reconcile product contract, architecture, threat model, security claims,
  README, roadmap, and rotating handoff;
- change any Linux/BYOK statement that exceeds current evidence;
- record the revoked exposed credential only as sanitized incident closure.

Gate:

- documentation consistently distinguishes managed demo, BYOK, implemented
  adapters, tested compatibility, and protected usability.

### Slice 1: Typed provider and custody registry

Deliverables:

- strict custody-profile, pool, store-target, provider capability, slot, and
  credential-associated metadata contracts;
- one reviewed registry for Nebius, Tavily, and GitHub;
- fixed mapping from each profile/provider/pool to allowed store targets and
  consumers;
- rejection of arbitrary providers, slots, store names, resource identifiers,
  payload keys, URLs, headers, commands, and environment fields;
- dependency rules preventing agent-facing packages from importing resolution
  internals.

Tests:

- valid mappings plus wrong-profile, cross-pool, wrong-slot, unknown-store,
  oversized, malformed, and substitution cases.

Gate:

- every current credential consumer resolves through the registry; no production
  code constructs an unregistered provider/slot pair ad hoc.

### Slice 2: Preflight and transactional lifecycle

Deliverables:

- non-secret preflight for runtime identity, store availability, configuration,
  destination suitability, and interaction availability;
- explicit enroll, replace, status, local revoke, and cancellation operations;
- verify-before-commit replacement that preserves the last valid credential;
- all-or-preserve behavior for GitHub access/refresh/metadata;
- deterministic buffer zeroing and sanitized typed errors;
- status that binds provider, profile, pool, target store, and intended runtime
  without returning a secret.

Tests:

- empty/oversized input, cancellation at every boundary, provider rejection,
  store failure before/during/after staging, rollback failure, prior-value
  preservation, concurrent replacement, cross-store routing, and redaction.

Gate:

- fake-secret tests prove no partial write and no loss of the prior valid
  enrollment on every modeled failure.

### Slice 3: Trusted local BYOK setup surface

Deliverables:

- a bounded fake-secret spike comparing a dedicated local UI and a hardened
  user-launched terminal surface against the threat and usability criteria;
- record the selected surface in an ADR before accepting real input;
- one stable `guardian credentials` entry point with explicit provider,
  destination, persistence, and intended-runtime display;
- reliable typing and clipboard paste, cancellation, and cleanup;
- compatibility aliases or migration guidance for `guardian setup`.

Tests:

- bracketed paste, ordinary paste, typing, backspace, Unicode rejection where the
  provider requires ASCII, control input, EOF, terminal loss, replay, duplicate
  submission, local-origin/caller binding where applicable, and secret-corpus
  inspection.

Gate:

- the exact fake-secret interaction passes on the claimed Linux host and the user
  reviews it before any protected enrollment.

### Slice 4: Managed-demo SecretStash adapter

Deliverables:

- strict trusted configuration containing only allowlisted non-secret secret IDs,
  payload keys, project/region bindings, profile, and pool;
- a narrow SecretStash resolver owned only by credential-holding services;
- service-account authentication with no reusable service key in application
  configuration;
- primary-version retrieval inside a scoped callback with bounded payload,
  zeroing, and sanitized errors;
- wrong-project, wrong-region, wrong-secret, wrong-payload-key, wrong-pool,
  unavailable, malformed, oversized, and stale-version rejection;
- sanitized status and provider verification without exposing payloads.

Tests:

- deterministic fake transport and fixture corpus first;
- protected retrieval only after IAM and exact resource bindings are reviewed;
- process, argv, environment, filesystem, log, trace, audit, error, and public
  result inspection.

Gate:

- a project-owned fake/provider test credential can be retrieved and consumed by
  the intended Linux credential service without entering any agent-visible
  surface.

### Slice 5: Judge/public budget isolation

The working quantities, tunable controls, calibration method, and initial reserve
are specified in [managed-demo-budget-plan.md](managed-demo-budget-plan.md).

Deliverables:

- fixed `judge` and `public` deployment pool policies;
- separate connection records and provider credential bindings;
- per-run, per-source, daily, global, queue, concurrency, and cooldown limits;
- provider/model token ceilings, operator kill switch, and fail-closed budget
  persistence;
- reserved judging capacity that public traffic cannot consume;
- anonymous public mutation rejection from ADR-0034.

Tests:

- exhaustion, concurrency races, restart preservation, clock boundaries,
  cross-pool substitution, public-to-judge escalation, kill-switch races, and
  provider failure charging semantics.

Gate:

- public use cannot select or consume judge credentials or budget and cannot
  perform a credentialed mutation.

### Slice 6: Protected Linux managed-demo journey

Deliverables:

- operator provisioning runbook using separate fake, public, and judge resources;
- preflight/status, provider verification, assignment binding, credential-holding
  consumption, budget decrement, rotation-version switch, and local disablement;
- sanitized incident-response and rollback procedure;
- protected evidence for Nebius and Tavily, followed by GitHub only when its
  attended authorization and current refresh limitation are acceptable.

Gate:

- one complete judge path and one bounded public no-effect path pass with clean
  secret/artifact inspection and without re-entering or relocating a credential.

### Slice 7: BYOK platform expansion

Order:

1. Linux desktop Secret Service;
2. Windows Credential Manager;
3. macOS Keychain;
4. separately approved headless-Linux fallback, if still needed.

Each platform requires the same preflight, setup-surface, replacement,
cancellation, status, revoke, runtime-consumption, bypass, and secret-corpus
evidence. A platform is not described as supported until its complete protected
journey passes.

## Verification cadence

For each slice:

1. run the narrowest affected unit and integration tests during iteration;
2. run format, lint, typecheck, dependency boundaries, and the relevant platform
   probes before checkpointing;
3. review the exact diff and changed-line secret patterns;
4. create a small local checkpoint commit only when the slice is coherent and
   green;
5. run the complete ordinary suite and bounded artifact/secret audit before any
   remote-readiness discussion.

No protected provider call is part of an ordinary test. No remote action is
authorized by this plan.

## Completion gate

The active objective is complete when:

- managed-demo Linux credentials are stored in SecretStash under separate public
  and judge identities/pools;
- only credential-holding services can resolve them and all runtime results are
  sanitized;
- deterministic global and pool budgets prevent public exhaustion of judging;
- the public mode cannot perform an anonymous credentialed mutation;
- the shared lifecycle passes preflight, verification, transactional
  replacement, status, cancellation, revoke, redaction, and cross-profile tests;
- the selected BYOK setup surface passes fake-secret usability review;
- every security claim is limited to reproducible evidence; and
- the old failed launcher prototypes are either removed or clearly quarantined
  and cannot be mistaken for supported setup.
