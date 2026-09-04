# C6 Authority Service and IPC Evidence

- Date: 2026-08-30 (AKDT)
- Issue: [#13](https://github.com/Loothore907/guardian-agent/issues/13)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Deterministic boundary and Linux permission probe implemented; OS peer evidence remains

## Implemented boundary

`apps/authority-service` is the sole runtime owner of
`@guardian/authority-store`. It initializes and migrates the SQLite database,
interrupts prior active sessions on startup, and serves only strict versioned
operations over a bounded local named pipe or Unix-domain socket. The broker
depends on `@guardian/authority-client` and cannot open SQLite.

Capabilities are short-lived, remain outside SQLite, and bind an exact caller
role, caller identifier, session identifier, issuance/expiry window, and operation
subset. The service independently applies a fixed role-operation matrix for
launcher, research service, authorization service, and broker service callers.
Unknown capabilities, binding mismatches, expired or prior-instance capabilities,
unsupported operations, malformed frames, and oversized frames fail closed with
fixed errors.

The reference authority supervisor generates the launcher, research,
authorization, and broker capabilities in memory, starts the authority service,
and injects mandatory authority into every session launched through its API. Its
public role clients are type-narrowed. A development-confirmation issuer stores an
exact, connection-bound approval through only `approval.store`; it enforces a
30-second confirmation freshness window and is explicitly not WebAuthn evidence.
ADR-0010 now places the authority service in a supervised child with bounded
stdin bootstrap, exact readiness, explicit shutdown, observable exit, and no
active-session respawn. The user-verifying WebAuthn verifier/issuer and
platform-specific peer identity and process containment remain. The later Linux
permission slice also verifies current-user ownership and mode `0600` for the
Unix socket and every live SQLite file, including WAL/SHM sidecars; see
`c6-linux-platform-permissions.md`.

## Verification

The local suite covers:

- exact caller, role, session, capability, lifetime, and operation binding;
- unknown, wrong-caller, expired, and prior-service-instance capability rejection;
- startup interruption without resetting durable session identity;
- role-expansion and oversized-frame rejection;
- capability absence from the SQLite file;
- fail-closed supervisor startup without durable-store configuration;
- capability-bearing bootstrap absence from child argv/environment;
- fixed readiness and sanitized invalid/oversized bootstrap failure;
- distinct authority process identity and no restart after unexpected exit;
- durable connection-before-session-before-approval ordering;
- exact request/caller binding and stale development-confirmation rejection;
- broker execution through local authority IPC; and
- dependency rules preventing runtime broker, research, launcher, provider, and
  adapter modules from importing the authority store.

The equivalent complete local checks pass with 22 Vitest files and 117 tests plus the separate SQLite
spike suite.

## Claim boundary and remaining evidence

Windows is an Observed development runtime for this boundary. The random named
pipe plus capability binding is tested, but named-pipe ACL and peer-token evidence
has not been collected. The WSL2 Linux permission probe now actively verifies
the restrictive socket and database modes, current-user ownership, SQLite
sidecars, broad-permission rejection, and a symbolic-link near miss. The final
Linux runtime still requires peer-credential checks, local credential resolution,
service process containment, and protected GitHub read/merge on the selected
host. Local process
supervision is implemented, but Windows and Linux peer/service identity evidence
and development confirmation do not establish complete process isolation or
human-presence assurance; the WebAuthn issuer remains before the final competition
approval claim can advance.
