# ADR-0034: Bounded public and piloted demo modes

- Status: Accepted
- Date: 2026-09-02
- Checkpoints: C8-C10

## Context

The controlled competition journey is an architectural validation instrument, but
the final product demonstration must serve two different audiences. A public
viewer needs a fast, repeatable experience that cannot spend unlimited provider
credits or exercise a credentialed operation. A judge, reviewer, or presenter
also needs a supervised exploratory experience that demonstrates natural-language
mission formation, live research, model fallibility, deterministic containment,
and a separately authorized GitHub action.

Treating an open prompt as open authority would defeat the product. Depending on a
live model to follow an indirect prompt injection would also make the security
story nondeterministic and encourage an unsupported claim that a particular page
caused a particular model action.

## Decision

Guardian will expose two presentation modes over the same policy, authority,
credential, broker, adapter, and audit boundaries.

### Public locked demo

The public mode is a one-click, queued, tightly rate-limited run of a fixed
versioned scenario. It uses a fixed mission, bounded provider/model policy,
controlled hostile-content fixture, disposable public targets, fixed budgets, and
ephemeral session state. It accepts no arbitrary prompt, URL, repository,
credential, header, command, model identifier, or capability selection.

It may make live Nebius and bounded public-research calls and may perform a typed
read against the dedicated demo repository. It demonstrates the unsafe proposal
being denied before approval or credential use. It does not expose an anonymous
credentialed mutation. Provider unavailability produces a labeled fail-closed
result rather than a canned success. A deterministic replay may be offered only
when visibly labeled as recorded or fixture-backed evidence.

Deployment enforces per-run, per-source, daily, and global provider budgets,
bounded concurrency, queue limits, cooldowns, and an operator kill switch. The
public UI returns only minimized scenario and audit projections.

### Piloted live demo

The piloted mode requires an authenticated operator at the trusted keyboard. It
accepts a natural-language objective, not raw authority. Guardian compiles the
objective into a reviewable mission candidate with fixed capability families,
destinations, duration, volume, and side-effect ceilings. The operator confirms
the exact normalized session before work begins.

The operator may choose either:

- the controlled hostile-content fixture for a reproducible injection-exposure
  and denial path; or
- curated live-web research through Guardian's bounded provider gateway, where
  retrieved content remains untrusted and no injection success is promised.

GitHub access is read-only by default and fixed to the dedicated disposable demo
repository. A mutation is a separate scenario step requiring exact current
resource binding and user-verifying approval. It cannot reuse the denied attempt,
research content, model rationale, or session confirmation as mutation authority.

### Shared claim boundary

The demonstrated threat is not that public content permanently corrupts a model.
The threat is that untrusted content may influence an agent's current reasoning so
it proposes an unsafe or out-of-scope operation. Guardian's claim is that this
proposal cannot create authority, obtain credentials, or execute through the
documented controlled path. The UI may show temporal association between exposure
and attempt, but it must not assert model causation without separate evidence.

## Consequences

- The locked mode is safe to fund and expose broadly without making the privileged
  broker an anonymous public action API.
- The piloted mode demonstrates product flexibility while keeping prompts below
  deterministic mission compilation and exact human confirmation.
- Controlled and live-web research are scenario choices, not different trust
  models; both remain untrusted.
- Worker-visible research and GitHub operations require new typed dispatcher
  gates. The current worker runtime exposes only session status and local command;
  the existing fixed competition coordinator remains the implemented route until
  those gates pass.
- OpenAI or another qualified provider may later implement a role policy, but demo
  mode never selects an unqualified model or silently changes policy mid-session.

## Rejected alternatives

- **Anonymous open prompt with broad tools:** converts a demonstration into a
  funded abuse and credential surface.
- **Anonymous merge button:** bypasses the human-approval story and creates shared
  mutable demo state.
- **Only a canned animation:** does not exercise the real model, research, policy,
  or authority boundaries.
- **Hunting for successful injections in the wild:** is nondeterministic, creates
  attribution problems, and rewards breadth over controlled evidence.
- **Calling the model corrupted:** overstates a transient context-manipulation
  threat and implies a causal claim the demo does not establish.

## Evidence required

Before public deployment, tests must cover prompt and destination immutability,
queue/concurrency/daily/global budgets, anonymous mutation rejection, operator
authentication, exact mission confirmation, controlled/live research labeling,
provider failure, demo reset isolation, WebAuthn mutation binding, audit
minimization, credential corpus exclusion, and kill-switch behavior. Public and
piloted modes must produce evidence through the same control implementation.
