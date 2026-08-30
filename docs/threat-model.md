# Threat Model

## Protected assets

- service credentials and credential-equivalent provider session material;
- mission intent, session profiles, assurance state, and runtime evidence;
- capability scopes, grants, approvals, and revocation state;
- private proposal arguments and sanitized results;
- public-research queries, provenance, and minimized journey history;
- policy configuration and version history;
- audit integrity; and
- the authority to perform external side effects or move private data.

## Adversaries and failure sources

- a mistaken, manipulated, or malicious interaction model;
- indirect prompt injection in webpages, repositories, issues, search results, tool output, or documents;
- hostile public content planted before the session or changed while it runs;
- context drift, compression, poisoned memory, or contaminated agent handoff during long-running work;
- an agent attempting unapproved browser, shell, network, Git, package-manager, or alternate MCP pathways;
- a local caller attempting scope expansion, replay, impersonation, or false assurance reporting;
- malformed or adversarial mission, research, proposal, or adapter input;
- exfiltration attempts encoded in an otherwise allowed search query or destination;
- a fallible or manipulated guardian model;
- a research or service adapter returning sensitive data or accepting unsafe arguments;
- accidental logging and diagnostic exposure;
- dependency, build, provider, or MCP-server compromise; and
- operator misunderstanding caused by vague approval or assurance language.

## Security invariants

1. No public operation returns a reusable provider credential or credential-equivalent provider value.
2. Prompt instructions are not treated as evidence of runtime enforcement.
3. A session is labeled Enforced only when Guardian can associate it with the documented reference tool, filesystem, credential, and network restrictions.
4. The interaction agent cannot grant itself tools, mission scope, destinations, time, volume, or side-effect authority.
5. A lower-authority decision cannot weaken a deterministic restriction.
6. Public content and agent-supplied rationale cannot create authority.
7. Approval cannot authorize an operation broader than the submitted request.
8. Material mutation or relevant resource-version change after approval invalidates authorization.
9. Expired, replayed, cross-session, cross-connection, and scope-expanded approvals fail.
10. Unknown, malformed, ambiguous, and unsupported operations fail closed.
11. Privileged execution uses typed operations with constrained destinations and arguments.
12. Allowed research cannot become an unchecked private-data exfiltration channel.
13. Audit evidence is sufficient to reconstruct the decision without recording secrets or unnecessary raw public content.
14. Evidence that preceded an agent attempt is recorded as temporal context, not
    asserted as proof that the public content caused the attempt.

## Primary threats and controls

| Threat | Example | Primary controls |
| --- | --- | --- |
| Indirect prompt injection | A webpage tells the agent to merge, purchase, upload, or reveal data | Untrusted-content labels, mission floor, typed tools, bounded excerpts, Nemotron escalation, no authority from prose |
| Alternate-path bypass | Agent uses `curl`, a browser, `git push`, or another MCP server | Trusted launcher, tool allowlist, isolated command executor, default-denied egress, no mounted credentials, negative tests |
| False enforcement claim | Optional MCP use is displayed as a fully constrained session | Enforced/Observed/Unknown contract, runtime evidence, fail-closed assurance display |
| Query exfiltration | Agent inserts a secret or private file content into a Tavily query | Strict query schema, length and entropy limits, secret corpus checks, private-field rejection, bounded destinations |
| Credential exfiltration | Caller requests a token or triggers a verbose provider error | No export capability, broker-only credentials, separate command sandbox, allowlisted results, redaction tests |
| Confused deputy | Valid credentials perform an unintended but syntactically valid action | Human-authored mission, narrow adapters, explicit effects, scoped grants, consequence prompts, exact binding |
| Mission drift | A long-running agent changes from research to execution | Immutable mission record, versioned scope expansion, action-count and time limits, deterministic side-effect policy |
| Persistent context poisoning | Hostile content is copied into memory or a future task handoff | Bounded session lifetime, provenance labels, minimized handoff, no public prose in policy or grants |
| Resource substitution | PR head, seller, recipient, branch, quantity, or resource changes after approval | Canonical digest, expected resource version, final re-fetch and re-normalization |
| Approval replay | An approved request is resubmitted | Atomic nonce consumption, use count, expiry, caller and connection binding |
| Guardian under-classification | Model labels a manipulated request routine | Deterministic floor, fixed schema, invalid-output fallback, adversarial evaluation |
| Adapter overreach | Adapter accepts arbitrary URLs, headers, commands, or destinations | Typed schemas, fixed endpoints, destination restrictions, review, fuzzing |
| Research-journey leakage | Durable audit stores private queries or entire pages | Data minimization, bounded excerpts, content digests, field allowlists, retention controls |
| Local impersonation | Another process submits as the authorized session | Authenticated transport, caller binding, short-lived task identity, supported-runtime isolation |

## Out of scope for the competition prototype

- defense against a fully compromised host, kernel, hypervisor, or privileged malware;
- universal enforcement for arbitrary third-party terminal agents;
- proof against covert channels outside the documented reference environment;
- a universal password manager, identity provider, synchronization, or recovery system;
- formal verification of sandbox, cryptographic, or hardware-backed authorization;
- arbitrary authenticated browsing, HTTP, commands, or caller-controlled destinations;
- purchases, financial transfers, or production commerce authorization;
- unsupervised production administration;
- complete protection against all prompt injection; and
- production assurance for third-party adapters or multi-tenant isolation.

## Required adversarial fixtures

- direct credential retrieval request;
- credential leakage through error, diagnostic, provider, and audit paths;
- direct public `curl` or equivalent request from the command sandbox;
- unauthenticated or credentialless `git push` bypass attempt;
- invocation of an unapproved or alternate external tool;
- false attempt to label an Observed or Unknown session Enforced;
- secret-like, private, oversized, encoded, and high-entropy Tavily queries;
- prompt-injected public content conflicting with the human-authored mission;
- public content requesting data upload, credential disclosure, tool use, or authority expansion;
- poisoned summary or task-handoff content;
- branch, commit, recipient, price, quantity, destination, and resource substitution;
- expired and replayed approval;
- cross-session and cross-connection approval reuse;
- mission scope, search budget, action volume, and destination expansion;
- malformed guardian output, provider failure, and uncertainty;
- hidden Unicode and ambiguous destination; and
- oversized or secret-like research and adapter responses.
- polluted public content followed by an unsafe proposal, with a minimized
  evidence-to-attempt-to-denial record and no retained hostile page or secret-like
  rejected value.
