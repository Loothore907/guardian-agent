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
| Public broker APIs do not return raw credentials | Goal | Interface audit, negative retrieval tests, error-path and log redaction tests | None; specification only |
| Deterministic policy cannot be weakened by guardian output | Goal | Policy precedence unit and property tests | None; specification only |
| Approval is bound to exact canonical request arguments | Goal | Canonicalization vectors, mutation property tests, end-to-end rejection tests | None; specification only |
| Expired, replayed, cross-session, and scope-expanded approvals fail | Goal | Capability lifecycle and adversarial tests | None; specification only |
| Unknown or malformed operations fail closed | Goal | Schema fuzzing and invalid-operation tests | None; specification only |
| Adapter results and audit events exclude credential material | Goal | Secret corpus tests, response allowlisting, audit inspection | None; specification only |
| Guardian inference receives minimized credential-free context | Goal | Provider contract tests and request capture inspection | None; specification only |
| The prototype prevents all prompt injection | Not claimed | Not applicable | Explicit non-claim |
| The prototype protects against privileged local malware | Not claimed | Not applicable | Explicit non-claim |
| Competition approval is production-grade biometric authorization | Not claimed | Not applicable | Explicit non-claim |

## Claim-change protocol

Any pull request that changes this matrix must identify:

1. the implementation revision;
2. exact reproducible test commands;
3. relevant fixtures and expected failures;
4. residual limitations; and
5. wording changes required in README, submission text, and demo materials.
