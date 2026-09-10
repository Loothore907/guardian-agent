# Extraction readiness probe stopped at origin

Owner: [issue #19](https://github.com/Loothore907/guardian-agent/issues/19).
The user approved the frozen [extraction-only proposal](2026-09-10-t1-exposure-readiness.md).
One origin attempt ran; zero extraction attempts and zero model calls occurred.
The probe failed before origin identity could be verified. Its grant is stopped;
there was no retry and no real credential access.

## Execution and independent verification

- Source: `3dbef571b232f48ac86ab448a6560e98f4f66649`, PR #84. Exact-head CI
  `34542697929` and merged-main CI `34543080183` passed. Fresh refs, clean source,
  all five frozen packet artifacts and 218 runtime/helper hashes were checked.
- Start: September 10, 2026, 23:47:36.287 UTC. Finish: 23:47:36.630 UTC.
  Elapsed: **343 milliseconds**; process exit code 1.
- Receipt: `outcome=probe_failed`, `failedBoundary=origin`, `originRequests=1`,
  `extractionRequests=0`, `modelCalls=0`. No origin digest was returned.
- The credential-store provider is constructed only after a successful origin
  identity check. That path was not reached. No hosted admission, VM action,
  credential mutation, forbidden destination request or privileged effect occurred.
- Independent receipt/hash verification and process inspection confirmed the
  stopped result, unchanged frozen inputs, and zero remaining evaluation services
  or probe process. Private evidence is in
  `tmp/t1-extraction-readiness-20260910/attempt/receipt.json` and `verification.json`.
- Receipt SHA-256:
  `c059ea4978e632d919bf281ac107d62b0e98fd64f153c2e1fa8d0eb540b16307`.
  Packet SHA-256:
  `c02a16b078f7a208fa2bc0ce13df783e7a35784a23ab65cd0a8ebdb17bd66929`.

## Interpretation and diagnostic repair

This is an origin-preflight failure, not another model or extraction result.
It neither verifies a fixture mismatch nor explains the earlier T1 partial
exposure. The frozen runner collapsed origin fetch, redirect, HTTP-status, body
and cleanup failures into one boundary category. The underlying reason was not
retained, so it cannot be diagnosed retrospectively. Short duration alone is not
proof of a TLS or DNS cause. Do not weaken TLS validation or bypass this gate.

The next diagnostic is prepared separately under
`tmp/t1-origin-diagnostic-20260910/`. It records numeric HTTP status, explicit
redirect/non-200/missing/oversized-body outcomes, bounded body hash and length,
and allowlisted DNS/TLS/connection/timeout codes. Unknown errors remain a closed
category; raw errors, response bodies and headers are not exported. Redirects
are observed without following them. Body readers are cancelled on every path.

Ten offline checks passed for expected/mismatched identity, redirect, HTTP error,
oversized/missing body, TLS, DNS, timeout and unknown-error redaction. These use
synthetic transports only. No further origin request has been made.

## Next operation — pending approval

Freeze the prepared diagnostic against the integrated result revision. Propose
one unauthenticated GET of the same exact injection fixture, no redirect follow,
10-second fetch deadline, 100,000-byte bound, 30-second process deadline, one
attempt and zero retries. Latest approval expiry: September 12 at 00:00 UTC.
There is no provider adapter, credential reader, extraction, model call or paid
API operation in this diagnostic. It does not automatically resume the stopped
extraction packet even if the origin passes.

Use the resulting category to choose the repair: TLS/DNS/connection status needs
an access diagnosis; redirect/HTTP status needs endpoint reconciliation; a hash
mismatch needs fixture identity reconciliation. Only a verified origin identity
supports proposing a new bounded extraction attempt. Preserve both failed
packets; do not repeatedly run the unchanged request with the same coarse error
reporting. The underlying T1 exposure question and issue #19 remain open.
