# ADR-0055: Compose protected research-only judge startup

Date: 2026-09-06

Status: Accepted

## Context

The managed-demo judge ingress, budget service, and bounded portal runtime were
implemented independently, but the existing headless host factory coupled live
startup to a mutation-capable session executor. That executor requires a GitHub
connection and standing mutation authorization even when the next acceptance
gate needs only public research. The default control API therefore could not be
made live without either widening the research gate or assembling sensitive
dependencies outside one reviewed startup boundary.

The judge ingress also needs two deployment-owned values: a digest of the private
access credential and a key used to pseudonymize the source address. They are not
provider credentials and must not pass through configuration, argv, environment,
logs, responses, or model-visible state.

## Decision

Add a dedicated `@guardian/judge-host-service` composition root with two strict
execution modes:

- `disabled` starts only the ordinary loopback control API and resolves no
  secrets, starts no budget child, and exposes no judge journey route.
- `research_only` requires an exact Linux judge configuration, resolves the two
  ingress values from two distinct fixed Nebius SecretStash resources, starts the
  production managed-demo budget child, constructs the budgeted portal runtime
  with exactly the Nebius and Tavily judge credential slots, and then listens on
  `127.0.0.1`.

The ingress loader invokes only `/usr/local/bin/nebius` with fixed SecretStash
read arguments, an empty environment and stdin, and a bounded timeout. The
payload keys are fixed to `judge_access_credential_sha256` and
`judge_source_fingerprint_key`. Both values must be lowercase hexadecimal; the
digest decodes to exactly 32 bytes and the fingerprint key to 32–64 bytes.
Transient helper output and callback copies are zeroed, and failures are reduced
to credential-safe errors.

The research composition has no GitHub connection, mutation target, seeded
scenario, or legacy direct-journey route. Its authenticated portal draft/confirm
flow performs the research journey. Existing budget admission remains ahead of
supervisor/provider preparation. The listener is created only after secret loading
and budget readiness. Startup failure, cancellation, an
unexpected budget-child exit, and explicit shutdown close the API, portal,
ingress material, and child in reverse ownership order.

The executable accepts one bounded strict JSON bootstrap frame on stdin. It does
not accept secret values. A separate source-bundle generator archives an exact
tracked Git revision and emits its commit and archive/lockfile hashes, a
canonically ordered path/size/content-digest/executable manifest derived from that
same commit, fixed toolchain versions, loopback binding, disabled initial mode,
and logical secret-slot names. ADR-0056 requires that manifest for research-only
startup and workspace preparation.
Concrete secret resource IDs, credential values, private state, host identity,
live policy windows, and spending authority remain deployment inputs rather than
source-manifest content.

The ordinary `start:control-api` command remains judge-disabled. This decision
does not provision Caddy, DNS, IAM, SecretStash resources, credentials, compute,
or a live budget window, and it does not authorize a paid provider call.

## Rejected alternatives

- Reusing the mutation-only headless executor would require unrelated GitHub
  authority and make the first hosted gate materially broader.
- Supplying ingress values through environment variables, argv, or a committed
  deployment file would enlarge their exposure and persistence paths.
- Starting the listener before protected dependencies are ready would create a
  partially initialized public service and complicate fail-closed cleanup.
- A generic SecretStash reader or authenticated process launcher would exceed the
  two ingress slots and one fixed budget child needed by this composition.

## Evidence and limits

Contract tests reject unknown fields, wrong custody/runtime/pool bindings,
duplicate resources, swapped payload keys, widened provider slots, deployment or
budget-capability mismatches, and non-loopback listeners. Credential-store tests
cover exact helper invocation, malformed values, sanitized failures, and buffer
zeroing. Composition tests cover disabled startup, dependency order, missing
legacy mutation ingress, unauthorized requests, startup/listener failure,
cleanup, and unexpected child exit. Production-child tests exercise the real
budget executable and an inert judge-host cold start/shutdown. The exact source
bundle and its credential-free manifest are also tested.

The reproducible record is
[`2026-09-06-protected-judge-startup.md`](../development/evidence/2026-09-06-protected-judge-startup.md).
This is offline implementation evidence. It does not prove target-host IAM,
SecretStash retrieval, Caddy header behavior, external TLS, Linux service
identity or containment, live provider use, settlement, availability, or an
Enforced hosted runtime.
