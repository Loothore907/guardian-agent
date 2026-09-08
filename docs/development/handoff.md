# Current development handoff

Last reconciled: September 7, 2026 (September 8 UTC). Main is
`f651a6edca79e468e479123289bd73755ed7abbc`, which includes the judge launch-profile
fix from [PR #53](https://github.com/Loothore907/guardian-agent/pull/53). Exact-head
CI, the complete local `pnpm check`, and the repository closeout check passed.

## Current outcome

The hosted C7 acceptance journey is still incomplete. The latest prepared attempt
validated the draft and reached confirmation, but the runtime returned
`503 unavailable` before creating a Guardian authority session or calling Nebius
or Tavily. The authority database contained zero sessions, events, and budgets.
The durable campaign ledger recorded its fourth forfeited USD 0.10 reservation
with `usageCount: 0`; no provider usage was reported.

A provider-free diagnostic using the production launcher then reproduced the
actual failure:

```text
TypeError: profile is not enforceable by the C4 reference runtime
```

The judge supervisor put only task-facing research/GitHub tools in the mission
permission envelope. The C4 launcher also requires the mediated baseline tools
`guardian.session_status` and `guardian.local_command`, plus the
`write_workspace` side effect. This was a source defect, not a browser login,
Guardian credential, SecretStash, or model-provider authentication failure.

[PR #53](https://github.com/Loothore907/guardian-agent/pull/53) fixes the mismatch.
Mission permissions now contain the C4 baseline capabilities while the
worker-visible tool catalog remains limited to the task tools. The local-command
budget remains zero. Regression coverage asserts the corrected public-research
and GitHub-merge profiles. Closing issue
[#19](https://github.com/Loothore907/guardian-agent/issues/19) records integration
of this repair; it does not establish a successful hosted journey or complete C7.

Both KC VMs were cloud-confirmed `STOPPED` after the attempt. Guardian and Caddy
were stopped, the SSH tunnel was closed, and the temporary retry bearer was
deleted and verified unavailable. Persistent disks, static addresses, DNS,
fixtures, SecretStash resources, IAM bindings, the campaign ledger, the retained
deployment, and sanitized diagnostics were preserved. No additional provider
spend is authorized by this handoff.

## Start here next session

1. Run `node scripts/session-hygiene.mjs start --remote`. Confirm current `main`,
   open issues/PRs, exact-head CI, and a clean worktree. Treat remote state as
   unknown if that check cannot reach GitHub.
2. Before any hosted action, independently verify both VM cloud states, current
   billing, the campaign ledger, and whether any cutoff automation is active.
   Leave both VMs stopped while doing repository and evidence review.
3. Review [PR #53](https://github.com/Loothore907/guardian-agent/pull/53), the
   [retry-3 abort evidence](evidence/2026-09-07-kc-hosted-retry-3-abort.md), and
   the ignored retry 4–6 diagnostics under `tmp/c7-acceptance/`. Preserve those
   artifacts; they are not present in a fresh clone.
4. If another live run is desired, create and integrate a fresh bounded run sheet.
   Bind its exact source commit and archive, one admission, maximum provider and
   infrastructure spend, absolute startup/admission/guest-stop/cloud-stop times,
   and a cloud-stop fallback. Every September 7 sheet is expired or spent.
5. Build the credential-free deployment from current reviewed `main`. Before
   reserving budget or activating providers, run the production launch diagnostic
   against the exact generated judge profile. It must pass the real C4 launcher
   contract with the configured research connection.
6. Start Guardian disabled and loopback-only, then Caddy. Verify intended-host
   process, filesystem, credential, and network containment. Corroborate public
   TLS with at least two independent clients before concluding the endpoint is
   broken. Preserve the prepared environment while investigating a single-client
   failure unless a safety or cutoff condition requires teardown.
7. Only after the provider-free launch and external TLS gates pass, activate the
   existing exact-resource credential readers, admit the one authorized journey,
   and capture sanitized authority, budget, provider, latency, and output evidence.
   Re-normalize and revalidate any privileged request immediately before execution.
8. Settle or forfeit every reservation, stop services, remove transient ingress
   credentials, cloud-stop the replacement, and independently verify both VMs are
   `STOPPED`. Reconcile actual billing rather than treating shutdown as zero cost.

Do not spend another hosted window on Codex Google/browser authentication.
Guardian's VM workload identity and exact SecretStash paths are designed to run
unattended. Codex/Nebius operator authentication is a separate control-plane
preflight and must not be treated as Guardian runtime authentication.

## Repository and verification state

Current reviewed source: `f651a6edca79e468e479123289bd73755ed7abbc`.

The source fix is limited to:

- `apps/reference-supervisor/src/judge-runtime-scope.ts`
- `apps/reference-supervisor/src/judge-runtime-scope.test.ts`

Verification on the merged feature head `25a344d00215441b31ad0978961eb900c6634072`:

- focused judge/runtime tests: 18 passed;
- complete Vitest suite: 689 passed, 18 skipped;
- formatting, lint, TypeScript project build, dependency boundaries, Linux helper,
  security harnesses, protected-host tests, manifest-bound gitless test, and web
  production build passed;
- GitHub Actions build run
  [34182126906](https://github.com/Loothore907/guardian-agent/actions/runs/34182126906)
  passed against that exact head;
- PR #53 merged as `f651a6edca79e468e479123289bd73755ed7abbc`.

The worker-visible catalog intentionally excludes the baseline local/status tools,
even though mission permissions contain them. Do not collapse those two scopes.
`guardian.local_command` remains mechanically inert for this judge profile because
`maxLocalCommands` is zero.

## Operational state to preserve

Nebius project: `project-u00h7t9mkc007dezqchqwv`.

- Replacement: `computeinstance-u00dkgrgnqdmy4vz67`, `204.12.168.166`, stopped.
- Original: `computeinstance-u00jbhqf6qg9jwag4g`, `204.12.170.222`, stopped; leave
  it stopped.
- Nebius credential resource: `guardian-c7-kc-dev-nebius`
  (`mbsec-u00vj1q4t557yq8zk4`).
- Tavily credential resource: `guardian-c7-kc-dev-tavily`
  (`mbsec-u00cabt74nah2z9rp4`).
- Exact-resource runtime payload-reader grants remain installed. Do not repeat
  credential enrollment merely to regain context.
- Fixture commit remains `bd63c72aa1e697e4192f53ba19f833724efb6475`.
- The private campaign ledger and latest deployment/diagnostics remain retained.
  The most recent attempt added a forfeited USD 0.10 reservation and no provider
  usage.

Ignored local operational evidence remains under `tmp/c7-acceptance/`, including
the retry 4–6 draft/confirm, budget, authority, isolation, launch-diagnostic, and
ledger files. In particular, preserve `kc-retry6-launch-diagnose.mjs`,
`kc-retry6-authority-diagnose.mjs`, `kc-retry6-isolation-probe.mjs`, the campaign
SQLite files, and `kc-evidence/`. These files can contain private operational
metadata and must not be indiscriminately staged or published.

The earlier retry-3 cutoff automation was paused after its closeout. Do not assume
that pause or any old cutoff protects a future start; inspect the current automation
state and establish a new absolute cloud-stop fallback within the next approved
run sheet.

## Remaining acceptance work

C6/C7 remain in progress. The merged fix removes the deterministic launch-profile
blocker, but it has not been redeployed or proven in a provider-backed hosted
journey. Remaining evidence includes:

- corrected profile launch in the intended hosted runtime;
- protected Nebius/Tavily retrieval and provider calls through Guardian;
- admission, reservation settlement, and durable authority/audit records;
- useful answer fidelity for the clean and seeded research cases;
- reliable external TLS and authenticated judge ingress;
- billing reconciliation and cloud-stop evidence;
- later exact-authorized GitHub mutation cases after the separate GitHub App and
  disposable-target gates are ready.

Do not promote a property from `Observed` or `Unknown` to `Enforced` without the
reproducible evidence required by [security claims](../security-claims.md).

## Evidence and history

- [KC hosted gate result](evidence/2026-09-07-kc-hosted-gate.md)
- [KC hosted retry abort](evidence/2026-09-07-kc-hosted-retry-abort.md)
- [KC hosted retry-3 abort](evidence/2026-09-07-kc-hosted-retry-3-abort.md)
- [KC hosted acceptance chronology](c7-kc-hosted-acceptance-handoff.md)
- [Manifest-bound gitless source decision](../adr/0056-manifest-bound-gitless-session-sources.md)
- [Protected research-only startup evidence](evidence/2026-09-06-protected-judge-startup.md)
- [C6 residuals](c6-residual-review.md)
- [C7 completion criteria](c7-completion-and-acceptance-plan.md)
- [Repository recovery and validation](repo-hygiene-recovery-2026-09-06.md)
- [Archived handoff chronology](handoff-history-2026-09-06.md)

Historical dates, counts, costs, and future-tense instructions remain in the linked
evidence for provenance. They do not supersede this pickup or grant authority for
another hosted action.
