# Protected research-only judge startup evidence

- Date: 2026-09-06
- Issue: #19
- Scope: offline fixed-secret loading, protected service composition, lifecycle,
  and credential-free source packaging
- Assurance: implemented and tested locally; hosted enforcement not claimed

## Security outcome

The repository now contains one dedicated production entry point that can start
the ordinary control API in a fully disabled mode or assemble the first
research-only managed-demo judge boundary. Research-only startup is narrower than
the earlier mutation-capable headless factory: it has no GitHub connection,
mutation authorization, seeded scenario, arbitrary provider slot, arbitrary
SecretStash key, or arbitrary child command.

The enabled startup order is fixed:

```text
strict credential-free bootstrap
  -> two fixed SecretStash ingress reads
  -> managed-demo budget child ready
  -> exact budget clients and research-only portal
  -> loopback control API listen
```

The API, portal, secret material, and child are closed on normal shutdown,
startup failure, cancellation, listener failure, or unexpected budget-child
exit. The default mode performs none of the protected setup and registers no
judge journey route.

## Implemented controls

- The host schema permits only `disabled` or `research_only` and only
  `127.0.0.1` ports 1024–65535.
- Research mode requires the Linux managed-demo judge pool, exactly
  `nebius/default` and `tavily/default`, a matching judge budget deployment, and
  exact service/client capability bindings for the controller plus four usage
  reporters.
- Project and durable-state roots must be absolute POSIX paths, with state outside
  the immutable project root.
- Ingress configuration contains exactly two distinct managed-demo Linux judge
  SecretStash resources: one fixed access-digest payload and one fixed source-key
  payload.
- `/usr/local/bin/nebius` receives only fixed SecretStash read arguments, empty
  stdin/environment, and a 15-second timeout. Values never enter argv or config.
- Lowercase-hex decoding, exact digest size, bounded key size, callback lifetime,
  zeroing, and sanitized errors limit secret exposure.
- The fixed production budget child receives one bounded bootstrap frame over
  stdin, must emit the exact readiness line, rejects output after readiness, and
  is terminated on close.
- The portal-only control API omits the legacy direct-journey coordinator. Existing
  portal and budget-controller tests prove atomic admission before runtime/provider
  preparation and conservative terminal settlement.
- Automatic Fastify logging remains disabled. Public ingress errors remain typed
  and sanitized.
- The source generator uses `git archive` for one exact commit and emits a strict
  disabled manifest containing only hashes, toolchain versions, loopback binding,
  and logical secret-slot names. Output is restricted to a new repository `tmp`
  child and the manifest is created with mode 0600.

## Reproducible verification

Focused verification:

```text
pnpm typecheck
node node_modules/vitest/vitest.mjs run \
  apps/judge-host-service/src/budget-child.test.ts \
  apps/judge-host-service/src/index.test.ts \
  packages/contracts/src/protected-judge-host.test.ts \
  packages/contracts/src/managed-demo-ingress.test.ts \
  packages/credential-store/src/index.test.ts \
  apps/control-api/src/app.test.ts \
  apps/control-api/src/judge-portal-budget.test.ts
node --test scripts/protected-judge-host.test.mjs \
  scripts/protected-judge-source-manifest.test.mjs
```

Full local verification on the feature branch:

- `pnpm check` passed: formatting, ESLint, TypeScript, Linux peer-helper build,
  686 Vitest tests passed / 18 protected tests skipped, SQLite 7 passed / 1
  POSIX-only case skipped, reset planner 2 passed, keyring preflight 6 passed,
  operator clock 1 passed, supervised GitHub harness 5 passed, legacy headless
  host 1 passed, protected host 1 passed, source manifest 1 passed, dependency
  boundaries (242 modules / 556 dependencies) and the production build.
- Session-hygiene tests passed 7/7. Linux-platform tests were correctly skipped
  2/2 on the Windows development host; exact-head Linux CI remains required.
- The production dependency audit reported no known vulnerabilities.

Remote exact-head CI results belong in the PR and session closeout rather than
being predicted here.

## Deliberate non-actions and remaining gates

This slice did not query or start either VM, read or change a real credential,
modify SecretStash/IAM, provision Caddy/DNS/TLS, refresh a policy or price window,
increase an allowance, call a paid provider, or execute a hosted journey.

Before hosted execution, the operator must approve the exact replacement VM,
source manifest, runtime readers, ingress provisioning, domain/routes, provider
limits, journey count, spend ceiling, admission close, compute window, and
shutdown/cleanup. Target-host cold boot, retrieval/redaction, service identity,
filesystem/process/network containment, external HTTPS, live admission/provider
ordering, durable settlement, and billing reconciliation remain required evidence.
