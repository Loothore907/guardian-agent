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
| Guardian does not label an unverified runtime Enforced | Goal | Assurance-state transition tests, missing and malformed evidence tests | None; specification only |
| Human-authored mission scope cannot be expanded by the interaction agent | Goal | Mission-version tests, unauthorized scope-change tests, end-to-end denial | None; specification only |
| Tavily-mediated research is bounded and recorded with untrusted provenance | Goal | Provider request capture, traversal-limit tests, journey inspection | C1 live bounded Search returns sanitized untrusted fields; journey and exhaustive-bound evidence remains |
| Secret-like or private outbound research queries fail before a provider call | Goal | Secret corpus, oversized and encoded query tests, provider non-invocation evidence | None; specification only |
| Deterministic policy cannot be weakened by guardian output | Goal | Policy precedence unit and property tests | None; specification only |
| Approval is bound to exact canonical request arguments and resource version | Goal | Canonicalization vectors, mutation property tests, resource-change rejection tests | None; specification only |
| Expired, replayed, cross-session, cross-connection, and scope-expanded approvals fail | Goal | Capability lifecycle and adversarial tests | None; specification only |
| Unknown or malformed operations fail closed | Goal | Schema fuzzing and invalid-operation tests | None; specification only |
| Adapter results, research events, and audit events exclude credential material | Goal | Secret corpus tests, response allowlisting, audit inspection | None; specification only |
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
