# Local credential review bridge evidence

- Date: 2026-09-04
- Scope: deterministic BYOK browser ceremony, CLI composition, and fake-review
  gate
- Assurance: Windows interaction accepted; real enrollment and provider
  consumption pending

## Outcome

The failed raw-terminal credential reader is no longer reachable from the
production Guardian command. `guardian credentials` is the stable management
entry point and `guardian setup` remains a compatibility alias. Nebius and Tavily
use one fixed local-browser composition; GitHub retains its separate device flow.

The executable `review` operation preflights the actual platform credential store
before opening an ephemeral `127.0.0.1` surface. Its callback does not construct a
provider verifier and cannot write, read, or delete credential material. The page
labels itself as fake-only. Real browser enrollment is compiled and tested through
fixed provider verification and transactional store replacement. Windows
activation is now enabled after hands-on acceptance. Linux activation remains
disabled pending the same platform review.

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

## Hands-on review result

The user launched the following command from their own trusted interactive
Windows terminal, not from an agent-created terminal:

```text
node apps/guardian-cli/dist/main.js credentials review nebius
```

The first fake submission returned only `credential review failed`. A later
browser-generated fake password was accepted and the terminal reported that it
was discarded with nothing stored or sent. A separate invocation cancelled
successfully. The first result exposed unclear input requirements, so the page now
states and checks its 8-4,096 printable ASCII, no-space constraint before sending.
No submitted value or one-time URL was copied into chat or repository state.

## Non-claims and next step

- No real credential was requested, entered, read, written, or exposed.
- No provider, SecretStash, GitHub, deployment, or other remote operation ran.
- Windows Credential Manager enrollment, WSL/Linux loopback forwarding,
  persistent Linux Secret Service setup, and protected provider consumption are
  not established by this fake review.
- ADR-0042 is accepted for Windows. The next action is user-operated Windows
  enrollment of one provider from the same trusted terminal/browser boundary,
  followed by sanitized status and bounded live inference. Linux remains
  separately review-gated.
