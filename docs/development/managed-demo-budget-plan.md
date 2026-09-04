# Managed-demo capacity and budget plan

- Status: Working plan; runtime enforcement not yet implemented
- Date: 2026-09-04
- Authority: user-directed managed-demo planning and ADR-0041
- Applies to: project-funded Linux judge and bounded public deployments

Progress: strict contracts, a deployment-bound SQLite ledger, sanitized provider-
usage projection, per-journey observation binding, and bounded FIFO admission
queue enforcement are implemented locally under ADR-0043. A deployment-bound
trusted service, role-scoped IPC, awaited metering callbacks, and optional exact-
journey usage reporters in all four credential-holding provider bootstraps are
implemented under ADR-0044. A reusable trusted journey controller binds admission,
reporter construction, and one settlement to the returned reservation. Hosted
ingress/supervisor attachment, source-fingerprint derivation, protected
calibration, load testing, and deployment remain pending.

## Outcome

Keep the judge path available from submission through the end of judging without
allowing public interest, abuse, provider-price changes, or an operator mistake to
consume its capacity. Public access may scale when interest and funding justify it,
but a scale-up is an explicit operator action rather than an automatic response to
traffic.

## Cost model

A completed full journey may use:

- one bounded mission-dialogue call;
- one primary Guardian-risk call, with Ultra used only for the documented invalid-
  output escalation;
- one or two native-worker calls, depending on whether the worker completes a
  tool round trip;
- one Tavily basic Search request; and
- one Tavily basic Extract request for the fixed controlled-content URL.

The planning equation is:

```text
loop cost =
  sum(model prompt tokens * input rate) +
  sum(model completion tokens * output rate) +
  Tavily credits * credit rate
```

Provider-returned numeric usage is settled after each call. Admission uses a
larger preauthorization derived from the current request and token ceilings. A
missing, malformed, unknown-model, stale-price, or over-ceiling usage record fails
closed: Guardian retains the full preauthorization, stops automatic retries, and
requires operator reconciliation. Prompts, model output, research content,
credentials, and provider response bodies are not budget telemetry.

Current output ceilings are 1,024 mission-dialogue tokens, 512 Guardian-risk
tokens, and 2,048 tokens for each native-worker call. Tavily is configured for
basic Search and basic Extract. Before provisioning, the operator records a
versioned price snapshot from the authenticated Nebius model catalog and the
active Tavily plan. The price snapshot is configuration evidence, not an agent-
selectable input.

Until a protected calibration run measures actual prompt and completion usage,
use **$0.10 per completed full journey** as the admission envelope. This is a
planning ceiling rather than an expected bill. The provisional expected range is
approximately **$0.04-$0.06 per completed journey**, excluding the fixed Linux
host, using a planning assumption of at most 4,000 prompt tokens each for mission
dialogue and risk, at most 8,000 prompt tokens per worker call, the current output
ceilings, and a Search-plus-Extract journey. The exact Nebius amount remains
unverified until the current assigned models' authenticated catalog prices are
captured.

## Guaranteed judge envelope

The demo must be live from the actual submission time through
`2026-12-15T20:00:00Z` (December 15 at noon Pacific). If submission occurs at the
deadline, that is approximately 1,107 host hours.

Initial planning reserve:

| Component | Planning quantity | Reserved amount |
| --- | ---: | ---: |
| Small always-on Linux VM | 2 vCPU, 8 GiB, submission through judging | $55 |
| Persistent disk and rounding | bounded deployment volume | $5 |
| Completed judge journeys | 250 at $0.10 admission envelope | $25 |
| Operational contingency | price drift, retries, and brief overlap | $15 |
| **Guaranteed judge envelope** |  | **$100** |

The VM quantity is a sizing hypothesis and requires a load test. If 2 vCPU and
8 GiB is insufficient, the operator updates the host-cost reserve before
deployment rather than silently reducing judge journey capacity.

The judge deployment has its own provider credentials, SecretStash resources,
service identity, ledger, queue, and kill switch. Its $100 envelope is not a
shared account balance from Guardian's perspective. Public traffic cannot borrow,
transfer, or select it.

