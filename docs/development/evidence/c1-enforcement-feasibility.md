# C1 Enforcement Feasibility Evidence

- Checkpoint: C1 - Enforcement feasibility
- Evidence date: 2026-08-29
- Branch: `codex/1-enforced-session-feasibility`
- Status: Passed

## Question tested

Can the reference Guardian launcher permit useful local work while excluding direct
public network access, host filesystem access, provider credentials, and direct Git
pushes, with public research reachable only through a narrow Guardian-owned path?

## Mechanism

The spike uses the installed Ubuntu 22.04 WSL 2 distribution. The trusted
Windows-side launcher starts a worker in new unprivileged user, mount, network, and
PID namespaces. The sandbox constructs a temporary root filesystem, mounts only
operating-system binaries read-only, clears the environment, and copies in the
worker. The deterministic suite uses a fake interaction provider; the protected
live run uses a Nebius-hosted Nemotron model as a temporary interaction-model
stand-in.

The worker has no configured public network path or host home-directory mount. It
communicates with the trusted launcher over inherited standard input/output. The launcher
accepts only a strict `guardian.research` request. Tests return a fake, explicitly
untrusted public-content fixture. The live path invokes Tavily Search from the
trusted launcher and returns only bounded, sanitized, untrusted fields.

## Reproduction

Run from the repository root with the bundled Node runtime or an equivalent Node
24 installation:

```powershell
& 'C:\Users\looth\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\spikes\enforced-session\launcher.mjs
& 'C:\Users\looth\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test .\spikes\enforced-session\spike.test.mjs
```

Observed structured result:

```json
{
  "checks": {
    "direct_git_push_blocked": true,
    "direct_public_egress_blocked": true,
    "guardian_research_succeeds": true,
    "host_filesystem_hidden": true,
    "local_command_succeeds": true,
    "model_proposal_succeeds": true,
    "provider_credentials_absent": true
  },
  "ok": true
}
```

The test suite also confirms that an unapproved `shell.exec` request is denied by
the trusted launcher and that the Tavily path fails closed without a launcher
credential.

## Protected live-provider run

With `NEBIUS_API_KEY` and `TAVILY_API_KEY` present only in the ignored trusted
launcher configuration, run:

```powershell
& 'C:\Users\looth\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\spikes\enforced-session\launcher.mjs --interaction=nebius --provider=tavily
```

The August 29 run passed all seven structured checks. The interaction proposal was
generated through Nebius Token Factory using
`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`; the accepted proposal then invoked Tavily
Search through the trusted launcher. No key value, authorization header, raw
provider response, or private environment value appeared in worker output or
captured evidence.

The selected Nemotron is a feasibility stand-in for the interaction side. It does
not decide the final interaction model or collapse the interaction and guardian
roles. ADR-0003 must separate those roles and choose the supported providers.

## Manual control comparison

Before running the automated spike, the same Ubuntu distribution produced:

- ordinary namespace: `curl https://example.com` returned HTTP `200`;
- isolated network namespace: the request failed to resolve the host and returned
  curl status `000`.

This comparison distinguishes isolation from a coincidental machine-wide network
failure.

## Interpretation

This result supports continuing toward an **Enforced reference runtime**. It proves
that this machine can create the necessary local network and filesystem boundary
without Docker or Podman. It does not yet establish the complete Enforced assurance
level defined in ADR-0002.

## Decisions carried into C2 and C4

- Decide in ADR-0003 which spike choices become supported architecture and which
  are replaced.
- Replace the temporary model stand-in with explicit interaction and guardian roles.
- Reduce namespace capabilities and establish the final runtime identity before
  C4 can claim an Enforced session.
- Replace ad hoc standard-input/output messages with the selected typed protocol.

## Limitations

- The deterministic suite uses fake providers; live-provider evidence is an
  explicitly protected test, not part of public pull-request checks.
- The worker runs as root inside the unprivileged user namespace. That identity is
  mapped to the invoking non-root WSL user and is not host root, but capability and
  identity reduction remain required before C4 can pass.
- The temporary root exposes read-only distribution binaries and libraries.
- The prototype does not claim resistance to Windows, WSL, Linux-kernel, launcher,
  or administrator compromise.
- Mission signing, expiry, revocation, budgets, MCP transport, and authenticated
  adapters are outside this spike.
- WSL 2 and unprivileged namespace support are current reference-platform
  prerequisites; portability has not been evaluated.
