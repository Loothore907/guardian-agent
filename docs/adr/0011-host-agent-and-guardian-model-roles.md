# ADR-0011: Host-Agent and Guardian Model Roles

- Status: Accepted
- Date: 2026-09-01
- Decision owner: Earl Ray
- Checkpoints: C6-C11
- Corrects: the worker-like Qwen interaction role introduced in ADR-0007 and ADR-0008
- Refined by: ADR-0012 for pre-activation mission formation and boundary failure semantics

## Context

The original product contract places Guardian between an untrusted external agent,
public information, and privileged operations. The user continues to delegate the
actual engineering or research task to Codex, Claude Code, Cursor, or another host
agent. Guardian supplies bounded capabilities and mediates authority.

Later terminal-bridge planning drifted from that contract. ADR-0007 described a
Guardian-owned controlled interaction runner, ADR-0008 said the Qwen interaction
model proposes work, and the first bootstrap implementation allowed its provider
outcome to propose a local command. That would make Guardian a competing agent
scaffold, duplicate the host model's inference cost and context, transfer more
task intelligence to a second provider, and weaken the product's interoperability
story.

## Decision

### The host agent remains the worker

The external host agent owns planning, coding, repository inspection, research
reasoning, and task execution. Guardian does not replace that agent and does not
run a second coding loop. A three-hour host task remains a three-hour host task;
Guardian is invoked at session and capability boundaries rather than continuously.

The supported integration target is any host that can call Guardian's typed
interface. Codex, Claude Code, Cursor, and other scaffolds may eventually
integrate through MCP, a CLI wrapper, or a native adapter. Guardian does not bring
its own worker model into the host's model context.

### Guardian's two model roles are internal and narrow

Qwen is an optional Guardian interaction assistant. It may produce a bounded
mission brief, consequence explanation, or clarification from already normalized
Guardian context. It may not inspect the repository, solve the delegated task,
plan the host's work, propose tools, execute tools, activate a mission, expand
authority, or weaken deterministic policy.

Nemotron is Guardian's contextual risk assessor. It receives a separate,
minimized, credential-free risk envelope for a typed host proposal. Its structured
output may preserve or increase the deterministic authorization floor and may
never lower it.

The normal risk tier is `nvidia/nemotron-3-super-120b-a12b`. The explicit quality
escalation tier is `nvidia/Nemotron-3-Ultra-550b-a55b`. Ultra may be selected only
by deterministic policy or a documented evaluation rule for high-risk,
ambiguous, uncertain, or structurally invalid cases. There is no silent
model substitution. If required judgment remains unavailable or invalid, the
operation steps up or denies. A smaller latency-optimized model is not a security
quality fallback.

### Assurance depends on control of the host

An already-running unrestricted host can use Guardian capabilities in Observed or
Unknown mode, but Guardian cannot claim that alternate network, shell, browser,
credential, or tool paths are absent.

Enforced mode requires Guardian to launch or wrap the host agent inside the
documented constrained runtime, or to receive equivalent reproducible evidence
from a supported host integration. The host still performs the work inside that
runtime; Guardian does not substitute Qwen for it.

### Reference flow

1. The user delegates a task to the host agent or starts it through a Guardian
   wrapper.
2. The host or user submits an untrusted session draft to Guardian.
3. Guardian deterministically normalizes the mission and capability profile.
   Optional Qwen output may explain the normalized result but creates no authority.
4. The human confirms the exact mission through the trusted Guardian surface.
5. The host agent performs the task using its own model and local reasoning loop.
6. Guardian mediates public research and authenticated operations through typed
   capabilities. Low-risk deterministic operations need no model call.
7. For selected semantic-risk events, Nemotron evaluates a minimized envelope;
   Ultra is an explicit quality escalation only.
8. Exact human approval is obtained when the effective authorization level
   requires it.
9. The privileged broker revalidates and executes only the exact authorized
   operation and emits sanitized audit evidence.

## Consequences

- The interaction IPC output becomes a mission brief only and can no longer
  propose a local command.
- The Guardian CLI must describe Qwen output as a Guardian mission brief, not a
  controlled runner result.
- Architecture and competition documentation must distinguish the host worker
  from Guardian's internal model services.
- Qwen cost is occasional Guardian UX overhead, not a replacement coding bill.
  Nemotron cost scales with selected guarded events, not wall-clock task duration.
- A general Codex, Claude Code, or Cursor integration remains a product target,
  while Enforced status remains conditional on launch/wrapper evidence.
- The protected live-model test covers one bounded mission brief and one bounded
  risk assessment. It does not claim an end-to-end coding-agent benchmark.

## Rejected alternatives

- **Qwen as Guardian's bundled coding agent:** duplicates the host agent, widens
  context disclosure and cost, and harms interoperability.
- **Two full agents collaborating on every task:** creates substantial token and
  latency overhead without strengthening deterministic authority.
- **Small fast model as a security fallback:** reduces expected judgment quality
  exactly when the primary result is questionable.
- **Calling any MCP-enabled host Enforced:** cannot exclude bypass paths outside
  Guardian's control.

## Evidence required

Tests must prove that Guardian interaction output cannot contain a tool proposal;
the host-agent identity remains distinct from Guardian service callers; model
contexts are bounded and credential-free; Qwen and Nemotron receive separate
projections; deterministic policy can omit model calls for low-risk work;
Nemotron and Ultra cannot lower the floor; provider failure escalates or denies;
and assurance labels depend on host-runtime evidence rather than tool installation.
