# Approved session-authority implementation plan

The user approved session-start authorization with unattended in-bounds execution
and human intervention only at an authority boundary. This plan executes that
contract locally without new third-party dependencies or remote effects.

1. Add strict immutable session-plan grants for the existing typed GitHub read
   and squash operations: exact repository/PR/head/base selectors, session/caller/
   mission/profile/policy/connection binding, explicit lifetime, action and mutation
   ceilings, and human confirmation evidence. Unknown operation classes stay denied.
2. Persist grants, usage, revocation and bounded pending requests in the sole
   authority SQLite service. Enforce role separation, replay protection and atomic
   count consumption. A revoked/expired/exhausted grant must never fall back to
   older exact-approval behavior. Existing sessions without a plan retain their
   existing behavior for compatibility.
3. Integrate the broker so a directly confirmed plan satisfies the existing
   deterministic confirmation floor for in-plan mutations. Preserve model
   escalation/uncertainty denial. Revalidate concrete request, grant and limits
   at execution, including after credential resolution. Keep out-of-plan proposals
   pending for review; they never mint authority or silently renew a grant.
4. Add trusted development confirmation/inspection/revocation entry points and
   exercise the full service composition. This issuer is still explicitly lower
   assurance than the later WebAuthn/user identity ceremony. Verify two-hour
   continuation using controlled clocks, near misses, mutation, expiry, revocation,
   concurrency, restart safety, replay and durable pending review.
5. Run focused tests, then complete ordinary Windows/Linux suites and native
   boundary checks. Reconcile ADR-0039, architecture, threat model, claims,
   roadmap and handoff with implemented behavior and exact limitations.

The broader unattended product also needs the actual headless judge startup,
isolated machine identity, SecretStash retrieval/renewal evidence, safe GitHub
installation-token lifecycle, and the native Linux coordinator. Those are separate
integration/provisioning gates; local grant success does not claim hosted readiness.
Existing WSL recovery and project credentials are preserved. No paid calls,
credential provisioning, host update, commits, pushes, PR writes, merge, release,
or deployment is authorized by this implementation plan. Prepare concrete remote
scope before requesting those actions under AGENTS.md.


## Execution status

Completed locally on 2026-09-05: items 1–5 for the exact GitHub-target slice.
[Evidence and limits](evidence/2026-09-05-session-authority.md) record the complete
Windows/Linux gates and native isolation probes. Source changes remain
uncommitted. The trusted API is available through the reference supervisor's
`authorizationIssuer`; launch UI and headless credential/session integration
remain the next slice, as scoped above. No existing project credential store,
remote repository or hosted deployment was changed.
