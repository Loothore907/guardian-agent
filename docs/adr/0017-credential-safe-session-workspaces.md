# ADR-0017: Credential-safe session workspaces

- Status: Accepted
- Date: 2026-09-01

## Context

The C4 reference command sandbox previously created a fresh empty `/workspace`
for every command. That preserved host isolation but prevented a worker from
building on changes across commands. Mounting the user's project directly would
make persistence easy while exposing a wider host path, making agent changes
immediately affect the user's checkout, and complicating credential and symlink
containment.

W2 needs a useful persistent filesystem without weakening the existing
credential, host-filesystem, or network boundary. Workspace selection must also
be visible in and bound by the exact pre-activation confirmation.

## Decision

The trusted supervisor plans one Guardian-managed workspace per session from an
explicit trusted Git project root. The selection is the bounded set returned by
`git ls-files --cached --others --exclude-standard`; ignored files, source Git
metadata, and the reserved `.guardian` state subtree are not selected. Guardian
rejects unsupported paths, symlinks
and junction ancestors, non-files, case collisions, configured size excess,
credential-bearing filenames, and high-confidence credential content.

The public preview contains the project name, opaque source-root and snapshot
digests, fixed `/workspace` mount, bounded limits, session persistence, no-host-
writeback policy, and delete-on-close lifecycle. It never contains the host path.
This selection is part of the canonical session preview digest.

Only after exact fresh confirmation does Guardian independently revalidate the
source-root identity and the complete path, metadata, and content manifest. It
then creates a new session-owned copy under the trusted workspace storage root.
The copy receives a fresh local Git repository with no remote, no inherited
global or system configuration, an empty credential helper, and one sanitized
baseline commit. Original Git metadata and authenticated remote configuration are
never copied.

Every local command binds that exact prepared workspace into the existing WSL
namespace sandbox as writable `/workspace`. The chroot remains otherwise
ephemeral, public network remains denied, provider credentials remain absent,
and the bind mount is `nosuid,nodev,noexec`. Changes persist across commands in
the same session but are never written back automatically to the source project.

Session close deletes only a target that this workspace lifecycle successfully
created. Target reuse fails closed, and cleanup never removes a pre-existing
target. The sandbox cleanup refuses to recursively remove its chroot if unmount
fails, avoiding traversal into a live bind mount.

## Consequences

- The worker can preserve source edits and generated files across typed local
  commands without direct access to the user's checkout.
- Exact confirmation covers which source snapshot and lifecycle will be exposed.
- Source mutation between preview and preparation requires a new preview and
  confirmation.
- The reference implementation currently requires an exact Git project root and
  supports only the fixed delete-on-close, no-writeback lifecycle.
- W2 does not connect W1 pending requests to execution, implement result feedback,
  create a multi-turn worker loop, or make the hosted worker `Enforced`.
