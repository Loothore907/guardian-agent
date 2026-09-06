# Credential placement and plan approval

Date: 2026-09-06

Status: Product design discussion; generalized transfer adapters and runtime
credential-copy plan grants are not implemented by this document.

## Product direction

The user confirmed Nebius as the default production provider while preserving
BYOK, model choice, and deployment choice. Those are separate choices. A model
choice does not select a secret store; a cloud deployment does not change who
owns a key. Supported providers and model roles remain constrained by typed
adapters and their verified capabilities.

The current `managed_demo`/`byok` profiles in ADR-0041 cover the existing demo and
local desktop paths. Hosted BYOK needs an explicit extension rather than treating
BYOK as necessarily desktop-only or relabeling a customer's key project-owned.
This document proposes that extension; it does not change the current schema.

| Execution location | Intended credential placement | Setup path |
| --- | --- | --- |
| User's desktop | Supported OS credential store | Enroll locally and use the local protected executor |
| User's Nebius deployment | Customer's selected SecretStash resources | Bind an existing resource, enroll directly through a trusted setup surface, or approve a copy from the OS store |
| Another supported cloud/headless deployment | Explicit supported deployment secret store | Use a tested store adapter; no implicit file/environment fallback |
| Guardian-managed service | Deployment-owned secrets, or explicitly isolated hosted customer BYOK | Keep ownership, tenant, readers and budgets distinct; hosted multi-tenant BYOK is future work |

SecretStash is the deployment's secret manager. It can hold credentials issued
by different API providers. Copying a Tavily credential into Nebius SecretStash
does not change the API provider or grant the model access to that credential.
Nebius's [metadata and payload interfaces](https://docs.nebius.com/mysterybox/secrets/get)
separate secret creation from payload viewing, which requires a distinct role.

## Proposed user journey

Choose the runtime, provider/model roles and connection. Guardian resolves the
appropriate supported store and shows a non-secret readiness summary. Prefer
binding an existing deployment secret or direct enrollment when no local copy
is needed. Offer a protected local-to-deployment copy when the user wants to
reuse an enrolled local key. The agent receives connection capabilities and
sanitized results, never key values or generic secret-store access.

Provisioning belongs in a trusted setup/control process outside the public agent
runtime. For a copy: preflight source and destination, validate the approved
scope, transfer through the protected path, verify the destination, attach only
the named runtime readers, and record a sanitized result. Partial failures must
reconcile before retry; retries must not create duplicate secrets or broaden
access. The runtime remains disabled until required protected-use checks pass.

Copying preserves the source. Deleting the local copy, invalidating the provider
key, replacing another secret, adding readers, and expanding provider permissions
are separate effects requiring inclusion in the approved plan. Copying an API
key cannot narrow the permissions originally granted by its issuer.

## Approval pattern

A user should approve one concrete deployment plan. Its credential-copy operation
names the source connection/slot, destination account/project/store and exact
resource or narrow trusted creation selector, provider binding, runtime readers,
copy semantics, count/retry limits, expiry and verification preconditions. Secret
values are not part of the human-readable plan or public audit. A durable grant
binds those fields to the confirmed plan digest/version and issuer.

At execution the trusted boundary resolves any permitted new resource ID,
re-normalizes the operation, checks plan membership and remaining limits, and
records the outcome. Resolving an ID must not permit another project, provider,
reader or operation. Model text and conversation summaries do not create grants.
Changed destinations, extra readers, source deletion, exhausted limits, expiry
or uncertain identity require a new decision. An unchanged, authorized transfer
does not require another prompt merely because it involves a credential.

This follows ADR-0039's plan-bound authority direction. Its current runtime slice
covers bounded GitHub operations; a typed credential-copy executor, durable
receipt, idempotent reconciliation and adversarial tests remain future work.
Tests must cover wrong destination/provider/reader, replay, source replacement,
partial failure, expiry, compaction-independent grant persistence and redaction.

## Current KC operator evidence

The development continuation used an ignored operator provisioning script, not a
shipped migration feature. An external automatic approval review rejected the
initial transfers despite broad session approval. The user subsequently gave
exact approval for both named transfers. They succeeded with the VMs stopped,
using protected stdin and metadata-only output. This does not prove automatic
plan membership or complete hosted credential containment. Repository guidance
now explicitly includes scope-bound credential provisioning; it cannot change
the external platform's approval-review policy.
