# KC native Linux acceptance checkpoint

Recorded September 5, 2026 AKDT / September 6 UTC. This is a credential-free
source/build/reference-runtime checkpoint, not completed hosted acceptance.

## Source and host identity

- Existing KC instance `computeinstance-u00jbhqf6qg9jwag4g`, project
  `project-u00h7t9mkc007dezqchqwv`, public IP `204.12.170.222`.
- Ubuntu 22.04, kernel `5.15.0-185-generic`, 4 vCPU/16 GiB.
- Source base remains `e5b1217`; accumulated main-repository work is uncommitted.
- The explicit 506-file snapshot excludes Git metadata, environment files,
  credentials, private state, build output and unrelated ignored material.
- Tested source identity:
  `c491675bb2e6e902e8f2e9f6951b1b8942e50865fa75923bdcf4e5fe02731095`.
- Tested archive SHA-256:
  `d404869d6e4a2524d8251c2310f012c650af69f258e3c0f063b2f9b85a67c374`.
- Local manifest/archive: ignored `tmp/c7-acceptance/kc-source-manifest.json`
  and `kc-source.tar.gz`. Each source file was checked for size and SHA-256
  on KC before running checks. This evidence document was written afterward.
- Staging/build directory: `/home/guardianops/guardian-c7-b5e4041a1f5b`.
  Its directory suffix identifies the first staging snapshot, not the final
  source identity; use the manifest above. It is not an immutable live release.
- Node `24.19.0` was fetched from the official distribution with its published
  SHA-256 checked; pnpm `11.19.0` and frozen-lockfile dependencies were installed.
  A copy of the pinned Node executable is at `/usr/local/bin/node` so the
  reference sandbox's read-only `/usr` mount can execute local Node commands.

## Verification

Run from the staged project with Node/pnpm above and `umask 077`:

| Check | Result |
| --- | --- |
| `pnpm check` | Passed; 668 Vitest tests passed, 6 opt-in/platform skips; formatting, lint, type checking, ancillary harnesses, dependency boundaries and build passed |
| `pnpm test:linux-platform` | 2 passed: private IPC/database permissions, unrelated-peer rejection, broad-mode and symlink rejection |
| `pnpm test:reference-runtime` | 1 passed: current native C4 reference executor, namespace evidence and local-command isolation |
| `pnpm audit --prod --audit-level high` | No known vulnerabilities reported |
| `node --test scripts/c7-fixtures.test.mjs scripts/c7-cost-report.test.mjs` | 3 passed |
| Windows focused supervisor/authority-store tests | 26 passed, 2 POSIX skips |

The native reference-runtime test exercises the current executor's public-egress,
Git-push, filesystem, credential-route and reduced-identity probes, plus allowed
workspace commands. Synthetic service-child tests within the main suite exercise
the supervisor/authority/Guardian/broker/research composition and injected
near-miss requests. They do not call real providers.

The legacy `pnpm test:session-enforcement` command's C1 launcher requires a
Windows drive path and cannot run on this native Linux host. Its three portable
tool-proposal/catalog/missing-credential tests passed using
`node --test --test-name-pattern="model proposals|trusted launcher|Tavily path" spikes/enforced-session/spike.test.mjs`.
The Windows-only runtime case is **inapplicable here**, not passed or replaced
by a fabricated C1 result. Native runtime evidence comes from C4 above.

Logs are retained locally under ignored
`tmp/c7-acceptance/kc-evidence/c7-evidence-c491675bb2e6/` and on KC under
`/home/guardianops/c7-evidence-c491675bb2e6/`.

## Corrections and unresolved observations

The restrictive host umask masked mode `0640` in intentionally permissive
database/WAL rejection fixtures. Tests now explicitly chmod those fixtures
after creation in `packages/authority-store/src/index.test.ts` and
`scripts/linux-c6-permissions.test.mjs`. The production permission policy was
not relaxed.

Earlier full runs intermittently failed to start an authority child in supervisor
or C7 service-child tests. Isolated and instrumented runs passed, as did the final
exact-source full run. **The intermittent startup failure is not resolved.**
Earlier failure and sanitized diagnostic logs remain under
`tmp/c7-acceptance/kc-evidence/c7-evidence-5b4c78927c3f/`; additional intermediate
logs remain on KC. Temporary instrumentation was restored before final checks.

