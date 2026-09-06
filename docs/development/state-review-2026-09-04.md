# State review, WSL assessment, and next steps

Reviewed 2026-09-04 (AKDT). This is the current planning entry point. It reconciles
the repository and recorded evidence; it does not claim a fresh protected run or
authorize remote writes, paid calls, enrollment, host changes, or a merge.

Latest execution: [fresh WSL samples, verification, and remote state](evidence/2026-09-04-session-readiness.md).
Three approved restart samples produced two status-219 failures; a later held
session and native unlock passed. Full Windows/Linux gates, native probes,
reference-runtime/bypass tests, and a fresh production audit passed. Linux GitHub
enrollment, exact-head PR 3 read, and separately approved squash merge passed.
[Merge record](w28-exact-merge-review.md): `5d78d261e024d9e93e59c30368c7c9797c765a2c`.
Next: [C6 residual and integration review](c6-residual-review.md). This supersedes the earlier
review-only test and host-access snapshots below.

## General state

The checked branch is `codex/13-c6-linux-provider-containment` at `e5b1217`.
Discovery fixes, W27 peer transport, W28 harness, session helpers, and associated
documentation remain modified/untracked. Preserve this work before integration;
the branch HEAD alone does not identify the tested source. The September 4
documentation review changes documentation only.

| Area | Evidence-backed state | Remaining gate |
| --- | --- | --- |
| C0–C5 foundation | Roadmap records passed checkpoints | Preserve regression coverage |
| W27 Linux provider IPC | Seven protocols have tested peer admission/listener authentication | Broader intended-host containment and bypass corpus |
| Linux Nebius custody | Accepted enrollment and protected Qwen/Nemotron use passed; post-W27 recovery run took 6.3 seconds | Session reliability and wider containment, not repeated enrollment |
| W28 GitHub composition | Synthetic cases and real Linux enrollment/read/approved squash merge pass | Narrow gate complete; broader C6 remains |
| Disposable PR 3 | Merged as `5d78d261e024d9e93e59c30368c7c9797c765a2c` | Historical fixture; do not rerun |
| Linux GitHub connection | User-operated enrollment and sanitized `available`; read/merge passed | Preserve enrollment; ordinary expiry/refresh limits remain |
| Windows IPC timing | Real-clock timestamps differed by 2–10 ms; strict freshness rejection retained | Dedicated diagnosis and regression evidence; fixed-clock tests do not close it |
| C6/C7 | In progress | C6 residual disposition, then C7 worker dispatch/evaluation |
| Hosted judge | Local budget/ingress work exists; deployment paused | Protected startup, host inspection, pricing/calibration, funding and deployment |

The prior closeout records Windows 534 / Linux 546 Vitest cases, six preflight
cases and five supervised GitHub cases per platform, SQLite/reset checks,
207-module/446-edge boundaries, builds, and Linux native probes. These are
historical run results, not tests rerun by this documentation review. The subsequent execution record verifies fresh Windows/Linux suites and a passing
production audit. Issue 13/PR 17 remain open; the latest PR 17 run still failed
its audit step. Current local source has no remote CI result.

Sources: [closeout](session-closeout-2026-09-04.md),
[W27 evidence](evidence/w27-linux-provider-ipc-containment.md),
[W28 evidence](evidence/w28-supervised-github-harness.md),
[protected recovery](protected-c6-ceremonies-2026-09-04.md), and
[security claims](../security-claims.md). Broad Linux Enforced parity remains a
goal; narrow IPC and provider successes do not establish it.

## WSL assessment

Subsequent [cgroup diagnosis](evidence/2026-09-04-wsl-cgroup-diagnosis.md) found
EBUSY attachment failures after distribution-only restarts with an unchanged VM
boot ID. Three full-VM cold starts passed; native unlock and existing GitHub/Nebius
status passed in a cold-started held session. Follow the
[operational recovery procedure](wsl-session-recovery.md). The observations below
retain the earlier review context; the root-cause attribution remains qualified.

Treat these as separate layers, in this order:

1. **User manager and bus:** `user@1000.service` previously failed with
   `219/CGROUP`; a targeted reset/start restored the bus. The root cause and
   persistence across restarts are unproved.
2. **Prompt routing:** WSLg display variables existed in the shell but were absent
   from activation routing. Importing only `DISPLAY` and `WAYLAND_DISPLAY` was
   followed by native prompt completion and unlocked collection metadata.
3. **Collection lock state:** readiness of a bus or display does not unlock a
   keyring. Native user unlock may be required after a fresh session.
4. **Provider enrollment:** even after unlock, GitHub was missing. The resulting
   broker denial is not evidence that the unlock failed or Nebius needs repair.

