# Product Contract

- Status: Accepted for competition planning
- Date: 2026-08-29
- Product owner: Earl Ray

## Problem

Long-running AI agents increasingly work across public, potentially adversarial content while retaining access to authenticated services. Three related problems make that unsafe or impractical:

1. **Credential custody** - agents are often given reusable credentials, credential-bearing configuration, or authenticated browser sessions that can leak through prompts, tools, logs, errors, or compromised context.
2. **Connection friction** - a human must repeatedly authenticate, copy credentials, or prepare an authenticated environment before useful work can begin.
3. **Delegated authority** - hiding a credential does not help if the agent still receives unrestricted use of everything that credential unlocks.

Long-running work increases exposure to webpages, repositories, issues, documents, search results, and tool output that may contain indirect prompt injection. The core safety objective is not to guarantee that the model is never manipulated. It is to prevent manipulated model behavior from automatically gaining authority.

## Product promise

> A Guardian Session gives an AI agent bounded autonomy inside a task-scoped runtime where public research and authenticated actions are forced through observable, policy-controlled pathways.

In shorter form:

> Give agents capabilities, not credentials.

## Primary users

- A person delegating a long-running research or engineering task who wants routine progress without repeated authentication or approval fatigue.
- An agent developer or operator who needs a reference pattern for credential isolation, bounded capabilities, exact approval, and evidence-backed audit.

For the competition prototype, the delegating user, provider-account owner, and
Guardian operator are normally the same person. Agentic Guardian is local-first
and self-hosted; the project maintainers are not the user's credential custodian.

## Product model

1. The user delegates work to a Guardian worker. The competition reference worker uses a versioned coding model through Nebius; future external-scaffold and local adapters may implement the same contract. A prompt-level Guardian invocation submits an untrusted natural-language session draft but creates no authority.
2. Guardian deterministically validates the draft envelope. In the normal cloud route, bounded Qwen review reports either semantic readiness or missing-field codes and targeted clarification questions. Qwen does not validate authority.
3. Guardian revalidates every answer, normalizes and clamps the completed draft to supported capabilities, and produces a candidate mission and versioned session profile defining tools, filesystem scope, network policy, time, volume, destinations, and side-effect limits.
4. A constrained Nemotron guardian may assess a minimized credential-free mission-risk envelope and may preserve or increase the deterministic scrutiny requirement. It cannot expand the candidate mission or activate it.
5. Guardian displays the exact normalized candidate and consequences. Direct human confirmation of its digest is required before it becomes mission authority.
6. For Enforced mode, a trusted Guardian launcher starts a fresh selected worker process inside a disposable reference runtime with no service credentials and no uncontrolled external pathway. An unrestricted existing host is Observed or Unknown.
7. The worker performs local reasoning, coding, and research and calls only mission-approved Guardian capabilities. Its model assignment is trusted deployment policy, never prompt-controlled session authority.
8. Tavily supplies bounded public evidence. Guardian records a minimized research journey and labels all retrieved content untrusted.
9. Deterministic policy establishes the minimum authorization requirement for every proposal. Runtime Nemotron review may preserve or increase that floor at selected semantic-risk boundaries.
10. A central local authority service is the sole owner of durable authorization state and exposes narrow authenticated operations to trusted components.
11. A human uses a user-verifying passkey to approve an exact consequential boundary crossing when the revised mission permits it but no existing grant authorizes it.
12. The privileged broker independently revalidates and executes only the exact authorized typed operation using a just-in-time, short-lived service credential.
13. Denial contains the rejected boundary attempt and normally returns a typed result so permitted work can continue. Immediate-severity events or a bounded repeated-violation pattern may trigger deterministic revocation or interruption; model output cannot choose or weaken that policy.

## Host-agent and Guardian model roles

