# C6 Credential-Isolated Nebius Model Adapter Evidence

- Date: 2026-09-01
- Scope: the implemented mission-dialogue mission-brief/draft-review adapter,
  deterministic formation contracts, and Nemotron guardian provider adapter
- Status: deterministic, model-inventory, and protected live-inference evidence pass

## Outcome

The two cloud roles now use separate typed adapters over the fixed Nebius Token
Factory chat-completions endpoint. ADR-0013 binds the exact assignments to the
trusted `competition-2026-09-01` v1 model policy:

- optional Guardian mission brief: `Qwen/Qwen3-235B-A22B-Instruct-2507`;
- primary Guardian judgment: `nvidia/nemotron-3-super-120b-a12b`;
- quality escalation: `nvidia/Nemotron-3-Ultra-550b-a55b`.

One authorized authenticated read-only request to the Token Factory model-list
endpoint confirmed that all three exact identifiers are currently available.
Lightning is not a security fallback. Super remains primary; structurally invalid
Super output triggers a recorded call to the more capable Ultra model. Invalid or
unavailable Ultra output denies, and no invalid response is normalized or guessed.

Both adapters resolve only `nebius/default` inside the credential-holding service
callback. The key is absent from the typed model context and request body, and the
credential store clears its temporary byte copy after the callback. Neither
adapter accepts a caller-controlled origin, URL, model, header, or response
schema. Trusted application configuration may supply a newer validated model-
policy version; the host/session prompt cannot. Responses are JSON-only,
streaming-bounded to 128 KiB, and strictly projected.

The mission-dialogue adapter receives only a normalized mission context for a
strict `mission_brief`, or a policy-version-bound draft envelope for strict
`ready` / `needs_clarification` review. It cannot fill a permission, propose a
tool, compile authority, or perform the host agent's work. The
Nemotron adapter receives only a strict,
credential-free envelope containing the typed proposal, deterministic floor,
bounded risk signals, and at most four bounded untrusted excerpts. Its structured
recommendation is passed through deterministic precedence. A lower
recommendation cannot lower the floor, uncertainty steps up, and missing
credentials, provider failure, malformed output, or polluted output deny. Guardian
assigns protocol `schemaVersion: 1` locally rather than asking a model to generate
protocol metadata.

The supervised interaction child now accepts an explicit `qwen` mode. It reads
the Nebius credential directly from Windows Credential Manager; the supervisor
does not place the key or a reusable secret handle in bootstrap, argv, or the
environment. The existing fake mode remains the ordinary deterministic path.

## Reproducible checks

```powershell
pnpm exec vitest run `
  apps/interaction-service/src/index.test.ts `
  apps/interaction-service/src/nebius.test.ts `
  apps/guardian-service/src/index.test.ts `
  apps/reference-supervisor/src/supervised-process.test.ts `
  apps/reference-supervisor/src/index.test.ts

pnpm typecheck
pnpm lint
pnpm boundaries
```

The focused five-file run covers fixed origins and models,
separate context projections, missing credential/provider non-invocation,
credential exclusion from bodies, strict and oversized response rejection, the
five planned guardian evaluation classes, deterministic-floor precedence,
uncertainty, unavailable behavior, sanitized failure classification, and explicit
Super-to-Ultra quality escalation.

## Protected live check

The guarded command below performs a bounded paid provider sequence and is
intentionally outside ordinary CI:

```powershell
$env:GUARDIAN_TEST_NEBIUS_MODELS = "1"
pnpm test:live:nebius-models
```

It reads the locally enrolled `nebius/default` credential through Windows
Credential Manager and does not accept `.env.local` or print the key or raw
provider responses.

The protected run passes. Qwen returned a strict mission brief. Super returned a
structurally invalid authorization enum, which Guardian rejected and recorded as
a quality escalation. Ultra then returned a valid strict recommendation. The
effective authorization did not fall below the deterministic `confirm` floor. The
successful end-to-end provider test completed in approximately 6.1 seconds. Only
allowlisted diagnostic categories were exposed during diagnosis; provider prose,
headers, credentials, and raw responses were not printed.

## Claim boundary

This evidence proves deterministic adapter behavior, current model inventory, and
one protected live compatibility path. It does not establish general model quality,
stable latency, or a task-level cost benchmark. A strict Guardian evaluator is now
attached to the deterministic broker path and its minimized durable outcomes are
tested; a protected model-through-broker execution has not been run. The CLI still
selects the fake mission-brief process by default. Windows process identity/containment and Linux credential
resolution remain incomplete, so this does not independently establish Enforced
assurance.

ADR-0012's strict draft-review contracts and deterministic formation coordinator
now pass locally. The coordinator caps review turns, rejects model readiness for
mechanically incomplete drafts, revalidates clarification revisions, clamps
permissions to a trusted ceiling, records explicit structured/Qwen/fallback
routes, binds model-policy ID/version, and consumes the exact preview digest once.
The structured reference bootstrap uses that compiler before its existing direct
confirmation. The assisted CLI/supervisor path now uses separate one-use,
revision-bound mission-review and digest-bound setup-risk child processes;
clarification answers are revalidated as a complete untrusted revision. Missing,
denied, step-up, mismatched, replayed, or malformed setup review cannot produce a
confirmable preview. This evidence does not cover a protected live draft-review/
setup-risk sequence or fresh external-host launch.

## Sources

- [Nebius Token Factory model list](https://docs.tokenfactory.nebius.com/api-reference/models/list-models)
- [Nebius structured JSON output](https://docs.tokenfactory.nebius.com/ai-models-inference/json)
