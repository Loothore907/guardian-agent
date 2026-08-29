# Architecture

## Purpose

Guardian Agent mediates between an untrusted interaction agent and privileged service operations. It protects both credential confidentiality and the use of credential-derived authority.

## Trust zones

1. **Untrusted interaction zone** - user-facing agents, prompts, retrieved documents, webpages, and caller-provided rationale.
2. **Deterministic mediation zone** - schemas, normalization, canonicalization, policy, capability scope, replay checks, and minimum authorization level.
3. **Contextual judgment zone** - a constrained guardian model that receives minimized, credential-free context and may recommend escalation.
4. **Authorization zone** - approval presentation, user-presence evidence, exact-request binding, expiry, and revocation.
5. **Privileged execution zone** - credential resolution, typed adapters, final validation, execution, response sanitization, and audit emission.

## Proposed flow

1. An authenticated caller submits a typed action proposal with an intent summary.
2. The system validates the schema and normalizes all security-relevant fields.
3. Deterministic policy computes an allow, deny, or minimum authorization floor.
4. The guardian provider receives a minimized, credential-free risk envelope.
5. The guardian returns constrained structured output. Policy may preserve or increase the floor but never reduce it.
6. If required, the user sees a consequence-oriented approval prompt bound to the exact canonical request.
7. The broker independently revalidates, re-normalizes, recomputes the digest, and checks scope, caller, expiry, nonce, and policy version.
8. A typed adapter performs the exact approved operation using a credential unavailable to the interaction and guardian zones.
9. The broker sanitizes the result and emits an audit record that contains evidence but no credential material.

## Dependency direction

The exact package layout is deferred to an implementation ADR. The intended dependency direction is:

```text
contracts <- policy <- application orchestration
contracts <- guardian provider <- application orchestration
contracts <- adapters <- privileged broker <- application orchestration
contracts <- audit
```

The guardian provider must not import credential resolution or privileged adapter internals. Adapters must not interpret user prompts or model output.

## Competition implementation

The competition build will prove a single vertical slice:

- routine read under a scoped session grant;
- a merge-like privileged action requiring exact confirmation;
- malicious retrieved content attempting to expose a secret or expand scope;
- post-approval argument mutation and replay rejection; and
- an audit view showing policy, guardian classification, approval, digest, and sanitized outcome.

Tavily may supply external content to the untrusted interaction/demo layer. It is not part of the policy, authorization, or credential boundary.

## Open decisions

- implementation language and workspace layout;
- canonical serialization format and compatibility policy;
- local IPC mechanism;
- approval interface and development-mode user-presence substitute;
- audit persistence format;
- selected NVIDIA open model and Token Factory endpoint; and
- public demo hosting approach.
