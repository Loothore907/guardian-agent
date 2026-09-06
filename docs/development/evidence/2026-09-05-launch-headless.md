# Launch and headless validation, 2026-09-05

Scope: [approved local plan](../session-plan-2026-09-05-launch-headless.md),
[ADR-0049](../../adr/0049-launch-and-headless-session-authority.md).
Changes remain uncommitted on `codex/13-c6-linux-provider-containment`, alongside
prior W27/W28 and session-plan work. No real token mint, merge, secret migration,
remote write, deployment or paid provisioning occurred.

## Reproducible evidence

- `apps/reference-supervisor/src/bootstrap.test.ts`: exact plan in preview digest,
  mission-scope rejection, grant-before-worker ordering, startup interruption,
  standing consent with original timestamp, unconfigured consent rejection, draft
  replay/expiry and defensive preview copies.
- `apps/reference-supervisor/src/index.test.ts`: real local authority IPC, durable
  deployment grant issuance, preserved consent time, expansion/expiry rejection,
  broker membership checks and revocation.
- `apps/reference-supervisor/src/headless-judge.test.ts`: synthetic supervisor,
  fixed workflow without a prompt, wrong objective/budget binding, expiry, aborted
  and closed executors, replay, concurrency, cancellation and startup failure.
- `apps/guardian-cli/src/competition-command.test.ts`: one initial confirmation,
  exact base/head plan and subsequent competition call without an approval prompt.
- `apps/broker-service/src/github-installation.test.ts`: generated RSA fixture,
  JWT signature/claim checks, fixed endpoint/repository/permissions, fresh minting
  after a simulated two-hour clock advance, variable-length token, wiped callback
  buffers, malformed/expired/overbroad responses and provider failure. Read-only
  SecretStash runner has no browser, stdin password, store write or desktop bus.
- `packages/adapter-github/src/index.test.ts`: variable-length token accepted and
  credentials beyond 8192 characters rejected before a request.
- `apps/reference-supervisor/src/credential-service-environment.test.ts`: managed
  custody omits desktop credential routing and inherited host secrets.
- `scripts/headless-judge-host.test.mjs`: actual host factory/HTTP injection,
  authentication before budget admission, budget denial before executor startup,
  sanitized response and secret closure. Uses a synthetic budget controller.
- `scripts/reference-runtime.test.mjs`: real namespace/chroot runtime, local tool,
  workspace/host filesystem isolation, credential absence, direct network and Git
  bypass probes. Passed on Windows/WSL and native Linux in the staged WSL guest.

## Gate results

| Gate | Result |
| --- | --- |
| Windows `pnpm check` | Passed: 578 Vitest tests, 18 skipped |
| Linux `pnpm check` | Passed: 590 Vitest tests, 6 skipped |
| Additional required Node suites, both | SQLite 8, reset plan 2, keyring preflight 6, supervised GitHub 5, headless host 1; all passed |
| Dependency boundaries, both | Passed: 213 modules / 467 dependencies |
| Linux native permission probes | 2 passed |
| Windows/WSL reference runtime | 1 passed |
| Native Linux reference runtime | 1 passed in staged WSL guest |
| Source synchronization | 315 files, zero hash differences |

The initial native Linux probe exposed an omitted `/usr/sbin` PATH entry for
`chroot`; the corrected probe passed. Formatting, TypeScript and lint failures
during iteration were corrected before both complete final checks passed.

Windows logs: ignored `tmp/launch-final-check.log`, `tmp/launch-windows-runtime.log`.
Linux logs: `/home/loothore907/guardian-w27-session-20260904/tmp/launch-final-check.log`,
`launch-runtime.log`, `launch-platform.log`.
Source-only synchronization covers 315 files; manifest SHA-256:
`5da5dfe2fcff414347013721e61d03de867908030c698d5e726c9c78737fe3f5`.

## Limits

Synthetic provider tests establish local behavior, not real GitHub installation,
Nebius VM IAM or SecretStash deployment readiness. There was no real two-hour run;
the competition mission remains five minutes. The headless service must still be
provisioned and rehearsed with real durable budget/ingress wiring and credentials.
See [concrete deployment preparation](../headless-judge-setup.md).

WSL again reported failure to start the systemd user session between offline runs.
These passing probes do not resolve the warm-restart EBUSY lifecycle defect. Native
Linux inside a WSL guest does not certify a separate cloud host. Broader provider
containment and atomic remote base-branch protection remain outside these claims.
