# C6 containment session plan — September 4

Status: Local implementation, verification, and protected-gate preparation complete.
Base: `e5b1217` on `codex/13-c6-linux-provider-containment`, preserving the
uncommitted discovery fixes listed in the discovery review.

## Ordered work and acceptance

1. Preserve the reviewed worktree. Reuse the existing Linux peer-identity package
   and native helper; add no third-party production dependency.
2. Implement a shared fail-closed local service transport for interaction,
   mission review, Guardian setup/action risk, worker, research, and broker IPC.
   On Linux require kernel PID/UID/GID and supervised ancestry before protocol
   parsing; restrict socket ownership/mode, reject occupied or substituted paths,
   and close pending connections during shutdown. Existing capability, session,
   exact-request, expiry, and replay checks remain mandatory.
3. Add deterministic and native Linux evidence: allowed supervised calls,
   unrelated process with a valid capability, wrong identity, missing helper,
   unsafe socket paths, malformed/early disconnects, failure sanitization, and
   shutdown. Preserve Windows behavior and run the complete ordinary suites on
   Windows and clean ext4 Linux, plus native Linux platform probes.
4. Record the decision, current evidence, residual limitations, and reproducible
   commands in the ADR, claims, roadmap, and handoff. Neither a passing unit suite
   nor a successful authentication call automatically closes C6 or grants Enforced.
5. Prepare a reviewable protected Nebius check using existing enrollment and the
   exact Linux GitHub read/merge ceremony. Identify exact targets, bounded calls,
   operator steps, expected effects, and cleanup before protected execution.

## Authority and boundaries

This session covers local edits, fixtures, builds, tests, disposable offline Linux
staging/cleanup, documentation, and read-only remote inspection. It does not
authorize new or rotated credentials, paid provider calls, GitHub mutation,
commits, pushes, PR/issue writes, merges, releases, hosting, or deployment. Those
actions require a concrete bounded review under the repository working agreement.
Prepare the relevant artifacts before requesting that authority.

C7 worker dispatch/evaluation, C8 WebAuthn and the full coordinator, persistent
plan-grant implementation, and hosted judge startup remain subsequent bounded
slices. This session finishes the shared IPC implementation and local evidence
needed to make the protected C6 gates meaningful.

## Completion record

Steps 1–4 are complete. Seven protocols now share bidirectional Linux peer
verification, and eight new native adversarial/lifecycle tests pass. The complete
Windows gate passed 534 Vitest tests; Linux passed 546 plus both native platform
probes. Both passed format, lint, typecheck, SQLite/reset tests, dependency
boundaries, and production build. See [W27 evidence](evidence/w27-linux-provider-ipc-containment.md).

Step 5 is prepared in [the protected ceremony scope](protected-c6-ceremonies-2026-09-04.md).
The user subsequently approved the bounded Nebius run. Its single attempt failed
closed during Qwen with `provider_unavailable` after about 15.2 seconds; Nemotron
was not started, and no retry was made. Follow-up checks found unstable WSL user
bus readiness and no remaining test-related processes. The cause is not proven.
The existing GitHub harness is Windows-specific and must be composed with the real
Linux services before requesting the exact remote effect. No remote mutation was
performed. C6 and C7 remain In progress; changes remain uncommitted.

Recovery follow-up: the user directed continued repair. The failed WSL user
manager was restarted, and the user unlocked the existing keyring in its native
prompt. A metadata-only readiness preflight and six regression cases were added.
The bounded protected Qwen/Nemotron retry passed in 6.3 seconds, and complete
Windows/Linux required checks passed again. No enrollment change was needed.
The post-change Nebius gate is now passed; Linux GitHub and broader containment
remain the next work. Details are in the protected ceremony record.
