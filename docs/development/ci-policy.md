# Continuous Integration Policy

September 6 enforcement correction: the active main ruleset now requires the
up-to-date GitHub Actions `build` check in addition to its existing PR, resolved
review-thread, squash and linear-history rules. No bypass actors were added.
Previously the workflow ran but was not required by the ruleset.

The build also tests `scripts/session-hygiene.mjs` and checks issue-linked branch
and Conventional PR-title metadata on pull-request events (including edits).
This syntax check does not establish semantic issue scope or human review. See
[session Git hygiene](session-git-hygiene.md) for local start/close checks and limits.

CI is an enforcement layer. Agent instructions, review prompts, local hooks, and model judgments do not replace required checks.

## Pull-request checks

The C2 baseline workflow is `.github/workflows/ci.yml`. Its `build` job installs
the frozen pnpm graph, runs `pnpm check`, and audits production dependencies. All
external actions are pinned to immutable commit SHAs and checkout does not persist
GitHub credentials. Historical remote runs are recorded in the roadmap and
handoff; their results do not establish CI status for a later branch head. The
workflow also runs `pnpm test:linux-platform` on Ubuntu. Protected provider and
Windows/WSL runtime checks remain separate from this ordinary gate.

`pnpm check` also runs six credential-free Linux keyring-preflight regression
cases. These verify fixed metadata calls and fail-closed errors using injected
fixtures; they do not access CI credentials or establish live store readiness.

The ordinary check also runs five `test:github-supervised` cases after compilation:
real child-process composition with a test-only in-memory store and fixed synthetic
GitHub transport. These require neither network nor enrollment. Linux uses real
clocks; Windows uses controlled fixture clocks because of the W28 timestamp finding.
The explicit `test:live:github-supervised` command is never part of ordinary CI.

The full intended pull-request check set is below. This is a target policy, not
an assertion that every item is configured: the current `ci.yml` runs the ordinary
suite, Linux platform probes, and production dependency audit. Inspect the other
workflows and protected evidence separately before claiming full coverage.

Every pull request should ultimately run:

- formatting and linting;
- type checking;
- unit tests;
- property-based tests for canonicalization and authorization;
- mission, session-profile, and assurance-state tests;
- reference-runtime tool, credential-path, and direct-egress checks;
- outbound research and provenance tests;
- architectural dependency checks;
- adversarial fixtures;
- secret scanning;
- dependency vulnerability scanning;
- CodeQL;
- build and package verification; and
- documentation and schema checks.

Security-relevant checks should use stable names:

- `policy-invariants`
- `session-enforcement`
- `research-egress`
- `digest-and-replay`
- `credential-non-disclosure`
- `adversarial-evaluation`
- `build`

## Workflow security

- Set minimal explicit permissions and default to `contents: read`.
- Use `persist-credentials: false` during checkout unless a narrowly justified job must write.
- Pin third-party Actions to immutable commit SHAs.
- Do not use `pull_request_target` for code execution.
- Do not expose provider secrets to fork-originated or otherwise untrusted pull requests.
- Run live-provider tests only through manual or scheduled workflows with a protected environment.
- Keep live Tavily, Nebius, and GitHub credentials outside the interaction-agent and local command environments.
- Keep mock and deterministic suites sufficient for public pull-request verification.
- Update GitHub Actions dependencies through reviewed automation.

## Release checks

Before a tag or competition submission:

- install in a clean environment;
- run the complete deterministic and adversarial suite;
- scan source, history, artifacts, logs, and fixtures for secrets and personal data;
- generate and review dependency and license information;
- compare security claims with passing evidence;
- verify the public demo and setup instructions; and
- ensure the video and submission text match the tagged revision.
