# Judge portal local foundation, 2026-09-05

Scope: [approved action plan](../judge-portal-action-plan.md), ADR-0050.
The user approved all in-scope local actions. Changes remain uncommitted alongside
the retained W27/W28 and launch/headless work on `codex/13-c6-linux-provider-containment`.

## Implemented local slice

- Strict seeded/custom task inputs, exact target/limit preview, caller/preview-bound
  one-use development confirmation, 30-second expiry and backwards-time rejection.
- Authentication before preparation; unknown fields/query authority rejected and
  public errors stripped of submitted URL/body/error details.
- A budget adapter that admits before runtime preparation, validates reporter
  bindings, settles once and treats abandoned previews conservatively.
- Persistent exclusive mutation fixture reservations, shared across pool instances
  and restarts. There is no automatic release, reset or replenishment.
- Scenario cards, custom-task fields, exact scope review and separate evidence
  labels. Default catalog marks all execution unavailable. Development proxy points
  to the existing loopback control API on port 4317.

## Reproducible evidence

| Tests                                                  | Evidence                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/src/judge-portal.test.ts`          | Public/private/encoded/credential-bearing URL near misses, secret-like objective and unknown capability fields, model assertion versus boundary event                                          |
| `apps/control-api/src/judge-portal.test.ts`            | Exact one-use confirmation, concurrency/replay, source/digest binding, expiry/backwards time, scope substitution, cancelled and active sessions, sanitized cleanup failure, defensive previews |
| `apps/control-api/src/judge-portal-routes.test.ts`     | Real Fastify injection through authentication, preview and confirmation; sanitized malformed/unknown URL results; disabled default catalog                                                     |
| `apps/control-api/src/judge-portal-budget.test.ts`     | Admission ordering, wrong bindings, denial before runtime, single settlement, abandonment and settlement failure                                                                               |
| `apps/reference-supervisor/src/judge-fixtures.test.ts` | Concurrent pool instances, persistent exclusion after restart, duplicate PRs with changed heads and invalid fixture operations                                                                 |

Run the five files with Vitest, or run `pnpm check` for the complete required suite.
Final `pnpm check` passed on both platforms:

- Windows: 604 tests passed, 18 skipped (79 passing files, 5 skipped).
- Linux: 616 tests passed, 6 skipped (80 passing files, 4 skipped).
- Both: format, lint, typecheck, required SQLite/reset/preflight/supervised-GitHub/
  headless-host suites, dependency checks (222 modules / 490 dependencies) and
  production builds passed. Windows skips the POSIX SQLite permission case.
- Logs: ignored `tmp/judge-portal-windows-check.log`; Linux stage
  `/home/loothore907/guardian-w27-session-20260904/tmp/judge-portal-linux-check.log`.

Linux synchronization is limited to 14 changed/new source files; prior hashes were
verified before every write, and unexpected source-stage differences would abort.

Local preview smoke checks returned HTTP 200 for the Vite page and proxied catalog.
No browser interaction or visual QA was performed. No real provider effect, paid
operation, GitHub token mint, credential read/change, remote fixture creation,
source publication or deployment occurred. WSL again reported a failed systemd
user session; offline test success does not resolve that host defect.

## Explicit limits and remaining work

Runtime integration tests use synthetic callbacks. They do not establish actual
model/tool dispatch, grant-before-worker ordering through the new adapter, live
budget-service composition or useful model-produced final answers. `prepareRuntime`
is a trusted extension point and has no installed live portal adapter yet.

The evidence enum is a strict public projection, not a cryptographic provenance
attestation. Only a trusted runtime may report actual boundary events. Portal
results deliberately permit only Observed/Unknown, not Enforced. Shared judge
access and a source fingerprint are not per-person identity or WebAuthn. Preview
state is in memory; restart loses it and cannot resume it. A reserved mutation
fixture stays consumed after abandonment or uncertainty pending operator review.
Windows fixture tests establish exclusivity, not Windows ACL privacy.

The [C7 integration boundary](../c7-judge-portal-integration.md) details typed
research/GitHub result paths, seed-content access, bounded worker continuation and
real supervisor wiring. Applicable C6 containment and actual-host acceptance remain
required. This is the first portal foundation checkpoint, not completion of the
whole local implementation plan or a hosted judging-readiness claim.
