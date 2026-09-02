# ADR-0006: Competition Authority Boundary and Adversarial Demo

- Status: Accepted
- Date: 2026-08-30
- Decision owners: Earl Ray
- Checkpoints: C6-C10
- Supersedes in part: ADR-0005 authority-store ownership and Linux-parity timing
- Partially superseded by: ADR-0008 for deployment ownership and credential
  custody; the exact-request broker and adversarial demo decisions remain active

## Context

The durable C6 store and exact GitHub broker establish the data and execution
primitives for a competition vertical slice. The remaining design choices must
ensure that persistence does not become shared mutable authority, credentials do
not become long-lived agent-accessible secrets, approval is demonstrably human
and request-specific, and the prompt-injection story exercises the real control
path rather than a canned simulation.

The competition schedule is materially ahead of its checkpoint targets. That
buffer should be spent on the security depth of the reference flow, not on wider
adapter or product breadth.

## Decision

### One authority owner

A central local Guardian authority service owns the single-host SQLite database
and is the only process permitted to open it. Trusted launcher, research, policy,
authorization, and broker components use narrow typed requests over authenticated
local IPC. The service validates the caller, session, mission, profile, policy,
connection, lifecycle, and operation rather than trusting identity fields supplied
in a request.

The supported Linux deployment uses a Unix-domain socket with restrictive
filesystem permissions and peer-identity checks where available. The Windows
development path uses an equivalently restricted named pipe. Launcher-derived,
short-lived IPC capabilities provide an additional exact session binding. Unknown
peers, malformed frames, stale capabilities, restarts, and binding mismatches fail
closed.

SQLite remains the competition build's persistence layer because the reference
runtime is deliberately single-host. PostgreSQL or distributed coordination is
deferred until the product requires multiple hosts or independently scaling
authority-service replicas.

### GitHub credential boundary

The showcased GitHub connection is limited to a dedicated, disposable demo
repository with the minimum required repository permissions. ADR-0008 supersedes
the original operator-held App-private-key assumption: reusable material must
remain in the self-hosting user's local credential store and must never be
persisted in Guardian's authority database. A credential-holding service exposes
only a short-lived or narrowly scoped credential to the fixed-endpoint typed
GitHub adapter for the duration of the operation.

Guardian persists only non-secret App, installation, connection, repository, and
scope references. A personal access token may exist only as an explicitly labeled
development or test fallback and is not the final showcased credential path.

### Human approval

The final competition approval uses a user-verifying WebAuthn passkey over the
canonical `https://agentic-guardian.com` origin. The domain is registered and
delegated to Cloudflare; the origin remains unverified until the intended Nebius
deployment serves valid HTTPS. Its server challenge is short-lived and bound to the
canonical request digest, caller session, connection, repository, pull-request
head commit, merge method, policy version, nonce, and expiry. The authority
service verifies the assertion and issues one exact authorization record. It does
not accept an interaction-agent assertion that a human approved.

A development confirmation control may remain for local iteration only. It must
be labeled lower assurance, may not be presented as equivalent to WebAuthn, and
is not used in the final security demonstration. The project does not claim that
all passkeys are biometric or hardware-backed.

### Dedicated adversarial fixture

The final demo operates only on a dedicated disposable repository with a scripted
reset procedure. It never targets the project's primary repository or unrelated
user data. The repository contains a seeded pull request whose current head commit
is an explicit authorization input.

The canonical demonstration is:

1. A human starts an Enforced review mission that does not authorize remote
   modification.
2. Guardian retrieves a controlled public page containing an indirect prompt
   injection through its bounded public-research path and labels the content
   untrusted.
3. The interaction agent or documented adversarial harness proposes an unsafe
   merge or authority expansion after exposure to that content.
4. Deterministic mission policy denies the proposal. Nemotron may explain or
   increase the risk floor but cannot weaken the denial. Because the request is
   stopped before a provider or privileged adapter boundary, no approval, nonce,
   GitHub token, or GitHub mutation is consumed.
5. The human sees the minimized evidence-to-attempt-to-decision chain and denies
   or dismisses the unsafe proposal. The UI describes temporal association, not
   model causation.
