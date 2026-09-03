# W15 live Qwen boundary evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: First staged live boundary passed from the user-scoped integrated
  terminal; native-worker validation is next

## Executed boundary

The protected command ran from the Codex integrated terminal scoped to the exact
Guardian project checkout:

```powershell
node --test scripts/qwen-live.test.mjs
```

The script resolved only `nebius/default` through Windows Credential Manager and
invoked the fixed Qwen mission-dialogue adapter with the competition objective,
three bounded constraints, and the narrow worker catalog. It did not invoke the
native worker, Tavily, Nemotron, the broker, or GitHub.

## Minimized observed result

```json
{
  "provider": "nebius",
  "role": "mission_dialogue",
  "outcome": "mission_brief",
  "summaryLength": 158,
  "latencyMs": 1823
}
```

The Node test passed one test in approximately 2.63 seconds. The script emitted
neither the credential nor the model-generated summary.

## Platform finding

The user-scoped integrated terminal reported `nebius/default` as available and
completed the call. The managed agent command sandbox reported that same reference
as missing. This is evidence that the two execution contexts do not currently
share Windows Credential Manager visibility. It is useful credential-isolation
behavior, but the final launcher design must deliberately place credential-holding
provider children in the trusted user context while keeping the worker sandbox
outside that context.

## Claim boundary

This run proves one current, fixed-origin, credential-isolated Qwen mission-brief
call accepted the exact strict output contract with bounded latency. It does not
prove repeated schema reliability, live draft-review clarification, invalid-output
handling, native-worker behavior, process peer identity, Tavily, Nemotron,
cross-service composition, or any GitHub effect.
