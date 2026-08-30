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

For the competition prototype, the delegating user, account owner, and operator may be the same person.

## Product model

1. The user creates a mission directly through Guardian before the interaction agent starts.
2. Guardian selects a versioned session profile defining tools, filesystem scope, network policy, time, volume, destinations, and side-effect limits.
3. A trusted launcher starts a disposable reference runtime with no service credentials and no uncontrolled external pathway.
4. The interaction agent performs local work and calls only mission-approved Guardian capabilities for public research or authenticated service operations.
5. Tavily supplies bounded public evidence. Guardian records a minimized research journey and labels all retrieved content untrusted.
6. Deterministic policy establishes the minimum authorization requirement for every proposal.
7. A constrained Nemotron guardian receives a minimized, credential-free risk envelope and may preserve or increase the requirement.
8. A human approves consequential boundary crossings when no existing mission grant authorizes them.
9. The privileged broker independently revalidates and executes only the exact authorized typed operation.

## Assurance levels

Guardian must describe what it can actually observe and enforce:

- **Enforced** - Guardian launched the documented reference runtime and verified its tool, filesystem, credential, and network profile.
- **Observed** - Guardian mediates its own capabilities, but other external pathways may exist in the host or agent harness.
- **Unknown** - the environment cannot provide sufficient evidence about alternate pathways.

The competition demonstration targets **Enforced** for the documented reference environment. Guardian does not claim universal enforcement in arbitrary third-party terminal harnesses.

## Competition mission

The reference mission is:

> Review pull request 17 and report findings. Do not modify the remote repository.

The mission permits bounded local analysis, tests, GitHub reads, and Tavily-mediated public research. It denies external writes. The demonstration then shows:

1. useful research and review proceeding without repeated login;
2. hostile public content attempting to influence the interaction agent;
3. a merge request rejected because it exceeds the read-only mission;
4. direct network and Git push bypass attempts failing in the reference runtime;
5. Nemotron explaining contextual risk without weakening deterministic policy;
6. a later human-authored mission revision, new bound profile, and explicit one-time merge authorization tied to the pull-request head commit;
7. post-approval mutation and replay rejection; and
8. a sanitized audit and research journey explaining the complete decision.

## Product goals and prototype success metrics

### Credential isolation

- No GitHub, Tavily, Nebius, or other reusable provider credential is available to the interaction model or local command sandbox.
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

### Guardian contribution

- Nemotron performs a real runtime call through Nebius Token Factory.
- The model detects or explains semantic risk in documented fixtures while never lowering deterministic requirements.
- Invalid, unavailable, uncertain, or malformed output escalates or denies.
- Evaluation reports both missed escalations and false escalations rather than claiming perfect prompt-injection detection.

### Human comprehension

- A new viewer can identify the mission, active restrictions, attempted action, relevant public influence, required approval, and outcome without reading the architecture documentation.
- The complete judged story fits within a public demonstration video of less than three minutes.

## Non-goals for the competition prototype

- Securing every arbitrary agent harness or host operating system.
- Defending against privileged malware, kernel compromise, or a malicious runtime operator.
- Preventing all prompt injection or guaranteeing correct model judgment.
- Building a universal browser, password manager, identity provider, or arbitrary authenticated proxy.
- Supporting unrestricted shell, arbitrary external destinations, or generic authenticated HTTP.
- Implementing purchases, payments, financial transfers, or production commerce authorization.
- Building multiple service adapters, a plugin marketplace, or production multi-tenant administration.
- Claiming production biometric, hardware-backed, or formally verified authorization.

## Scope rule

If schedule or complexity creates a conflict, preserve the enforced reference session, deterministic authority boundary, one real GitHub vertical slice, required Nemotron integration, Tavily research journey, and reproducible evidence before adding breadth.
