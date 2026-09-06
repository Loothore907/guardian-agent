# ADR-0049: Launch-bound plans and headless judge execution

Status: Accepted for local implementation, 2026-09-05. Hosted validation pending.

## Decision

The first piloted launch preview contains the exact GitHub repository, pull request,
head commit, base branch, squash operation and attempt limits. Its digest binds that
intent. Guardian stores the resulting session grant before the worker runs; failure
interrupts startup. Competition execution consumes this grant without a second
manual prompt. Existing risk escalation, expiry, revocation and final resource checks
remain mandatory. Returned previews are copies of internal state.

A judge trigger uses a separate, trusted standing deployment authorization. It binds
an operator identity, original consent time, expiry, objective, mission permissions,
workspace snapshot and exact plan intent. Bootstrap checks these against the current
preview and binds the trigger to its session ID. The durable grant labels this
`deployment_authorization`; it does not invent a fresh human confirmation. This is
trusted host configuration, not a signed remote authorization protocol. An HTTP
request cannot install or modify it. Configuration and the issuer remain trusted.

`HeadlessJudgeSessionExecutor` accepts only the configured objective and exact one-
merge workflow. It requires managed judge custody, checks budget reporter bindings,
uses unique state directories, rejects concurrent/replayed IDs and closes services
on cancellation. `scripts/headless-judge-host.mjs` composes it with the existing
credential-authenticated ingress and durable-budget coordinator. This factory does
not listen or provision resources. The default control API remains unchanged.

The headless capability lasts at most ten minutes to cover initialization; the
competition mission still allows only five minutes of execution. Standing consent
must cover both. This demonstration profile does not yet supply a two-hour worker
mission, even though grant/token tests simulate two hours. It has no automatic
mutation retry, fixture reset, queue drain or recovery that renews authority.

For managed GitHub operations the broker reads an App private key and explicit
installation/repository metadata through read-only SecretStash callbacks. It signs
an RS256 JWT and mints a fresh installation token for each credential callback, using
a fixed GitHub endpoint, one repository ID, and contents/pull-requests write
permissions. The response must match that scope and a bounded expiry. Failed minting
stops execution; there is no desktop prompt or OAuth fallback. Existing BYOK OAuth
behavior remains separate. Multiline data is accepted only as a strict PEM private
key in the dedicated slot. Neither key nor token is an agent result.

Native Linux now invokes the same unshare/chroot/capability-drop executor directly.
Windows continues through WSL. Managed service environments do not inherit the
operator desktop bus or environment secrets. The worker sandbox hides the host
`/mnt`, including cloud metadata. A VM-attached service account and least-privilege
SecretStash IAM still need hosted verification and provider process isolation review.

## Evidence and limits

See [validation record](../development/evidence/2026-09-05-launch-headless.md).
No new production dependency, hosted deployment, real token mint, merge or credential
migration is part of this slice. WSL warm-restart EBUSY remains unresolved. Native
Linux execution tested in a WSL guest is not evidence of Nebius VM readiness.

GitHub supports short-lived installation tokens with explicit repository and
permission narrowing; the resolver accommodates variable-length tokens:
[installation access tokens](https://docs.github.com/en/rest/apps/apps),
[App JWT requirements](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app).
Nebius documents VM-attached service-account authentication and its metadata token:
[CLI on compute VMs](https://docs.nebius.com/cli/compute-vm).
