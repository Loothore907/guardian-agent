# KC bounded continuation — September 6

The user approved execution within the existing KC hosting scope and shared
USD 25 cumulative allowance, using existing testing keys, for two hours from
replacement startup followed by cloud shutdown. The original stays stopped.

Both cloud rows were verified Stopped before startup. Replacement
`computeinstance-u00dkgrgnqdmy4vz67` was started at approximately 19:07 UTC;
the original `computeinstance-u00jbhqf6qg9jwag4g` remained Stopped. The conservative
cutoff is **21:06 UTC / 13:06 AKDT**. The existing cloud-stop heartbeat was updated
to this task and cutoff. Guest `shutdown -P 21:06` was confirmed at 19:09:07 UTC.
The heartbeat is a follow-up, not evidence of a completed cloud stop. This window
ended early: both VMs were independently confirmed `STOPPED` with the authenticated
cloud CLI by **19:56:52 UTC**. Replacement stop operation was
`computeoperation-u00khsjmt0y997vqwk`; the original was never started. The heartbeat
is paused. Files, disks, static addresses and DNS are preserved.

## Synthetic lifecycle

Source remains the previously tested `ceaedfe68511…` snapshot. No provider call
was made by these probes. The prepared `kc-custody-lifecycle.mjs` checks exact
fixture bytes, callback-buffer zeroing, zeroing after callback failure, sanitized
availability, and rejection of an unconfigured provider before callback entry.

- Initial V1 passed at 19:09:39 UTC.
- Previously staged V2 `mbsecver-u00eqfbb3htp4xc4gp` was promoted, but two exact
  retrieval checks failed. Inspection of this synthetic-only payload established
  that it contained concatenated V1 and V2 markers. This was a fixture-entry
  defect; neither failure is counted as passing replacement evidence.
- Corrected synthetic V2 `mbsecver-u00e3cdkfrjaptk7c1` was created after selecting
  and replacing the whole inherited value. Its exact retrieval and all cleanup/
  rejection checks passed at 19:11:59 UTC.
- Original V1 `mbsecver-u00cpzeap3k8fp1fq7` was restored as primary. Exact retrieval
  and all cleanup/rejection checks passed at 19:12:42 UTC.
- The production reference sandbox metadata-token/direct-CLI bypass test passed
  again after restoration (1/1).

Sanitized retained logs:
`tmp/c7-acceptance/kc-evidence/c7-lifecycle-v2-20260906.log` and
`tmp/c7-acceptance/kc-evidence/c7-lifecycle-v1-restored-20260906.log`.
The earlier failed synthetic version remains retained and non-primary.

This proves the narrow synthetic replacement/restoration and callback cleanup
journey. It does not prove real credentials, complete secret-corpus redaction,
provider-role isolation, live budgets, unattended availability, or C7 completion.

## Revocation and operator transfer preflight

At 19:25 UTC the synthetic fixture's payload-viewer permit was removed. The
runtime probe failed closed without entering the credential callback and returned
a sanitized denial. The same role/resource grant was restored as permit
`accesspermit-u00tf40tac8qsqwwwd`; exact V1 retrieval passed again at 19:28 UTC.
Retained log: `tmp/c7-acceptance/kc-evidence/c7-lifecycle-revoked-20260906.log`.

The local operator CLI is authenticated. A synthetic-only stdin transfer through
the operator CLI created `guardian-c7-kc-dev-nebius-transfer-preflight`; exact
comparison passed. The runtime has no grant on that separate resource. The
operator authentication remains off the VM.

Real Nebius/Tavily transfer was rejected by automatic approval review because
the specific credential-to-SecretStash destination required exact user approval.
That question was pending at the running-window checkpoint; see the post-shutdown
approval and enrollment update below. GitHub App private
key and installation slots are absent, so unattended GitHub setup also remains
pending. The default user credential is not a substitute for those slots.

## Budget preparation

