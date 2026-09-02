# C6 Local Credential Enrollment Evidence

- Status: Deterministic setup path implemented and tested locally; protected
  GitHub App device enrollment and account verification pass
- Date: 2026-08-31
- Scope: provider-scoped contracts, deterministic store, Windows Credential
  Manager adapter, fixed-origin verification, GitHub App device flow, and
  executable setup orchestration

## Implemented slice

`@guardian/credential-store` defines only three provider scopes: Nebius, Tavily,
and GitHub. References contain a provider and bounded local slot; status responses
contain only `available` or `missing`. The store does not expose enumeration or a
general secret-retrieval API. Credential-holding code receives a temporary byte
copy only inside a scoped callback, and that copy is zeroed afterward.

The deterministic in-memory implementation proves provider isolation, exact-slot
rotation, exact-slot revocation, missing-material failure, and temporary-copy
zeroing. Dependency Cruiser prevents the command sandbox, agent-facing domain
packages, policy, adapters, and non-credential-holding applications from
importing the credential store.

The reference-platform adapter uses Windows Credential Manager generic
credentials under fixed `AgenticGuardian/<provider>/<slot>` targets. A static
non-interactive PowerShell helper calls `CredWriteW`, `CredReadW`, and
`CredDeleteW`. The helper program contains no credential. The credential is sent
only over the helper's stdin with a minimal non-secret environment; it is never
placed in argv. Status checks do not copy credential bytes out of Windows
Credential Manager. Helper stderr is discarded and failures become the same
sanitized `CredentialStoreError`.

The Guardian setup orchestrator accepts exactly one supported provider, requires
interactive input, obtains a hidden byte buffer, invokes a provider-bound verifier
before storage, rejects a verifier result for a different provider, writes only
after successful verification, emits only provider and bounded account-label
metadata, and zeroes the input buffer on every path.

`guardian setup <provider>` is now executable on Windows. Nebius and Tavily use
the hidden-input reader and verify before writing the default provider slot.
GitHub uses an App device flow bound to a configured numeric repository ID. It
shows only GitHub's fixed verification URI and short-lived user code, honors the
poll interval and `slow_down`, requires expiring access and refresh tokens,
verifies the authenticated user, and stores the two values under isolated
`github/default` and `github/refresh` targets. It writes non-secret expiry data to
`github/metadata` as the final commit marker. Setup attempts cleanup of each
completed new write, reports cleanup failure, and clears transient byte buffers.
`guardian setup
status <provider>` returns only `available` or `missing`. `guardian setup revoke
<provider>` requires the exact `REVOKE <provider>` confirmation; GitHub revocation
deletes all three slots. All setup management commands reject non-interactive
invocation.

Verification is isolated in `@guardian/credential-verification`, which only the
trusted setup application may import. Nebius uses authenticated `GET
https://api.tokenfactory.nebius.com/v1/models`; Tavily uses authenticated `GET
https://api.tavily.com/usage`; and GitHub uses authenticated `GET
https://api.github.com/user`. Requests reject redirects, have bounded time and
response size, contain no body or caller-controlled destination, and return only
a fixed Nebius label, validated Tavily plan label, or validated GitHub login.
Every transport, status, malformed-body, oversized-body, provider-mismatch, and
credential-polluted metadata failure becomes the same sanitized verification
error.

