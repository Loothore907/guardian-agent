# Architecture

## Purpose

Guardian Agent mediates between an untrusted interaction agent, public information sources, and privileged service operations. It protects credential confidentiality, limits credential-derived authority, and constrains the external pathways available to the interaction agent in the documented reference runtime.

## Trust zones

1. **Human control zone** - trusted mission creation, connection setup, approval, denial, revocation, and assurance display.
2. **Session-control zone** - trusted launcher, versioned session profile, tool allowlist, disposable filesystem scope, local command sandbox, network policy, task lifetime, and runtime evidence.
3. **Untrusted interaction zone** - interaction model, prompts, plans, local command requests, retrieved documents, webpages, repository content, and agent-supplied rationale.
4. **Public research zone** - bounded Tavily search, map, crawl, and extract operations; source provenance; untrusted evidence normalization; and minimized research-journey events.
5. **Deterministic mediation zone** - schemas, normalization, canonicalization, mission scope, policy, data-egress checks, replay controls, and minimum authorization level.
6. **Contextual judgment zone** - constrained Nemotron inference receiving minimized, credential-free context and recommending preserved or increased scrutiny.
7. **Authorization zone** - consequence presentation, user-presence evidence, exact-request binding, expiry, denial, and revocation.
8. **Privileged execution zone** - credential resolution, typed adapters, final validation, execution, response sanitization, and audit emission.

## Reference flow

1. The human creates a mission directly through Guardian and selects or accepts a versioned session profile.
2. Guardian validates the mission and launches a disposable reference runtime with no provider credentials, an explicit tool set, and default-denied public egress for local commands.
3. The interaction agent performs bounded local work. Public research and authenticated operations are available only through mission-approved Guardian capabilities.
4. Before a Tavily request, deterministic mediation checks mission relevance, destination, query shape, secret-like outbound content, traversal depth, volume, and remaining budget.
5. Guardian labels Tavily results untrusted, records minimized provenance events, and returns bounded evidence to the interaction agent.
6. The interaction agent submits a typed action proposal. Agent-supplied intent or rationale remains untrusted unless it matches the mission captured in the human control zone.
7. The system validates and normalizes the proposal, compares it with the mission, and computes an allow, deny, or minimum authorization floor.
8. Nemotron receives a minimized, credential-free risk envelope containing normalized facts, selected risk signals, bounded untrusted excerpts, and the deterministic floor.
9. Structured guardian output may preserve or increase the required authorization level but never reduce it or override a deterministic denial.
10. If required, the human sees a consequence-oriented approval prompt bound to the exact canonical request and relevant resource version.
11. The broker independently revalidates, re-normalizes, recomputes the digest, and checks mission, scope, caller, connection, expiry, nonce, use count, policy version, and current resource version.
12. A typed adapter performs the exact operation using a credential unavailable to the interaction, research, session command, and guardian-model zones.
13. The broker sanitizes the result and emits audit evidence without credential material or unnecessary public content.

## Control and data planes

```text
Human control plane
  mission -> session profile -> approval/revocation
                      |
                      v
Reference agent runtime
  interaction model -> approved tool call
       |                     |
       | local work          +-> Guardian public research -> Tavily
       v                     |
  network-disabled           +-> deterministic policy -> Nemotron
  command sandbox            |                         -> authorization
                             +-> privileged broker -> typed GitHub adapter
```

MCP is the approved agent-facing protocol for Guardian capabilities. It does not establish the enforcement boundary by itself. The launcher, runtime restrictions, credential separation, policy, and broker establish that boundary together.

## Session assurance

Guardian reports:

- **Enforced** only when it launched the documented runtime and can associate the active session with verified tool, filesystem, credential, and network configuration.
- **Observed** when Guardian mediates its own calls but cannot rule out alternate tools, credentials, or network paths.
- **Unknown** when runtime evidence is insufficient.

Assurance state is part of the audit record and approval presentation. A lower-assurance session may require stricter policy, but it may not be silently presented as Enforced.

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

The interaction agent may request a scope change. It may not grant one.

## Public research journey

Tavily maps websites and retrieves public evidence; Guardian maps the agent's Tavily-mediated journey. Search relevance is not treated as trust or safety.

Research events should retain the minimum fields needed to explain decisions, such as task, sequence, operation, bounded domain or URL, content digest, trust label, deterministic signals, retrieval time, and provider request identifier. Full raw content should not be copied into durable audit storage unless a documented fixture requires it.

The research gateway must prevent the approved path from becoming an exfiltration channel. Query length, opaque encodings, secret-like material, private content, destinations, and traversal parameters require deterministic checks before any provider call.

## Dependency direction

The exact package layout is deferred to ADR-0003. The intended dependency direction is:

```text
contracts <- mission and session policy <- trusted launcher/orchestration
contracts <- deterministic action policy <- application orchestration
contracts <- research gateway <- application orchestration
contracts <- guardian provider <- application orchestration
contracts <- adapters <- privileged broker <- application orchestration
contracts <- audit
```

The command sandbox must not import or receive provider credentials. The guardian provider must not import credential resolution or privileged adapter internals. Adapters must not interpret prompts, public prose, or model output.

## Competition implementation

The competition build proves one enforced PR-review mission:

- a read-only mission captured directly from the user;
- bounded local analysis and GitHub reads without reusable credential exposure;
- Tavily-mediated public research with a visible provenance trail;
- hostile public content attempting to create authority;
- direct public network and Git push bypass rejection in the reference runtime;
- an unauthorized merge denied by mission policy;
- Nemotron contextual risk analysis that cannot weaken deterministic controls;
- a later exact one-time merge approval bound to the PR head commit;
- post-approval mutation, expiry, and replay rejection; and
- an audit view connecting mission, runtime assurance, research, policy, guardian, approval, execution, and sanitized outcome.

## Open implementation decisions

- final interaction model after the C1 hosted Nemotron stand-in;
- production hardening and hosted parity for the proven WSL/Linux namespace mechanism;
- canonical serialization format and compatibility policy;
- authenticated MCP transport and session-caller identity;
- session evidence and runtime-attestation representation;
- approval interface and development-mode user-presence substitute;
- approval, nonce, and audit persistence;
- selected Nemotron model and Token Factory endpoint; and
- public demo hosting approach.

Longer-horizon ideas that are not part of the competition architecture or current
security claims are recorded in [Future Directions](future-directions.md).
