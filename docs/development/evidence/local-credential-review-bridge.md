# Local credential review bridge evidence

- Date: 2026-09-04
- Scope: deterministic BYOK browser ceremony, CLI composition, and fake-review
  gate
- Assurance: implemented locally; user interaction and real enrollment pending

## Outcome

The failed raw-terminal credential reader is no longer reachable from the
production Guardian command. `guardian credentials` is the stable management
entry point and `guardian setup` remains a compatibility alias. Nebius and Tavily
use one fixed local-browser composition; GitHub retains its separate device flow.

The executable `review` operation preflights the actual platform credential store
before opening an ephemeral `127.0.0.1` surface. Its callback does not construct a
provider verifier and cannot write, read, or delete credential material. The page
labels itself as fake-only. Real browser enrollment is compiled and tested through
fixed provider verification and transactional store replacement, but a local
acceptance constant keeps that command disabled until the user completes the
hands-on review and ADR-0042 is accepted.

## Deterministic controls

- Only Nebius or Tavily and the Windows Credential Manager or Linux Secret
  Service destinations are accepted by the pasted-secret surface.
- Store preflight occurs before the surface is created.
- The server binds an ephemeral IPv4 loopback port and requires the exact host,
  loopback peer, same-origin `Origin`, same-origin fetch metadata, binary content
  type, and fixed-length one-use capability comparison.
- The capability stays in the URL fragment, is removed from browser history, is
  absent from the document, and is zeroed by the server when it closes.
- The page applies a nonce-bound default-deny content security policy, no-store,
  no-referrer, same-origin resource/opener controls, disabled privileged browser
  features, and no credential autofill.
- Submission accepts 8-4,096 printable non-whitespace ASCII bytes. Browser,
  request-chunk, callback, verification, snapshot, and store-use byte copies are
  cleared on their documented paths.
- Cancellation, invalid input, oversized input, verification failure, expiry,
  and replay reach bounded terminal outcomes. Public errors do not reproduce
  callback or provider detail.
- Verification precedes writes. Failed replacement restores the prior valid
  enrollment or reports a sanitized rollback failure.

## Reproducible local verification

```text
pnpm check
```

Result on the Windows development host:

- Prettier, ESLint, TypeScript, and Linux peer-helper build passed.
- Vitest: 72 files / 524 tests passed; 4 protected files / 10 protected tests
  skipped.
- SQLite spike: 7 passed; the POSIX-only permission case skipped on Windows.
- Demo reset planner: 2 passed.
- Dependency boundaries: 201 modules / 427 edges, no violations.
- Production web build passed.

The changed tests cover stable command parsing, actual-store preflight ordering,
real enrollment composition, provider-free/store-read-only review, sanitized
cancel/failure/expiry handling, fake-only page copy, local-destination rejection,
invalid and oversized terminal completion, callback failure, one-use replay, and
buffer clearing.

## Hands-on review gate

After building, the user must launch the following command from their own trusted
interactive terminal, not from an agent-created terminal:

```text
node apps/guardian-cli/dist/main.js credentials review nebius
```

The user opens the printed one-time URL in their normal browser, confirms the
provider and destination, and either submits an obvious fake value or cancels.
The URL and fake value must not be pasted into chat. Acceptance requires the user
to confirm that the origin, ownership, destination, copy, paste behavior,
cancellation, and terminal/browser completion are understandable.

## Non-claims and next step

- No real credential was requested, entered, read, written, or exposed.
- No provider, SecretStash, GitHub, deployment, or other remote operation ran.
- Browser usability, Windows Credential Manager enrollment, WSL/Linux loopback
  forwarding, persistent Linux Secret Service setup, and protected provider
  consumption are not established by deterministic tests.
- After hands-on acceptance, update ADR-0042, enable real enrollment, run the
  relevant platform review again, and let the user enroll one provider from the
  same trusted terminal/browser boundary before resuming bounded live inference.
