# W17 live worker typed-request evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Exact permitted native-worker tool selection passed

## Executed boundary

The protected native-worker tool-selection test ran from the user-scoped Codex
integrated terminal using `nebius/default` from Windows Credential Manager:

```powershell
node --test scripts/native-worker-tool-live.test.mjs
```

The turn exposed exactly one permitted model-visible tool,
`guardian.session_status`, and instructed the worker to request that tool rather
than return a final response.

## Live result

The credential-isolated provider returned one locally validated typed request:

```json
{
  "provider": "nebius",
  "role": "native_worker",
  "outcome": "tool_request",
  "tool": "guardian.session_status",
  "latencyMs": 2138
}
```

The Node test passed in approximately 2.96 seconds. It did not print generated
arguments, model content, a provider response body, or the credential.

## Enforcement interpretation

This run establishes that the version 2 Kimi worker can select the exact permitted
typed capability through the JSON-object provider mode introduced by ADR-0032.
The returned object passed strict local `WorkerOutcomeSchema` validation, and its
tool name matched the exact per-turn catalog. The model-visible guidance was
derived from that turn catalog rather than from the broader session capability
ceiling.

The result is still a pending request. The worker provider did not authorize or
execute the tool, and it cannot widen the catalog. Guardian's dispatcher must
independently bind, authorize, meter, execute, and sanitize any accepted request.

## Claim boundary

Together, W16 and W17 prove one live final-response outcome and one live exact
typed-request outcome for the current worker assignment. This run does not prove
live execution, denial continuation, replay handling at the live provider
boundary, repeated reliability, containment, task quality, or the hosted judge
runtime. The next worker sub-gate is a denied typed request followed by the
required sanitized continuation/final response.
