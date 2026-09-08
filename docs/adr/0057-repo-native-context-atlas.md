# ADR-0057: Repo-native advisory context atlas

- Status: Accepted
- Date: 2026-09-07

## Context

Guardian's documentation and implementation evidence are intentionally detailed.
Fresh agent sessions repeatedly spend substantial context reading the same handoff,
security-claim matrix, ADR corpus, and package layout before useful work begins.
Unstructured memory can improve continuity, but it can also preserve stale state or
blur the distinction between design intent, accepted decisions, implementation, and
verified evidence.

Third-party semantic indexes and networked retrieval services add freshness,
credential, provenance, and lifecycle questions. Guardian does not yet have evidence
that those costs are justified for its approximately megabyte-scale tracked Markdown
corpus. A broad code MCP server would also widen the default tool surface before the
required queries and output bounds have been measured.

## Decision

Add a deterministic, read-only repository context atlas implemented with Node.js and
Git. It reads regular-file blobs from one pinned HEAD, excluding staged/unstaged
edits, symlinks and gitlinks. Checkout links cannot redirect reads. It resolves the exact repository head and dirty
state at invocation time, returns repository-relative source locations, classifies
current authority, accepted/superseded decisions, evidence, and historical records,
and caps all outputs.

The initial public interface is a project-local Codex skill plus a CLI with narrow
operations for current state, documentation, security claims, ADRs, and lexical
impact. The session-start and post-compaction hook injects a sanitized advisory
packet derived from the current handoff. Query validation rejects secrets, encoded
blobs, external URLs, absolute paths, traversal, control characters, and oversized
input. The implementation does not read untracked file contents.

Enable Codex local memory in the project config for helpful personal continuity, but
exclude sessions that use MCP, web search, or tool search from memory generation.
Memory may recall preferences and working habits; it is never a source of product
authority, live state, approval, or security evidence. Required rules remain in
`AGENTS.md` and tracked documentation.

Provide a custom explorer with a read-only filesystem sandbox, no approval path,
disabled web search, and disabled app connectors. These settings narrow its normal
tool surface. Its model instructions remain guidance rather than proof of complete
tool isolation, so callers must not attach authenticated MCP tools to the role.

## Consequences

- A fresh task can obtain a bounded pickup before opening large documentation files.
- Every result remains inspectable against exact tracked sources and Git state.
- Dirty worktrees are visible instead of silently summarized as a clean revision.
- Hook definitions require explicit local trust and load only for trusted projects.
- Chats that use external context can still consume existing local memories, but are
  excluded from generating new memories under the project setting.
- The atlas cannot prove live GitHub, CI, cloud, credential, or runtime state.
- Lexical impact is not a call graph or dependency proof; dependency-cruiser and
  targeted source inspection remain required.
- Semantic indexing, a local read-only MCP wrapper, or a third-party code explorer
  may be evaluated later only if measured misses or latency justify the added surface.

## Evidence

The context test corpus covers query rejection, secret and private-path redaction,
source classification, scope isolation, provenance, dirty-state reporting, bounded
hook output, path-aware lexical impact, staged/deleted source isolation, non-regular
Git entries, checkout junctions, oversized/binary sources, multiline redaction with
line provenance, fixed public errors, and bounded dirty-state metadata. Repository hygiene, the context tests,
dependency boundaries, and the complete required suite remain the integration gates.
