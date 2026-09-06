# ADR-0041: Managed-demo and BYOK credential custody profiles

- Status: Accepted
- Date: 2026-09-03
- Extends: ADR-0008 and ADR-0034
- Supersedes: none

## Context

Guardian has two materially different credential owners:

1. the project operates a funded Linux deployment for judging and a bounded
   public demonstration using project-owned provider credentials; and
2. a self-hosting user supplies credentials they own through Guardian's BYOK
   setup flow.

Treating both cases as one undifferentiated local keyring workflow creates the
wrong operational assumptions. A hosted Linux service must survive without a
desktop login keyring, while a BYOK installation should use the local user's
operating-system credential store. Conversely, building two unrelated credential
systems would duplicate provider verification, replacement, status, revocation,
broker resolution, redaction, and evidence rules.

The failed protected Linux enrollment recorded in the development handoff also
showed that a hidden-input primitive or an agent-created terminal is not by itself
a trustworthy enrollment product. The worker, model, MCP client, public web
surface, and agent tool arguments must remain outside both secret-entry paths.

Nebius AI Cloud provides
[SecretStash](https://docs.nebius.com/mysterybox/overview), whose CLI and API
retain the historical `mysterybox` service identifier. It stores encrypted,
versioned secrets and supports payload access by service accounts attached to
Compute VMs, containers, and managed services. This is a better match for
project-owned hosted-demo credentials than a desktop Secret Service session.

## Decision

### One credential system, two custody profiles

Guardian will implement one typed provider registry and one credential lifecycle
with two explicit custody profiles:

- `managed_demo`: project-owned credentials used by a hosted Linux deployment;
- `byok`: credentials owned by the local self-hosting user.

The profiles share provider and slot definitions, preflight semantics,
verification contracts, sanitized status, replacement state transitions,
credential-holding broker callbacks, redaction requirements, and assignment
capability binding. They do not share storage identifiers, identities, budgets,
or secret values.

### Managed-demo custody

The Nebius-hosted demonstration uses SecretStash as the credential system of
record. Initial operator enrollment and provider-side rotation occur through an
authenticated Nebius operator surface, outside Guardian's public application and
outside every agent or model context. Guardian configuration contains only
strictly validated non-secret SecretStash resource identifiers, payload keys,
provider bindings, pool bindings, and expected project/region metadata.

The runtime credential service uses a dedicated deployment service account with
payload-read access only to the exact configured secrets. It may retrieve a
payload only inside a provider-specific callback immediately before a fixed typed
operation. It returns only sanitized provider results and non-secret credential
status. Guardian will not expose a generic SecretStash read, write, list, or
arbitrary resource capability.

Judging and public demonstrations use separate provider credentials, SecretStash
resources, service identities where practical, Guardian connection records, and
budgets. Public exhaustion or revocation must not consume or disable the judging
pool. The public locked demo follows ADR-0034 and cannot perform an anonymous
credentialed mutation.

### BYOK custody

The BYOK profile selects only a supported local operating-system adapter:

- Windows Credential Manager;
- Linux Secret Service for a supported logged-in desktop session;
- macOS Keychain; or
- a future explicitly designed headless-Linux fallback.

There is no automatic fallback from an unavailable OS store to plaintext, an
environment variable, a repository file, or an adjacent-key encrypted file.

A Guardian-owned, user-launched local setup surface performs preflight before
enabling secret entry, identifies the provider, slot, destination store,
persistence, and intended consuming runtime, and implements enroll, verified
replacement, status, and local revoke. The exact UI technology will be selected
by a fake-secret usability and threat-model spike; an agent-created or detached
terminal is not an eligible surface.

### Shared lifecycle

For pasted credentials, the lifecycle is:

```text
preflight -> acquire -> validate -> verify -> stage -> commit -> attest
```

Cancellation or failure before commit creates no credential. Replacement keeps
the last valid credential until the new credential has verified and the store can
commit the replacement. A multi-slot credential such as GitHub cannot delete a
previous valid enrollment merely because a later replacement step failed.

GitHub retains its fixed App device-flow ceremony instead of accepting a pasted
token. It participates in the same preflight, verification, transactional commit,
status, and revoke model. Until the documented refresh endpoint succeeds, fresh
attended enrollment remains an operational fallback rather than an unattended
availability claim.

Local revoke removes Guardian's stored ability to use a credential. It does not
claim provider-side invalidation. Provider-side key rotation or revocation is a
separate typed operation and is unsupported unless a provider-specific adapter
and exact authorization boundary are implemented.

### Assignment and execution

An assignment binds a typed non-secret connection or capability reference. It
never receives a secret, store path, SecretStash payload, environment-variable
name, authorization header, or general retrieval handle. The credential-holding
service revalidates the provider, custody profile, pool, connection, session, and
operation immediately before resolution and use.

Managed-demo global, daily, source, queue, concurrency, and per-session budgets
are deterministic authority state. Provider-side project quotas and spending
limits remain an outer containment layer. Model output and public requests cannot
select a pool, credential, SecretStash resource, model identifier, destination,
or higher budget.

## Consequences

- The hosted demo no longer depends on a GNOME keyring or interactive user
  session.
- BYOK remains local-first and does not turn Guardian into a multi-tenant secret
  custodian.
- Operators and BYOK users share lifecycle behavior even though the managed-demo
  secret is initially provisioned through Nebius and the BYOK secret is entered
  through Guardian's local setup surface.
- SecretStash integration adds a deployment-specific credential-store adapter,
  IAM configuration, fixed-resource validation, and protected retrieval evidence.
- Full Windows, Linux, and macOS BYOK compatibility remains three separate
  implementation and assurance claims.
- An encrypted local file is not accepted merely because it is encrypted; its
  independent wrapping-key custody, permissions, backup behavior, replacement,
  recovery, and deletion semantics would require a separate ADR and evidence.

## Rejected alternatives

- **GNOME Secret Service for the hosted demo:** depends on a desktop user session
  and does not match an unattended service identity.
- **One shared credential pool for judges and public traffic:** allows public
  exhaustion or revocation to disable judging and correlates incident scope.
- **Secrets in deployment environment variables:** exposes values through a broad
  process-inheritance and diagnostic surface.
- **Generic SecretStash proxy:** widens a fixed provider capability into arbitrary
  secret retrieval.
- **Public or MCP-based enrollment:** places reusable credentials in an
  agent-accessible or remotely exposed ingestion path.
- **A common encrypted file with an adjacent key:** moves rather than solves the
  custody problem.

## Evidence required

- strict provider/profile/pool/store/resource contracts and substitution tests;
- service-account least-privilege configuration and wrong-resource rejection;
- SecretStash payload retrieval only inside credential-holding callbacks;
- no secret in agent/model/MCP/public contexts, argv, environment, files, logs,
  traces, audit records, errors, or results;
- separate public and judge credentials plus provider and Guardian budgets;
- transactional replacement, cancellation, rollback, replay, expiry, and
  concurrent-use tests;
- fake-secret usability tests for the selected local setup surface before any
  protected BYOK enrollment;
- protected Linux managed-demo verification and consumption evidence;
- platform-specific protected BYOK evidence before claiming support for Windows,
  Linux, or macOS.
