# C7 mission cost baselines

September 8 measurement update: these remain whole-journey planning forecasts.
They do not measure Guardian's incremental overhead. Use the matched-baseline
[cost and interruption protocol](evidence-first-delivery-plan.md#cost-and-interruption-benchmark)
before making latency, cost or approval-fatigue claims. No rate or admission
ceiling changes in this documentation revision.

- Status: approved planning ranges; not live spending authority
- Date: 2026-09-06
- Machine-readable source:
  [`c7-mission-cost-baselines.v1.json`](c7-mission-cost-baselines.v1.json)
- Tracking: issue #19

## Decision

Keep the existing Kansas City Nebius 4-vCPU/16-GiB replacement VM for the first
protected hosted acceptance. Its rounded console estimate is USD 0.12/hour, so a
two-hour acceptance window reserves USD 0.24 of incremental compute. Moving that
short run would save too little to justify reworking and revalidating the existing
Nebius service identity, SecretStash readers, fixed ingress loader, filesystem and
network containment.

This is not an always-on hosting commitment. At USD 0.12/hour, 1,107 judging hours
would cost about USD 132.84 before any omitted charge. The published Nebius
component rates produce a rounded-up planning rate of USD 0.052713/hour for a
2-vCPU/8-GiB host plus the current 32-GiB network SSD, or USD 58.353291 for 1,107
hours. After the protected run, measure peak CPU, RAM and latency and use 2/8 for
judging only if it passes the same containment, reliability and load gates.

AWS Lightsail and DigitalOcean do not offer enough savings to justify a migration
from the current acceptance host. Hetzner and Oracle may materially lower a long-
running host bill, but shared CPU or Arm, a new provider, new credential custody,
and full host-boundary revalidation make them post-acceptance portability options.
Token Factory and Nemotron remain the qualification-critical runtime path even if
a future host changes.

## Baselines

Host cost and variable provider cost remain separate. Expected cost is a forecast;
the admission envelope is the maximum durable reservation and is never inferred
from the forecast. The validator derives these values from the versioned JSON:

| Class | Scope                                        |        Host | Expected provider |        Expected total | Reserved total |
| ----- | -------------------------------------------- | ----------: | ----------------: | --------------------: | -------------: |
| R0    | startup, health and cancellation only        |       $0.03 |                $0 |                 $0.03 |          $0.03 |
| R1    | one research smoke journey                   |       $0.06 |       $0.02-$0.05 |           $0.08-$0.11 |          $0.16 |
| R2    | one standard full journey                    |       $0.12 |       $0.04-$0.06 |           $0.16-$0.18 |          $0.22 |
| R3    | one adversarial or model-escalated journey   |       $0.12 |       $0.06-$0.10 |           $0.18-$0.22 |          $0.22 |
| R4    | twenty-journey protected calibration         | $0.24-$0.48 |       $0.80-$1.20 |           $1.04-$1.68 |          $2.48 |
| R5    | 250 journeys and 1,107-hour 2/8 judging host |  $58.353291 |           $10-$15 | $68.353291-$73.353291 |     $83.353291 |

R0 through R4 describe possible work inside the existing development campaign,
but the file does not open a policy window or authorize a call. R5 is explicitly a
future, separately funded judge scope. Its reserved total leaves approximately
USD 16.65 of the provisional USD 100 judge envelope for contingency; it is valid
only if the 2/8 sizing hypothesis passes protected measurement.

The output ceilings remain 1,024 mission-dialogue tokens, 512 Guardian-risk
tokens, and 2,048 tokens for each worker call. Planning prompt ceilings remain
4,000 mission, 4,000 risk and 8,000 per worker call. R3-R5 allow a second Guardian
attempt only for the documented invalid-output escalation. They do not grant a
second ordinary evaluation or an automatic retry.

## Price evidence and recalibration

The public Tavily list value is USD 0.008 per credit. A basic Search plus a basic
Extract therefore has a conservative list value of USD 0.016 before any free
quota. Free credits reduce cash settlement only; they do not increase the approved
allowance or admission capacity.

The repository's model policy currently names:

- `Qwen/Qwen3-235B-A22B-Instruct-2507` for mission dialogue;
- `moonshotai/Kimi-K2.7-Code` for the native worker;
- `nvidia/nemotron-3-super-120b-a12b` for primary contextual risk; and
- `nvidia/Nemotron-3-Ultra-550b-a55b` only for invalid-output escalation.

Before live admission, capture a fresh authenticated Token Factory model catalog
and price snapshot for all four exact IDs and reconcile the active Tavily plan.
The public URLs in the JSON are research provenance only and are marked unusable
for live admission. A missing, changed, deprecated, unknown or stale model/rate
fails closed. A model replacement is a separate versioned model-policy change,
not an operator run-sheet substitution.

After R4, record per-role tokens, Tavily credits and total provider charge for
each completed or failed journey. Replace expected ranges from observed p50/p95
data only when sample provenance and policy/model versions match. Increasing a
runtime ceiling still requires an authenticated operator policy update; editing a
forecast can never increase authority.

## Validation

Run:

```text
pnpm test:c7-cost-tools
node scripts/c7-cost-baselines.mjs
```

The strict validator rejects unknown fields, duplicate or unordered classes,
unknown host references, inverted ranges, expected cost above preauthorization,
miscomputed aggregate reservations, paid calls in R0, and any attempt to label R5
as current development authority. `pnpm check` includes this validation and the
existing campaign cost-report tests.

## Sources and limitations

- [Official hackathon rules](https://nebiusglobalaihackathon.devpost.com/rules)
- [Nebius compute pricing](https://docs.nebius.com/compute/resources/pricing)
- [Nebius Token Factory prices](https://nebius.com/token-factory/prices)
- [Token Factory model lifecycle](https://docs.tokenfactory.nebius.com/other-capabilities/deprecation-info)
- [Tavily API credits](https://docs.tavily.com/documentation/api-credits)
- [AWS Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets)
- [Hetzner 2026 price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)

These are planning observations captured on September 6, 2026. They are not a
provider quote, an invoice, a guarantee of capacity, a security certification or
evidence that hosted acceptance passed.
