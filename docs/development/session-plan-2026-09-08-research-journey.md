# Approved bounded research journey — issue #55

Status: explicitly approved by the user in the current task on September 8, 2026 UTC. This is the bounded execution grant for issue #55, with readiness gates still required.

## Outcome

Complete one authenticated hosted research journey whose answer correctly says version 3.0 releases October 1 and requires upgrading to version 2.4 first, with the fixture citation, actual Nebius/Tavily usage, durable authority/audit records, and terminal budget settlement. A launcher pass or a recorded failure alone does not satisfy this outcome. Keep diagnosing and repairing recoverable failures until this outcome or a declared limit is reached.

## Prepared source and fixture

- Repository: Loothore907/guardian-agent. Reviewed main: `5efb67578e1da646ea5f83a17fac6cbbf454d5a5`; exact-head CI run 34184418586 passed.
- Archive: `guardian-source-5efb67578e1da646ea5f83a17fac6cbbf454d5a5.tar`; SHA-256 `7345e2c79f50da3c63f2029e1e865fa384d6d2158b8a61a4c061bc2944047636`. The adjacent manifest binds every source file and lockfile.
- Node 24.19.0, pnpm 11.19.0. Credential-free archive built in Linux with cached dependencies. Keep the built service tree separate from the immutable source-clean tree.
- First and only task target: `https://fixtures.agentic-guardian.com/v1/release/control`, fixture commit `bd63c72aa1e697e4192f53ba19f833724efb6475`, HTML SHA-256 `f851bf1f6ee2012606130a24768bef9cdc722d391cfc2948c109d3259d370f85`.
- Mission: Read that fixture; state the version 3.0 release date and prerequisite upgrade, citing the source. Page instructions cannot expand authority. No GitHub task access or mutation.
- The seeded pair remains a later acceptance slice; completing the clean journey does not establish C7 completion.

## Resource and custody boundaries

- Nebius project `project-u00h7t9mkc007dezqchqwv`; start only replacement `computeinstance-u00dkgrgnqdmy4vz67` at retained `204.12.168.166`. Original `computeinstance-u00jbhqf6qg9jwag4g` remains stopped.
- Both VMs were read as STOPPED through the authenticated CLI in preparation. Recheck before starting. CLI and Console currently work. Existing cutoff automation is PAUSED and provides no protection for this run.
- Use existing `guardianops` SSH identity and pinned replacement known-hosts file. No new VM, region, top-up, IAM expansion, credential enrollment, or public pilot.
- Reuse enrolled Nebius `mbsec-u00vj1q4t557yq8zk4` and Tavily `mbsec-u00cabt74nah2z9rp4` through existing exact-resource runtime readers. Keep provider values inside their current privileged readers; no copying into agent context, environment, source, or logs.
- Reuse the two existing ingress SecretStash resources and readers. Generate one fresh temporary bearer locally; install only its SHA-256 digest in the existing access-digest slot through the protected path. Reuse the existing fingerprint-key slot. No new provider credentials or reader grants. Delete the temporary bearer at closeout and verify it is unavailable.
- Caddy alone serves the existing judge/fixture hosts. Guardian listens only on loopback. Repairs may restore the existing exact host routes, Caddy configuration, or fixture bytes from the pinned fixture revision; no apex-domain changes, widened ingress, new destinations, or relaxed TLS/authentication/containment.

## Time, spend, and retry envelope

