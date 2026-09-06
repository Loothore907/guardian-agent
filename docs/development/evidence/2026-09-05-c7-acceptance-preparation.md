# C7 acceptance preparation checkpoint

Date: 2026-09-05 (local; cloud activity extends into September 6 UTC).
Source: uncommitted working tree on `codex/13-c6-linux-provider-containment`.

## Verified local behavior

- Trusted worker-turn context is minimized and passed into the Guardian child.
  Turn/session/mission/profile/policy/grant identity and digest mismatch fail closed.
- The broker independently checks the final request digest, proposal and floor
  against trusted context. A mismatch does not invoke Guardian or GitHub. The
  provider-boundary audit flag is set only immediately before actual inference.
- Session receipts distinguish usage estimates from unresolved reservations and
  keep provider billing pending; the judge receipt contains no campaign totals.
- Explicit budget policies can account for eight calls per role and two Extracts.
  Tests settle ten observations and reject a ninth worker call or third credit.
  Initial policies retain their original limits.
- Static fixture pairs preserve legitimate facts, use approved origins, and escape
  HTML. Operator accounting distinguishes prepaid cash, credits, estimates,
  pending reservations and billed charges; unknown values remain pending.

## Reproduction

Run from the repository root with installed workspace dependencies:

```text
node node_modules/vitest/vitest.mjs run apps/reference-supervisor/src/c7-service-children.test.ts packages/broker/src/index.test.ts apps/broker-service/src/index.test.ts apps/broker-service/src/process.test.ts apps/control-api/src/judge-portal-budget.test.ts
node node_modules/vitest/vitest.mjs run packages/contracts/src/managed-demo-budget.test.ts packages/managed-demo-budget/src/index.test.ts
node --test scripts/c7-fixtures.test.mjs scripts/c7-cost-report.test.mjs
pnpm check
```

Results: 50 focused risk/receipt tests; 32 focused budget tests; three static
fixture/report tests; final complete Windows suite 655 passed and 18 platform
skips. Formatting, lint, type checking, remaining harness checks, dependency
boundaries (234 modules, 532 dependencies), and production build passed.
Local logs are under ignored `tmp/c7-acceptance/`.

## External state

- Public synthetic fixture repository created and its remote commit verified:
  [guardian-agent-injection-lab](https://github.com/Loothore907/guardian-agent-injection-lab/tree/bd63c72aa1e697e4192f53ba19f833724efb6475).
- User completed Cloud Console billing; active status and USD 25 prepaid balance
  were observed. Cloud billing showed no usage in the displayed period before
  provisioning was attempted. Token Factory billing is separate and is not
  reconciled by that observation.
- Prepared CPU-only VM: `guardian-c7-judge-dev`, eu-north1, cpu-e2, 2 vCPU/8 GiB,
  Ubuntu 22.04 driverless, 32 GiB encrypted SSD, static IPv4, dedicated operator
  SSH key, password/root SSH disabled, operator-source SSH firewall rule, TCP
  80/443 ingress, initial six-hour shutdown. Console estimate USD 0.07/hour,
  taxes excluded. These are prepared settings, not verified host controls.
- Creation rejected for zero non-GPU CPU quota. Provider acknowledged a request
  for exactly two vCPUs. No successful VM creation, DNS activation, or live model
  session occurred at this checkpoint.

## Limits and next gates

This is synthetic/local evidence, not a successful real-provider injection test
or a hosted Enforced claim. Complete current-source Linux and intended-host probes
before live sessions. Resolve quota, verify resource/image identities and SSH host
identity, deploy hardened ingress, and register exact fixture URLs/PR heads.
The operator report remains a local read-only artifact; authenticated hosted
operator access and actual campaign ledger configuration remain unfinished.
Reconcile provider billing and track infrastructure independently of prepaid cash.
The main repository's accumulated source is not committed, pushed or merged.
