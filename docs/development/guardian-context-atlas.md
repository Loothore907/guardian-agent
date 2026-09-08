# Guardian Context Atlas

The Guardian Context Atlas is a repo-native retrieval layer for development work. It
reduces repeated full-corpus reads while keeping tracked sources and exact Git state
visible. It is an advisory index, not a second authority system.

## Authority and freshness

Use sources in this order for consequential work:

| Need                     | Authority                                      | Atlas role                                         |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------- |
| Repository rules         | `AGENTS.md`                                    | Points to the file; never replaces it              |
| Current pickup           | `docs/development/handoff.md`                  | Extracts a bounded current-state packet            |
| Public security language | `docs/security-claims.md`                      | Returns matching lines and status context          |
| Architecture and threats | `docs/architecture.md`, `docs/threat-model.md` | Locates exact tracked passages                     |
| Decisions                | Accepted ADRs                                  | Reports ADR status and source                      |
| Runtime or remote state  | Reproducible fresh checks                      | Reports `Unknown`; the atlas has no live authority |

Every invocation resolves the branch, exact head, upstream divergence, and dirty
paths (at most 12, with a total count). Content is read from regular-file Git
blobs at a single pinned HEAD, never from checkout paths. Staged and unstaged
edits are excluded; re-read those separately before acting. Symlinks and gitlinks
are excluded, and worktree junctions or replacements cannot redirect blob reads.
The tree listing is capped at 2 MB, each source at 1 MiB, and binary sources fail
closed. Search results include the source head and repository state. Dated evidence remains evidence;
dated plans and run sheets remain historical unless the current handoff activates
them. Accepted ADRs are decisions, not implementation proof.

## Commands

Run from the repository root:

```powershell
node scripts/guardian-context.mjs current
node scripts/guardian-context.mjs search-docs "session authority"
node scripts/guardian-context.mjs claim "credentials"
node scripts/guardian-context.mjs decision "manifest bound"
node scripts/guardian-context.mjs impact "packages/authorization/src/index.ts"
```

Add `--json` for machine-readable output. A search with no results exits `1`; rejected
or malformed input exits `2`. Inputs that look like credentials, encoded blobs,
URLs, absolute paths, traversal, control characters, or oversized queries fail
closed. `impact` is a bounded lexical reference search; use `pnpm boundaries` and
targeted source inspection before asserting dependency or runtime impact.

Known credential patterns are redacted before splitting into source lines; line
numbers are preserved. This is best-effort redaction of a reviewed public source
tree, not a general secret scanner. Never commit credentials. CLI failures return
a fixed code without raw subprocess diagnostics or local paths.

## Codex integration

Project config under `.codex/` enables local memories and hooks only when the project
is trusted. Memory generation is disabled for chats that use MCP, web search, or
tool search. This reduces the chance that retrieved external content is consolidated
into local memory, but it is not a secret-handling control. Do not put secrets in
chat or memory.

The SessionStart hook runs on a new task and after compaction. It injects at most a
small sanitized packet from tracked authority files. Codex requires explicit trust
for the exact hook definition and re-prompts after it changes.

The `guardian_explorer` role is intended only for delegated read-heavy mapping. It
uses a read-only filesystem sandbox, cannot request approvals, disables web search,
and disables app connectors. These are profile defaults; parent runtime permission
overrides and inherited MCP servers still require inspection. The Atlas CLI blob
reader does not restrict other shell commands available to an explorer. See the
[official subagent configuration documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).
Model instructions are still guidance; do not attach an
authenticated MCP server or treat the profile as an enforcement boundary.

## One-time local setup after integration

Do this only after the pull request is merged and the other active Guardian task has
finished or moved to its own worktree:

1. Start a new Guardian task so Codex loads the merged project config.
2. Run `/hooks`, review the repository hook, and trust its exact definition.
3. Run `/memories` and confirm the task can use and generate local memories. Use the
   per-chat control to opt sensitive or unusual work out.
4. Run `node scripts/guardian-context.mjs current` once and confirm the reported
   branch, head, dirty state, and handoff agree with the repository.

No global `~/.codex/config.toml` edit is required. Settings > Personalization can
enable memories globally if the desktop application or organization policy disables
the project setting, but project-local configuration is preferred for Guardian.

## Evaluation before adding semantic search or MCP

Keep this first slice deterministic. For ten representative fresh tasks, record:

- time and tokens before the first source-backed answer;
- whether the atlas cited the necessary source in its first result set;
- false-current or missing-provenance results;
- commands that still required broad scans; and
- hook packet size.

Consider a local semantic index or read-only MCP wrapper only if these measurements
show recurring retrieval misses that lexical search cannot address. Any later server
must preserve tracked-source provenance, exact-head freshness, bounded sanitized
outputs, no credential access, no arbitrary filesystem or network capability, and a
clear rebuild lifecycle.