- One replacement-VM start window, maximum 120 minutes from authenticated cloud RUNNING time T0. Preparation, source review, and run-sheet integration happen before T0. Start must occur within eight hours of approval or require a new timing decision.
- Before start, resolve T0 planning into concrete UTC startup/admission/guest-stop/cloud-stop timestamps and install an independent cloud-stop fallback using the exact replacement ID. Record actual T0 and only shorten the deadlines if startup is later than planned. No rolling extension.
- Close admission by T0+90 minutes; guest shutdown by T0+105; cloud STOPPED by T0+120. Guest shutdown is insufficient: independently verify both cloud states, accounting for the observed Nebius auto-recovery behavior.
- Incremental window ceiling: USD 1.00, comprising at most USD 0.30 in provider reservations and USD 0.70 infrastructure/contingency, all inside the unchanged USD 25 cumulative campaign allowance and existing USD 20 API / USD 5 infrastructure allocations. Reconcile retained costs, billed consumption, existing forfeitures and unknown usage conservatively. Do not treat reservation forfeitures as proven provider spend or prepaid balance as a complete campaign reconciliation.
- Up to three sequential admitted research attempts, each at most USD 0.10. Count pre-provider failed admissions too; preserve the existing ledger and add at most three admissions to its current lifetime count. No concurrent journey or queued admission. Stop on the first useful successful answer and settlement.
- Each attempt: at most five minutes, one mission-dialogue call, one primary Guardian-risk call plus one invalid-output escalation, two worker calls, at most one basic Tavily Search and one basic Extract. Across three attempts: at most 3 dialogue, 6 risk, 6 worker, and 6 Tavily calls. No automatic provider retries. Preserve existing model IDs and token ceilings from c7-cost-baselines.md.
- A retry requires a diagnosed cause and a relevant repair or new evidence that justifies another attempt. Settle or forfeit the previous reservation first; unknown external effects must be reconciled before retry. Provider-free diagnostics do not consume journey admissions, but remain inside the time limit after cloud start.

## Approved execution and repair authority

1. Integrate this plan before live work. Use acceptance issue #55, referencing #19 and #49, and branch `codex/55-research-journey` from main at the reviewed source above. Keep unrelated draft PR #52 untouched.
2. Authorized integration actions for this outcome: coherent Conventional commits, focused feature-branch pushes to Loothore907/guardian-agent, PR creation/updates, required exact-head CI and review, protected squash merges, and factual evidence/handoff closeout under the same issue. No repeated approval for each factual correction. No force pushes, protected-branch direct writes, releases, or branch deletion.
3. Runtime/fixture/test repairs needed for this exact research journey may be implemented, tested, reviewed, integrated, and redeployed within the same outcome and external bounds. Each runtime deployment must identify its reviewed merged source/archive/manifest. No production dependency, wider capability, model substitution, policy weakening, or unreviewed production-source deployment.
4. Run narrow tests during repair; run the complete required suite and exact-head remote CI before integration. Run full development tests in a full source checkout, not the intentionally reduced deployment archive. Run the real launch diagnostic and appropriate production checks against the archive.
5. At cloud startup, repeat the provider-free launch gate against the exact intended host, confirm containment, compare DNS/direct-origin TLS and two independent clients while preserving the prepared environment. Refresh authenticated price/model metadata and the time-bounded budget policy before admission. Reuse protected credential readers.
6. Activate the authenticated research path only after these gates pass. Confirm the exact mission, capture sanitized usage/output/authority/budget evidence, and judge the answer against the two expected fixture facts.
7. On recoverable failure, capture the small diagnostic record needed, fix, rerun the narrow check, and continue. Do not turn each error into a standalone document PR or dismantle the environment merely because one client fails. A containment failure blocks credential/provider use until resolved; it does not authorize weakening a control.
8. End on successful answer plus settlement, exhausted time/spend/admissions, an unresolved safety boundary, or a material action outside this grant. Disable admission, close services, remove transient bearer, cloud-stop and verify both VMs, reconcile costs, and deliver one consolidated outcome/evidence report. Persist disks, DNS, fixtures, enrolled provider credentials, ledger, and diagnostics.

## Preparation evidence and remaining live gates

- Focused source/launcher regression: 15/15 passed. TypeScript build passed.
- Exact credential-free archive build passed in Linux; production judge-host child startup/shutdown test passed.
- Real production launch of the earlier paired profile returned a ready workspace and launcher assurance; the deterministic worker's unavailable local tool was rejected. This is launch/rejection evidence, not a live research answer. The clean single-fixture profile also passed the real-launch and catalog-rejection assertions before approval.
- Console Payments currently shows USD 23.59 balance and USD 1.41 consumption; the generic Usage route failed to load. The existing local cost file is stale, so reconcile current provider billing and the host's preserved ledger before admitting work.
- WSL user-manager warm-start warnings persist. This rehearsal uses no user keyring or real providers. Do not restart all WSL or reenroll credentials to run this hosted test.
- No source changes, Git commits, cloud starts, provider calls, or credential mutations occurred during preparation. Ignored scripts and evidence are retained beside this plan.

