# C6 GitHub Broker Evidence

- Date: 2026-08-30 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Branch: `codex/13-c6-durable-authorization-broker`
- Dedicated target: [Loothore907/guardian-agent-demo](https://github.com/Loothore907/guardian-agent-demo)
- Status: Deterministic local path, protected exact-head PR read, and protected
  one-use squash merge passed

## Implemented path

The credential-holding broker service uses a session-bound authenticated authority
IPC client and maps one configured protected-store handle to one scoped GitHub
credential. The resolver supplies temporary credential bytes only within the
awaited typed-adapter callback and the store clears them afterward. It serializes
refresh, uses GitHub's fixed token endpoint, rotates access and refresh tokens,
and writes non-secret expiry metadata last. Only the separate central authority service opens SQLite. Neither the
interaction runtime, research provider, command sandbox, durable database, result,
error, nor authority-context record receives the reusable credential.

The GitHub adapter exposes only:

- a typed pull-request read against `https://api.github.com`;
- a squash-only merge carrying the exact expected head SHA;
- fixed headers, redirect rejection, a ten-second timeout, and a streaming 64 KiB
  response limit; and
- strict allowlisted snapshots, merge results, and error codes.

The broker re-parses the canonical request, checks the durable session identity and
lifetime, exact scoped connection and permission, stored approval, digest, scope,
expiry, and replay state before the first provider call when those facts are
locally knowable. After recording the attempt and validating the connection scope,
it sends a minimized credential-free GitHub proposal, deterministic floor, and
bounded risk signals to an injected trusted Guardian evaluator. The returned
evaluation is strictly reparsed and recomputed against the deterministic floor.
Denial, step-up, invalid structure, inconsistency, or unavailability stops before
credential resolution, tool charging, approval consumption, or GitHub. It durably charges the logical tool call before credential
resolution and the GitHub read, compares the current head, then re-parses and re-digests immediately
before atomically consuming the nonce. GitHub receives the expected SHA again, so
a concurrent head change fails at the merge endpoint. A nonce remains consumed
after any post-consumption failure.

For requests whose audit writes succeed, the broker records a minimized attempt
and one decision. The record links only pre-existing evidence-exposure IDs, exact authority bindings,
a safe canonical digest, typed effect/destination classes, bounded reason codes,
Guardian outcome, Guardian-provider and GitHub-adapter crossing, separate
tool/approval consumption, and control outcome. Tests prove pre-provider
approval rejection and replay are reconstructable without retaining the credential
fixture or provider prose.

## Verification

The current complete local checks pass 33 Vitest files and 169 tests, with five
protected tests skipped. The C6-focused tests cover:

- fixed endpoint, headers, redirect posture, timeout configuration, and exact
  squash/SHA request projection;
- malformed, declared/chunked oversized, credential-polluted, and non-success provider responses;
- routine scoped read and allowlisted result projection;
- minimized Guardian request projection, deterministic-floor preservation,
  uncertainty/step-up, inconsistent-output failure, and durable Guardian outcome;
- missing, mutated, expired, replayed, cross-session, cross-connection,
  scope-expanded, and changed-resource denial;
- zero GitHub invocation and zero durable tool consumption for deterministic
  preflight rejection;
- exact successful merge, atomic one-time consumption, and conservative
  post-boundary failure behavior;
- minimized attempt/decision reconstruction and credential absence; and
- authority-service startup interruption followed by a newly bound session.

## Protected evidence

The GitHub App is installed only on repository ID `1352093544`. Device flow
verified `GitHub @Loothore907` and stored expiring `ghu_`/`ghr_` material in
Windows Credential Manager. On 2026-08-31 AKDT, the protected live test passed
through authenticated authority IPC, the callback-scoped Windows resolver, and
the fixed typed adapter. It issued only the pull-request read operation for PR #1.
That initial empty-repository run returned the sanitized
`connection_unavailable` outcome; the public result contained no credential
material and no repository mutation occurred.

After explicit fixture-seeding authorization, the GitHub connector initialized
`main` at `44a84282649a5705dbc34d11e9dcc5b24edc4c9e`, created only branch
`guardian/demo-fixture-pr`, added the harmless non-executable fixture, and opened
[PR #1](https://github.com/Loothore907/guardian-agent-demo/pull/1) at exact head
`e7e0425959e52e0fed968c4442181bfd878a1235`. A second protected broker run bound
that head into the canonical request and returned the allowlisted open, non-draft,
`main`-based snapshot.

After a separate explicit user approval for exactly PR #1, squash method, and
head `e7e0425959e52e0fed968c4442181bfd878a1235`, the protected merge harness issued
a fresh one-use development approval, stored it through authorization-role IPC,
re-read the PR, revalidated the exact head and request digest, atomically consumed
the nonce, and invoked the typed squash operation. GitHub closed PR #1 as merged
at `2026-09-01T06:08:05Z`, producing squash commit
`16263e7a0e9bc81df55bac9b8413fc2256077a9d`. A read-only connector check confirmed
the final state. This proves the C6 execution mechanics; the confirmation is
explicitly lower-assurance development evidence, not the future user-verifying
WebAuthn ceremony.

A preceding migration of enrollment created before expiry metadata existed made a
real refresh request. The returned pair did not pass the complete strict
response/write transaction, so Guardian deleted access, refresh, and metadata
slots and required device enrollment again. That is the intended fail-closed
recovery, but it does not prove successful live refresh. Re-enrollment then wrote
all three slots and enabled the protected read above.

## Remaining gate

The dedicated public target exists, is configured for squash-only merges, has the
App installed only on that repository, and its first controlled fixture PR is
squash-merged. The deterministic reset procedure has seeded live PR #2, and the
application-visible process/database/log/audit secret corpus passes. Successful
protected refresh, OS process supervision, and the user-verifying approval
ceremony remain before the showcased credential-path claim can advance.

The deterministic evidence uses injected fake Guardian and GitHub providers plus
local authority IPC; the protected GitHub probes use the real installed App,
Windows Credential Manager, and GitHub. The Nebius models separately pass their
protected compatibility path, but a protected model-through-broker execution has
not been run. C6 still requires full launcher/research durable-budget integration,
security review, and remote CI.

## Sources

- [GitHub REST API: Pull requests](https://docs.github.com/en/rest/pulls/pulls)
- [ADR-0005](../../adr/0005-durable-authority-and-rejection-context.md)
- [C6 durable authority store evidence](c6-authority-store.md)
