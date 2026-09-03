# ADR-0031: Live-inventory-bound model policy v2

- Status: Accepted
- Date: 2026-09-02
- Supersedes: ADR-0015 only for the current native-worker model assignment

## Context

The first protected Qwen mission-dialogue call passed its strict contract. The
next staged boundary, the Nebius-native worker, failed closed with a sanitized
HTTP 404. A credential-isolated read of Nebius Token Factory's fixed `/v1/models`
endpoint then established that the version 1 worker assignment,
`Qwen/Qwen3-Coder-30B-A3B-Instruct`, was absent from the user account's current
catalog. The same inventory included `moonshotai/Kimi-K2.7-Code` as a coding and
agentic worker candidate.

The built-in policy registry also exposed a correctness gap: policy objects
contained an identifier and version, but lookup was keyed only by identifier.
Historical and current versions of the same policy identifier therefore could not
both be resolved exactly.

Provider catalogs are operational evidence, not authority. A session, prompt,
worker, provider response, or inventory result must not silently select a
replacement model or weaken exact confirmation.

## Decision

Preserve `competition-2026-09-01` version 1 as a historical built-in policy and
add version 2 as the current default. Version 2 changes only the native-worker
assignment to `moonshotai/Kimi-K2.7-Code`; the Qwen mission-dialogue and distinct
NVIDIA Nemotron risk assignments remain unchanged.

Built-in policy resolution is keyed by the exact `(policyId, version)` pair.
Unknown or unavailable pairs fail closed. A session binds and confirms the exact
worker assignment derived from the selected reviewed policy version.

The inventory probe remains a credential-isolated diagnostic and setup preflight.
It reports only bounded model identifiers and availability state. It cannot
modify a policy, create a session, grant a capability, select a runtime fallback,
or expose provider credentials or raw response content.

## Consequences

- Historical version 1 bindings remain reproducible and distinguishable from the
  current version 2 binding.
- Model-catalog drift causes a visible fail-closed result and a reviewed policy
  update rather than a silent runtime fallback.
- The protected native-worker test must pass against version 2 before strict JSON
  schema compatibility or working live-worker behavior is claimed.
- Provider enrollment should eventually include a low-friction compatibility
  preflight that distinguishes credential availability from required-model
  availability.
- Future model changes require a new policy version, contract tests, live
  inventory evidence, and a staged protected inference check.
