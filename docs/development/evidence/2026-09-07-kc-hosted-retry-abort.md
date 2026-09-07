# KC protected hosted retry abort — September 7, 2026

Tracking: issue [#19](https://github.com/Loothore907/guardian-agent/issues/19)
and run-sheet PR
[#44](https://github.com/Loothore907/guardian-agent/pull/44).

## Result

The second bounded KC research window ended without a judge-host admission,
credential activation or provider request. The replacement VM was started long
enough to verify the exact reviewed deployment bundle and two deployment-safe
Linux gates, then was stopped after the Codex operator session incorrectly treated an
inapplicable development-suite result as a production gate failure. A later
attempt to resume did not reactivate the cutoff automation or restart the VM,
and the absolute run-sheet window expired.

This is an assistant execution failure, not a Guardian authorization
failure and not evidence of a product runtime defect. It does not establish a
successful hosted journey, public HTTPS availability, live model behavior or a
new security claim.

## Bound source and infrastructure

- reviewed source commit: `95648b58a871664ef6e29c9713bb2e7dacaa4f05`
- run-sheet merge commit: `4ea86ea100f6598d3cfb87956709a1fc3954fad3`
- source archive SHA-256:
  `de1584e28603873dc9a90fba9355664b65c844cb98537be4eefd86143dce8a12`
- lockfile SHA-256:
  `9425effa8a472bbb356cea1472d33df3fd3c73a2d69f3ebb97576a5bac68f492`
- immutable manifest: schema 1, 530 entries, 107,845 bytes
- replacement VM: `computeinstance-u00dkgrgnqdmy4vz67`
- original VM: `computeinstance-u00jbhqf6qg9jwag4g`
- runtime: Node `v24.19.0`; pnpm `11.19.0`

The replacement start operation recorded `2026-09-07T08:49:18.05857Z`.
Authenticated stop verification was conservatively recorded at
`2026-09-07T09:22:38.5390886Z`, a 33-minute 20-second interval. The original VM
remained stopped. A later authenticated control-plane check reported both VMs
`STOPPED`.

## Verification performed

The exact archive hash matched after transfer. Extraction produced a gitless
root with no `.env.example`; the lockfile hash matched. Frozen-lockfile install
used only the retained offline pnpm store and downloaded zero packages.

The deployment-safe hosted checks passed:

- `pnpm test:linux-platform`: 2 passed, 0 failed;
- `pnpm test:reference-runtime`: 2 passed, 0 failed, including the production
  manifest-bound gitless archive and C4 isolation tests.

The Codex operator session also ran `pnpm check` inside the reduced deployment archive. That
command is valid in the complete repository but is not a valid deployment-archive
gate. It reported 13 failures, 688 passes and 6 skips because the archive retains
some test files while intentionally excluding their tracked fixture modules.
The serial rerun reproduced missing-fixture failures in:

- `apps/reference-supervisor/src/c7-service-children.test.ts`;
- `apps/reference-supervisor/src/supervised-process.test.ts`; and
- `packages/linux-peer-identity/src/service-ipc.test.ts`.

The production bundler explicitly excludes
`apps/reference-supervisor/test-fixtures/`,
`packages/linux-peer-identity/test-fixtures/` and `scripts/test-fixtures/`.
`scripts/protected-judge-source-manifest.test.mjs` asserts those exclusions.
The result therefore did not show an authorization or isolation regression.
The assistant nevertheless failed closed, removed the deployment and stopped the
VM before credentials or public ingress were enabled.

## Effects and cleanup

- journey admissions: 0;
- new budget reservations: 0;
- Nebius model calls: 0;
- Tavily calls: 0;
- temporary retry bearer: never created and later verified missing;
- access-digest and fingerprint versions: unchanged;
- public Caddy/HTTPS retry gate: not started;
- judge host: not started;
- cutoff automation: original configuration preserved and paused;
- retry deployment root, uploaded archive and temporary pnpm runtime: removed;
- durable private ledger, fixtures, disks, static addresses and SecretStash
  resources: preserved.

Before deploying the new bundle, the explicitly inventoried expired `0bee21f…`
source/archive, one-off helpers and expired bootstrap descriptors were also
removed as the run sheet required. The reviewed source remains recoverable from
Git and the ignored exact bundle; those remote transient files would otherwise
need reconstruction.

The conservative cumulative infrastructure estimate is now USD 1.110945. The
provider billing page reported USD 1.01 total compute usage at its 06:47 UTC
snapshot and may lag this interval. The earlier forfeited USD 0.10 reservation
still awaits provider reconciliation. No top-up or allowance increase occurred.

## Next-session boundary

The PR #44 sheet's absolute admission and shutdown times have expired. Although
its one journey admission was not consumed, a later session must bind a fresh
clock and stop fallback before restarting the replacement. It does not need a
product-code repair for the intentionally excluded fixtures.

The next operator should use exact-head CI and the complete local repository for
`pnpm check`. On the reduced VM archive, run only the deployment-safe gates plus
the reviewed standalone process, peer, filesystem, metadata, credential-path,
network, alternate-tool and Git-push probes required by the new run sheet. Do
not reinterpret absent test fixtures as a production failure or add them to the
manifest-bound runtime.