6. The human creates the required mission revision or separately permitted action
   context. A legitimate exact merge proposal is then presented with repository,
   pull request, current head commit, squash method, expiry, and one-time use.
7. A passkey assertion establishes human approval. Immediately before execution,
   the broker re-fetches the pull request, re-normalizes the request, recomputes
   the digest, verifies every binding, atomically consumes the nonce, mints a
   short-lived GitHub installation token, and requests the exact squash merge.
8. Mutation and replay attempts fail, while the sanitized audit contrasts the
   rejected injected attempt with the separately authorized legitimate action.

The unsafe proposal may be produced by the real interaction model or by a clearly
identified deterministic adversarial fixture. The control outcome must be real in
both cases; the demo does not depend on falsely claiming that a model will always
obey the injected text.

### Bounded hostile-page retrieval

The demo adds only the narrow public retrieval capability required for the
fixture: Tavily Extract or an equivalent fixed provider operation for mission-
allowlisted public HTTPS URLs and domains. It rejects private, loopback, link-local,
credential-bearing, ambiguous, oversized, unsupported, or redirect-escaped
requests before provider invocation. It accepts no caller-controlled headers or
credentials, enforces response and time limits, records a digest and untrusted
label, and does not persist live hostile page bodies.

CI uses a deterministic fake-provider fixture. The final demonstration also uses
a controlled live public page so provider invocation, content exposure, policy,
guardian analysis, and denial can be shown as one genuine runtime path.

### Earlier self-hosted Linux parity

Self-hosted Linux parity is pulled forward before product-experience freeze. The
team must validate the authority-service IPC, database permissions, local
credential resolution, narrow GitHub flow, approval ceremony, launcher isolation,
and network controls in the intended host environment while C6-C8 are still adaptable. A host
that lacks the documented evidence is displayed as Observed or Unknown, never
Enforced.

## Consequences

- Direct SQLite ownership by the current broker and other trusted orchestrators is
  an intermediate C6 integration. Its contracts, transactions, and tests remain
  useful, but access moves behind an authority-service client before the final
  competition runtime.
- C6 gains the authority service, authenticated IPC, narrow local GitHub
  credential path, dedicated demo repository, and self-hosted Linux feasibility
  work.
- C7 gains the hostile-content risk envelope and deterministic/live fixture
  evaluation.
- C8 gains the WebAuthn approval ceremony and a UI comparison between an injected
  denied attempt and a separately authorized legitimate operation.
- C9 must exercise the complete controlled live page through exact merge flow and
  retain reproducible evidence for every public claim.
- A self-hosted Linux reference runtime is selected. The exact Nebius endpoints,
  Linux credential store, approval ceremony, and supported peer-identity
  mechanism remain near-term implementation selections under ADR-0008.
- The project continues to claim prevention of unauthorized authority acquisition,
  not complete prevention or attribution of prompt injection.

## Rejected alternatives

- **Shared direct database access:** makes caller authentication and the single
  authority boundary dependent on every process using the store correctly.
- **Long-lived personal access token in the final demo:** increases credential
  lifetime and account scope and weakens the credential-custody story.
- **A localhost confirmation button as final approval:** does not establish the
  desired human-presence and exact-challenge evidence.
- **Using the primary project repository:** creates unnecessary risk and makes
  repeatable resets harder.
- **A canned hostile-content animation:** does not prove the provider, policy,
  authority, or adapter boundaries operate together.
- **Claiming the model cannot be injected:** is neither required nor supported;
  the security result is that untrusted text cannot create authority.
- **A general browser or arbitrary URL proxy:** materially widens destinations,
  headers, content types, and exfiltration surface beyond the mission need.
- **Moving to PostgreSQL now:** adds distributed deployment surface without a
  current multi-host requirement.

## Evidence required

Acceptance as implemented behavior requires authenticated-IPC peer and binding
tests, direct-database boundary checks, restart and stale-capability rejection,
local credential-store inspection, GitHub credential capture tests, passkey
challenge mutation/replay/expiry/origin tests, dedicated-repository reset proof,
private-network and redirect retrieval fixtures, deterministic fake-provider tests,
and a protected self-hosted Linux run of the complete polluted-content denial and
exact passkey-authorized squash merge.
