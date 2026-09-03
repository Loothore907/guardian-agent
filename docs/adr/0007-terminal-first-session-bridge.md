# ADR-0007: Terminal-First Session Bridge and Trusted Ceremonies

- Status: Accepted
- Date: 2026-08-31
- Decision owners: Earl Ray
- Checkpoints: C6, C8-C10
- Extends: ADR-0002 and ADR-0006
- Partially superseded by: ADR-0008 for deployment ownership, credential custody,
  and the role of the public domain
- Corrected by: ADR-0011 for the external host-agent and internal Guardian model roles

## Context

Requiring a user to leave an active coding scaffold, complete a broad web form,
and then separately start an agent creates enough friction that users may avoid
Guardian or treat it as an optional afterthought. The normal interaction should
begin where the user is already delegating work: a terminal or supported coding
scaffold.

That convenience cannot turn model-authored text into trusted authority. An
interaction model may be mistaken, manipulated, or malicious, and an existing
unrestricted harness may retain shell, network, browser, credential, or alternate
tool paths that Guardian cannot constrain. A terminal bridge must therefore
separate mission drafting from mission activation and must not imply Enforced
assurance merely because Guardian MCP tools are installed.

Connection setup also must not encourage users to paste reusable provider
credentials into a model conversation, shell history, mission field, or general
Guardian form. ADR-0008 subsequently places deployment and credential ownership
with the self-hosting user rather than a Guardian operator.

## Decision

### Terminal-first entry

The primary competition experience starts through the Guardian-owned `guardian`
CLI, which launches or wraps one selected external host agent. The user can invoke
Guardian with a natural-language task or ask the host to request a Guardian session. Guardian
parses that input into a strict mission and versioned session profile, presents a
concise consequence-oriented summary, and launches the documented constrained
runtime only after direct human confirmation. Third-party scaffolds may later use
Guardian capabilities in Observed mode, but they are not the Enforced competition
reference.

The terminal remains the routine work surface. The canonical
`https://agentic-guardian.com` origin is reserved for ceremonies that benefit
from an independently authenticated human surface: confirmation of a model-
drafted or consequence-bearing mission, first-time connection, passkey enrollment
and verification, consequential approval, mission-authority expansion, revocation,
and detailed audit inspection.

### Drafting is not authority

An interaction model or scaffold integration may submit a proposed mission,
profile, connection request, or scope expansion. Every such submission is
untrusted draft input. It cannot create a session, activate authority, bind an
Enforced profile, add a destination, or increase side-effect permissions until a
human confirms the normalized result through a trusted Guardian surface.

The confirmation displays the normalized goal, resources, tools, destinations,
filesystem and network scope, lifetime, volume, and side-effect consequences.
Hidden fields, omitted defaults, model rationale, public content, and free-form
prose do not grant authority. Material edits after confirmation require a new
binding and confirmation.

### Assurance depends on launch control

A session can report Enforced only when the trusted Guardian launcher starts the
documented runtime and verifies its tool, filesystem, credential, network,
lifecycle, and profile evidence. Adding Guardian tools to an already-running
unrestricted agent provides useful mediated capabilities but cannot rule out
alternate paths; such a session reports Observed or Unknown.

The competition bridge therefore launches or wraps the external host agent inside
the Guardian-controlled runtime rather than attaching enforcement claims to an
arbitrary pre-existing process.

### Short-lived ceremony handoff

When browser interaction is required, the launcher requests a short-lived,
single-purpose handoff bound to the initiating session request, expected user,
caller, profile or operation digest, nonce, expiry, and return channel. The
browser opens the canonical HTTPS origin with an opaque one-time reference, not
mission authority or a provider credential in the URL. Completion is returned
to the waiting launcher through an authenticated channel. Wrong-user,
wrong-session, expired, replayed, modified, or already-consumed handoffs fail
closed.

The browser cannot silently confirm a model draft, and an agent opening or
clicking the link cannot substitute for required human confirmation or a
user-verifying WebAuthn assertion.

### Connections and secrets

This section's original operator-provisioned credential decision is superseded by
ADR-0008. The terminal bridge still never accepts secrets through mission text,
model tool arguments, shell history, browser URLs, or the authority database.
Provider credentials are enrolled through a trusted local setup ceremony and
remain in the self-hosting user's local credential store. Credential-holding
services expose only narrow typed results to the runner.

### Competition breadth

The reference build supports the Guardian-owned CLI, one launched or wrapped host
agent, one narrow GitHub connection, and the existing narrow Guardian capability surface. Universal
IDE plugins, arbitrary third-party harness enforcement, multi-device
  notifications and general OAuth brokerage remain deferred. The narrow local
  credential-enrollment flow is required by ADR-0008; a general secret vault is
  not.

## Consequences

- C6 must expose a narrow session-bootstrap boundary suitable for the launcher
  without letting a model self-activate a mission or receive authority-service
  capabilities directly.
- The first controlled-runner slice uses a separate strict local IPC boundary. A
  runner request identifies only its exact session binding and first turn; the
  credential-holding provider service supplies the already-fixed mission context.
  Provider tool output remains a proposal and cannot bypass deterministic policy
  or execute directly.
- C8 becomes a terminal-first product checkpoint with a small canonical web
  ceremony and audit surface rather than a web-form-first session launcher.
- The demo begins in the Guardian-owned terminal CLI, crosses to the domain only
  for trusted confirmation, connection, or passkey approval, and returns to the
  same terminal session.
- Session-request and ceremony-handoff mutation, replay, expiry, caller, user,
  return-channel, and wrong-assurance cases become required C9 adversarial tests.
- Installation instructions must distinguish the Enforced launcher path from an
  Observed tool-only integration.

## Rejected alternatives

- **Web-form-first session creation:** adds avoidable context switching and makes
  bypass more attractive without improving the authority model.
- **Treating model-submitted criteria as human intent:** lets manipulated agent
  output manufacture mission authority.
- **Calling any Guardian-enabled scaffold Enforced:** ignores alternate tools,
  credentials, and network paths outside Guardian's control.
- **Pasting provider keys into the agent or mission:** exposes reusable secrets to
  untrusted context, history, logs, and tool arguments.
- **Building universal scaffold support for the competition:** widens product and
  assurance scope before one reference integration is evidenced.

## Evidence required

Acceptance as implemented behavior requires launcher-to-bootstrap contract tests,
normalized mission confirmation and mutation tests, proof that unconfirmed model
drafts create no session authority, Enforced-versus-Observed integration tests,
local setup secret-corpus inspection, and a protected self-hosted run in the
supported terminal scaffold. If a web ceremony is included, it additionally
requires one-time handoff replay/expiry/caller/user tests, agent-click and wrong-
return-channel rejection, and provider redirect-state binding where applicable.
