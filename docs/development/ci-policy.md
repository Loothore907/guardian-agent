# Continuous Integration Policy

CI is an enforcement layer. Agent instructions, review prompts, local hooks, and model judgments do not replace required checks.

## Pull-request checks

Once the implementation stack exists, every pull request should run:

- formatting and linting;
- type checking;
- unit tests;
- property-based tests for canonicalization and authorization;
- architectural dependency checks;
- adversarial fixtures;
- secret scanning;
- dependency vulnerability scanning;
- CodeQL;
- build and package verification; and
- documentation and schema checks.

Security-relevant checks should use stable names:

- `policy-invariants`
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
