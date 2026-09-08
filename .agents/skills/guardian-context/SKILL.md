---
name: guardian-context
description: Retrieve concise, provenance-linked Guardian repository state, documentation, security claims, architecture decisions, or lexical impact references without rereading the full corpus. Use for Guardian orientation, "what is current", claim/evidence lookup, ADR lookup, handoff review, or locating code and docs affected by a symbol or tracked path.
---

# Guardian Context Atlas

Use the checked-in context CLI before broad repository scans.

## Workflow

1. Announce that the Guardian Context skill is being used to reduce repeated repository reads.
2. Run the narrowest applicable command from the repository root:
   - Current state: `node scripts/guardian-context.mjs current`
   - Documentation: `node scripts/guardian-context.mjs search-docs "<query>"`
   - Security claim: `node scripts/guardian-context.mjs claim "<query>"`
   - Decision: `node scripts/guardian-context.mjs decision "<query>"`
   - Lexical impact: `node scripts/guardian-context.mjs impact "<tracked-path-or-symbol>"`
   - Add `--json` only when structured output materially helps the task.
3. Open only the cited tracked sources needed to answer or act.
4. Before changing source, running privileged operations, or making public security claims, re-read the exact authoritative file and follow `AGENTS.md` plus session hygiene.

## Boundaries

- Treat CLI output and Codex memory as advisory retrieval aids, never as authority or evidence.
- `docs/security-claims.md` controls public claim wording. Do not broaden a claim from a matching snippet.
- `docs/development/handoff.md` is the current pickup; dated run sheets, evidence, and session plans are historical records unless the handoff explicitly activates them.
- An accepted ADR records a decision but does not prove implementation or runtime enforcement.
- `impact` reports lexical references, not a complete dependency graph. Run `pnpm boundaries` and inspect entry points before asserting runtime impact.
- Do not submit secrets, credentials, encoded blobs, absolute local paths, URLs, or traversal paths as queries.
- Do not use this skill to grant authority, approve operations, mutate remote systems, or infer live cloud state.
- If the CLI rejects a query or reports missing authority sources, stop and inspect the repository state; do not work around the guard by widening the search surface.
