# ADR-0056: Manifest-bound gitless session sources

- Status: Accepted
- Date: 2026-09-07

## Context

The protected hosted workflow deliberately deploys a reviewed credential-free
`git archive`. That archive has no mutable `.git` metadata. The session workspace
planner introduced by ADR-0017 accepted only an exact Git project root and used
`git rev-parse` plus `git ls-files` to derive its source set. The first bounded KC
research attempt therefore failed closed during workspace planning before any
provider process started.

Adding `.git` to the hosted artifact would introduce unnecessary history,
configuration and mutable source-selection state. Recursively treating every
extracted file as authorized would instead let archive contents create their own
authority.

## Decision

Keep exact-Git-root discovery as the default local contract. Add a separate
strict immutable source-manifest contract for reviewed deployment archives. The
manifest binds the archive SHA-256 and one canonically ordered entry per file:
relative path, SHA-256 content digest, byte size and executable bit. Duplicate,
case-colliding, absolute, escaping, non-canonical or oversized entries fail
schema or workspace validation.

The protected source-bundle generator derives every entry from the exact Git
commit used by `git archive`, rather than from the mutable working tree. It reads
the lockfile digest from that same entry set. The public manifest remains in
disabled mode and contains no credential values, resource IDs, runtime authority,
private state or spending permission.

Protected `research_only` startup requires this manifest. Trusted host
configuration passes it through the portal runtime to the reference supervisor;
HTTP, agent, model and retrieved content cannot supply or replace it. Other
supervisor callers omit the manifest and retain ADR-0017 Git discovery.

For an immutable source, workspace planning enumerates the extracted tree only
to reject missing, extra or unsupported entries. It never adds an observed path
to the authorized set. Planning reads and credential-screens only declared
regular files and verifies every declared digest, size and executable bit.
Preparation independently repeats root identity, topology, file metadata,
content digest, size, executable-bit and credential checks immediately before
copying only those entries into the sanitized session repository. Symlinked
roots, files or ancestors fail closed.

The archive digest becomes the opaque source-identity input; the verified entry
set remains the snapshot-digest input to exact confirmation. The raw source path
and manifest contents are not returned through the public session selection.

## Consequences

- A reviewed gitless archive can prepare a session workspace without adding Git
  metadata to the deployment artifact.
- Archive contents cannot expand the file set declared by trusted packaging.
- Any manifest/archive mismatch or mutation requires a new package and preview.
- The protected host bootstrap frame is bounded at 4 MiB so the fixed maximum
  4,096-entry deployment manifest and runtime configuration fit without making
  stdin unbounded.
- The manifest authenticates no deployment by itself. The operator must still
  verify the archive digest and reviewed source revision before extraction.
- This change does not authorize a VM restart, provider call, new admission or
  second hosted journey, and it does not establish hosted availability or an
  Enforced assurance state.

## Evidence

Contract tests cover canonical ordering, duplicates and strict protected-host
binding. Workspace tests cover the allowed gitless path plus missing, extra,
mismatched, escaping, case-colliding, symlinked, oversized, secret-like and
post-preview-mutated near misses while retaining the existing Git path. The
protected source-manifest test derives entries and the lockfile digest from the
exact archived commit. A production-supervisor child test extracts a real
`git archive`, proves `.git` is absent, starts the real authority child and plans
the manifest-bound workspace successfully.
