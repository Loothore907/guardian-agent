# Headless judge deployment preparation

For current cloud state, enrolled secret IDs, source identity and execution order,
use the [KC handoff](c7-kc-hosted-acceptance-handoff.md). Both VMs are stopped;
Nebius/Tavily copies are enrolled, while runtime verification and GitHub App
setup remain pending. The sections below describe composition requirements.

Local implementations:
[ADR-0049](../adr/0049-launch-and-headless-session-authority.md) covers the
mutation-capable headless authority path, while
[ADR-0055](../adr/0055-protected-research-judge-startup.md) covers the narrower
research-only production startup. Neither is a claim that judging is hosted.

Use `pnpm start:judge-host` for the protected production entry point. It accepts
one bounded strict JSON configuration on stdin and prints one exact readiness
line. `disabled` is the safe initial mode: it resolves no secrets, starts no
budget child, and exposes no judge route. `research_only` requires the exact
managed-demo Linux judge SecretStash resources, Nebius/Tavily credential
descriptors, matching budget service/client capabilities, absolute project and
external state roots, approved hostname, deployment/principal, and loopback port.
The bootstrap contains descriptors only, never secret values. The ordinary
`start:control-api` remains judge-disabled.

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
2. For the first research-only journey, register only the existing separate
   Nebius/Tavily judge slots and the two distinct ingress-secret resources with
   their fixed runtime readers; never pass values in HTTP, config, environment or
   argv. Defer the dedicated judge GitHub App and mutation targets to the later
   mutation gate.
3. Attach the dedicated VM service account with access only to the required secret
   resources. Verify the fixed noninteractive CLI read under the actual isolated
   service identities. Check that interaction/worker processes cannot reach the
   metadata token or other services' SecretStash resources. Local synthetic tests
   do not establish this hosted IAM/process boundary.
4. Generate the credential-free exact source bundle under repository `tmp` from
   the reviewed revision. On the host, place the immutable sanitized project root
   separately from the private persistent state root and bind the exact research
   fixture, model policy and limits. Do not add mutation targets or standing
   mutation consent to this gate.
5. Start `pnpm start:judge-host` first in `disabled` mode, then with the reviewed
   `research_only` descriptor after the runtime readers and budget window are
   ready. Keep its listener on `127.0.0.1` behind the existing authenticated TLS
   ingress design. Secret values come only from its fixed two-resource loader.
6. Test a cold boot and an unattended authenticated journey on the actual VM,
   including expired/invalid credentials, exhausted budget, revocation, cancellation,
   process failure and an attempted mutation or source-repository write.
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
