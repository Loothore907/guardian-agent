# Project pause: shutdown and billing audit

Date: September 12, 2026. Owner: Earl; follow-up: [issue #19](https://github.com/Loothore907/guardian-agent/issues/19).
Read the [pause decision](project-pause.md) for the reasons and restart conditions.

Status: **known running/retained cost sources removed; provider billing closure
and final usage reconciliation pending**. Observations below were made through
authenticated provider consoles on September 12, 2026, approximately 20:15-20:28 UTC.

## Observations and actions

| Surface                                                             | Current evidence                                                                                                                                                         | Disposition                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nebius Cloud project `project-u00h7t9mkc007dezqchqwv`               | Authenticated console now shows 0 standalone VMs and 0 disks                                                                                                             | Both VMs and managed disks permanently deleted with exact user approval, including possible loss of cloud-only diagnostics                                                                                                                     |
| `guardian-c7-kc-dev-runtime` / `computeinstance-u00dkgrgnqdmy4vz67` | Originally 4 vCPU / 16 GiB, stopped                                                                                                                                      | Deleted; disappearance verified                                                                                                                                                                                                                |
| Runtime boot disk `computedisk-u00y8rf6x3p5gsj8t0`                  | Originally 32 GiB SSD                                                                                                                                                    | Deleted with VM; empty disk inventory verified                                                                                                                                                                                                 |
| `guardian-c7-kc-dev` / `computeinstance-u00jbhqf6qg9jwag4g`         | Originally 4 vCPU / 16 GiB, stopped                                                                                                                                      | Deleted; disappearance verified                                                                                                                                                                                                                |
| Original boot disk `computedisk-u00rcnbxepsavxqe1p`                 | Originally 32 GiB SSD                                                                                                                                                    | Deleted with VM; empty disk inventory verified                                                                                                                                                                                                 |
| Disk images / snapshots                                             | Console reported 0 / 0                                                                                                                                                   | No image or snapshot retention observed in this project                                                                                                                                                                                        |
| VM network allocations                                              | Two public and two private auto-allocations were attached to the VMs                                                                                                     | Released automatically; network allocation page now says no IP addresses                                                                                                                                                                       |
| Other compute                                                       | 0 Kubernetes nodes, 0 container VMs, 0 job/endpoint VMs; separate Jobs and Endpoints pages both report 0                                                                 | No retained jobs or endpoints observed in this project                                                                                                                                                                                         |
| Cloud billing                                                       | September 12 dashboard update 18:09 UTC: USD 2.19 posted usage, including USD 0.98 SSD storage, USD 0.59 CPU and USD 0.62 RAM; USD 22.81 balance                         | Snapshot is not a final invoice or proof that all delayed charges have posted                                                                                                                                                                  |
| Cloud payment                                                       | Transactions showed a prior USD 25 card payment                                                                                                                          | Card remains attached; no detach/disable control found in inspected billing UI; support request sent                                                                                                                                           |
| Guardian Codex automations                                          | `stop-guardian-issue-55-test` and `stop-kc-testing-at-alaska-cutoff` are PAUSED                                                                                          | No active Guardian automation found in the local automation inventory; unrelated tasks preserved                                                                                                                                               |
| Repository automation                                               | No scheduled workflow found under `.github/workflows`; no open PR at pickup; exact main CI passed                                                                        | No new deployment, evaluation or paid provider run initiated                                                                                                                                                                                   |
| Local processes                                                     | No Guardian service found among inspected Windows processes; WSL process scan found no node/python/SSH/Guardian processes; no running Docker container reported          | Codex's own node workers preserved; WSL user timer query failed because the user bus was unavailable                                                                                                                                           |
| Windows tasks / WSL timers                                          | No matching Guardian/Nebius/C7 Windows scheduled task or system timer found; user crontab returned no entries                                                            | User-service timer state remains a verification limitation                                                                                                                                                                                     |
| Token Factory                                                       | Organization `aitenant-e00neffjpyk7r78hsc`, project `aiproject-e00cvn8h1sg07jjz56`; 0 dedicated endpoints; billing balance USD 25.00 and header trial USD 0.82 / 15 days | User approved revocation of `hackathon-key` and `linux-wsl-key`; both revoked and empty API-key list verified. Billing account/card remains attached; support request sent. These balances are separate from Cloud                             |
| Tavily                                                              | Personal Researcher free plan; 34/1,000 monthly credits, 0/3,125 add-on credits; pay-as-you-go initially enabled                                                         | Disabled pay-as-you-go; Billing shows Disabled, auto-upgrade unchecked, no upcoming payments and no invoices. User approved revocation of `default`; deleted and no API keys verified. Saved card remains, but no paid plan or overage enabled |
| Domain registration                                                 | `agentic-guardian.com` was set to auto-renew; expires August 31, 2027                                                                                                    | Auto-renew disabled and unchecked state verified. Registration retained through expiration; no new purchase                                                                                                                                    |
| Cloudflare zone/subscriptions                                       | Guardian zone shows Free; shared account has Workers Paid, R2 Paid and Images Stream Basic for the existing Homegrown environment                                        | Shared subscriptions and account payment method preserved; no Guardian-specific paid subscription identified                                                                                                                                   |
| Stale DNS                                                           | Three A records pointed to released address `204.12.168.166`: `judge.agentic-guardian.com`, `fixtures.agentic-guardian.com`, `fixtures.homegrowncannalytics.com`         | Exactly these records deleted with user approval. Guardian zone now has 0 DNS records; Homegrown retains 11 records. Other Homegrown DNS/services preserved                                                                                    |
| SecretStash                                                         | Six Guardian resources; no payloads read                                                                                                                                 | All six scheduled for deletion through the recoverable 30-day UI flow; active view is empty, inactive view lists all six with Restore controls. This is not immediate permanent erasure. Provider keys themselves were separately revoked      |
| Other Cloud storage/services                                        | 0 object buckets, 0 filesystem buckets, 0 shared filesystems, 0 registries, 0 KMS keys, 0 PostgreSQL clusters, 0 MLflow clusters, 0 installed applications               | No resources to stop or delete in these inspected categories                                                                                                                                                                                   |
| Token Factory training/data                                         | Post-training shows first-job empty state; Data Lab shows no operations; sandbox page is a simulated tutorial/free beta                                                  | No training or data operation observed; no sandbox command was run                                                                                                                                                                             |

The CLI inventory attempt failed with exit code 7 and did not establish cloud
state. The authenticated browser inventory is the current evidence. No VM was
started to inspect or copy its disk. Local collected evidence is retained, but a
complete backup of each cloud disk was not verified before the user's deletion
approval.

## Remaining billing boundary and next action

Nebius documents automatic collection when balances become negative or reach its
billing threshold. A saved card was visible in both Cloud and Token Factory; the
inspected controls offered changing the card/adding funds, not detaching it or
disabling billing. No card removal, account closure, balance forfeiture or refund
has been confirmed. Removing cost sources and revoking API keys does not itself
terminate that billing relationship.

The user reviewed and authorized a support request. It was sent from the connected
Gmail account to `support@nebius.com` at approximately 20:27 UTC, subject
"Guardian project paused: disable new spending and detach payment methods."
It asks Support to confirm residual resources/commitments/usage, disable new
spending and automatic charging, remove payment methods where possible, and
preserve records and prepaid balances. Account deletion or forfeiture requires
the user's further confirmation. Gmail thread ID: `1a0974d122d02ca8`.

**Next action:** Earl reviews the support response and the final posted usage.
Keep issue #19's shutdown reconciliation open until those answers are recorded.
No automatic follow-up agent or paid monitoring is created by this session.

Primary billing references checked September 12:

- [Nebius Cloud PAYG and stopping charges](https://docs.nebius.com/signup-billing/billing-models/payg)
- [Token Factory billing and automatic collection](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new)

## Closeout conditions

1. Completed: verify deletion of both VMs/disks/allocations; disable Tavily overage,
   revoke all three provider keys, retire cloud secrets and disable domain renewal.
2. Pending: obtain provider confirmation on the retained billing attachments,
   residual services/commitments and any required further user action.
3. Pending: reconcile usage posted after shutdown against timestamps. An already-incurred
   charge can settle later; do not promise that the next statement is zero.
4. The user authorized committing/pushing these documentation changes, opening a
   PR and merging after required checks. No runtime change or deployment is included.

No paid monitoring or automatic restart is created for this pause. If a later
billing review is needed, arrange it explicitly and keep it read-only.
