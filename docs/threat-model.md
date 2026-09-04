# Threat Model

## Protected assets

- service credentials and credential-equivalent provider session material;
- locally stored provider credentials, GitHub credential material, short-lived
  tokens, WebAuthn challenges, and verified approval assertions;
- untrusted mission drafts, clarification state, compiled mission intent, session
  profiles, assurance state, and runtime evidence;
- capability scopes, grants, approvals, and revocation state;
- private proposal arguments and sanitized results;
- public-research queries, provenance, and minimized journey history;
- policy configuration and version history;
- audit integrity; and
- the authority to perform external side effects or move private data.

## Adversaries and failure sources

- a mistaken, manipulated, or malicious external host agent or model;
- indirect prompt injection in webpages, repositories, issues, search results, tool output, or documents;
- hostile public content planted before the session or changed while it runs;
- context drift, compression, poisoned memory, or contaminated agent handoff during long-running work;
- an agent attempting unapproved browser, shell, network, Git, package-manager, or alternate MCP pathways;
- an agent or compromised scaffold submitting, answering, confirming, replaying,
  or mutating a session draft, clarification exchange, compiled candidate, or
  terminal-to-browser ceremony handoff;
- a local caller attempting scope expansion, replay, impersonation, or false assurance reporting;
- a local process attempting to impersonate an authority-service client or open the authority database directly;
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
15. The central authority service is the sole runtime owner of durable authority state; local IPC identity and exact session capabilities are independently checked.
16. A passkey assertion is accepted only for the exact short-lived challenge, origin, request digest, resource version, caller, connection, nonce, and policy version.
17. Reusable provider credentials remain in the self-hosting user's local
    credential store and credential-holding services; they are never stored in
    authority state, exposed to a runner or model, or returned publicly.
18. Model- or scaffold-submitted mission text is untrusted draft input and cannot create or expand session authority without direct human confirmation of Guardian's normalized representation.
19. A terminal-to-browser ceremony handoff is short-lived, single-purpose, opaque, caller-, user-, session-, digest-, nonce-, expiry-, and return-channel-bound, and cannot convey provider credentials.
20. Qwen readiness, clarification questions, and explanations cannot compile,
    confirm, activate, or expand mission authority; every clarification answer is
    revalidated before deterministic compilation.
21. Setup-time and runtime Nemotron output may only preserve or increase a
    deterministic floor and cannot activate a mission or choose revocation policy.
22. Ordinary boundary denial is distinct from trusted-runtime interruption;
    immediate and repeated-violation revocation uses only versioned deterministic
    severity, window, and threshold rules.
23. Native-worker model output is untrusted data: a turn is exact-bound,
    expiring, budgeted, and one-use, and a typed request remains pending until a
    separate trusted execution boundary re-normalizes and authorizes it. The
    current loop permits one exact result round-trip; turn 2 must finish.
24. A session workspace is a Guardian-owned copy of an exact-confirmed,
    credential-screened Git-visible snapshot. It does not expose the source host
    path, inherit authenticated Git state, or write changes back automatically.

## Primary threats and controls

