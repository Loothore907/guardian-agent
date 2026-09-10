# ADR-0058: Evidence-first competition scope and consent

- Status: Accepted for planning, September 8, 2026
- Tracking: [issue #19](https://github.com/Loothore907/guardian-agent/issues/19)
- Refines ADR-0049 and ADR-0050; supersedes conflicting competition scope and
  mandatory second-passkey narrative in ADR-0006, ADR-0007 and downstream plans.
- This decision changes delivery priorities and presentation, not runtime policy,
  grants, assurance levels or deployment authority.

## Decision

The primary product outcome is useful development work with fewer redundant
approval and authentication interruptions. Credential custody and bounded
authority make that delegation acceptable. The intended audience includes
developers who do not specialize in authentication or agent security.

Prove the unauthorized-destination research journey first, then extend the same
evidence chain to the two existing GitHub scenarios: read becoming write and
substitution of an approved exact action. These are the three curated scenarios
in total. The chain is content exposure,
unauthorized typed request, Guardian denial before the forbidden external effect,
sanitized denial feedback, and useful completion in the same session. No hidden
worker replacement, new grant or reset may be presented as continued execution.
Only eligible ordinary denials permit continuation; critical binding/replay
violations, trusted-service failure, revocation and exhausted limits retain their
existing stop behavior.

Pursue actual model-generated forbidden requests within a bounded evaluation.
Maintain separately labelled deterministic adversarial-harness tests through the
same supported boundary. Model resistance, malformed output, denial and task
completion are distinct results. Neither exposure nor temporal association proves
causation. No model, prompt or control may be silently weakened to obtain a demo.

### One agreement, exact checks

The piloted curated scenario confirms its normalized scope and any exact permitted
action at launch. Existing grant membership, current resource, expiry, revocation,
risk escalation and final execution checks still apply on every action. A denied
substitution cannot consume or create the original action's approval. Covered work
does not require a second confirmation merely because a denial occurred.

Fixed judge sessions may use the exact standing deployment authorization defined
by ADR-0049. An HTTP trigger cannot create or widen it. Public anonymous mutation
remains excluded. A new goal outside the grant requires a reviewed amendment;
provider-required login remains separate from human task consent.

User-verifying WebAuthn and the terminal/browser ceremony remain product goals,
but are deferred from this competition slice. The existing development issuer
must be named as such; standing operator consent is not fresh user presence.
Removing the ceremony from the demo does not establish production identity or
permit a public caller to use the trusted development issuer. The reference
worker is the current native worker; general external-harness integration is
also deferred. No Enforced claim follows from this decision.

### Measurement and local control

Measure incremental latency, cost, unnecessary approval/escalation and recovery
against the same useful task in a sensibly configured baseline. Whole-journey
spend is not Guardian overhead. Credential renewal and broader multi-goal sessions
require separate evidence; the current five-minute/eight-turn profile is retained.
The detailed measurement protocol and dated delivery targets are in the
[evidence-first plan](../development/evidence-first-delivery-plan.md).

Local-first means the self-hosting user controls credential custody, authority
and audit; external providers still govern their own authentication and receive
the documented selected context. Local small-model operation is an unvalidated
future option. No mandatory Guardian-operated cloud service is intended. Local
control is not claimed as unique, universally portable or proof of host isolation.

## Scope and consequences

Defer custom-task breadth, local-model migration, new provider/service adapters,
general multi-hour/multi-goal missions and additional harness integrations.
Preserve the supported runtime's containment, deterministic policy, credential,
redaction, risk and exact-action checks. A meaningful measured Nemotron role is
required in the submitted experience; a decorative call is insufficient.

Targets are September 18 for one complete recovery journey, October 2 for the
GitHub variants, October 12 for experience/scope freeze, October 23 for the release
candidate and October 28 for submission lock. Reduce showcased variants if needed
before reducing evidence standards. C6/C7 stay open until their remaining criteria
pass; a scope decision never retroactively passes a milestone.

The user authorized this documentation revision, validation, feature-branch
commit/push and PR preparation in this conversation. It grants no new provider
spend, credential operation, VM start, mutation experiment or deployment. Each
such execution needs its own exact resources, limits, recovery and cleanup scope.
