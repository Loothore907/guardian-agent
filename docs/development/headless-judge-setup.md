# Headless judge deployment preparation

For current cloud state, enrolled secret IDs, source identity and execution order,
use the [KC handoff](c7-kc-hosted-acceptance-handoff.md). Both VMs are stopped;
Nebius/Tavily copies are enrolled, while runtime verification and GitHub App
setup remain pending. The sections below describe composition requirements.

Local implementation: [ADR-0049](../adr/0049-launch-and-headless-session-authority.md).
This is the next deployment scope to make concrete, not a claim that judging is hosted.

The C7 portal runtime is now available as explicit trusted composition through
`buildRuntimeJudgePortal` in `scripts/headless-judge-host.mjs`; see
[ADR-0051](../adr/0051-bounded-worker-portal-runtime.md) and
[local evidence](evidence/2026-09-05-c7-runtime.md). Construct it with the actual
durable budget controller, deployment ID, private fixture root, exact provisioned
mutation scopes and read-only scenario scopes. Pass the returned portal to
`buildHeadlessJudgeHost`. No scenarios or provider sessions are enabled by default.

Runtime options bind the immutable project root, private state root outside the
project, principal, credential-store descriptors and one exact repository connection.
`seededAuthorization` must resolve previously approved standing consent for the
specific scenario and fixture; HTTP callers cannot supply it. Continuation consent
must include `workerProfileDigest` matching the preview constraints, tool catalog
and turn limit in addition to existing scope/snapshot digests. Public-only missions
bind a null GitHub plan digest. The full five-minute mission must fit the consent's
remaining expiry; an old consent cannot silently become a shorter or renewed grant.

Both seeded and piloted mutations consume a persistent exact fixture reservation
before preview. Cancelled or uncertain sessions do not release it automatically.
The integration tests use synthetic transports/budget inputs; acceptance still
requires actual budget-service reporting and settlement, provider children, host
isolation and repeated independent runs under the exact resource plan below.

1. Confirm the existing Nebius/domain hosting decision's exact project, VM, region,
   resource limits, domain/TLS configuration and spend cap. Prepare a reviewed
   provisioning plan before any paid or external change.
2. Provision a dedicated judge GitHub App installation on the disposable demo
   repository, with contents/pull-requests write. Store the private key under
   `github_app_private_key` and JSON installation metadata under
   `github_installation_metadata` in SecretStash. Metadata is schemaVersion 1,
   decimal-string appId/installationId, positive repositoryId, lowercase owner and
   repository. Register only the broker's two GitHub resources. Register separate
   Nebius/Tavily slots with their provider consumers; never pass keys in HTTP or argv.
3. Attach the dedicated VM service account with access only to the required secret
   resources. Verify the fixed noninteractive CLI read under the actual isolated
   service identities. Check that interaction/worker processes cannot reach the
   metadata token or other services' SecretStash resources. Local synthetic tests
   do not establish this hosted IAM/process boundary.
4. Prepare an immutable sanitized project snapshot and a private persistent state
   root outside it. Configure the exact fixed objective, merge target/head/base,
   research fixture and limits. Create standing authorization digests from that
   preview, with operator identity, deployment ID, original consent time and expiry.
   Do not regenerate consent at each HTTP request. Changes to the snapshot, target,
   permissions or expiry require a new authorization.
5. Compose `buildHeadlessJudgeHost` from `scripts/headless-judge-host.mjs` with the
   real durable budget controller, ingress secret material, approved hostname and
   trusted execution config. Bind loopback behind the existing authenticated TLS
   ingress design. The script is a host factory, not a command that provisions or
   listens automatically. The default `start:control-api` does not enable judging.
6. Test a cold boot and an unattended authenticated journey on the actual VM,
   including expired/invalid credentials, exhausted budget, revocation, cancellation,
   process failure, wrong head/base and forbidden source-repository mutation.
   Reconcile redacted audit evidence and publish only after those checks pass.

A fixed merged PR cannot be merged again for later judges. Preparing the next exact
fixture/head and authorizing it is a separate operator action; automatic resetting
or expansion is not implemented. This remains a deployment readiness requirement.

For the piloted competition CLI, configure `GUARDIAN_COMPETITION_BASE_BRANCH` along
with the existing repository, PR and expected head settings. The initial preview
now contains that exact action plan. The standalone legacy exact-approval CLI API
still exists, but the competition command does not ask a second time mid-session.

Longer production missions need a separately reviewed duration/volume profile and
hosted longevity evidence. This slice does not change the five-minute competition
mission into a two-hour mission. Revocation/expiry stops execution; no silent renewal
of the user's authority is permitted. Token renewal within valid authority is allowed.
