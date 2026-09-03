# ADR-0009: GitHub App Device-Flow Enrollment

- Status: Accepted
- Date: 2026-08-31
- Decision owners: Earl Ray
- Checkpoints: C6-C9
- Refines: ADR-0008 GitHub connection enrollment

## Context

The competition path needs read access to pull requests and one exact squash
merge against a dedicated repository. Ambient GitHub CLI authentication,
delegated connector credentials, classic personal access tokens, and GitHub
Actions' `GITHUB_TOKEN` are outside Guardian's local credential boundary. A
GitHub App installation token is short lived, but minting one locally requires
custody of the App private key. Distributing a project-owned private key would
conflict with local-first self-hosting, while a hosted minting service would make
the project a credential custodian.

GitHub App device flow requires only the App's public client ID. The resulting
user access token is limited to the intersection of the App installation, the
App permissions, and the authorizing user's own access. GitHub also permits the
token request to identify one repository.

## Decision

`guardian setup github` uses GitHub App device flow in the trusted local setup
process. The App must have device flow and expiring user access tokens enabled.
For the competition configuration it is installed only on
`Loothore907/guardian-agent-demo`, with Pull requests read and Contents write.
The token request additionally includes that repository's immutable numeric ID.

Guardian displays only GitHub's fixed verification URI and short-lived user code.
It polls only GitHub's fixed token endpoint, honors the provider interval and
`slow_down`, rejects redirects and unbounded or malformed responses, and requires
an expiring `ghu_` access token plus `ghr_` refresh token. The access token is
verified through the fixed authenticated-user endpoint before enrollment is
reported successful.

The access and refresh tokens are written to provider-scoped `default` and
`refresh` targets in the user's OS credential store. Non-secret expiry metadata
is written to a third `metadata` target as the final commit marker. Setup attempts cleanup of
every completed new write and reports cleanup failure rather than claiming
success; transient byte buffers are cleared, status remains non-secret, and
GitHub revocation deletes all three slots. The public App client ID and repository ID
may be supplied as non-secret setup configuration. Neither token is returned to
an agent, model, public UI, SQLite, audit, or command argument.

The credential-holding broker refreshes an absent or near-expiry access token
through GitHub's fixed token endpoint, serializes concurrent refresh, rotates both
tokens, and writes expiry metadata last. If GitHub may have invalidated the old
pair but the response cannot be validated or the new pair cannot be committed,
Guardian deletes all three slots and requires device enrollment again. The
metadata-less protected migration exercised that fail-closed recovery path;
deterministic refresh tests pass, including response-read and each local-write
failure. Internal refresh diagnostics expose only a fixed stage, outcome,
optional allowlisted provider rejection code, and bounded HTTP status; they
may also carry a strictly validated GitHub correlation ID and cannot alter refresh
behavior. An authorized protected refresh reached the fixed
GitHub endpoint but received reproducible `HTTP 500` before any accepted response
or local token write, including immediately after fresh device re-enrollment. A
successful protected live refresh remains open as an external blocker. Sanitized
provider coordination is tracked in GitHub Support ticket `#4717324` without
making private correspondence part of public evidence.

GitHub's registration UI may require creation of an App private key before it
enables installation. That bootstrap key is not part of Guardian's design. If
GitHub requires it, the owner generates it only to unlock installation, installs
the App, immediately deletes the key from the App registration, and removes the
downloaded PEM. Guardian never reads, imports, stores, or uses that key.

## Consequences

- Guardian does not import or reuse ambient ADC, connector, `gh`, `GITHUB_TOKEN`,
  or `GH_TOKEN` authentication.
- A manually supplied fine-grained token remains an explicitly protected
  development-test input only; it is not the product enrollment path.
- The public GitHub App registration, installation, client ID, and repository ID
  must exist before a protected device-flow run can occur.
- The broker resolves `github/default` only inside a callback-scoped credential
  operation; the credential-holding resolver alone manages `github/refresh` and
  `github/metadata`.
- App permission or installation expansion is external authority expansion and
  must not silently widen an existing Guardian connection.

## Rejected alternatives

- **Ambient delegated authentication:** Guardian cannot inspect its provenance,
  scope, or isolation and cannot use it as Enforced credential evidence.
- **Classic or broad personal access token:** wider and longer-lived than the
  fixed repository operation requires.
- **Locally distributed project GitHub App private key:** turns a shared App key
  into reusable credential material on every installation.
- **Project-hosted installation-token minting:** creates a central Guardian
  credential service contrary to ADR-0008.

## Evidence required

Deterministic evidence must cover fixed endpoints and bodies, repository-ID
binding, poll cadence, `slow_down`, expiry, denial, malformed and oversized
responses, expiring-token requirements, verification-before-write, partial-write
rollback, transient-buffer clearing, three-slot revocation, refresh rotation and
concurrency, and output/error secret
corpus inspection. Protected evidence must exercise a real App installation and
prove the credential is absent from runner environment, argv, SQLite, logs,
audit, and public results.
