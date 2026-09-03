# W16 live worker policy-correction evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Model-catalog drift corrected; policy v2 Kimi final-response boundary
  passed

## Executed boundary

The protected native-worker test ran from the user-scoped Codex integrated
terminal using `nebius/default` from Windows Credential Manager:

```powershell
node --test scripts/native-worker-live.test.mjs
```

The first attempt stopped with the public error `native worker provider is
unavailable` after approximately 1,899 ms. After adding bounded sanitized
diagnostics, the same boundary stopped with:

```json
{
  "provider": "nebius",
  "role": "native_worker",
  "diagnostics": [{ "kind": "http_error", "status": 404 }]
}
```

The second attempt failed after approximately 2,048 ms. No provider body, header,
credential, or model-generated content was printed.

The first version 2 Kimi rerun reached the live model but failed closed with a
sanitized HTTP 400 after approximately 2,459 ms. This distinguishes the result
from the unavailable v1 model's 404 and narrows the next check to request-format
compatibility. It does not establish which request field was rejected.

The credential-safe compatibility probe then returned:

```json
{
  "results": [
    { "variant": "text", "outcome": "accepted_text" },
    { "variant": "json_object", "outcome": "accepted_json_object" },
    { "variant": "simple_json_schema", "outcome": "accepted_json_object" }
  ]
}
```

No response body or generated content was emitted. This localizes the HTTP 400 to
the full union-heavy Guardian schema rather than Kimi availability or general
structured-output support.

## Inventory finding

The credential-isolated fixed-endpoint inventory probe ran as:

```powershell
node scripts/nebius-worker-model-inventory.mjs
```

Its minimized result established that the version 1 pin
`Qwen/Qwen3-Coder-30B-A3B-Instruct` was unavailable, no Qwen Coder candidate was
present, and `moonshotai/Kimi-K2.7-Code` was among the bounded available worker
candidates. The probe emitted model identifiers and availability only.

## Design correction

ADR-0031 preserves the unavailable version 1 assignment as history and introduces
`competition-2026-09-01` version 2 with `moonshotai/Kimi-K2.7-Code` as the native
worker. The built-in registry now resolves the exact policy identifier and
version. It does not choose a fallback from live inventory.

ADR-0032 changes the provider reliability mechanism from the rejected full strict
schema to JSON-object mode with guidance derived from the turn's exact allowed-tool
catalog. Guardian's bounded JSON parse, strict `WorkerOutcomeSchema` validation,
and independent dispatcher catalog check remain the enforcement boundary; invalid
or out-of-catalog model output still fails closed or is denied.

## Corrected live result

The corrected protected adapter ran from the user-scoped integrated terminal:

```powershell
node --test scripts/native-worker-live.test.mjs
```

It returned one strict final response without requesting a tool:

```json
{
  "provider": "nebius",
  "role": "native_worker",
  "outcome": "final_response",
  "responseLength": 68,
  "latencyMs": 2159
}
```

The test passed in approximately 2.97 seconds. The generated response content and
credential were not emitted.

The ordinary verification after this correction passes 61 Vitest files and 344
tests, with 3 protected files and 5 protected tests skipped. TypeScript project
compilation, formatting, lint, the 176-module/354-dependency boundary gate, the
SQLite and reset checks, and the Vite production build also pass.

## Claim boundary

This evidence proves that the credential was usable for inventory, the v1 model
was absent from the visible live catalog, the 404 and 400 diagnostics remained
sanitized, and the reviewed v2 assignment is exact and test-bound locally. It
proves Kimi accepted text, JSON-object mode, and a simple strict JSON schema, and
that the corrected adapter returned one locally validated final response. It does
not prove repeated reliability, typed tool selection, denial continuation,
multi-turn behavior, task quality, containment, or the final judge environment.
Those claims require the remaining staged gates.
