# ADR-0029: End-to-end architectural validation before feature expansion

- Status: Accepted
- Date: 2026-09-02

## Context

Guardian now has locally tested mission formation, worker, workspace, authority,
research, Guardian-risk, broker, adapter, supervision, and exact-confirmation
components. The complete controlled journey is not yet reachable from the
executable CLI, and the assembled path has not been exercised across every live
model and provider boundary.

Continuing to add isolated components would increase integration risk without
testing the assumptions between them. Treating the next slice only as a race to a
competition demo would create a different risk: optimizing around one scripted
happy path before the architecture has encountered real model behavior, provider
failure, latency, hostile public content, and a privileged external effect.

Live model cooperation also cannot establish an enforcement property. Models and
retrieved content remain untrusted even when a live run behaves exactly as hoped.

## Decision

The next architectural gate is one complete vertical journey through the real
executable surface. Its primary purpose is architectural validation and learning;
competition readiness is a later hardening outcome.

Validation proceeds in controlled stages:

1. Make the fixed journey executable with deterministic and fake providers.
2. Introduce live Qwen mission dialogue and the native worker separately, while
   preserving strict schemas, bounded contexts, and fail-closed behavior.
3. Introduce live Tavily research, including controlled hostile public content,
   while treating all retrieved material as untrusted data without authority.
4. Introduce live Nemotron action-risk evaluation through the credential-free
   Guardian boundary and verify that it cannot reduce the deterministic floor.
5. Run the assembled live path without a privileged external effect.
6. Only after the earlier gates pass, perform one exact effect against the
   dedicated disposable GitHub target.
7. Exercise malformed output, unavailability, timeout, denial, mutation, replay,
   expiry, binding mismatch, changed resource version, and trusted-process failure
   at their applicable boundaries.
8. Inspect minimized public results, durable authority state, audit evidence, and
   process surfaces for credential or private-content exposure.

Every live boundary test must state the assumption under test, the deterministic
control that remains authoritative, the expected failure behavior, and the
evidence captured. Successful live behavior is compatibility evidence only.
Enforcement claims continue to require reproducible deterministic and runtime
evidence recorded in `docs/security-claims.md`.

If the journey contradicts an architectural assumption, work stops at that
boundary long enough to record the finding, correct the design and tests, and
re-run the affected earlier stages. The implementation must not patch around a
failed assumption merely to preserve the scripted journey.

The fixed journey is a validation instrument, not the permanent limit of the
product. After it is stable, findings are triaged into three lanes:

- **Validated core**: controls supported by integrated evidence.
- **Design corrections**: assumptions or boundaries that require revision.
- **Expansion candidates**: additional typed capabilities, research behavior,
  worker lifecycle, integrations, and product experience.

Expansion candidates may enter the active roadmap only through the existing
boundary, evidence, and schedule gates. Schedule buffer may support feature
expansion after the required path is stable; it does not weaken higher-priority
security outcomes or convert speculative breadth into a claim.

## Consequences

- The current session prioritizes an executable deterministic journey, then live
  boundary validation in increasing order of side-effect risk.
- Competition demo hardening, deployment, recording, and submission remain
  distinct later work rather than the definition of this architectural gate.
- The generalized bounded multi-turn worker loop remains deferred while the fixed
  journey tests the existing contracts.
- Live-model or provider failures may legitimately cause contract, orchestration,
  or experience changes before feature expansion resumes.
- A successful disposable GitHub merge is necessary evidence for the narrow path,
  but is insufficient by itself to label a runtime `Enforced`.