The endpoint choices follow the official
[Nebius Token Factory model-list API](https://docs.tokenfactory.nebius.com/api-reference/models/list-models),
[Tavily Usage API](https://docs.tavily.com/documentation/api-reference/endpoint/usage),
and [GitHub authenticated-user API](https://docs.github.com/en/rest/users/users?apiVersion=2022-11-28)
documentation.

The GitHub device-flow endpoints and response requirements follow GitHub's
[user access token documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app).
ADR-0009 records why this local public-client flow replaces ambient delegated
authentication and project-private-key distribution.

The protected GitHub ceremony passes against the App registered with client ID
`Iv23liP8Sq3ZEAyeIHju` and installed only on repository ID `1352093544`. The CLI
displayed GitHub's fixed verification URI and short-lived user code, GitHub
returned an expiring access/refresh pair, the fixed authenticated-user endpoint
projected `GitHub @Loothore907`, and Windows Credential Manager status returned
only `github: available`. A second enrollment after a fail-closed migration also
wrote expiry metadata and enabled the protected broker read. No token value was
printed or added to this evidence.

The credential-holding resolver now emits an optional internal diagnostic with
only a fixed refresh stage, `started`, `succeeded`, or `failed` outcome, and an
optional allowlisted provider rejection code and bounded HTTP status. It does not
include provider bodies, descriptions, exceptions, tokens, handles, or store payloads,
and a diagnostic sink failure cannot affect refresh behavior. A GitHub correlation
identifier is retained only when it matches a bounded uppercase hexadecimal/colon
syntax; polluted header values are rejected. Deterministic tests
exercise a credential-polluted response-stream failure and failure at each local
refresh-token, access-token, and metadata write. Each post-response failure keeps
the public error sanitized and deletes all three slots because GitHub may already
have rotated the remote pair. A guarded live mode can expire only the non-secret
access metadata, exercise the real refresh through the broker path, and require
all three writes to complete. Its authorized run is recorded below.

The authorized protected forced-refresh run reached GitHub's fixed token endpoint
but received `HTTP 500` before an accepted response or any local token write. The
same bounded failure reproduced immediately after a fresh device re-enrollment,
which successfully verified `GitHub @Loothore907`. This is evidence of a current
external blocker, not successful rotation. The guarded test now restores the exact
pre-test non-secret metadata after a provider or transport failure that occurs
before possible rotation; production refresh behavior is unchanged. A final
non-secret status check returned `github: available`. No credential or provider
response body was printed or retained in this evidence.

One support-oriented retry at approximately `2026-09-01T07:19:45Z` returned the
same `HTTP 500` with validated GitHub correlation ID
`F18A:1070A1:156B14D:1DBF7A3:6A967C97`. This identifier, the public App client ID,
the fixed endpoint, and the timestamp are sufficient for a provider report; no
token, credential-bearing request body, or untrusted response prose should be
included. If GitHub does not make device-flow refresh operational, the supported
fallback is fresh device enrollment before the access token expires. That keeps
interactive demos and explicitly attended operations usable, but Guardian does
not claim unattended GitHub operation beyond the roughly eight-hour access-token
lifetime.

GitHub Support ticket `#4717324` was submitted from the operator's authenticated
support account with only the sanitized incident fields above. The ticket is
private provider coordination, not reproducible security evidence; do not copy
future private correspondence, account metadata, or credential material into the
public repository.

## Reproducible checks

```powershell
pnpm exec vitest run packages/credential-store/src/index.test.ts `
  packages/credential-verification/src/index.test.ts `
  packages/credential-verification/src/github-device-flow.test.ts `
  apps/guardian-cli/src/setup.test.ts `
  apps/broker-service/src/github-credential.test.ts

$env:GUARDIAN_TEST_WINDOWS_CREDENTIAL_STORE = "1"
pnpm exec vitest run packages/credential-store/src/windows.integration.test.ts
Remove-Item Env:GUARDIAN_TEST_WINDOWS_CREDENTIAL_STORE

# Requires separate explicit credential-use authorization.
# GitHub's development-only input is GUARDIAN_DEV_GITHUB_TOKEN in .env.local.
$env:GUARDIAN_TEST_LIVE_CREDENTIALS = "1"
pnpm test:live:credentials
Remove-Item Env:GUARDIAN_TEST_LIVE_CREDENTIALS

# Requires separate explicit credential-use authorization and an operator ready
# to repeat device enrollment if conservative fail-closed cleanup is necessary.
$env:GUARDIAN_TEST_LIVE_GITHUB_BROKER = "1"
$env:GUARDIAN_GITHUB_FORCE_REFRESH = "1"
pnpm exec vitest run apps/broker-service/src/live.integration.test.ts
Remove-Item Env:GUARDIAN_GITHUB_FORCE_REFRESH
Remove-Item Env:GUARDIAN_TEST_LIVE_GITHUB_BROKER

pnpm typecheck
pnpm lint
pnpm boundaries
```

The credential resolver's focused deterministic run passes 9 tests. The protected
Windows-platform probe writes, reads, rotates, and deletes one generated test
target and passes when the host grants access to the interactive user's
Credential Manager. The exact target is deleted in a `finally` block.

The complete ordinary verification passes 34 Vitest files / 179 tests, with five
protected tests across three files skipped in the 37-file / 184-test run; the eight-case SQLite spike passes
seven cases with the expected Windows POSIX-permission skip. Formatting, ESLint,
TypeScript, dependency boundaries, and the production build pass.

## Limitations

- The protected GitHub device-flow enrollment and authenticated-user verification
  pass. The separate guarded `.env.local` provider test was not run, and live
  Nebius/Tavily verification remains pending explicit credential-use
  authorization; no broader provider compatibility is claimed.
- The Windows helper necessarily handles credential-equivalent material inside
  the trusted setup/credential process. OS process placement and supervision must
  keep it outside the WSL command sandbox and interaction-agent environment.
- The current tests use a bounded fixture corpus. Broader process, database, log,
  trace, audit, crash, and provider-error corpus inspection remains required.
- macOS Keychain, Linux Secret Service, and the secured Linux fallback remain
  goals. This evidence does not advance Linux parity or Enforced assurance.
- Setup currently supports only Windows. The CLI has not yet been exercised as a
  complete hidden-input-to-live-provider-to-Credential-Manager journey.
- The App is registered and installed only on the public demo repository pinned
  to immutable GitHub ID `1352093544`. Deterministic fail-closed refresh and a
  protected exact-head broker read are implemented. A metadata-less live
  migration failed closed and required re-enrollment. A later guarded refresh
  received reproducible GitHub `HTTP 500` before local writes, including after
  fresh re-enrollment, so successful protected refresh remains open as an
  external blocker. PR #1 was subsequently exact-head approved and
  squash-merged. The deterministic reset planner and an attended live application
  subsequently created non-draft demo PR #2 at exact head
  `36251caf778466a7d08670ad8210375daf8a9bcb`, changing only the fixed fixture;
  repeatable post-merge reset evidence is complete.
