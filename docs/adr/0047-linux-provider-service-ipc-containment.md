# ADR-0047: Linux provider-service IPC containment

- Status: Accepted for local implementation under the C6 session plan
- Date: 2026-09-04
- Extends: ADR-0010, ADR-0038, ADR-0040

## Problem

W25 authenticates Linux authority peers, but provider IPC still relied on a
capability alone. An unrelated process holding a copied capability could reach
the provider protocol, and clients could send that capability to a substituted
listener before authenticating its process. Default Unix socket permissions and
duplicated server lifecycle code left these paths short of the C6 boundary.

## Decision

Reuse the existing `@guardian/linux-peer-identity` package for a shared service
transport. Interaction, mission review, Guardian setup/action risk, worker,
research, and broker protocols construct it directly; no public bootstrap or
model input can disable Linux admission. The dependency rule permits only those
named protocol modules to import it. No third-party package is added.

On Linux, a server requires the native helper before startup, pauses each
connection, and checks kernel PID/UID/GID and supervised ancestry before invoking
the protocol handler. It accepts its own process, its parent supervisor, or a
direct sibling under that supervisor, with matching UID/GID. Existing exact
capability, role/session/request, lifetime, and replay checks still apply.

A client verifies its listener before writing a capability-bearing frame. It
requires matching UID/GID and the same process, its parent, a sibling under its
parent, or a direct child it supervises. This admits the existing supervisor-to-
child and broker-to-Guardian topology without accepting an unrelated descendant.
The process relation establishes a supervised group, not a provider role;
the exact protocol capability and bindings still establish the role.

Socket setup requires an absent endpoint in a real directory owned by the user
or root. A writable shared directory must have its sticky bit set. Before
readiness, the socket must be owned by the current UID, must be a socket rather
than a symlink, and is restricted to `0600`. Accepted connections recheck mode,
owner, and device/inode identity; clients inspect the endpoint before and after
peer verification. Occupied files and symlinks are rejected without replacing
them. Same-user privileged filesystem manipulation is not made safe by these
checks; the command sandbox must remain unable to access the host socket path.

Admission is limited to 16 simultaneous connections and a two-second admission
deadline. The native helper retains its own one-second deadline. Once admitted,
the existing protocol timeout governs the bounded frame/provider call. Close
rejects new admission, destroys pending sockets, awaits server shutdown, is
idempotent, and prevents reopening. Closing during bind must also clean up the
eventual listener. All transport failures map to fixed errors and no raw peer or
filesystem diagnostics are reflected through the protocol.

Windows keeps its named-pipe transport and exact capability checks. This change
does not claim Windows peer-token or pipe-ACL verification. Other operating
systems remain outside the supported BYOK deployment claim.

## Evidence and limitations

`packages/linux-peer-identity/src/service-ipc.test.ts` exercises real Linux peers,
an unrelated caller given a valid fixture capability, a grandchild impersonating
a listener without receiving client bytes, occupied paths, permissions, missing
helper, early disconnect, and close/bind races. Existing protocol suites must
continue to pass on Windows and Linux, including successful supervised children
and wrong capability, binding, expiry, and replay rejection.

See [W27 evidence](../development/evidence/w27-linux-provider-ipc-containment.md)
for actual results. This local control does not establish complete intended-host
credential/process/artifact containment, descendant-tree confinement, universal
provider isolation, hosted assurance, or the separate Linux GitHub effect gate.
