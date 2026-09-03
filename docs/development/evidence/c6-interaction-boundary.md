# C6 Controlled Interaction Boundary Evidence

- Date: 2026-08-31
- Scope: local one-turn interaction IPC, deterministic fake provider, and terminal
  bootstrap attachment
- Status: implemented locally for the post-confirmation mission-brief slice;
  ADR-0012's pre-activation mission-review flow remains unimplemented

## Outcome

The Guardian CLI's confirmed bootstrap can now attach one controlled interaction
turn without returning a provider credential, IPC capability, endpoint, or
revocation handle. Trusted orchestration creates a random local named pipe or
Unix socket and an opaque capability bound to the exact session, caller, mission,
profile, policy version, and lifetime. The client request cannot supply a prompt
or replace the mission context.

The credential-holding interaction-service boundary projects only the normalized
objective, constraints, and fixed tool catalog to its provider. Its strict outcome
contains only `kind: mission_brief` and one bounded sanitized summary. A tool
proposal, permission field, activation result, extra secret-like field, or any
other output shape fails closed. The single turn is consumed before provider
invocation, preventing retry after an uncertain provider boundary.

## Deterministic evidence

Focused verification:

```powershell
vitest run packages/contracts/src/interaction-ipc.test.ts `
  packages/interaction/src/ipc.test.ts `
  apps/interaction-service/src/index.test.ts `
  apps/reference-supervisor/src/bootstrap.test.ts `
  apps/guardian-cli/src/index.test.ts
```

Result: 5 files and 17 tests passed.

The broader local suite at this revision passes 28 Vitest files and 138 tests,
TypeScript project compilation, ESLint, and dependency-cruiser over 99 modules and
164 dependencies. Dependency rules prevent the interaction package and service
from importing privileged authority, broker, or GitHub adapter internals.

Covered near misses include:

- wrong IPC capability;
- service-clock expiry;
- second-turn replay;
- caller-controlled prompt or extra authority fields;
- malformed provider output containing an extra secret-like field;
- recognizable credential redaction from provider completion text;
- secret-like material rejected from the initial session objective;
- provider output shaped as any tool proposal or permission grant; and
- capability and endpoint absence from the public bootstrap result.

## Limitations

- The provider is deterministic and fake; no Nebius model, endpoint, or credential
  is selected or exercised.
- Trusted orchestration now hosts the fake interaction service in a short-lived
  supervised child with bounded stdin bootstrap and fixed readiness. Separate
  platform peer-identity, service-identity, and child-containment evidence remain
  required.
- Only one post-confirmation turn exists. There is no pre-activation completeness
  review, clarification loop, deterministic general mission compiler, repository
  materialization, host-agent launch, or transition explanation flow.
- The CLI uses lower-assurance development confirmation. WebAuthn and the
  terminal-to-browser-to-terminal ceremony are not implemented.
- No hosted Linux or protected live-provider evidence exists for this slice.
