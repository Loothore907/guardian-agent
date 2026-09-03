# W13 exact competition CLI confirmation evidence

- Date: 2026-09-02 (AKDT)
- Branch: `codex/13-c6-durable-authorization-broker`
- Status: Exact CLI ceremony and complete trusted supervisor operation implemented;
  executable dispatch and competition-session activation remain

## Implemented path

```text
strict fixed research + unsafe merge + legitimate merge input
  -> exact cross-request authority and different-repository checks
  -> terminal renders exact target, head, method, and canonical digest
  -> AUTHORIZE <digest-prefix>
  -> fresh confirmation only (no approval object in CLI)
  -> supervisor owns the journey clock, revalidates W12, and derives durable connection scope
  -> one-use approval stored by authorization role
  -> fixed W11 services run W6 exactly once and close
  -> minimized completed/stopped result rendered
```

## Deterministic evidence

The focused set passes four files and 17 tests. New tests cover:

- acceptance of only the explicit zero-argument competition command shape;
- non-interactive and wrong-digest rejection before runner invocation;
- exact digest, target, head, and sanitized outcome display;
- forwarding only the parsed fixed requests plus fresh human confirmation; and
- same-target unsafe-request rejection before confirmation.

The completed workspace gate passes 60 ordinary Vitest files / 334 tests, skips
three protected files / five tests, cruises 174 modules / 348 dependencies without
a violation, and passes formatting, lint, typecheck, SQLite/reset checks, the
production Vite build, and `git diff --check`.

## Residual limitations

- `guardian competition` is parsed but is not yet dispatched by `main.ts`.
- The trusted competition-specific mission/profile split, research endpoint,
  durable demo connection, and exact request construction are not yet attached to
  executable startup.
- Protected Tavily, Nemotron-through-broker, demo merge, and audit inspection were
  not run. WebAuthn and platform peer-identity evidence remain.