Authenticated TokenFactory pricing was checked for all four selected models.
Per million input/output tokens in USD: Qwen 235B 0.20/0.60; Kimi K2.7 Code
0.95/4.00; Nemotron Super 0.30/0.90; Nemotron Ultra 1.00/3.00. Tavily uses a
conservative USD 0.008 per credit pending active-plan reconciliation.

A private persistent SQLite ledger was initialized with admissions disabled,
USD 20 total/daily provider budget, USD 0.25 journey reservation, concurrency one,
and a 21:01 UTC admission close. Its configured maximum journey is USD 0.201327.
Disabled admission and persistence passed. A separate synthetic ledger checked
replay and concurrency rejection, cancellation forfeiture, and expiry forfeiture
after reopen. The deployment ledger still has zero admissions. This is ledger
preflight evidence, not proof of a running budget service or live settlement.
Retained log: `tmp/c7-acceptance/kc-evidence/c7-budget-preflight-20260906.log`.

## Static fixture staging

Eight fixture files from published fixture commit `bd63c72aa1e6` were staged under
`/srv/guardian-fixtures/bd63c72aa1e6`; all manifest hashes matched. Caddy 2.11.4
was installed from its official signed repository while masked. Its static-only
configuration validates, and a systemd isolation drop-in is installed. Runtime
isolation and HTTPS checks subsequently passed. Both approved fixture A records
were added DNS-only to replacement address `204.12.168.166`. No judge portal has
been exposed. In Caddy's actual mount namespace and under its UID, metadata,
operator-home and runtime-user paths were inaccessible while the fixture was
readable. This is a filesystem traversal check, not general Caddy egress isolation.

The initial external Windows check matched all eight HTTPS hashes, then found
that Caddy directive ordering returned 404 instead of the intended 405 for POST.
An explicit `route` fixed the ordering. Final host-side checks passed at 19:43:24
UTC: all eight TLS-validated responses matched their manifest hashes, ten invalid
paths returned 404, and both POST probes returned 405. Subsequent Windows and
local WSL reachability attempts timed out; firewall still allowed public TCP
80/443. External reachability is therefore not established as reliable. Logs:
`c7-fixture-https-host-20260906.log` and `c7-caddy-isolation-20260906.log` in the
retained KC evidence directory. Fixture URLs are offline after cloud shutdown.

## Budget IPC defect, correction and final source verification

The first production-child IPC check failed closed with `budget_unavailable`:
the client admission timestamp differed from the ledger clock. Fixed-clock tests
had hidden this real IPC latency. The queue now calls trusted-clock stamping
methods that sample the ledger clock once at execution. Direct ledger methods
retain their exact-clock contract. Advancing-clock and caller-time expiry/window
regressions pass; see ADR-0053. Operator policy/price update timestamp contracts
were not changed and still need real-clock acceptance.

New hash-verified source identity:
`2dcc7cd79e2e44f87bc1df4e9738d60303f378d6d61eee371c50145075bff472`, 508 source files,
staged at `/home/guardianops/guardian-c7-2dcc7cd79e2e`. Archive SHA-256:
`1756e63ddba611cd6dbfbfe21490817317f329571754e8af5d7305935d674fd2`.
The snapshot includes the code changes and pre-final documentation; subsequent
documentation reconciliation does not change the tested source code.

`pnpm check` passed: 679 tests / 6 skips, plus the required script suites,
formatting, lint, typecheck, boundaries and production build. Native platform
checks passed 2/2, production reference containment 1/1, and production audit
reported no known vulnerabilities. Logs are retained under
`tmp/c7-acceptance/kc-evidence/c7-runtime-evidence-2dcc7cd79e2e/`.

At 19:53:03 UTC the corrected production-child preflight passed with actual Linux
peer verification and a 0600 socket. Campaign admission remained disabled with
zero admissions. A separate synthetic ledger rejected wrong-role and wrong-journey
usage, settled a synthetic worker observation for five microUSD, rejected repeated
settlement, and preserved settled totals after process restart. No provider call
was made. Retained log: `tmp/c7-acceptance/kc-evidence/c7-budget-ipc-20260906.log`.
All test service children were closed before shutdown.

