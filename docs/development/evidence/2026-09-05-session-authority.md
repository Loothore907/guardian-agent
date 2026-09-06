# Session-authority runtime evidence — 2026-09-05

Follow-up: the [launch/headless slice](2026-09-05-launch-headless.md) implements the local integration described below as next work. This record preserves the earlier checkpoint.

Scope: local implementation under the [approved session plan](../session-plan-2026-09-05-session-authority.md).
No credentials, provider calls, GitHub effects, host updates or remote writes are
part of these tests. Existing uncommitted W27/W28 work is preserved.

## Implemented behavior

- Strict plan schema and domain-separated canonical plan digest; immutable exact
  GitHub target selectors and explicit session/time/action/mutation bindings.
- SQLite schema 5, versioned grants, revocation, conservative attempt accounting,
  replay protection and bounded durable proposals. Older schemas migrate forward.
- Role-scoped IPC and trusted development issuer methods: `issueSessionPlan`,
  `getSessionPlan`, `getPendingPlanRequests`, `revokeSessionPlan`.
- Mandatory broker membership checks with no exact-approval fallback for an
  invalid existing plan, final checks after credential lookup, repeated merge
  preflight, and preserved deterministic/model risk floors.

## Reproduce

Run `pnpm check` on the pinned Node 24.19.0 / pnpm 11.19.0 toolchain.
Focused tests:

```sh
node node_modules/vitest/vitest.mjs run packages/broker/src/index.test.ts packages/authority-store/src/index.test.ts apps/authority-service/src/index.test.ts apps/reference-supervisor/src/index.test.ts
```

The broker tests advance an injected clock by two hours after one confirmation;
they do not claim a two-hour wall-clock provider soak. They cover in-plan read and
merge without an exact approval, replay/new-ID retry, concurrent merge attempts,
revocation at both credential callbacks, expiry during credential lookup, changed
base preconditions, policy/caller/mission/profile changes, stale grant replacement,
Guardian escalation, pending bounds and persistence, and interrupted-session denial.
Supervisor tests cross real child-process authority IPC for confirmation,
inspection, revocation and pending review. Authority-service tests reject plan
control for non-authorization roles even when configuration tries to grant it.

## Validation results

| Gate | Result |
| --- | --- |
| Windows `pnpm check` | Passed: 555 Vitest tests / 18 skipped; SQLite 7 / 1 skipped; reset 2; keyring preflight 6; synthetic GitHub harness 5; format, lint, types, build |
| Linux `pnpm check` | Passed: 567 Vitest tests / 6 skipped; SQLite 8; reset 2; keyring preflight 6; synthetic GitHub harness 5; format, lint, types, build |
| Dependency boundaries, both platforms | Passed: 209 modules / 453 dependencies |
| Linux native platform checks | 2 passed: IPC/SQLite permissions and broad-permission/symlink rejection |
| Windows/WSL reference runtime | 1 passed: production reference executor C4 isolation probe |
| Windows/WSL session-enforcement spike | 4 passed: alternate-tool, credential absence, filesystem/network/Git boundary probes |

Windows logs are in ignored `tmp/session-authority-*.log`. Linux validation used
`/home/loothore907/guardian-w27-session-20260904`, with its logs under `tmp/`.
The source-only manifest covers 309 inputs; its SHA-256 is
`6d7b4aebe3b1220a94b8dd78af209463b951bc3c60ae78739c2a493a0133d691`.
No dependency was added by this slice, so the earlier dependency audit was not
repeated. These suites do not use real provider credentials or perform GitHub
operations. An initial formatting failure was corrected before both full suites
passed. The WSL warm-start user-session warning recurred between runs; passing
offline tests does not establish user-manager or keyring lifecycle reliability.

## Limits and next gates

[ADR-0048](../../adr/0048-typed-session-plan-runtime.md) defines the precise scope.
This is development confirmation, not WebAuthn assurance or production identity.
The grant has no raw secret and does not unlock a keyring. It is exposed to trusted
application code, not yet wired into the production launch/judge UI. Generalized
worker continuation and derived future Git references remain unimplemented.
GitHub guards the expected head SHA; base/open/draft checks remain preflight
observations, with no claimed atomic remote base-branch protection.

Next integrate the launch preview with the grant, then headless judge session
startup with isolated workload identity, SecretStash resolution and provider-token
renewal. Validate unattended runs on the intended Linux host with revocation,
expiry, outage and restart cases before deployment. Keep the WSL update/recovery
track separate and open; no new hosted-readiness or Enforced claim follows here.
