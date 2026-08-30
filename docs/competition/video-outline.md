# Three-Minute Demo Narrative

This is a provisional narrative guide, not a final script. The final video must
show the tested competition build, remain under three minutes, and use security
language supported by `docs/security-claims.md`.

## Story allocation

| Time | Story beat |
| --- | --- |
| 0:00-0:20 | The problem: useful agents encounter untrusted content and need authenticated capabilities without receiving unrestricted authority. |
| 0:20-0:45 | The contract: the user creates a mission and Guardian launches the bounded reference session. |
| 0:45-1:20 | Useful work: the agent analyzes the PR and uses Guardian-mediated Tavily research with visible provenance. |
| 1:20-1:50 | The boundary: hostile content attempts to expand authority; direct bypass and the unauthorized merge are denied. |
| 1:50-2:20 | Deliberate authority: the user creates a human-authored mission revision permitting one merge, Guardian binds a new profile, and the user approves the exact PR head and method before broker revalidation. |
| 2:20-2:43 | Evidence: mutation, expiry, or replay fails and the audit view connects the decision to the outcome. |
| 2:43-2:55 | Future direction: Guardian as an authorization protocol across model architectures. |
| 2:55-3:00 | Product name and concise closing statement. |

The future direction is optional and should be cut before any working behavior or
evidence. It receives at most twelve seconds.

## Provisional future-looking close

> Today, Guardian proves one enforced agent session. Tomorrow, the same protocol
> could serve ordinary models, mixtures of experts, and multi-agent systems—even
> when models learn to recognize risk internally, the authority to execute stays
> behind a separate Guardian boundary.

Do not imply that model-native Guardian awareness is implemented, that internal
model routing is an enforcement boundary, or that Guardian secures arbitrary
third-party runtimes.

The merge sequence must visibly distinguish the denied read-only session from the
later human-authored mission revision. An approval cannot override the original
mission, and the interaction agent cannot revise or expand that mission itself.
