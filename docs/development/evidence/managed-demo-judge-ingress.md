# Managed-demo judge ingress evidence

- Date: 2026-09-04
- Implementation revisions: `fb0d180`, `fa1809b`
- Scope: local deterministic contracts, HTTP ingress, budget lifecycle, and
  supervisor reporter projection
- Assurance: implemented locally; protected hosted enforcement not claimed

## Assumption tested

A same-host trusted ingress can authenticate a fixed judge route, derive a
deployment-separated one-way source identity, reserve managed-demo capacity
before supervised provider execution, and attempt one settlement for every
admitted terminal path without exposing a ledger, pool selector, provider
credential, source address, fingerprint, capability, provider body, or internal
failure detail through the public API.

## Deterministic controls

- The public request contains only `schemaVersion` and one bounded,
  credential-safe objective. Strict schemas reject unknown fields and
  secret-like content.
- The control API accepts the route only from a loopback peer with the exact
  configured host, HTTPS forwarding marker, one canonical client address, and a
  syntactically bounded bearer credential whose hash matches the configured
  digest. Alternate or ambiguous forwarding fields fail before admission.
- Credential comparison hashes the presented value and uses fixed-length
  `timingSafeEqual`. The in-memory expected digest and HMAC key are copied into
  private buffers and zeroed when the API closes.
- IPv4-mapped IPv6 and IPv4 canonicalize identically. HMAC-SHA-256 separates the
  source digest by deployment ID and a deployment-owned key. Only the digest
  reaches admission.
- The coordinator generates the journey ID, calls budget admission first, and
  never invokes the executor after denial or admission failure.
- The admitted interaction, Guardian, worker, and research reporters must share
  the exact reservation, journey, budget endpoint, and deployment while retaining
  their distinct role capabilities.
- The reference supervisor places only the matching reporter into each
  credential-holding service bootstrap. It receives no ledger path.
- Completion is accepted only from an exact one-field executor result and a
  matching settled reservation. Denial, malformed output, exception, abort, or
  disconnect requests failed settlement. Settlement failure, mismatch, or
  forfeited apparent completion returns only service unavailability.
- Automatic Fastify request logging is disabled. Judge results use `no-store`
  and a strict state/code schema.

## Near-miss evidence

Tests cover missing and incorrect credentials, wrong host, non-TLS forwarding,
non-loopback peers, comma-separated forwarding chains, `Forwarded`, `X-Real-IP`,
malformed addresses, address ports and zone identifiers, request-supplied pool
fields, secret-like objectives, denied and unavailable admission, reporter role
and journey substitution, stopped and malformed execution, provider-style thrown
detail, pre-execution and in-execution abort, settlement failure, settlement
identity mismatch, forfeited apparent completion, malformed JSON, and public/log
secret and source-corpus absence.

## Reproducible local verification

```text
pnpm check
```

Result on the Windows development host:

- Prettier, ESLint, TypeScript, and Linux peer-helper build passed.
- Vitest: 72 files / 518 tests passed; 4 protected files / 10 protected tests
  skipped.
- SQLite spike: 7 passed; the expected POSIX-only permission case skipped on
  Windows.
- Demo reset planner: 2 passed.
- Dependency boundaries: 201 modules / 426 edges, no violations.
- Production web build passed.

Focused ingress verification also passed 6 files / 45 tests covering the new
contracts, source identity, coordinator, HTTP route, competition-service bundle,
and supervisor reporter projection.

## Residual limitations and next evidence

- The default control-API executable does not activate the judge route because no
  protected SecretStash ingress-secret loader or hosted deployment bootstrap is
  configured yet.
- The route-to-supervisor executor is a narrow injected boundary. Protected
  startup must construct it with the fixed judge configuration and show that no
  paid provider child can start outside an admitted journey.
- Caddy header overwrite, access-log suppression, loopback binding, firewall,
  SecretStash payload access, process identity, Linux socket/database ownership,
  client disconnect, and expiry forfeiture require inspection on the target VM.
- No live provider was called. Prices, the 20-journey calibration, provider-side
  caps, funding, and load measurements remain absent.
- No public deployment, judge availability, custody isolation, cost guarantee, or
  hosted `Enforced` assurance is claimed.
