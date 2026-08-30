# Enforced Session Feasibility Spike

This disposable spike tests the hardest premise in ADR-0002: a useful interaction
process can perform local work while direct public network access, host filesystem
access, and direct authenticated Git operations remain unavailable.

The trusted Windows-side launcher starts an Ubuntu 22.04 WSL 2 worker inside new
user, mount, network, and PID namespaces. The sandbox builds a temporary root,
mounts only operating-system binaries read-only, clears the environment, and
copies in one worker program. The worker can request the narrow
`guardian.research` capability over inherited standard input/output. The launcher
owns that capability and currently answers through a deterministic fake provider.

This is feasibility evidence, not production architecture. In particular:

- the worker is a deterministic stand-in for an interaction-model loop;
- the research provider is fake until a protected Tavily credential is available;
- the worker currently runs as namespace root, mapped only to the invoking
  unprivileged WSL user, because this WSL namespace denies supplemental-group
  changes; a narrower runtime identity remains a production requirement;
- the launcher has not yet implemented mission signatures, lifetime, revocation,
  resource budgets, or a production MCP transport; and
- the spike makes no claim of resistance to host or kernel compromise.

## Prerequisites

- Windows with WSL 2;
- an Ubuntu 22.04 distribution named `Ubuntu-22.04`;
- unprivileged user namespaces enabled in that distribution; and
- Node.js on Windows plus Python 3 and Git inside the distribution.

## Run

From the repository root:

```powershell
node .\spikes\enforced-session\launcher.mjs
node --test .\spikes\enforced-session\spike.test.mjs
```

The bundled Codex Node runtime may be used when `node` is not on `PATH`.

To perform the optional protected Tavily check, copy the repository's
`.env.example` to the ignored `.env.local`, add `TAVILY_API_KEY` on your own
machine, and run:

```powershell
node .\spikes\enforced-session\launcher.mjs --provider=tavily
```

To reproduce the complete protected live chain, also provide `NEBIUS_API_KEY` and
run:

```powershell
node .\spikes\enforced-session\launcher.mjs --interaction=nebius --provider=tavily
```

The launcher uses Tavily's [official Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search)
directly, returns only bounded sanitized
fields to the worker, and never forwards the API key. Do not place the key in this
repository, a command argument, the worker environment, or captured evidence.
Do not paste a provider key into chat.
