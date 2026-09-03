# ADR-0033: Explicit model portability and provenance qualification

- Status: Accepted
- Date: 2026-09-02

## Context

The live worker gate exposed ordinary model-catalog drift: the initial Qwen Coder
pin disappeared while other capable models remained. A separate risk is policy
and procurement drift. In 2026, U.S. government bodies are actively evaluating
and investigating the security and supply-chain implications of PRC-developed
open-weight models in software tools and systems with sensitive access. That is
not a current blanket prohibition on private use, but it makes future customer,
procurement, platform, or government restrictions plausible.

Kimi K2.7 Code and GLM-5.3-Flash may both be capable worker choices, but they do
not diversify developer-country provenance. A provider-hosted open-weight model
also separates model origin from inference location; both facts must be recorded.

## Decision

Guardian treats worker-model portability as a qualification requirement rather
than a runtime fallback mechanism.

- The current reviewed primary remains Kimi K2.7 Code under policy v2 while its
  staged live contract is validated.
- Before competition readiness, the project will qualify two explicit alternative
  assignments against the same credential-free envelopes and deterministic
  parser. At least one qualified alternative must come from a non-PRC-origin
  model family.
- Qualification records model developer, open-weight/license status, Nebius
  hosting region, retention posture, live availability, structured-output and
  tool compatibility, latency, cost, and task-quality evidence.
- A model change always creates a reviewed policy version and new exact session
  confirmation. Inventory or provider failure never triggers a silent fallback
  inside an active session.
- Provider-specific request formatting may vary behind the adapter, but public
  worker contracts, exact tool catalogs, deterministic validation, denial,
  budgets, and audit semantics remain unchanged.

## Consequences

- GLM-5.3-Flash is a capability challenger, not geopolitical diversification.
- The current live inventory has no obvious U.S.-origin dedicated coding model;
  Meta Llama is an available non-PRC family but requires evidence that it can meet
  the worker contract and task-quality floor. This remains an explicit portfolio
  gap.
- Portability work follows the working end-to-end slice rather than delaying its
  next boundary. One alternative can be exercised during staged validation; the
  full three-policy qualification is a competition-readiness gate.
- Future legal or procurement change should require a policy/configuration update
  and requalification, not a worker-protocol rewrite.
