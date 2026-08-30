# Competition Plan

## Entry posture

- Competition: Nebius x NVIDIA Global AI Hackathon
- Track: Best Apps and Agents
- Submission deadline: October 30, 2026 at 10:00 a.m. Pacific / 9:00 a.m. Alaska daylight time
- Working name: Guardian Agent
- Formulation: a task-scoped agent runtime and capability firewall that forces public research and authenticated actions through observable, policy-controlled pathways

## Required competition integrations

- The working project must make a runtime call to Nebius Token Factory or run on Nebius AI Cloud.
- The project must use at least one NVIDIA open-source model.
- The submission must provide a working demo or test build, public source repository, open-source license, setup instructions, project description, public YouTube demonstration of less than three minutes, and product feedback.

Live rules remain authoritative and must be rechecked before submission:

- https://nebiusglobalaihackathon.devpost.com/
- https://nebiusglobalaihackathon.devpost.com/rules

Use the [submission checklist](competition/submission-checklist.md) as the operational compliance gate.

## Competition MVP

The MVP is one complete enforced-session story:

1. The user creates a read-only PR-review mission directly through Guardian.
2. Guardian launches the documented reference runtime with a mission-specific tool set, no provider credentials, and default-denied public egress for local commands.
3. Routine local analysis and a typed GitHub read proceed without repeated login.
4. Tavily supplies bounded public evidence and Guardian records a visible, minimized research journey.
5. Hostile public content attempts to convince the interaction agent to merge or disclose information.
6. Direct public network and Git push bypass attempts fail in the reference runtime.
7. An unauthorized merge request fails deterministic mission policy.
8. Nemotron classifies contextual risk and produces a concise consequence explanation without weakening the denial.
9. The user deliberately expands the mission for one exact merge bound to the PR head commit.
10. The broker revalidates and performs that action without credential exposure.
11. Mutation, resource-version change, expiry, and replay attempts fail.
12. The UI connects mission, runtime assurance, public research, policy, guardian, approval, execution, and sanitized outcome.

## Tavily integration

Tavily is optional under the general competition rules but required by the selected Guardian competition experience and necessary for Best Use of Tavily bonus eligibility. The build will make functional runtime calls to bounded Search and/or Extract operations as part of the PR-review mission.

Tavily provides public discovery and content. Guardian, not Tavily, records the agent's mediated research journey and applies deterministic activity limits. Search relevance must not be represented as source trust or safety.

Guardian must not send credentials, approval records, private audit data, private repository content, or unnecessary user information to Tavily. Query and traversal limits, secret-like outbound checks, provenance labels, provider failure behavior, and deterministic fixtures are required.

## Build gates

| Gate | Output | Exit criterion |
| --- | --- | --- |
| 0 - Contract | Product promise, assurance levels, mission, scope, threat model, claims matrix | No ambiguity about what the prototype does or claims |
| 1 - Feasibility | Reference agent loop, constrained command executor, controlled external path | Direct bypass fails while Guardian research succeeds |
| 2 - Core | Mission, session, schema, canonicalization, policy, grant, nonce, expiry, and assurance contracts | Tests reject unknown input, false assurance, mutation, replay, and scope expansion |
| 3 - Research | Tavily provider, outbound checks, provenance, journey ledger, deterministic fixtures | Public research is functional, bounded, visible, and credential-free |
| 4 - Action | Demo credential boundary, typed GitHub adapter, final revalidation | End-to-end read and exact merge work without credential exposure |
| 5 - Model | Token Factory provider, constrained output, failure fallback, evaluation fixtures | Invalid or unavailable output escalates or denies |
| 6 - Experience | Mission, assurance, research, approval, and audit interface | A new viewer understands what the agent could do, encountered, attempted, and executed |
| 7 - Attack | Runtime bypass, adversarial, mutation, replay, egress, and redaction evidence | Every showcased security claim has reproducible passing evidence |
| 8 - Submit | Public repository, hosted demo, clean install, video, description, and feedback | Submission matches the tested tagged build |

## Submission evidence

Maintain a claim-to-evidence map for:

- technological implementation;
- design and product coherence;
- potential impact;
- quality and originality of the idea;
- Nebius and NVIDIA usage;
- Tavily usage and research-journey contribution; and
- significant work completed during the submission period.
