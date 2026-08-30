# ADR-0002: Enforced Guardian Sessions

- Status: Accepted
- Date: 2026-08-29
- Decision owners: Earl Ray

## Context

ADR-0001 establishes Guardian as a capability and authorization broker between an untrusted interaction agent and privileged service operations. A broker exposed only as an optional MCP server cannot prove that an agent lacks alternative external pathways. An agent with unrestricted shell networking, an authenticated CLI, browser state, another MCP server, or host credentials may bypass Guardian entirely.

Long-running tasks also expose an agent to many untrusted public inputs. Prompt instructions such as "use only Guardian" help cooperative behavior but are not enforcement when malicious content influences the model.

## Decision

The competition prototype will implement one reference **Guardian Session** that Guardian launches and constrains before the interaction agent begins work.

The session will bind:

- a user-authored mission captured through a trusted Guardian interface;
- a versioned session profile;
- an explicit tool allowlist;
- a disposable filesystem scope with no mounted host credentials;
- a local command executor with default-denied public network access;
- Guardian-mediated public research and authenticated operations;
- time, volume, destination, and side-effect limits; and
- an auditable policy and configuration version.

MCP remains the approved agent-facing protocol for Guardian capabilities. It is not, by itself, the isolation boundary. The trusted launcher, runtime configuration, network policy, credential separation, deterministic mediation, and privileged broker together establish the reference enforcement boundary.

Guardian will report one of three assurance levels:

- **Enforced** when it launched the documented runtime and has evidence for the active profile;
- **Observed** when it mediates its own capabilities but cannot exclude alternate pathways; or
- **Unknown** when the environment cannot establish either condition.

The project will not claim that an arbitrary third-party harness becomes Enforced merely by connecting to the Guardian MCP server or receiving Guardian instructions.

## Consequences

- The architecture gains a session-control zone and trusted task-initiation path.
- The competition implementation must include a minimal interaction-agent loop or launcher we control.
- Local command execution must be separated from provider credentials and constrained by network policy.
- Tavily becomes the reference public-research gateway and feeds a minimized research-journey ledger.
- Direct bypass attempts such as public `curl` and authenticated `git push` become required negative tests.
- Runtime configuration and assurance labels become security-relevant contracts.
- Supporting arbitrary terminal agents becomes a later interoperability goal with lower assurance unless the host can attest equivalent controls.
- The implementation stack ADR will follow as ADR-0003.

## Rejected alternatives

- **Instruction-only compliance:** model instructions can be overridden or confused by untrusted context and cannot establish enforcement.
- **Optional MCP server in an unrestricted harness:** useful for observed mediation but cannot exclude alternate tools, credentials, or network paths.
- **Secret-holding local stdio MCP under the agent's operating-system identity:** may expose configuration, environment variables, caches, or process-accessible credentials to a shell-capable agent.
- **Universal operating-system security platform:** materially exceeds the competition scope and would encourage unsupported production claims.
- **Commerce as the first adapter:** demonstrates impact but adds payment, liability, privacy, merchant, refund, and regulatory complexity before the core boundary is proven.