## Public pilot envelope

Start public access only after the judge reserve is funded and isolated.

Recommended initial public pilot:

| Control | Initial value |
| --- | ---: |
| Total variable-cost ceiling | $25 |
| Daily variable-cost ceiling | $5 |
| Journey admissions per source per day | 2 |
| Concurrent journeys | 2 |
| Queue capacity | 10 |
| Admission envelope per journey | $0.10 |
| Anonymous credentialed mutations | 0 |

At the admission envelope, $25 permits 250 completed public journeys and $5 per
day permits 50. Provider failures settle only the usage actually reported, while
Guardian also records a separate failure count and cooldown so repeated failures
cannot become an unbounded retry path.

## Operator-adjustable variables

Every change is a versioned, audited operator policy update. A request, worker,
model, or adapter cannot modify these values.

| Group | Variables |
| --- | --- |
| Availability | `opens_at`, `closes_at`, maintenance state, kill switch |
| Cash | total micro-USD, daily micro-USD, per-journey preauthorization, contingency floor |
| Volume | total, daily, and per-source journey admissions; completed-journey telemetry |
| Load | active concurrency, queue capacity, queue timeout, cooldown |
| Model use | fixed model IDs, calls per role, prompt-token ceiling, completion-token ceiling, Ultra escalation count |
| Research | Search count, Extract count, Tavily-credit ceiling |
| Price evidence | provider, plan/model, input rate, output rate, credit rate, captured-at time, expiry |
| Protection | judge reserve floor, public ceiling, provider-side project/key limits |

Money is represented as integer micro-USD, not floating point. Time boundaries use
UTC instants. Public and judge policies are separate signed or integrity-protected
records selected by trusted deployment identity; the inbound request contains no
pool selector.

## Scaling signals

Public capacity may be raised when all of these are healthy:

- unique completed journeys, rather than page views, show sustained use;
- completion and repeat-use rates indicate that users receive value;
- p50 and p95 measured cost per journey stay within the envelope;
- queue rejection, provider failure, and abuse-denial rates are acceptable; and
- the remaining public balance covers the intended runway at the observed rate.

Traffic never raises its own spending ceiling. The system may emit a sanitized
operator alert with the measured facts, but only an authenticated operator can
approve a new policy version. Scale public capacity in small funded increments;
do not change judge capacity downward during the required access window unless a
security incident requires shutdown.

## Implementation slices

1. Add strict price-snapshot, pool-policy, preauthorization, usage, and settlement
   contracts with malformed, overflow, stale-price, and cross-pool rejection.
2. Persist independent judge and public ledgers and make admission plus settlement
   atomic across concurrent requests and restarts.
3. Parse Nebius numeric usage from the existing fixed model adapters and Tavily
   credits from the fixed Search/Extract operations without retaining provider
   content.
4. Bind pool selection to deployment identity and credential custody; reject any
   request-supplied pool, model, price, or budget value.
5. Add queue, concurrency, cooldown, source-rate, global, daily, and kill-switch
   enforcement, including public-to-judge substitution tests.
6. Run a protected 20-journey calibration, record p50/p95 usage and cost, then
   replace the provisional $0.10 envelope with a measured ceiling plus headroom.
7. Load-test the candidate Linux host, fund the judge reserve, and only then enable
   the public pilot.

## Evidence and non-claims

This document is a plan. It does not establish that managed-demo cost controls,
provider-side limits, judge availability, or public rate limits are currently
enforced. Those claims require deterministic tests, restart and race evidence,
protected provider calibration, deployment evidence, and corresponding updates to
`docs/security-claims.md`.

## Current external references

- [Official hackathon rules](https://nebiusglobalaihackathon.devpost.com/rules)
- [Nebius Compute pricing](https://docs.nebius.com/compute/resources/pricing)
- [Nebius Token Factory model-price discovery](https://docs.tokenfactory.nebius.com/ai-models-inference/playground)
- [Nebius completion usage response](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion)
- [Tavily credits and pricing](https://docs.tavily.com/documentation/api-credits)
