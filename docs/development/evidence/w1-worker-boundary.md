# W1 worker-boundary evidence

Date: 2026-09-01 (AKDT)

## Scope

This record covers only the provider-neutral single-turn worker boundary. It does
not cover a persistent workspace, execution of model-requested tools, sanitized
tool-result feedback, multi-turn state, denial containment, a protected live
Nebius worker call, or an Enforced worker runtime.

## Implemented boundary

- `@guardian/contracts` defines the strict worker assignment, exact turn envelope,
  remaining budgets, two-outcome provider contract, typed request shapes, IPC
  frames, bounded failure reasons, and bootstrap result state.
- `@guardian/worker` creates and revalidates the canonical turn digest and owns
  bounded one-use local IPC. It consumes the turn before provider invocation and
  rejects wrong capability, session, turn ID/number/digest, time, replay, frame,
  catalog, and budget state.
- `@guardian/worker-service` provides the deterministic fake and credential-
  holding Nebius adapters behind the same interface. The Nebius adapter resolves
  only `nebius/default`, calls only the fixed Token Factory chat-completions
  origin, requires the policy-assigned native-worker model, and gives the model a
  credential-free projection without trusted IDs or the turn digest.
- The reference supervisor creates turn 1 only after exact confirmation and
  runtime launch, runs the worker in a short-lived supervised child, closes it
  after the response, and returns a final response or sanitized pending request.
  It does not execute the pending request.

## Deterministic evidence

The focused suite covers:

- allowed final-response and typed-request outcomes;
- assignment-policy and exact-digest mutation;
- wrong capability, session, and turn number;
- pre-provider expiry, replay, and oversized request rejection;
- provider non-invocation on deterministic boundary rejection;
- unknown trusted fields and arbitrary command, URL, header, and shell shapes;
- unsupported or budget-exhausted tool requests;
- credential-like and malformed output failing with bounded public errors;
- Nebius fixed endpoint/model capture and credential confinement to the
  authorization header;
- model-context exclusion of the provider credential, session ID, caller ID, and
  turn digest; and
- a real supervised deterministic worker-service child using bounded stdin and
  one-use IPC.

Focused command:

```text
node node_modules/vitest/vitest.mjs run packages/contracts/src/worker.test.ts packages/worker/src/index.test.ts apps/worker-service/src/index.test.ts apps/worker-service/src/nebius.test.ts apps/reference-supervisor/src/bootstrap.test.ts apps/reference-supervisor/src/worker-process.test.ts apps/guardian-cli/src/index.test.ts
```

Result: 7 files and 31 tests passed locally before the ordinary complete gate.

The complete ordinary gate then passed: Prettier, ESLint, TypeScript project
references, 48 Vitest files / 244 tests (three files / five protected tests
skipped), the seven-test SQLite spike with its expected Windows POSIX-permission
skip, the two-test demo reset planner, dependency boundaries over 143 modules and
254 dependencies with no violations, and the production Vite build.

## Residual limitations

- No live Nebius worker request ran for this evidence record.
- Windows Credential Manager behavior is inherited from the separately recorded
  C6 credential-store evidence; complete worker child peer identity and process
  containment are not proven.
- The C4 command sandbox still starts every command with an empty disposable
  `/workspace`; W2 must solve safe session workspace materialization and
  persistence.
- W3 must independently turn a pending request into a trusted proposal, rebind
  and authorize it, execute only the typed capability, meter it, sanitize the
  result, and feed a bounded result to a later turn.
