# Repository Strategy

## Lifecycle

1. Prepare and review the governance bootstrap locally.
2. Create `guardian-agent` as a private GitHub repository.
3. Push the reviewed bootstrap commit.
4. Configure repository rules, Actions permissions, secret scanning, and metadata.
5. Make the repository public early while preserving the complete history.
6. Develop through issues and pull requests.

## Main branch policy

- Default branch: `main`.
- Direct pushes are prohibited after bootstrap.
- Pull requests and passing required checks are mandatory.
- Force-push and deletion are prohibited.
- Linear history and squash merge are preferred.
- Auto-merge is disabled for security-boundary changes.
- Initially require zero external approvals so a solo entrant is not blocked; require approval when trusted collaborators join.

## Branch names

- Agent-created: `codex/<issue>-<slug>`
- Human-created: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `docs/<issue>-<slug>`, `chore/<issue>-<slug>`, or `security/<issue>-<slug>`

## Commit and release policy

- Use Conventional Commit subjects.
- Squash pull requests into coherent main-branch commits.
- Sign release tags.
- Do not publish a release whose artifacts, documentation, demo claims, and tested revision disagree.

## Ownership

The repository owner is the merge authority during solo development. `CODEOWNERS` provides repository-wide ownership and should be narrowed when collaborators join.

## GitHub settings to configure after remote creation

- private visibility during bootstrap;
- `main` branch ruleset;
- squash merge enabled; merge commits and rebase merge disabled;
- Actions default token set to read-only;
- secret scanning, push protection, dependency graph, Dependabot alerts, and private vulnerability reporting;
- issue and pull-request templates;
- a protected environment for live provider tests; and
- public visibility only after a clean sensitive-data review.
