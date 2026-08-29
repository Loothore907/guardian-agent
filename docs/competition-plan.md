# Competition Plan

## Entry posture

- Competition: Nebius x NVIDIA Global AI Hackathon
- Track: Best Apps and Agents
- Submission deadline: October 30, 2026 at 10:00 a.m. Pacific / 9:00 a.m. Alaska daylight time
- Working name: Guardian Agent
- Formulation: a capability firewall that lets AI agents use accounts without receiving credentials or unchecked authority

## Required competition integrations

- The working project must make a runtime call to Nebius Token Factory or run on Nebius AI Cloud.
- The project must use at least one NVIDIA open-source model.
- The submission must provide a working demo or test build, public source repository, open-source license, setup instructions, project description, public YouTube demonstration of less than three minutes, and product feedback.

Live rules remain authoritative and must be rechecked before submission:

- https://nebiusglobalaihackathon.devpost.com/
- https://nebiusglobalaihackathon.devpost.com/rules

Use the [submission checklist](competition/submission-checklist.md) as the operational compliance gate.

## Competition MVP

The MVP is one complete authorization story:

1. A routine Git-like read proceeds under a scoped grant.
2. A merge-like action crosses a deterministic boundary.
3. Nemotron classifies contextual risk and produces a concise consequence summary.
4. The user approves the exact action.
5. Mutation and replay attempts fail.
6. The audit view explains the complete decision without exposing credentials.

## Optional Tavily integration

Tavily may retrieve real external content for the untrusted demo layer. A fixture can contain a prompt-injection attempt that asks the interaction agent to expose a credential or widen an operation. Guardian must demonstrate that retrieved text cannot create authority.

This integration must remain optional to the core and must not send credentials, approval records, private audit data, or unnecessary user information to Tavily.

## Build gates

| Gate | Output | Exit criterion |
| --- | --- | --- |
| 0 - Governance | Scope, invariants, threat model, repository policy, claims matrix | No ambiguity about what the prototype does or claims |
| 1 - Core | Schemas, canonicalization, policy precedence, grants, nonce and expiry checks | Tests reject mutation, replay, and scope expansion |
| 2 - Model | Token Factory provider, constrained output, failure fallback, evaluation fixtures | Invalid or unavailable output escalates or denies |
| 3 - Action | Demo credential boundary and typed Git-like adapter | End-to-end action works without credential exposure |
| 4 - Experience | Approval and audit interface | A new viewer understands what is approved and why |
| 5 - Attack | Adversarial suite and redaction checks | Every showcased security claim has passing evidence |
| 6 - Submit | Public repository, demo, clean install, video, description, feedback | Submission matches the tested build |

## Submission evidence

Maintain a claim-to-evidence map for:

- technological implementation;
- design and product coherence;
- potential impact;
- quality and originality of the idea;
- Nebius and NVIDIA usage;
- Tavily usage, if included; and
- significant work completed during the submission period.
