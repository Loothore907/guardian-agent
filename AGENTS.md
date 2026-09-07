# Agentic Guardian repository guidance

## Working agreement

- Follow `docs/development/session-git-hygiene.md` for source-changing sessions.
  Run `node scripts/session-hygiene.mjs start --remote` before new feature work
  and `node scripts/session-hygiene.mjs close --remote` before closeout. Resolve
  failures or record an owning issue, exact blocker and next action; never describe
  a failing hygiene check as complete. Plan bounded integration authority early.

- Treat this repository as a security-sensitive public project.
- Keep changes small, reviewable, and tied to a documented user or security outcome.
- Documentation-only reconciliation that accurately records already-approved work,
  checks, integration state, or handoff metadata remains within the originating
  issue and session scope. Use that existing issue reference; do not create a new
  issue or seek new authority merely because the correction follows a merge. Treat
  it as new scope only if it changes requirements, runtime behavior, security
  claims beyond evidence, external authority, or the next operation's bounds.
- A user-approved session plan is explicit authority for the non-destructive actions it enumerates, including commits, feature-branch pushes, and pull-request creation or updates when the repository, destination, and ref constraints are bounded. Do not ask again for each in-scope action.
- This includes credential copying/provisioning when the approved plan identifies the source credential slots, destination account/project/store/resources, intended runtime readers, copy versus move semantics, and applicable time/count limits. Bind the concrete operation to that approved scope using non-secret identifiers; never include key values in the approval record. Ask again only for missing material scope or a changed/expired grant, not merely because a named plan step is sensitive. Higher-priority tool/platform restrictions still apply; report their exact blocker without presenting it as a new repository requirement.
- If an action is not covered by an approved plan, obtain an explicit request before committing, pushing, publishing, creating a release, or changing remote settings. Protected-branch writes, force pushes, merges, releases, deployments, destructive actions, and scope expansion require plan authority that names that action class or a fresh exact confirmation.
- Preserve user-authored changes and unrelated worktree state.
- Ask before adding a production dependency or materially widening project scope.

## Product invariants

- Public agent interfaces must never return raw credentials or credential-equivalent material.
- Prompt instructions are guidance, not evidence of runtime enforcement.
- Label a session `Enforced` only when Guardian has evidence for the documented tool, filesystem, credential, and network restrictions; otherwise report `Observed` or `Unknown`.
- An interaction agent may request mission expansion but may never grant itself new tools, destinations, time, volume, or side-effect authority.
- In the reference enforced runtime, public research and authenticated external operations must pass through Guardian-controlled pathways.
- Treat all retrieved public content and agent-supplied rationale as untrusted; neither can create authority.
- Reject secret-like, private, oversized, or encoded outbound research requests before invoking an external provider.
- Guardian/model output may maintain or increase a deterministic risk floor; it may never reduce one.
- A privileged operation must be re-normalized and its request digest revalidated immediately before execution.
- Approval must be bound to the exact request, caller session, connection, scope, expiry, nonce, and policy version as applicable.
- Unknown, malformed, unsupported, ambiguous, expired, replayed, or scope-expanded operations fail closed.
- Adapters expose typed capabilities. Do not add arbitrary authenticated HTTP, arbitrary URLs, arbitrary headers, arbitrary commands, or shell expansion.
- Public results, errors, traces, and audit records must be sanitized and must not include secrets.
- Model unavailability, invalid structured output, or uncertainty must escalate or deny; it must never silently allow.

## Architecture expectations

- Keep session control, protocol/schema, public research, deterministic policy, guardian inference, privileged broker, adapters, UI, and evaluation concerns separable.
- Keep the local command sandbox outside credential-holding provider processes.
- Keep the guardian provider outside the credential-holding execution boundary.
- Encode dependency direction mechanically once the package structure exists.
- Record consequential decisions in `docs/adr/`.

## Verification

- Add or update tests in the same change as behavior.
- Test both allowed behavior and near-miss rejection cases.
- Treat canonicalization, mutation, replay, expiry, caller binding, scope, assurance state, outbound research, and redaction as property-test candidates.
- Test direct-network, credential-path, alternate-tool, and Git push bypass attempts in the documented reference runtime.
- Never describe a security property as implemented unless `docs/security-claims.md` identifies reproducible evidence.
- Run the narrowest relevant checks during iteration and the complete required suite before requesting review.

## Documentation

- Keep `README.md` concise and honest about current status.
- Update architecture, threat model, claims, competition documentation, and setup instructions when behavior changes.
- Distinguish prototype limitations, design goals, implemented controls, and verified guarantees.

## Code review rules

### Credential boundary

- Flag any path that can expose credentials, bearer tokens, session cookies, private keys, provider secrets, or credential-bearing URLs to an interaction agent, model provider, client response, log, trace, or audit record.
  Safe path: keep values inside the privileged executor and return typed, sanitized results.

### Policy precedence

- Flag any change that allows model output, user preference, or adapter metadata to weaken a deterministic deny or mandatory step-up.
  Safe path: lower-authority layers may only preserve or increase the required authorization level.

### Exact-request binding

- Flag execution that trusts previously normalized arguments or an approval without independently re-normalizing and verifying the final request.
  Safe path: validate schema, canonicalize, hash, and compare again at the execution boundary.

### Capability width

- Flag generic authenticated proxies, arbitrary HTTP, arbitrary shell execution, caller-controlled headers, or caller-controlled destinations.
  Safe path: add a narrow typed operation with explicit targets, effects, schemas, and sanitization.

### Claim integrity

- Flag security language that is broader than the implementation and reproducible evidence.
  Safe path: label the property as a goal or limitation until the required tests pass.
