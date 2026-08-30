# Future Directions

- Status: Incubation guide
- Scope: Post-MVP hypotheses
- Authority: Non-normative; the product contract, accepted ADRs, active roadmap,
  and security claims take precedence

This document is the trajectory guide for credible extensions outside the
competition MVP. It prevents useful ideas from being lost without silently turning
them into commitments. Entries are research directions, not implemented controls,
verified guarantees, or work authorized by the current development roadmap.

Any future extension must preserve Guardian's core authority boundary: an
interaction agent or model may request additional scrutiny, but it may not grant
itself new authority or bypass deterministic mediation, exact-request approval,
final revalidation, credential separation, or the privileged broker.

## How a direction becomes roadmap work

A direction may move into the active roadmap only through all of these gates:

1. **Problem evidence** - identify a concrete user or security outcome that the
   current product does not meet.
2. **Boundary review** - define trust boundaries, abuse cases, failure behavior,
   non-goals, and the claims that must remain unchanged.
3. **Bounded experiment** - use fake providers and deterministic fixtures first;
   do not add production authority or credentials to validate a hypothesis.
4. **Measured result** - show a material benefit in safety, capability, latency,
   cost, or usability without weakening deterministic enforcement.
5. **Durable decision** - accept an ADR, add a separately estimated checkpoint,
   and update claims only after reproducible evidence exists.

During the competition cycle, required C5-C11 work takes priority. A future
direction may enter that cycle only when it is necessary to satisfy an existing
exit criterion or when C9 has passed early and the roadmap explicitly admits it.

## Trajectory map

| Horizon | Hypothesis | Prerequisites | Promotion evidence |
| --- | --- | --- | --- |
| Protocol portability | Different interaction models and runtimes can emit the same versioned Guardian capability and risk contracts without receiving authority semantics of their own. | Stable C3/C6 contracts and C9 attack evidence | Compatibility fixtures, identical policy outcomes, and honest assurance mapping across at least two runtimes |
| Earlier risk recognition | A companion classifier or routed expert can identify suspicious intent before request-time Guardian judgment. | C7 evaluation harness and stable deterministic precedence | Lower missed-escalation or false-escalation rates without any new false allows |
| Multi-agent delegation | Multiple agents can collaborate while each request remains bound to an explicit caller, mission, profile, scope, and non-transitive authority. | C6 exact binding, replay protection, and C9 cross-session attacks | Delegation and confused-deputy tests showing that no agent can inherit or grant another agent's authority |
| Broader typed capabilities | Additional service operations can reuse the same broker and approval protocol without becoming a generic authenticated proxy. | Stable GitHub vertical slice and adapter review rules | One narrow adapter at a time, with schema, revalidation, redaction, and near-miss tests |

The horizons are sequencing guidance, not release promises. Protocol portability
and evaluation infrastructure should generally precede model-internal or
multi-agent breadth.

## Model-native Guardian awareness

Future model architectures may include specialized safety classifiers, routed
experts, or companion models that recognize risky intent before an operation
reaches Guardian. A model-native component could:

- identify prompt injection, suspicious intent, or possible data exfiltration;
- prepare a structured risk envelope for Guardian;
- recommend increased scrutiny or an explicit user confirmation; and
- help the interaction model explain why a request requires escalation.

These components would be advisory. A mixture-of-experts router and its experts
remain part of the model being controlled; their activation is not an independent
security boundary. The enforced path must therefore remain external to the
interaction model:

```text
interaction model or internal expert
               |
               | typed capability request
               v
external Guardian boundary
  deterministic policy -> contextual judgment -> exact approval
               |
               v
privileged broker -> typed adapter
```

The external boundary must evaluate every privileged operation whether or not an
internal expert flagged it. Model-native judgment may preserve or increase the
deterministic authorization floor; it may never lower that floor, override a
denial, certify its own runtime assurance, or authorize execution.

### Candidate research questions

- Does model-native risk specialization detect dangerous intent earlier than an
  external request-time classifier alone?
- Can it reduce unnecessary escalations without increasing false allows?
- Can different model families produce the same versioned Guardian request
  contract without model-specific authority semantics?
- Can routing and advisory-model behavior be evaluated without treating hidden
  activation as enforcement evidence?
- What latency, cost, usability, and adversarial-resilience tradeoffs result from
  internal, companion-model, and external-only configurations?

### Experiment-specific contribution gate

A contributor pursuing this direction should begin with a proposal or ADR that
defines the experiment, threat model, failure behavior, evaluation fixtures, and
claim boundaries. Production integration should follow only if the experiment
shows a measurable benefit while preserving the external enforcement path.

## Public framing

The concise public message is:

> Guardian can become a shared authorization protocol for ordinary models,
> mixtures of experts, and multi-agent systems. Future models may recognize risk
> internally, while Guardian remains the separate boundary that controls what can
> actually execute.

This direction may appear in future-looking project or demo material only when it
is clearly distinguished from the implemented competition build.

Public material should link back to the current [security claims](security-claims.md)
and must not use a future direction to imply platform support, runtime assurance,
or an enforcement property that has not passed the promotion gates above.