| Threat                                     | Example                                                                                                                                                                      | Primary controls                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indirect prompt injection                  | A webpage tells the agent to merge, purchase, upload, or reveal data                                                                                                         | Untrusted-content labels, mission floor, typed tools, bounded excerpts, Nemotron escalation, no authority from prose                                                                                                                                                        |
| Alternate-path bypass                      | Agent uses `curl`, a browser, `git push`, or another MCP server                                                                                                              | Trusted launcher, tool allowlist, isolated command executor, default-denied egress, no mounted credentials, negative tests                                                                                                                                                  |
| False enforcement claim                    | Optional MCP use is displayed as a fully constrained session                                                                                                                 | Enforced/Observed/Unknown contract, runtime evidence, fail-closed assurance display                                                                                                                                                                                         |
| Query exfiltration                         | Agent inserts a secret or private file content into a Tavily query                                                                                                           | Strict query schema, length and entropy limits, secret corpus checks, private-field rejection, bounded destinations                                                                                                                                                         |
| Credential exfiltration                    | Caller requests a token or triggers a verbose provider error                                                                                                                 | No export capability, broker-only credentials, separate command sandbox, allowlisted results, redaction tests                                                                                                                                                               |
| Local credential enrollment capture        | A key reaches shell history, argv, a hosted page, mission text, MCP arguments, logs, or SQLite during setup                                                                  | Trusted local hidden input or local-only UI, OS credential-store adapter, no generic secret API, secret-corpus and process inspection                                                                                                                                       |
| Confused deputy                            | Valid credentials perform an unintended but syntactically valid action                                                                                                       | Human-authored mission, narrow adapters, explicit effects, scoped grants, consequence prompts, exact binding                                                                                                                                                                |
| Mission drift                              | A long-running agent changes from research to execution                                                                                                                      | Immutable mission record, versioned scope expansion, action-count and time limits, deterministic side-effect policy                                                                                                                                                         |
| Persistent context poisoning               | Hostile content is copied into memory or a future task handoff                                                                                                               | Bounded session lifetime, provenance labels, minimized handoff, no public prose in policy or grants                                                                                                                                                                         |
| Resource substitution                      | PR head, seller, recipient, branch, quantity, or resource changes after approval                                                                                             | Canonical digest, expected resource version, final re-fetch and re-normalization                                                                                                                                                                                            |
| Approval replay                            | An approved request is resubmitted                                                                                                                                           | Atomic nonce consumption, use count, expiry, caller and connection binding                                                                                                                                                                                                  |
| Guardian under-classification              | Model labels a manipulated request routine                                                                                                                                   | Deterministic floor, fixed schema, invalid-output fallback, adversarial evaluation                                                                                                                                                                                          |
| Adapter overreach                          | Adapter accepts arbitrary URLs, headers, commands, or destinations                                                                                                           | Typed schemas, fixed endpoints, destination restrictions, review, fuzzing                                                                                                                                                                                                   |
| Worker self-authorization                  | The worker emits a proposal ID, session binding, approval state, arbitrary transport, shell text, a replayed execution, or a second tool request and treats it as executable | Exact turn/request/execution/result digests, minimized provider projection, strict typed output, independent runtime reauthorization, unique durable execution consumption, capability-specific budgets, exhaustive dispatcher, empty turn-2 catalog                        |
| Workspace escape or credential inheritance | The worker traverses a symlink, selects an ignored secret, reuses a target, inherits a Git remote/helper, or modifies the user's checkout                                    | Exact Git root and bounded manifest, path and credential screening, post-confirmation identity/path/content revalidation, fresh no-remote Git baseline, Guardian-owned copy, fixed bind mount, no host writeback, ownership-safe cleanup                                    |
| Research-journey leakage                   | Durable audit stores private queries or entire pages                                                                                                                         | Data minimization, bounded excerpts, content digests, field allowlists, retention controls                                                                                                                                                                                  |
| Local impersonation                        | Another process submits as the authorized session                                                                                                                            | Linux `SO_PEERCRED` PID/UID/GID and supervised-ancestry checks before request parsing, independent exact capability and caller binding, short-lived task identity, supported-runtime isolation                                                                              |
| Authority-store bypass                     | A trusted component or stray local process opens SQLite and mutates a grant or nonce                                                                                         | Sole authority-service ownership, filesystem permissions, dependency checks, authenticated typed IPC, peer identity, transaction invariants                                                                                                                                 |
| Approval ceremony substitution             | Agent clicks a local control, replays an assertion, or swaps the request after a human gesture                                                                               | WebAuthn user verification, HTTPS origin checking, short-lived exact challenge binding, fresh nonce, final request and resource revalidation                                                                                                                                |
| Mission-draft self-activation              | The model invokes Guardian and represents its own expanded task as trusted user intent                                                                                       | Draft-versus-authority state, normalized consequence display, direct human confirmation, immutable mission version, no authority before confirmation                                                                                                                        |
| Clarification-path authority injection     | Qwen, the host, or relayed answers insert permissions, executable instructions, secrets, or a different mission into the setup dialogue                                      | Deterministic pre-screening and answer revalidation, strict `ready`/`needs_clarification` output, bounded codes/questions, new digest after mutation, no authority before confirmation                                                                                      |
| False semantic readiness                   | Qwen marks an ambiguous or unsupported draft ready                                                                                                                           | Deterministic required fields and capability clamp, optional separate Nemotron mission-risk review, exact human consequence confirmation, ambiguity fails closed                                                                                                            |
| Ceremony-handoff interception              | The agent opens, modifies, replays, or completes a browser handoff intended for the user                                                                                     | Opaque one-time reference, expected-user/caller/session/digest/return-channel binding, short expiry, WebAuthn where required, atomic consumption                                                                                                                            |
| False terminal assurance                   | Guardian tools are installed in an unrestricted scaffold and displayed as Enforced                                                                                           | Trusted-launch requirement, runtime evidence, alternate-path probes, Observed/Unknown fallback                                                                                                                                                                              |
| GitHub credential persistence              | Long-lived token or App key enters the authority database, agent runtime, model context, log, or adapter response                                                            | User-owned local credential store, narrow credential service, repository scope, short-lived token where supported, process isolation, allowlisted outputs, secret-corpus tests                                                                                              |
| False model independence                   | Two cloud models are treated as mutually independent security authorities                                                                                                    | Deterministic policy root, distinct roles and minimized context, model output may only maintain or increase scrutiny, shared-provider risk disclosed                                                                                                                        |
| Violation-counter manipulation             | Host retries malformed or denied calls to cause an unintended shutdown, avoid a threshold, or reset its history                                                              | Versioned severity classes, bounded windows, durable monotonic counters, exact session binding, explicit immediate-revoke classes, adversarial threshold tests                                                                                                              |
| Hostile-page retrieval escape              | Controlled Extract receives a private/unlisted target, accepts attacker-selected transport options, or returns a different URL                                               | Exact reviewed public HTTPS fixture URLs and domains, IP/local/query/fragment rejection, fixed provider operation, no caller headers, returned-URL validation, size/time/content limits; Tavily-internal pre-response redirects remain a documented live-fixture limitation |