The terminal is the primary work surface. A user can start Guardian with a
natural-language task without first completing a broad web form. A host agent or
scaffold integration may pre-populate a proposed mission, but that draft
is untrusted and cannot create or expand authority. Guardian presents the
normalized goal, resources, tools, destinations, lifetime, volume, filesystem and
network scope, and side-effect consequences for direct human confirmation.

The canonical `https://agentic-guardian.com` origin supplies documentation,
downloads, release metadata, competition demonstration, and—only where a later
threat model justifies it—a narrow independent human ceremony. Routine session
creation, provider credential enrollment, agent work, policy, and audit remain in
the user's self-hosted environment.

The competition reference integration launches Guardian's provider-neutral native
worker inside the controlled runtime and serves its versioned coding model through
Nebius Token Factory. Future Codex, Claude Code, Cursor, and local-model adapters
remain compatible targets. Merely installing Guardian
tools in an existing unrestricted harness is useful mediation but is Observed or
Unknown, not Enforced.

Before activation, the normal cloud `qwen_assisted` route gives the versioned
policy's mission-dialogue model (currently Qwen) a bounded, credential-free draft
envelope after deterministic input screening. It reviews semantic completeness
and returns only readiness or bounded missing-field codes and targeted questions.
Guardian code revalidates the answers and remains the only mission compiler. A
deliberately selected structured integration may bypass model review, and any
fallback is visible and auditable.

After deterministic compilation, Qwen may explain the candidate mission and its
consequences. After activation it may explain denials, expansion requests, and
approval consequences. It cannot perform the delegated task, inspect the
repository, propose or execute tools, validate authority, confirm a digest,
activate a session, or expand authority. Nemotron separately evaluates minimized
credential-free mission-risk or action-risk envelopes and may only preserve or
increase scrutiny. Model assignments are trusted, versioned evidence pins rather
than permanent choices; session prompts cannot select them, and the competition
policy must retain NVIDIA Nemotron risk roles. The competition runtime needs no
OpenAI API key: Nebius serves the worker, Qwen dialogue, and Nemotron risk calls,
while their contracts and contexts stay separate. See ADR-0012, ADR-0013, and
ADR-0015.

`guardian setup` is a trusted local ceremony. It will place user-owned Nebius,
optional Tavily, and operation-specific credentials directly into the operating
system credential store or a documented secured local alternative. Secrets never
enter mission text, model arguments, MCP requests, command arguments, browser
URLs, the public domain, or the authority database. Credential-holding services
resolve them only for fixed, typed provider operations and return sanitized
results. `.env.local` is development-only, not an installation mechanism.

Cloud mode sends only selected minimized Guardian context to Nebius and, when research is enabled,
bounded public-research queries to Tavily. The user owns those accounts and their
billing. Future provider adapters may support hybrid or local modes, but current
competition implementation still depends on Nebius and the research story uses
Tavily.

## Assurance levels

Guardian must describe what it can actually observe and enforce:

- **Enforced** - Guardian launched the documented reference runtime and verified its tool, filesystem, credential, and network profile.
- **Observed** - Guardian mediates its own capabilities, but other external pathways may exist in the host or agent harness.
- **Unknown** - the environment cannot provide sufficient evidence about alternate pathways.

The competition demonstration targets **Enforced** for the documented reference environment. Guardian does not claim universal enforcement in arbitrary third-party terminal harnesses.

## Competition mission

The reference mission operates against a dedicated, disposable demo repository:

> Review the seeded pull request and report findings. Do not modify the remote repository.

The mission permits bounded local analysis, tests, GitHub reads, and Tavily-mediated public research. It denies external writes. The demonstration then shows:

