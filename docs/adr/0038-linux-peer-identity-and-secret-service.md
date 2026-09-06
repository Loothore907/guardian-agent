# ADR-0038: Linux peer identity and Secret Service credential resolution

- Status: Accepted
- Date: 2026-09-03

## Context

C6 requires the intended self-hosted Linux runtime to authenticate local IPC
peers and resolve credentials without exposing reusable secrets. W24 established
current-user-only Unix socket and SQLite permissions, but a filesystem mode does
not identify the process connected to a socket. Node 24's public `node:net` API
does not expose Linux `SO_PEERCRED`.

The existing credential store used Windows Credential Manager. The Linux
reference path needs an operating-system credential service with no plaintext
file or in-memory fallback.

## Decision

Add a small, dependency-free C helper owned by the repository. The authority
service passes each accepted Unix socket as child file descriptor 3. The helper
requires an `AF_UNIX` socket, reads `SO_PEERCRED`, and emits only the peer PID,
UID, and GID. Guardian verifies the helper is a regular executable owned by root
or the current user and not writable by group or others before opening durable
state.

The authority accepts only a same-UID/GID peer that is the authority process,
its trusted supervisor, or a direct sibling child of that supervisor. It performs
this check before reading a request. The independently generated, session-bound
IPC capability remains mandatory after peer authentication. Missing helpers,
malformed credentials, unavailable `/proc` ancestry, and unmatched processes
fail closed. The ordinary Linux build requires `/usr/bin/cc` and produces the
helper before tests or application build.

Add a Linux Secret Service adapter using the fixed `/usr/bin/secret-tool`
executable and fixed `application`, schema, provider, and slot attributes. Secret
bytes travel only over stdin. The child receives only
`DBUS_SESSION_BUS_ADDRESS` and `XDG_RUNTIME_DIR` when present; it receives no
ambient `PATH` or provider configuration. Lookup output is bounded, scoped to a
credential-holding callback, and zeroed afterward. A missing executable,
unavailable session bus, provider diagnostic, invalid UTF-8, NUL byte, oversized
secret, or unexpected output produces the fixed credential-store error. There is
no fallback store.

## Consequences

- Possession of a leaked IPC capability alone is insufficient for an unrelated
  Linux process to call the authority service.
- The native helper is narrow and auditable, but Linux builds now require a C
  compiler and must preserve its restrictive executable mode.
- Linux credential operations require `libsecret-tools` and a running Secret
  Service in the same user session.
- This slice does not claim successful protected Linux credential enrollment or
  GitHub read/merge evidence. The current WSL image lacks `secret-tool`, and that
  absence is verified to fail closed.
- Other local service protocols and broader service containment remain separate
  defense-in-depth work; C6 remains in progress.

## Rejected alternatives

- Undocumented Node socket-handle fields: unstable and not a supported security
  boundary.
- A general native addon or third-party IPC package: materially wider dependency
  and attack surface than the one syscall required here.
- UID or socket permissions alone: they do not bind the request to the supervised
  process topology.
- Arbitrary credential commands, arbitrary attributes, environment credentials,
  or plaintext-file fallback: each widens authority or exposes reusable secrets.

## Evidence

- `packages/linux-peer-identity/native/peercred.c`
- `packages/linux-peer-identity/src/index.test.ts`
- `apps/authority-service/src/index.ts`
- `scripts/linux-c6-permissions.test.mjs`
- `packages/credential-store/src/index.test.ts`
- `docs/development/evidence/w25-linux-peer-and-credentials.md`