Fresh read-only host metadata: WSL 2.6.1.0, kernel 6.6.87.2-1, WSLg 1.0.66,
Windows 10.0.26200.9168. `wsl --list --verbose` returned
`Wsl/EnumerateDistros/Service/E_ACCESSDENIED` in this agent context. Therefore
current distribution, user-manager, display, and keyring readiness were not
established here. This access error is separate from the historical CGROUP fault.

Microsoft's [systemd guidance](https://learn.microsoft.com/en-us/windows/wsl/systemd)
confirms that systemd services do not keep a WSL instance alive. The reported
[WSL issue 13188](https://github.com/microsoft/WSL/issues/13188) concerns a second
instance's systemd user session; similarity is a diagnostic lead, not attribution
of this machine's failure or evidence that a particular update fixes it.

### Working-session mitigation

From the normal-user WSL terminal and the verified source stage, use:

```sh
sh scripts/linux-credential-session.sh --hold 1800
```

Keep that terminal open while using another for the ceremony. The helper checks
the manager and bus socket, validates fixed local WSLg routing, imports only the
two display variables, and holds a foreground process for at most 30 minutes.
It checks manager PID/activity and bus-socket existence every five seconds. It
does not verify bus identity, detect every transient restart, supervise another
terminal's protected process, unlock the collection, or validate enrollment.
Even `--check` imports display routing; it is not a purely read-only diagnostic.
Expiry or a detected session change requires the operator to recheck readiness
before further protected work. Per-operation preflight remains necessary.

### Evidence required before calling session usability resolved

- Capture sanitized WSL/distribution/systemd versions and targeted manager error
  metadata in the intended user context. Record whether other distributions were
  active when the fault occurred; do not dump whole environments or secret data.
- After an agreed clean-start window, record manager/bus readiness, local prompt
  visibility confirmed by the operator, unlock completion, and sanitized status.
- Repeat across at least three clean starts as a proposed acceptance sample.
  Include hold expiry and planned session-restart recovery with no protected
  operation in flight. Record failures as well as successes. Three successes
  support usability of this configuration, not a universal WSL guarantee.
- Verify stale sessions fail closed, retained source matches the intended build,
  and no credential re-enrollment is needed merely because the keyring relocked.
- If the fault recurs, use captured evidence to choose a bounded host repair or a
  dedicated Linux validation environment. Do not prescribe a WSL update, PAM
  change, linger configuration, or restart as a proven permanent fix today.

Recommendation: retain the bounded helper for local ceremonies while gathering
lifecycle evidence. WSL debugging should remain a named host-readiness task;
the dedicated Linux judge host will require its own custody/startup evidence.

## Original sequence and completion criteria

Steps 2–3 subsequently passed, including exact separate merge approval. Step 1
reproduced restart failure and validated only a held session. Fresh checks and
remote inspection under step 5 passed as recorded; source integration is pending.
Use the [C6 residual review](c6-residual-review.md) for remaining work.

1. **WSL readiness:** complete the diagnostic and lifecycle record above. A
   restart/system change needs a scheduled, explicitly authorized interruption.
2. **Linux GitHub:** user completes the accepted App enrollment. Revalidate PR 3,
   its repository, base, exact head, and one-line diff; capture one successful
   broker read. Stop on changed state or sanitized failure. Commands and IDs are
   in the [W28 handoff](w28-github-handoff.md).
3. **Exact GitHub effect:** only after the read succeeds, prepare the concrete
   exact-head squash request for approval. Record outcome, audit and cleanup.
   Fixture-creation approval has already been used; it is not merge authority.
4. **C6 evidence closure:** map every residual exit criterion to a reproducible
   test or explicit limitation. Complete intended-host process/credential/artifact
   inspection and direct-network, credential-path, alternate-tool and Git-push
   bypass evidence. Update claims and the roadmap from outcomes. Keep Windows
   timing as a separately tracked defect; do not weaken freshness checks to pass.
5. **Source integration:** review the existing diff in logical slices (discovery
   fixes, W27, W28/session helpers, documentation), then run the complete required
   suite and native Linux gates against the exact candidate source. Verify the
   dependency audit and remote PR relationship. Prepare bounded commit/push/PR
   scope for approval under AGENTS.md; this review makes no such writes.
6. **C7 onward:** finish worker-generated research/GitHub dispatch and polluted-
   content evaluation, then C8 WebAuthn/full coordinator and later UX/demo gates.
   Return to hosted judge work through its existing ADR-0045/0046 plan once the
   core path is ready. Deployment and competition deadlines must be revalidated
   against current official rules at the release checkpoint.

## Documentation maintenance

`handoff.md` is the concise current pointer; its lower sections are explicitly
historical. W28 owns exact operator commands, evidence files own executed results,
`security-claims.md` owns claim status, and `roadmap.md` owns checkpoint state.
After each protected gate, update those current summaries together and retain
attempt history in evidence. Record source identity, platform, command, sanitized
outcome, remaining limitations, and any remote target change. Do not append a
second competing pickup section.