## Out of scope for the competition prototype

- defense against a fully compromised host, kernel, hypervisor, or privileged malware;
- universal enforcement for arbitrary third-party terminal agents;
- proof against covert channels outside the documented reference environment;
- a universal password manager, identity provider, synchronization, or recovery system;
- formal verification of sandbox or cryptographic authorization, and universal biometric or hardware-backed passkey claims;
- arbitrary authenticated browsing, HTTP, commands, or caller-controlled destinations;
- purchases, financial transfers, or production commerce authorization;
- unsupervised production administration;
- complete protection against all prompt injection; and
- production assurance for third-party adapters or multi-tenant isolation.

## Required adversarial fixtures

- direct credential retrieval request;
- credential leakage through error, diagnostic, provider, and audit paths;
- credential enrollment through argv, shell history, model or mission input,
  browser URL, hosted form, SQLite, log, trace, or audit;
- direct public `curl` or equivalent request from the command sandbox;
- unauthenticated or credentialless `git push` bypass attempt;
- invocation of an unapproved or alternate external tool;
- false attempt to label an Observed or Unknown session Enforced;
- prompt-level Guardian invocation treated as authority without a confirmed digest;
- Qwen output containing a compiled mission, permission grant, confirmation,
  activation result, tool proposal, executable instruction, or secret request;
- native-worker output containing trusted bindings, approval or assurance state,
  arbitrary commands, URLs, headers, credentials, unsupported tools, exhausted
  budgets, malformed fields, a replayed turn or execution, a substituted
  workspace, or a second tool request;
- host mutation, replay, or scope expansion through clarification answers;
- silent Qwen omission, route substitution, or fallback with different authority
  semantics;
- secret-like, private, oversized, encoded, and high-entropy Tavily queries;
- prompt-injected public content conflicting with the human-authored mission;
- public content requesting data upload, credential disclosure, tool use, or authority expansion;
- poisoned summary or task-handoff content;
- branch, commit, recipient, price, quantity, destination, and resource substitution;
- expired and replayed approval;
- ordinary action denial followed by otherwise permitted continuation;
- immediate-severity and bounded-window repeated violations at threshold edges;
- cross-session and cross-connection approval reuse;
- mission scope, search budget, action volume, and destination expansion;
- unconfirmed model-drafted session creation and mission expansion;
- terminal-to-browser handoff mutation, wrong user, wrong caller, wrong session,
  wrong return channel, expiry, replay, and agent-click substitution;
- a tool-only unrestricted scaffold attempting to claim Enforced assurance;
- malformed guardian output, provider failure, and uncertainty;
- hidden Unicode and ambiguous destination; and
- oversized or secret-like research and adapter responses.
- polluted public content followed by an unsafe proposal, with a minimized
  evidence-to-attempt-to-denial record and no retained hostile page or secret-like
  rejected value.
- authority-service calls from an unknown peer, wrong session capability, stale
  capability, restarted process, and direct database importer or opener;
- WebAuthn challenge mutation, wrong origin, expiry, replay, user-verification
  absence, request substitution, and resource-version substitution;
- locally stored provider and GitHub credential leakage through database, runner
  process, model context, response, error, trace, and audit paths;
- controlled hostile-page Extract attempts involving private IPs, redirect escape,
  credentials in URLs, caller-controlled headers, unsupported content, timeout,
  and oversized responses; and
- the complete self-hosted Linux reference path from controlled polluted content to pre-boundary
  denial, followed by a separately passkey-authorized exact squash merge.
