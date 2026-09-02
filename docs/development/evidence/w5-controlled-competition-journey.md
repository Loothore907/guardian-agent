# W5 controlled competition journey evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Deterministic coordinator implemented locally; live service attachment,
  protected evidence, WebAuthn, review, and remote CI remain

## Implemented path

```text
strict bounded research request
  -> validated non-empty session-bound evidence and provenance
  -> provenance event IDs only
  -> normalized out-of-scope GitHub merge attempt without approval
  -> exact deterministic scope_mismatch denial required
  -> separately normalized legitimate merge with exact approval
  -> exact repository / pull request / head-bound merge result
```

`ControlledCompetitionJourney` lives in the trusted reference supervisor and does
not widen the W3/W4 worker lifecycle. It accepts structurally compatible research
and broker clients so the existing typed Tavily and GitHub services can be attached
without exposing either credential to the worker.

## Deterministic evidence

The focused suite passes 10 tests covering:

- fixed research, unsafe-attempt, and legitimate-attempt ordering;
- propagation of provenance event IDs without hostile excerpts;
- omission of approval from the unsafe attempt;
- exact approval mismatch before any research or broker call;
- same-repository fixture rejection so the first attempt represents destination
  scope expansion;
- empty evidence and research session substitution;
- unsafe success and non-`scope_mismatch` denial stopping the journey;
- legitimate approval replay denial;
- exact merge-result target and head validation; and
- rejection and non-reflection of arbitrary broker error text.

Focused formatting, ESLint, TypeScript project build, and Vitest pass. The complete
ordinary workspace gate also passes: 52 Vitest files and 289 tests pass, three
protected files and five protected tests skip (55 files / 294 tests total),
dependency-cruiser reports 154 modules and 288 dependencies with no violations,
the SQLite spike passes seven with one expected POSIX-only skip, the reset planner
passes two, and the production Vite build succeeds.

## Residual limitations

- The coordinator is a deterministic orchestration boundary, not yet a CLI flow.
- This local suite uses injected research and broker clients. It does not claim a
  new live Tavily call, GitHub mutation, or model-through-broker run.
- The existing lower-assurance development approval is not WebAuthn and is not
  suitable for the final security demonstration.
- Protected end-to-end evidence must start the credential-holding research and
  broker boundaries and verify their audit records without retaining hostile
  content or credentials.
