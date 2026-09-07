# KC protected hosted gate — September 7, 2026

Tracking: issues [#19](https://github.com/Loothore907/guardian-agent/issues/19)
and [#40](https://github.com/Loothore907/guardian-agent/issues/40).

## Result

The bounded KC window completed safely but did **not** pass the hosted journey
gate. The exact draft was admitted and then failed during local workspace
preparation before any provider process or request. The no-retry rule was
honored: no confirmation or second draft was sent. Both VMs were stopped, the
cutoff automation was paused, and the temporary judge bearer was deleted.

This record adds intended-host containment, protected SecretStash retrieval,
authenticated price/catalog, public negative-route and durable fail-closed
settlement evidence. It does not establish a successful hosted journey, live
model behavior, reliable public availability or an Enforced assurance state.

## Bound source and infrastructure

- source commit: `0bee21f50cec47db1d015e34fdbd408d5db499d5`
- archive SHA-256:
  `e5dadf164bf00c9056ec72417191e4408efb2c58e7390be56c3ffae9960a47ee`
- lockfile SHA-256:
  `9425effa8a472bbb356cea1472d33df3fd3c73a2d69f3ebb97576a5bac68f492`
- replacement: `computeinstance-u00dkgrgnqdmy4vz67`, 4 vCPU/16 GiB,
  `204.12.168.166`
- original: `computeinstance-u00jbhqf6qg9jwag4g`; it remained stopped
- runtime service account: `serviceaccount-u00kxywmp8yn71epyz`
- Node `v24.19.0`; pnpm `11.19.0`

The replacement ran in two final intervals: 01:53:04.800–01:57:00 UTC and
01:58:39.178–03:00:42.044 UTC. Cloud state was authenticated with the Nebius CLI;
both VMs reported `STOPPED` at closeout. Guest shutdown and a separate cloud-stop
heartbeat were established before live work. The heartbeat is now paused.

## Passed pre-provider gates

The archive and lockfile hashes matched on the VM. Offline Linux helper, TypeScript
and Vite builds passed. Disabled-mode startup and the production reference
sandbox passed. The sandbox confined its workspace and denied direct network,
metadata, SecretStash/credential and alternate-provider routes. Caddy's service
namespace could read only the fixed fixture tree, not metadata, operator-home or
runtime-user paths. Guardian listened on `127.0.0.1:4317`; only Caddy listened on
public TCP 80/443.

The two ingress resources were distinct exact-resource SecretStash bindings:

| Slot | Secret | Primary version | Payload-reader permit |
| --- | --- | --- | --- |
| access digest | `mbsec-u00mq5e5ndqw9g0y38` | `mbsecver-u00d35ee2cg5ydcfy8` | `accesspermit-u00a7b6pk9cbejy0sr` |
| source fingerprint | `mbsec-u00a9qnjp1bsqb5x64` | `mbsecver-u00dr24hnasb81knvh` | `accesspermit-u00p5rkqzmygf9gcw1` |

The exact runtime group had one member: the bound runtime service account.
Runtime reads returned only sanitized sizes: 32 digest bytes and 48 fingerprint
bytes. Existing Nebius and Tavily resources were readable through their fixed
consumer projections. No value entered argv, environment, logs, repository or
tool output.

At 02:31:21.653 UTC the authenticated Token Factory catalog contained the four
fixed model IDs and prices. Tavily reported Researcher usage 4/1500 before the
attempt. Policy and prices were enabled through the authenticated operator service
clock at 02:39:20.994 UTC with one admission, no queue, no retries and a USD 0.10
journey ceiling. The update preserved zero admissions and reservations.

The DNS-only judge A record resolved to the replacement address. Valid public TLS
returned 404 for unknown, GET-draft and legacy journey routes and 401 for absent
or malformed authorization. The authenticated strict-schema near miss returned
400 without echoing the unknown authority field.

## Transport anomaly

After the public negative-test burst, new operator-side TLS sessions became
unreliable. Caddy and its certificate remained healthy on VM loopback, while VM
packet state showed half-closed operator connections whose responses did not
return. Browser, Windows curl and WSL curl reproduced the failure. The public
path was not widened or proxied.

The one authorized attempt used an SSH forward to the same Caddy TLS listener.
Certificate and host verification still passed and Caddy returned the expected
404 probe. This preserves a safe diagnostic route but is not evidence that the
successful journey traversed the public ingress. Reliable public availability
therefore remains open independently of the preparation defect.

## Failed draft and durable accounting

The exact piloted draft requested two fixed fixture URLs, no GitHub target and a
300-second research-only duration. At 02:55:49.768 UTC the budget admitted journey
`23d4838d-936e-4964-98dc-1a3fc31b36ed`. The route returned sanitized HTTP 503 at
02:55:49.789 UTC. The reservation was immediately settled as `forfeited`, outcome
`failed`, charged 100,000 microUSD, with `usage: []`.

Tavily reconciliation at 03:01:47.866 UTC remained 4/1500, Search 4, Extract 0,
pay-as-you-go 0. The 21 ms admission-to-settlement interval and empty usage report
show that no model or research call started. Provider billing remains subject to
normal delayed reconciliation; it is not asserted as a final zero bill.

## Root cause

The source packaging and runtime workspace contracts disagree:

1. the run sheet correctly requires a credential-free `git archive`, which has no
   `.git` directory;
2. `SupervisorJudgePortalRuntime.prepare` passes that extracted directory to
   `ManagedSessionWorkspace.plan`; and
3. `ManagedSessionWorkspace.plan` requires an exact Git project root by invoking
   `git rev-parse --show-toplevel` followed by `git ls-files`.

That check failed before the supervisor could start its provider children. Issue
#40 owns a manifest-bound gitless-source contract with mutation, traversal,
symlink, size and credential near-miss tests. A second hosted journey must not run
until that fix is integrated and a new bounded run sheet explicitly authorizes
the additional admission.

## Cost and cleanup

The conservative cumulative infrastructure estimate is USD 1.044294; the last
provider-reported infrastructure bill remains USD 0.86 and may lag. The failed
ledger reservation contributes USD 0.10 awaiting provider reconciliation. The
unchanged campaign allowance is USD 25 with the existing USD 5 infrastructure
reserve. No top-up or allocation increase occurred.

The live host and budget child exited, Caddy stopped, both cloud VMs reported
`STOPPED`, the SSH forward closed, the cloud-stop heartbeat paused and the
temporary Windows judge bearer was deleted and verified missing. Disks, static
addresses, DNS and exact SecretStash resources remain retained. Because the host
is stopped, the retained DNS record does not expose the judge service.
