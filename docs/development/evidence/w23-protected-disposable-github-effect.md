# W23 protected disposable GitHub effect

- Date: 2026-09-03 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Target: `Loothore907/guardian-agent-demo#2`
- Authorized head: `36251caf778466a7d08670ad8210375daf8a9bcb`
- Method: squash
- Result commit: `7df353afe005b74811dfcd081ac98af5695a8170`
- Status: passed with one explicitly authorized remote mutation

## Preconditions

W22's single-session live no-effect journey passed before this effect was
considered. A fresh public read showed PR #2 open, non-draft, cleanly mergeable
into `main`, and still at the recorded exact head. Changed-file metadata showed
only two additions to `fixtures/approved-change.md`, the fixed harmless path from
the deterministic reset plan; raw remote patch and PR-body text were not ingested
for authority.

The first protected typed read failed closed with `connection_unavailable`. The
disposable target remained unchanged. This was consistent with the documented
roughly eight-hour GitHub App access lease and known provider-side refresh
failure. The operator completed a fresh GitHub device-flow ceremony; no token was
pasted into the terminal, model context, evidence, or repository. The exact-head
protected read then passed.

## Exact authorization

After the protected read, the operator separately authorized only:

- repository `Loothore907/guardian-agent-demo`;
- pull request `#2`;
- expected head `36251caf778466a7d08670ad8210375daf8a9bcb`; and
- squash merge method.

The live harness derived a fresh one-use development approval bound to the
canonical request, session, caller, connection scope, policy version, resource
version, expiry, and nonce. This remains lower-assurance development evidence;
it is not the future user-verifying WebAuthn ceremony.

## Protected execution

The merge flag was enabled only for the separately authorized run:

```powershell
$env:GUARDIAN_TEST_LIVE_GITHUB_BROKER = '1'
$env:GUARDIAN_GITHUB_LIVE_PULL_REQUEST = '2'
$env:GUARDIAN_GITHUB_LIVE_HEAD_SHA = '36251caf778466a7d08670ad8210375daf8a9bcb'
$env:GUARDIAN_GITHUB_LIVE_MERGE = '1'
node node_modules/vitest/vitest.mjs run apps/broker-service/src/live.integration.test.ts
```

The protected test passed in 8.23 seconds, 8.90 seconds total. The broker re-read
the pull request, revalidated the exact head and canonical digest immediately
before execution, consumed the one-use approval, resolved the GitHub credential
only inside the typed adapter boundary, and issued the squash-only operation.

## Final verification

A separate read-only GitHub check returned:

- PR state `closed` and `merged: true`;
- merged at `2026-09-03T13:48:55Z`;
- unchanged source head `36251caf778466a7d08670ad8210375daf8a9bcb`; and
- squash commit `7df353afe005b74811dfcd081ac98af5695a8170`.

The only remote mutation in W23 was the explicitly authorized merge of PR #2.
No main-repository push, pull request, release, deployment, remote-setting change,
or additional disposable-target mutation occurred.

## Closing verification

The complete ordinary gate passed after the evidence and claim updates:

- Prettier and ESLint passed;
- TypeScript compilation passed;
- Vitest passed 61 files / 362 tests, with three protected files and five
  protected tests skipped by default;
- SQLite passed seven tests with the expected Windows POSIX-permission skip;
- the deterministic reset planner passed two tests;
- dependency-cruiser found no violations across 176 modules / 354 dependencies;
- the production Vite build passed; and
- `git diff --check` and lockfile-integrity checks passed.

The bounded scan found no private-key, credential-database, log, trace, or similar
artifact files. One newly added credential-pattern line is the explicit fake
provider credential in a research-service failure test; no reusable credential or
credential-equivalent material was added. Final changed-surface review found no
blocking security issue.

## Review transition

The reviewed W20-W23 stack was checkpointed as `48b082d`, pushed on
`codex/13-c6-durable-authorization-broker`, and opened as main-repository PR #14.
The first CI run failed before tests because frozen install found stale workspace
importer entries in `pnpm-lock.yaml`: a duplicate broker-service dev dependency
and a missing reference-supervisor dev dependency. Regenerating only the lockfile
offline produced the canonical importer order and relationships. A subsequent
offline `pnpm install --frozen-lockfile` and the exact `pnpm check` CI command both
passed locally. The correction was committed as `9acab1f`; replacement CI passed
in 1m45s, including frozen install, required checks, and the production dependency
audit. PR #14 is open and mergeable with no reviews or comments. No runtime code
or security claim was relaxed for this correction.

## Claim boundary

W23 proves the protected exact-head read and one-use squash effect mechanics for
the narrow disposable GitHub adapter with fresh device enrollment. Combined with
W22, the prerequisite live no-effect assembly and the later separately authorized
effect both pass. It does not prove that the fixed competition coordinator ran
the whole journey in one invocation, that a model generated the proposal, that
automatic GitHub refresh succeeds, or that WebAuthn, hosted containment, platform
parity, and the public judge experience are complete.