The supervisor now preserves its generic error message and exposes only a fixed
`startup_timeout` or `startup_rejected` cause, without retaining a child exception
or child output. A silent-child test verifies timeout classification and process
termination; the rejection test verifies the sanitized cause. The existing
five-second startup deadline and fail-closed behavior remain unchanged.

## Operational and credential gate

At `2026-09-06T02:53:53Z`, KC was running and retained its original power-off at
`2026-09-06T08:15Z` / September 6, **00:15 AKDT**. No reboot, restart, shutdown
extension, replacement VM or Finland VM was performed.

At `02:54:05Z`, the existing rounded infrastructure estimator reported
USD **0.084019** since provisioning. This is an estimate, not billed usage;
infrastructure/API billing remains pending. The shared USD 25 allowance still
allocates USD 20 to API calls and USD 5 to infrastructure. The operator cost
snapshot was refreshed; no actual persistent runtime ledger has been bound.

The authenticated KC SecretStash inventory showed **zero secrets**. Only the
empty native creation form was inspected; no credential value was requested,
read, entered or copied. Existing local BYOK enrollment was left untouched.
Hosted enrollment and resource-scoped service identities remain necessary.
Nebius documents payload access as a separate `mysterybox.payload-viewer` role,
with individual-resource access permits supported:
[SecretStash creation](https://docs.nebius.com/mysterybox/secrets/create),
[IAM roles](https://docs.nebius.com/iam/authorization/roles).

Next: investigate startup reliability; prepare the exact protected SecretStash/IAM
consumer configuration and synthetic preflight. The user confirmed that existing
testing keys are the current development credentials; dedicated judging keys are
not a prerequisite for this private development run. Then bind
the actual durable budget and operator reporting, followed by Caddy/DNS/TLS,
fixtures and authenticated portal, real-provider pairs, source review/integration
and the quota-dependent Finland comparison, in the approved order.

No persistent Guardian service, live provider session, public ingress, DNS change,
source commit/push/PR/merge, or hosted `Enforced` assurance was enabled. Full
provider/IAM/credential containment, cold-boot/unattended behavior and full C7
completion remain **not claimed**.

## Late continuation: startup and cloud identity

On September 6 at 07:17–07:27 UTC, three further full synthetic suites each
passed **668 tests with 6 skips** against the same staged source. Fifty sequential
authority-supervisor start/close cycles using a disposable Git mission fixture
also passed (median 155 ms, maximum 182 ms). This does not resolve the earlier
intermittent failure. Retained local logs are under
`tmp/c7-acceptance/kc-evidence/c7-startup-20260906-0717/`.

Credential-free CLI preflight passed for the existing root-owned Nebius CLI
0.12.238, including the fixed adapter flags under an empty environment. It did
not retrieve a payload or test cloud authorization. CLI SHA-256:
`019e9cab1773a18c2a91958dab3c445cc31f8bce9c93f77c60e3a3a39afd6a06`.

Created `guardian-c7-kc-dev-runtime` service account
`serviceaccount-u00kxywmp8yn71epyz` in the KC project with **no groups**. No
payload permissions or service keys were created. A synthetic SecretStash form
was filled, discarded through the unsaved-changes dialog, and the inventory
remained zero; persistence/replacement/retrieval rehearsal is still pending.

The original VM's equivalent creation code omits a service-account attachment,
and `/mnt/cloud-metadata/token` was absent at 07:36:36 UTC (existence check only).
Nebius marks the attachment immutable in its
[instance schema](https://github.com/nebius/api/blob/main/nebius/compute/v1/instance.proto).
The user authorized preparing a same-size replacement with the runtime identity
attached, the existing testing keys, the shared USD 25 limit, and tonight's
unchanged cutoff. This is a provisioning correction; original source evidence
does not automatically prove replacement-host containment.

The same schema warns that guest shutdown can trigger VM recovery. A cloud-level
stop follow-up is now scheduled for September 6, 00:15 AKDT for the original and
its named replacement, preserving disks. Cloud `STOPPED` remains to be confirmed;
the guest shutdown timer alone is not evidence of stopped billing.

## Replacement and real CLI synthetic acceptance (08:10 UTC)

Replacement `guardian-c7-kc-dev-runtime` is
`computeinstance-u00dkgrgnqdmy4vz67`, public IP `204.12.168.166`, private
`10.96.0.12`. It has the runtime service account attached from creation, the same
CPU/RAM/disk/image sizing, and the original SSH public key and firewall source.
The SSH host key was verified against authenticated serial logs before use:
`SHA256:01YwfmagpbMG9HJolSq1sz61surwn0/RWHRYAMKTn7s`. First-boot hardening and
rootless network namespace checks passed. The token path exists (value not read).

The real CLI exposed a defect hidden by mock fixtures: `--format text` returns a
protobuf envelope, not the payload string. The adapter now requests JSON, checks
the fixed envelope and exact payload key, rejects duplicate/unknown members and
unsupported binary payloads, and returns only the decoded string bytes. Updated
tests retain PEM and nested installation-metadata support. JavaScript JSON
strings cannot be explicitly zeroed; the callback and captured byte buffers are
zeroed, not all process memory.

Patched source identity:
`ceaedfe685116cec6d127eac1be7c208fe3a1635964898d166d314dddb5956fc` (507 files).
Archive SHA-256:
`b717f960d42f0f99c6e15c0ecca53c49dc6b9f444faa7cfc4d268bdfb3bc29cc`.
The source remains at `/home/guardianops/guardian-c7-c491675bb2e6`; that directory
suffix predates the fix, so use the manifest identity. No later documentation
edits should be confused with this tested snapshot.

- Focused Windows credential/GitHub-installation tests: **43 passed**.
- Replacement full `pnpm check`: **677 passed, 6 skipped**; build, lint,
  typecheck, format and dependency boundaries passed.
- Native Linux permissions: **2 passed**; C4 reference containment: **1 passed**.
- Portable session checks and fixture/cost tests passed; production audit clean.
- Exact synthetic retrieval through the real adapter: callback reached, fixture
  matched, callback buffer zeroed, **zero provider calls**.
- Direct CLI retrieval and metadata-token path were blocked inside the production
  reference sandbox (**1 passed**). The initial probe exceeded the existing
  256-character argument limit and was rejected before execution; moving its
  synthetic script into the disposable workspace corrected the probe setup.

Retained locally:
`tmp/c7-acceptance/kc-evidence/c7-runtime-evidence-ceaedfe68511/` contains the full
suite, platform, reference, audit, fixture/cost, custody and sandbox logs. The
synthetic reproduction scripts are `kc-synthetic-custody.mjs`,
`kc-synthetic-sandbox.test.mjs` and `build-kc-sandbox-probe.cjs` in
`tmp/c7-acceptance/`. Run the first from `/home/guardianops` with the staged build;
run the second using `node --test` there. Both bind the one synthetic resource.

Synthetic resource `guardian-c7-kc-dev-preflight`:
`mbsec-u00v9a85wqn6vnms5t`, primary version `mbsecver-u00cpzeap3k8fp1fq7`, payload
key `nebius_api_key`. Group `guardian-c7-kc-dev-secret-readers`
(`group-u00yaf17ndh9s5c38r`) grants only `mysterybox.payload-viewer` on that exact
resource to the runtime account. No editor/admin grant, actual provider key,
service-account key, real provider call, Caddy or live portal was enabled.
Replacement and full secret-corpus lifecycle checks remain pending.

At 08:10 UTC, SSH began rejecting new logins under the scheduled shutdown's
normal five-minute `nologin` window. The final patched evidence directory was
already copied successfully; a subsequent connection for older supplemental
logs was rejected. The cutoff was not changed and the login restriction was not
bypassed.

Cutoff follow-up: at approximately 08:20 UTC both VM rows were confirmed
**Stopped** in the authenticated Console. Guest shutdown briefly recovered to
Running, requiring cloud-level stops after that transition. No disks or addresses
were deleted. Cost metadata uses the observation time as a conservative estimate
endpoint, not an exact provider billing timestamp. Retained storage/address
charges still need reconciliation.
