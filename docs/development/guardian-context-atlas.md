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

## Daily development patterns

Start with the CLI. Hooks, memory and delegated explorers are optional conveniences;
they are not prerequisites for useful retrieval. No model call, network index or
cache rebuild is needed. Run commands in the checkout or worktree you are actually
changing. An Atlas command in a different worktree describes that worktree's HEAD.

### Orient once, then follow evidence

1. Run `node scripts/guardian-context.mjs current` at pickup. Confirm branch,
   full head (use `--json` if needed), content source and dirty state. Read the
   current handoff and repository guidance, then state the outcome and action bounds.
2. Choose one question from the table below. Start with one to three distinctive
   words, a symbol, or a repository-relative tracked path. Read the returned source
   passage and its nearby context before making a decision.
3. Identify the relevant implementation and allowed/near-miss tests, make the
   bounded repair, run the narrow checks, and retry toward the useful outcome.
4. Classify the final diff and complete the required validation and integration
   gates in the [development loop](development-loop.md). Atlas does not replace
   hygiene, review, current CI, or operation authority.

| Development question | First query | Next evidence to read |
| --- | --- | --- |
| Where do I resume? | `current` | Current handoff, active issue and fresh PR state |
| Where is this workflow described? | `search-docs "development loop"` | The cited section and the current handoff |
| What can we claim about this control? | `claim "credential"` | Claim status, linked evidence, implementation and named tests |
| Why was this design chosen? | `decision "context atlas"` | ADR status, decision and consequences; then current code |
| What references this file? | `impact "scripts/guardian-context.mjs"` | Call sites, entry points, tests and package boundaries |

Prefix each query with `node scripts/guardian-context.mjs`. Search is lexical:
all query tokens must occur on the same line unless the literal phrase matches.
There are at most three matching lines per file and twelve results. Long natural
language questions often hide useful matches; short repository vocabulary works
better. Result order and an empty result are not proof of completeness or absence.

### Keep committed context and work in progress distinct

Atlas reads regular-file blobs at HEAD even when it reports a dirty working tree.
Use its result to locate the committed baseline. For an exact cited passage, read
`git show HEAD:docs/development/handoff.md` (substitute the cited tracked path).
After switching branches or committing, rerun the query before relying on old line
numbers. A citation from an earlier head belongs to that revision, not necessarily
the current checkout.

During editing, inspect the actual diff and relevant changed files:

```powershell
git diff -- scripts/guardian-context.mjs
git diff --cached -- scripts/guardian-context.mjs
```

The first command shows unstaged changes; the second shows staged changes. An
untracked new file needs a direct, intentional read. Do not commit merely to make
Atlas see unfinished edits, and do not treat a stale baseline as a failed edit.
Known-path fixes can go directly to source and tests after orientation; another
search is useful only if it resolves a specific uncertainty.

### Recover from misses without broadening authority

An exit code of `1` means no matching result. Try a shorter term or a narrower
command once, then inspect the known source or use a focused tracked-file search,
for example `git grep -n -F -- "WorkerOutcomeSchema" -- packages/contracts/src`.
That command searches tracked checkout content, so inspect dirty state and keep
its findings separate from HEAD citations. Prefer this targeted fallback to
repeatedly dumping the full corpus or repeatedly changing the same query.

An exit code of `2` means the request or source could not be handled safely.
Inspect query shape and repository state: credential-shaped input, absolute or
traversal paths, unsupported source types and source size limits are deliberate
boundaries. Missing authority files may indicate the wrong checkout or an
incomplete archive. Repair the actual setup within the existing grant and retry;
never bypass the guard to read excluded content. If a necessary source remains
outside the allowed boundary, report the exact missing evidence and next action.

### Use small retrieval budgets and honest measurements

Normally use one current packet and one targeted query before the first source
read or test. This is a working heuristic, not a runtime limit. A second query
should answer a new uncertainty or refine a miss. Rerun after a head/worktree
change, compaction when provenance was lost, or a relevant commit; there is no
benefit in printing the same packet before every tool call.

For optional delegated exploration, assign one concrete question, the relevant
checkout/head, and a small requested result: cited paths, findings, uncertainties
and suggested tests. Keep authorization and integration decisions in the owning
session, and follow the session's delegation rules. Do not delegate merely because
an explorer profile exists.

Keep one brief observation per real task in the existing issue or session notes:
question, head, queries, whether the first results located the needed source,
fallback reads, and time to the first useful source-backed answer or test. Record
tokens only when measured; otherwise say unavailable. No token-saving or retrieval
quality claim follows from tests alone. Use the ten-task evaluation below before
considering an indexing expansion.

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
