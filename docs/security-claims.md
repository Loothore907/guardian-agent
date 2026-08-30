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
| The reference Guardian Session exposes only mission-approved model tools | Goal | Tool-catalog capture, unavailable-tool tests, profile-version tests | C1 feasibility spike denies an unapproved tool; production profile evidence remains |
| Local commands in the reference Guardian Session cannot make direct public network requests | Goal | Runtime configuration inspection, direct `curl` equivalents, redirect and alternate-protocol tests | C1 namespace spike blocks direct HTTPS and Git; alternate-protocol and production-runtime evidence remains |
| The reference Guardian Session does not mount host provider credentials or authenticated CLI state | Goal | Mount and environment inspection, credential-path probes, clean-runtime tests | C1 temporary-root, environment, and credential probes pass; production-runtime evidence remains |
| Guardian does not label an unverified runtime Enforced | Implemented and tested | Assurance-state transition tests, missing and malformed evidence tests | `f058d41`, `a295737`, `479c6c9`; `pnpm test packages/session/src/index.test.ts packages/contracts/src/mission.test.ts` covers complete, missing, malformed, exact-profile, expired, and caller-selected foundation assurance; production runtime transitions remain C4 |
| Human-authored mission scope cannot be expanded by the interaction agent | Implemented | Mission-version tests, unauthorized scope-change tests, end-to-end denial | `f058d41` adds human authorship, request-only agent expansion, deterministic subset checks, and unit/property tests; mission-version and end-to-end denial evidence remains |
| Tavily-mediated research is bounded and recorded with untrusted provenance | Goal | Provider request capture, traversal-limit tests, journey inspection | C1 live bounded Search returns sanitized untrusted fields; journey and exhaustive-bound evidence remains |
| Secret-like or private outbound research queries fail before a provider call | Goal | Secret corpus, oversized and encoded query tests, provider non-invocation evidence | None; specification only |
| Deterministic policy cannot be weakened by guardian output | Implemented and tested | Policy precedence unit and property tests | `f058d41`; `pnpm test packages/policy/src/index.test.ts` covers lower-bound preservation, increased scrutiny, malformed output, uncertainty, and all lattice pairs |
| Approval is bound to exact canonical request arguments and resource version | Implemented and tested | Canonicalization vectors, mutation property tests, resource-change rejection tests | `f058d41`, `a295737`, `479c6c9`; `pnpm test packages/canonical/src/index.test.ts packages/authorization/src/index.test.ts packages/contracts/src/actions.test.ts` covers domain/version separation, equivalence, mutation, exact bindings, canonical identifiers and URLs, not-before/expiry, target mismatch, and resource change |
| Expired, replayed, cross-session, cross-connection, and scope-expanded approvals fail | Goal | Capability lifecycle and adversarial tests | `a295737` rejects expiry and session, caller, connection, policy, resource, and scope mismatch at contract validation; atomic replay and lifecycle evidence remain C6 |
| Unknown or malformed operations fail closed | Implemented | Schema fuzzing and invalid-operation tests | `f058d41`, `a295737` add strict schemas and invalid-operation, hidden-Unicode, unknown-field, target-mismatch, and unsupported-value tests; broader schema fuzzing remains |
| Adapter results, research events, and audit events exclude credential material | Goal | Secret corpus tests, response allowlisting, audit inspection | `a295737` adds typed allowlisted provenance and audit events that reject raw-content and unknown detail fields; adapter result and secret-corpus evidence remain |
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
