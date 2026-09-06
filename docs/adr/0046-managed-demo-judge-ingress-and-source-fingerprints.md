# ADR-0046: Managed-demo judge ingress and source fingerprints

- Status: Accepted
- Date: 2026-09-04
- Extends: ADR-0034, ADR-0041, ADR-0043, ADR-0044, and ADR-0045
- Supersedes: none

## Context

The managed-demo budget service can reserve a journey, bind four role-specific
usage reporters to it, and settle measured or conservatively forfeited cost. It
does not yet decide whether an Internet request is an authorized judge request,
derive the one-way source fingerprint used by admission policy, or guarantee that
admission happens before a paid provider process starts.

The initial hosted topology places Caddy and Guardian on one judge VM. Caddy is
the only public listener; Guardian receives HTTP over loopback. An inbound bearer
credential, hostname, forwarding header, or request body must not become a
deployment, pool, ledger, model, price, or capability selector. Raw client
addresses are personal and abuse-sensitive data and must not become budget,
audit, or application-log fields.

## Decision

### Fixed judge route and authentication

The judge deployment exposes one bounded `POST /v1/judge/journeys` route through
Caddy. Guardian binds its HTTP listener to loopback and accepts the route only
when all of the following hold:

- the direct peer is loopback;
- the canonical host is the configured judge hostname;
- Caddy reports HTTPS and supplies exactly one unambiguous client address; and
- the request presents the deployment's private high-entropy judge credential.

Caddy overwrites, rather than appends to, inbound client-address and scheme
headers. Guardian rejects `Forwarded`, `X-Real-IP`, multiple
`X-Forwarded-For` values, comma-separated chains, malformed addresses, and any
non-loopback direct peer. Host and forwarding values are routing evidence, never
authentication evidence. Caddy access logging remains disabled for this route
unless a reviewed redaction configuration proves that it omits authorization and
raw client-address fields.

Guardian hashes the presented credential and compares the fixed-size digest in
constant time with a deployment-bound expected digest. The expected digest is
treated as protected credential-equivalent configuration. The raw credential,
its digest, authorization header, and authentication failure detail are excluded
from responses, logs, traces, audit records, command arguments, environment
variables, and repository configuration.

The expected credential digest and source-fingerprint key are separate
SecretStash payloads readable only by the judge ingress identity. The operator
provisions and rotates them outside Guardian's public application and outside
agent or model context. Local tests inject obvious non-production bytes through a
narrow in-memory interface; this is not evidence that protected SecretStash
resolution is deployed.

### Privacy-preserving source fingerprint

After authentication, trusted ingress canonicalizes the single client address.
IPv4-mapped IPv6 and its IPv4 representation canonicalize identically. Zone
identifiers, ports, address lists, and non-IP values fail closed.

The admission fingerprint is:

```text
HMAC-SHA-256(
  deployment source key,
  "guardian-managed-demo-source-v1" || deployment ID || canonical address
)
```

The deployment ID provides explicit domain separation, and judge and public
deployments use unrelated keys. Only the 64-character digest reaches the budget
controller and ledger. Guardian does not log or persist the canonical address or
key. The fingerprint is stable for the deployment window so cooldown and source
limits cannot be reset by routine key rotation. Rotating the key during an active
window is an incident operation that disables admission first and reconciles the
loss of prior source continuity. The ledger follows the deployment's documented
retention and deletion procedure; fingerprints are not exported as analytics.

### Admission, supervisor composition, and settlement

Trusted ingress generates the journey identifier and invokes the fixed judge
deployment's `ManagedDemoJourneyBudgetController` before starting the reference
supervisor or any credential-holding provider process. The request body contains
only a strict, credential-safe mission objective. Unknown fields and attempts to
submit identifiers, pools, credentials, models, prices, money, capabilities, or
provider options fail before admission.

Admission denial returns one generic capacity response without a budget snapshot
or policy detail. An admitted journey supplies its exact interaction, Guardian,
worker, and research reporter configurations to the corresponding supervised
service bootstraps. The HTTP process receives neither a ledger path nor provider
credential capability.

Exactly one settlement begins after execution. A fully completed journey settles
as `completed`; validation failure, denial, exception, interruption, timeout,
client disconnect, or incomplete output settles as `failed`. A settlement error
overrides an apparent success and returns only service unavailability. The
durable reservation remains available for conservative expiry forfeiture; ingress
does not infer missing usage or retry settlement with altered data.

The judge route does not expose an anonymous or implicitly approved GitHub
mutation. Any future privileged effect retains its separate exact-request,
resource-version, and human-authorization boundary.

### Public result and logging

The initial route returns only a strict state and a small allowlisted public code.
It does not return budget snapshots, source fingerprints, provider identifiers,
usage, capabilities, credentials, raw model/provider bodies, or internal failure
text. Automatic HTTP request logging is disabled because common serializers
include remote addresses. Any later ingress telemetry must use an explicit
sanitized event schema.

## Consequences

- Unauthorized or malformed requests cannot consume admission capacity or start
  a paid provider process.
- Requests cannot choose or debit another deployment's budget or credentials.
- Stable rate limiting does not require retaining raw client addresses.
- A copied fingerprint cannot authenticate a request and cannot be reversed
  without both the narrow address candidate set and the deployment key.
- The judge ingress necessarily handles the presented judge credential and raw
  network address briefly in memory, so its process, secret resolution, proxy
  configuration, zeroing, and logs require protected deployment inspection.
- The local contract and composition do not prove Caddy, SecretStash, firewall,
  provider caps, or hosted runtime enforcement.

## Rejected alternatives

- **Raw address in the ledger:** creates unnecessary personal-data retention.
- **Plain SHA-256 of the address:** permits inexpensive enumeration of likely
  addresses and cross-deployment correlation.
- **Request-selected pool or ledger:** allows public-to-judge substitution.
- **Trust every forwarding chain:** lets a public caller choose its rate-limit
  identity.
- **Admission after mission or provider startup:** permits unreserved spend.
- **Optimistic success when settlement fails:** can release results without
  durable cost accounting.
- **Generic authenticated HTTP:** widens the route beyond the one typed journey.

## Evidence required

- strict request and public-result contract tests;
- authentication, constant-time digest, header ambiguity, address
  canonicalization, spoofing, and cross-deployment fingerprint tests;
- order tests proving admission precedes supervisor/provider startup;
- exact reporter projection and role-substitution tests;
- completion, failure, interruption, timeout, disconnect, and settlement-failure
  tests;
- response and log secret/source corpus inspection; and
- protected Linux inspection of Caddy overwrite behavior, loopback binding,
  SecretStash identity and payload access, process ancestry, filesystem/network
  boundaries, and ledger expiry behavior.