1. useful research and review proceeding without repeated login;
2. a controlled live public page delivering indirect prompt-injection content through Guardian's bounded retrieval path;
3. an unsafe merge or authority-expansion proposal rejected by the read-only mission before approval, credential minting, or GitHub mutation consumes anything;
4. direct network and Git push bypass attempts failing in the reference runtime;
5. Nemotron explaining or increasing contextual risk without weakening deterministic policy;
6. a minimized evidence-to-attempt-to-decision view that does not claim the public content caused the proposal;
7. a later human-authored mission revision and legitimate merge request approved with a user-verifying passkey bound to the repository, pull-request head commit, squash method, expiry, and nonce;
8. immediate re-fetch, re-normalization, digest verification, atomic nonce consumption, and execution through a narrow GitHub adapter using a locally resolved short-lived or narrowly scoped credential;
9. post-approval mutation and replay rejection; and
10. a sanitized audit contrasting the injected denied attempt with the separately authorized legitimate action.

## Product goals and prototype success metrics

### Credential isolation

- No GitHub, Tavily, Nebius, or other reusable provider credential is available to
  the external host agent, Guardian models, or local command sandbox.
- Provider capture, public results, errors, logs, traces, and audit events pass secret-corpus and negative retrieval tests.
- Direct credential-retrieval capabilities do not exist.

### Enforced mission boundaries

- The reference runtime exposes only the tools named by the active session profile.
- Direct public network requests and direct authenticated Git operations fail in reproducible tests.
- Scope, time, volume, destination, and side-effect limits fail closed.
- The UI never labels a session Enforced without corresponding runtime evidence.

### Bounded public research

- Tavily requests are derived from allowed mission context, bounded by deterministic query and traversal limits, and checked for secret-like outbound content.
- Every returned source is labeled untrusted and associated with provenance metadata.
- The research journey explains which public evidence preceded a consequential proposal without retaining unnecessary raw content.

### Exact authorization

- Mutation, expiry, replay, cross-session use, cross-connection use, scope expansion, and resource-version changes are rejected by reproducible tests.
- A privileged operation is re-normalized and its digest revalidated immediately before execution.
- The showcased approval uses a user-verifying WebAuthn assertion whose challenge is bound to the exact request and authority context.
- The showcased GitHub credential is short-lived or narrowly scoped, resolved by
  the self-hosting user's local credential service, and unavailable to the agent,
  models, authority database, logs, and public results. The final GitHub
  enrollment mechanism remains to be reconciled with ADR-0008 before this is an
  implementation claim.

### Guardian contribution

- Nemotron performs a real runtime call through Nebius Token Factory.
- The model detects or explains semantic risk in documented fixtures while never lowering deterministic requirements.
- Invalid, unavailable, uncertain, or malformed output escalates or denies.
- Evaluation reports both missed escalations and false escalations rather than claiming perfect prompt-injection detection.

### Human comprehension

- A new viewer can identify the mission, active restrictions, attempted action, relevant public influence, required approval, and outcome without reading the architecture documentation.
- A new user can start and resume the reference session from the Guardian-owned terminal CLI, with browser transitions limited to clearly identified trusted ceremonies.
- The complete judged story fits within a public demonstration video of less than three minutes.

## Non-goals for the competition prototype

- Securing every arbitrary agent harness or host operating system.
- Defending against privileged malware, kernel compromise, or a malicious runtime operator.
- Preventing all prompt injection or guaranteeing correct model judgment.
- Building a universal browser, password manager, identity provider, or arbitrary authenticated proxy.
- Supporting unrestricted shell, arbitrary external destinations, or generic authenticated HTTP.
- Implementing purchases, payments, financial transfers, or production commerce authorization.
- Building multiple service adapters, a plugin marketplace, or production multi-tenant administration.
- Supporting every terminal agent or IDE, general OAuth brokerage, a generic
  secrets vault, or arbitrary provider credentials. Narrow local enrollment for
  the selected providers is in scope.
- Claiming that every passkey is biometric or hardware-backed, or that the prototype provides production identity recovery or formally verified authorization.

## Scope rule

If schedule or complexity creates a conflict, preserve the terminal-first Enforced
reference session, deterministic authority boundary, one real GitHub vertical
slice, required Nemotron integration, Tavily research journey, and reproducible
evidence before adding scaffold, connection, or credential breadth.
