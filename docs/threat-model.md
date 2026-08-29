# Threat Model

## Protected assets

- service credentials and credential-equivalent session material;
- capability scopes and approval records;
- user intent and authorization decisions;
- private proposal arguments and sanitized results;
- policy configuration and version history;
- audit integrity; and
- the authority to perform external side effects.

## Adversaries and failure sources

- a mistaken, manipulated, or malicious interaction agent;
- prompt injection in webpages, repositories, search results, or documents;
- a local caller attempting scope expansion, replay, or impersonation;
- malformed or adversarial proposal input;
- a fallible or manipulated guardian model;
- an adapter that returns sensitive data or accepts unsafe arguments;
- accidental logging and diagnostic exposure;
- dependency or build compromise; and
- operator misunderstanding caused by vague approval text.

## Security invariants

1. No public operation returns a credential or credential-equivalent value.
2. A lower-authority decision cannot weaken a deterministic restriction.
3. Approval cannot authorize an operation broader than the submitted request.
4. Material mutation after approval invalidates authorization.
5. Expired, replayed, cross-session, cross-connection, and scope-expanded approvals fail.
6. Unknown, malformed, ambiguous, and unsupported operations fail closed.
7. Privileged execution uses typed operations with constrained destinations and arguments.
8. Audit evidence is sufficient to reconstruct the decision without recording secrets.

## Primary threats and controls

| Threat | Example | Primary controls |
| --- | --- | --- |
| Prompt injection | Retrieved content instructs the agent to upload data or reveal a key | Untrusted-zone treatment, typed proposals, deterministic policy, minimized guardian context |
| Credential exfiltration | Caller requests a token value or triggers a verbose error | No export capability, broker-only access, field-level redaction, negative tests |
| Confused deputy | Valid credentials are used for an unintended but syntactically valid action | Narrow adapters, explicit effects, scoped grants, consequence prompts, exact binding |
| Argument substitution | Branch, recipient, amount, or resource changes after approval | Canonical serialization, request digest, final re-normalization |
| Approval replay | An approved request is resubmitted | Nonce, use count, expiry, caller and connection binding |
| Guardian under-classification | Model output labels a privileged request routine | Deterministic floor, fixed output schema, invalid-output fallback, adversarial evaluation |
| Adapter overreach | Adapter accepts arbitrary URLs, headers, or commands | Typed schemas, destination restrictions, independent review, fuzzing |
| Audit leakage | Logs capture tokens or sensitive payload fields | Structured events, allowlisted fields, redaction tests, retention controls |
| Local impersonation | Another process submits as an authorized caller | Authenticated IPC and caller-session binding in supported environments |

## Out of scope for the competition prototype

- defense against a fully compromised host or privileged malware;
- a universal password manager, synchronization, or recovery system;
- formal verification of cryptographic or hardware-backed authorization;
- arbitrary authenticated browsing or HTTP;
- unsupervised production administration;
- complete protection against all prompt injection; and
- production assurance for third-party adapters.

## Required adversarial fixtures

- direct credential retrieval request;
- credential leakage through error and diagnostic paths;
- prompt-injected rationale that conflicts with normalized facts;
- branch, recipient, amount, and resource substitution;
- expired and replayed approval;
- cross-session and cross-connection approval reuse;
- scope and volume expansion;
- malformed guardian output and provider failure;
- hidden Unicode and ambiguous destination; and
- oversized or secret-like adapter responses.
