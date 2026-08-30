# Security Claims and Evidence

This file is the authority for public security language. A design description does not become a guarantee merely because it appears in documentation or code.

## Status definitions

- **Goal** - intended behavior without completed implementation evidence.
- **Implemented** - present in code but not yet backed by the complete required evidence.
- **Implemented and tested** - supported by reproducible tests identified here.
- **Not claimed** - deliberately excluded or unsupported.

## Claims matrix

| Property | Status | Required evidence | Current evidence |
| --- | --- | --- | --- |
| Public broker APIs do not return reusable provider credentials | Goal | Interface audit, negative retrieval tests, error-path and log redaction tests | None; specification only |
| The reference Guardian Session exposes only mission-approved model tools | Implemented and tested | Tool-catalog capture, unavailable-tool tests, profile-version tests | `8d1eee1`; `pnpm check` covers exact profile catalogs, unsupported-tool denial, exact profile/version binding, and revocation rechecks; the launcher rejects catalogs the concrete host cannot implement |
| Local commands in the reference Guardian Session cannot make direct public network requests | Implemented | Runtime configuration inspection, direct `curl` equivalents, redirect and alternate-protocol tests | `8d1eee1`; `pnpm test:reference-runtime` proves HTTPS and direct Git failure in the production WSL namespace; redirect and alternate-protocol coverage remains C9 |
| The reference Guardian Session does not mount host provider credentials or authenticated CLI state | Implemented and tested | Mount and environment inspection, credential-path probes, clean-runtime tests | `8d1eee1`; `pnpm test:reference-runtime` verifies an empty environment, hidden `/home`, `/mnt`, and `/root`, no provider variables, and no effective capabilities in the supported Windows/WSL runtime |
| Guardian does not label an unverified runtime Enforced | Implemented and tested | Assurance-state transition tests, missing and malformed evidence tests | `65405ff`, `8d1eee1`; `pnpm check` and `pnpm test:reference-runtime` cover missing, malformed, expired, caller-supplied, failed-probe, exact-profile, and successful trusted-launch evidence paths |
| Session expiry and revocation stop new action tool calls | Implemented and tested | Boundary-time tests, exact-handle revocation, action-path rechecks | `8d1eee1`; `pnpm check` covers before-start, exact-expiry, wrong-handle, exact-handle, MCP action recheck, remaining-time, and volume denial |
| Human-authored mission scope cannot be expanded by the interaction agent | Implemented | Mission-version tests, unauthorized scope-change tests, end-to-end denial | `65405ff` adds human authorship, request-only agent expansion, deterministic subset checks, and unit/property tests; mission-version and end-to-end denial evidence remains |
| Tavily-mediated Search is bounded and recorded with untrusted provenance | Implemented | Provider request capture, traversal-limit tests, journey inspection | Current C5 working tree and `docs/development/evidence/c5-tavily-research-gateway.md`: `pnpm check` covers the launcher/MCP/IPC bindings, fixed endpoint and parameters, exact domains, bounded redacted evidence, digests, duplicate rejection, provenance, and session budget; `pnpm test:live:tavily` passes the full protected reference path; committed revision and remote review remain |
| Secret-like or private outbound research queries fail before a provider call | Implemented | Secret corpus, oversized and encoded query tests, provider non-invocation evidence | `72c774e`, current C5 working tree, and the C5 evidence record: `pnpm check` covers secret-like, private-path, encoded, high-entropy, domain, relevance, empty-destination, budget, wrong-binding, lifecycle, and revocation rejection plus IPC/provider non-invocation; broader secret-corpus and remote review remain |
| Deterministic policy cannot be weakened by guardian output | Implemented and tested | Policy precedence unit and property tests | `65405ff`; `pnpm test packages/policy/src/index.test.ts` covers lower-bound preservation, increased scrutiny, malformed output, uncertainty, and all lattice pairs |
| Approval is bound to exact canonical request arguments and resource version | Implemented and tested | Canonicalization vectors, mutation property tests, resource-change rejection tests | `65405ff`; `pnpm test packages/canonical/src/index.test.ts packages/authorization/src/index.test.ts packages/contracts/src/actions.test.ts` covers domain/version separation, equivalence, mutation, exact bindings, canonical identifiers and URLs, not-before/expiry, target mismatch, and resource change |
| Expired, replayed, cross-session, cross-connection, and scope-expanded approvals fail | Goal | Capability lifecycle and adversarial tests | `65405ff` rejects expiry and session, caller, connection, policy, resource, and scope mismatch at contract validation; atomic replay and lifecycle evidence remain C6 |
| Unknown or malformed operations fail closed | Implemented | Schema fuzzing and invalid-operation tests | `65405ff` adds strict schemas and invalid-operation, hidden-Unicode, unknown-field, target-mismatch, and unsupported-value tests; broader schema fuzzing remains |
| Adapter results, research events, and audit events exclude credential material | Goal | Secret corpus tests, response allowlisting, audit inspection | `65405ff` adds typed allowlisted provenance and audit events that reject raw-content and unknown detail fields; adapter result and secret-corpus evidence remain |
| Rejected attempts retain minimized evidence exposure, decision, boundary-crossing, consumption, and control context without raw hostile or secret-like content | Goal | Persistence, redaction, polluted-content, and reconstruction tests | ADR-0005 records the C6-C9 design; contracts, persistence, UI, and evidence remain |
| Guardian inference receives minimized credential-free context | Goal | Provider contract tests and request capture inspection | None; specification only |
| The prototype prevents all prompt injection | Not claimed | Not applicable | Explicit non-claim |
| Guardian enforces isolation in every arbitrary third-party harness | Not claimed | Not applicable | Explicit non-claim |
| The prototype protects against privileged local malware or host compromise | Not claimed | Not applicable | Explicit non-claim |
| Competition approval is production-grade biometric authorization | Not claimed | Not applicable | Explicit non-claim |
| The prototype safely authorizes purchases or financial transfers | Not claimed | Not applicable | Explicit non-claim |

## Claim-change protocol

Any pull request that changes this matrix must identify:

1. the implementation revision;
2. exact reproducible test commands;
3. relevant fixtures and expected failures;
4. supported runtime and configuration;
5. residual limitations; and
6. wording changes required in README, submission text, demo UI, and video materials.