## Cost and remaining state

Replacement accounting interval: approximately 19:07–19:56:52 UTC, 49m52s.
Cumulative VM compute estimate is USD 0.912327; the new interval contributes
USD 0.099733. The retained campaign ledger has zero reservations, estimated usage
or pending forfeitures. Provider billing, previous usage reconciliation and
retained disk/static-IP charges remain pending; the estimate is not a final bill.
The USD 25 allowance and USD 5 infrastructure reserve remain unchanged.

During the running window, no real credential transfer, GitHub App enrollment, authenticated judge ingress,
live model/research call, source commit or push occurred. Existing worktree changes
are preserved. The later transfer approval and enrollment are recorded below;
the remaining C7 live acceptance gates remain incomplete.

## Post-shutdown approval and protected enrollment

The user explicitly approved the two named key transfers and clarified that
actions enumerated in an approved plan, including key migration, should proceed
within that scope. Repository guidance now makes that interpretation explicit;
the external automatic approval reviewer itself was not changed.

The stopped-host operator path created and verified these exact copies:

| Provider | KC SecretStash resource | Primary version | Runtime payload-reader permit |
| --- | --- | --- | --- |
| Nebius | `mbsec-u00vj1q4t557yq8zk4` (`guardian-c7-kc-dev-nebius`) | `mbsecver-u00py2fnb9dqntcjnd` | `accesspermit-u00a2zndb58x154f9q` |
| Tavily | `mbsec-u00cabt74nah2z9rp4` (`guardian-c7-kc-dev-tavily`) | `mbsecver-u00nmw6k50rcwgbgk1` | `accesspermit-u00n54wjv67byawwa1` |

Both resources belong to `project-u00h7t9mkc007dezqchqwv`. Each new permit grants
only `mysterybox.payload-viewer` on its exact resource to group
`group-u00yaf17ndh9s5c38r`. Membership was checked: its sole member is runtime
service account `serviceaccount-u00kxywmp8yn71epyz`. Existing tenant/operator
administrative authority is not removed by these resource grants.

The ignored operator helper transferred values from Windows Credential Manager
through protected stdin; no key values entered tool arguments or output. A
separate helper retrieved each approved primary version into private process
buffers and compared it with the retained Windows original using an exact
constant-time comparison. Both matched. Outputs contain only resource/version
IDs and success booleans. Temporary byte buffers were cleared; complete erasure
of runtime/JSON string memory is not claimed. No plaintext credential file was
created, and the local originals were not deleted or revoked.

Retained sanitized log: `tmp/c7-acceptance/kc-evidence/c7-protected-transfer-20260906.log`.
No VM was started for this work and no inference/research call was made. These
checks establish operator copy integrity, not runtime retrieval, protected
provider use, comprehensive redaction, generalized product migration or C7
completion. The handoff now starts with the remaining runtime verification gates.

## Final handoff audit

Both VMs were again confirmed STOPPED with read-only authenticated cloud queries;
the cutoff automation remains PAUSED. All 337 code files covered by the tested
snapshot match their manifest hashes. The prior required suite remains the code
validation baseline (679 passed / 6 skipped); this closeout changes documentation
and ignored operational metadata only. `git diff --check` passes.

The local Markdown path check examined 153 Markdown files and 407 relative file
links with no missing targets. This checks local path existence, not external URL
availability or every heading anchor. ADR-0052 was added to the decision index;
current delivery links now point to this continuation and the KC pickup. Old
VM/SSH/cutoff and pre-enrollment instructions were removed from the active pickup
and retained by reference to historical evidence. Operational metadata now
distinguishes verified operator copies from unverified runtime credential use.

Next milestone: one authenticated, budgeted hosted research-only journey. Prepare
the operator budget-clock update path and protected ingress/startup composition
offline, then obtain a fresh bounded compute window and verify runtime credentials,
live usage settlement and external HTTPS. Existing enrollment, grants and fixtures
are reusable. GitHub App/mutation acceptance follows its own readiness gate;
generalized hosted BYOK remains a separate product-design follow-up.
