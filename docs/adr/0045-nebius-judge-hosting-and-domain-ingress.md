# ADR-0045: Nebius judge hosting and domain ingress

- Status: Accepted
- Date: 2026-09-04
- Extends: ADR-0015, ADR-0034, ADR-0041, ADR-0043, and ADR-0044
- Supersedes: none

## Context

The competition deployment needs an unambiguous hackathon-qualification story,
predictable judge availability, a stable HTTPS origin, and isolation from an
optional public demo. These are related but distinct decisions: application
hosting does not replace the required NVIDIA model use, a domain name is not an
authorization boundary, and public demand must not consume judge capacity.

The official hackathon rules require both a runtime on Nebius Token Factory or
qualifying Nebius AI Cloud compute and at least one NVIDIA open-source model.
Their definition of qualifying AI Cloud compute names Serverless Jobs,
Serverless Endpoints, and DevPods. A plain Compute VM is therefore not the sole
qualification claim; Guardian's runtime Token Factory calls provide the explicit
Nebius path, while Nemotron provides the NVIDIA model path.

## Decision

### Judge runtime

The competition judge deployment uses a dedicated, regular CPU-based Linux
Compute VM in Nebius AI Cloud. Guardian's web ingress, supervisors, local IPC
services, and durable judge ledger run there. Model inference remains behind the
fixed Nebius Token Factory adapters; Guardian will not operate a GPU VM merely to
self-host Nemotron for the hackathon.

The judge VM uses its own SecretStash resources, service identity, provider
credentials, ledger, limits, and kill switch as required by ADR-0041 through
ADR-0044. No public application process receives a capability for those
resources.

### Initial ingress and domain

The initial judge ingress is Caddy on the same VM. A reusable Nebius public IPv4
allocation is attached to the VM, and the DNS `A` record for
`judge.agentic-guardian.com` points to that address. The VM security group admits
public TCP 80 and 443 only to the ingress; operator access is separately
restricted. Caddy terminates and renews HTTPS and proxies to a Guardian ingress
bound only to loopback. Budget, credential, and provider services remain on
owner-only local IPC and are never public listeners.

The apex `agentic-guardian.com` remains suitable for project documentation,
downloads, and general competition material. An optional public deployment uses
`demo.agentic-guardian.com`.

DNS names and the HTTP `Host` header are routing inputs, not evidence of judge
authority. The judge route requires a low-friction judge credential supplied in
the private testing instructions. Trusted ingress authenticates it before work
can reach the fixed judge deployment capability. No request field, URL parameter,
hostname alone, or model output may select a credential pool or budget ledger.

### Public deployment

Public service is not co-hosted on the judge VM. If enabled and funded, it uses a
separate Nebius Linux deployment with a separate public IP or trusted edge route,
service identity, SecretStash resources, provider credentials, ledger, limits,
and kill switch. Until then, the public application remains disabled without
reducing the judge allocation.

### Reassessment triggers

These are the default deployment decisions through the judging window. They are
reconsidered only when evidence changes an assumption, including:

- authenticated Nebius and Tavily prices plus protected journey calibration;
- measured CPU, memory, latency, concurrency, and provider usage on the target
  Linux runtime;
- observed public demand, abuse, reliability, or funding that justifies a
  separately funded public deployment;
- measured judge availability that requires redundancy; or
- a material change or written clarification in the hackathon or Nebius runtime
  requirements.

Traffic volume by itself does not authorize spending, enable public capacity, or
weaken judge isolation. Any scaling change retains deployment-bound credentials,
ledgers, and capabilities. A managed or external edge proxy or Kubernetes load
balancer is introduced only when measured availability or scale justifies its
additional cost and trusted-proxy configuration.

## Consequences

- Token Factory plus Nemotron supplies the clearest compliance story while the
  CPU VM supplies the persistent Linux enforcement environment.
- The initial topology avoids GPU hosting and Kubernetes administration costs.
- A dedicated judge VM prevents anonymous public traffic from exhausting its
  host resources, not only its financial ledger.
- The initial judge service has a single-VM availability risk and requires OS,
  TLS, firewall, backup, and deployment operations.
- Nebius hosting and inference create correlated provider availability risk.
- Enabling the public demo requires another deployment and its associated fixed
  hosting cost.
- Hosting choices do not establish an `Enforced` claim. Protected deployment,
  peer, filesystem, credential, network, lifecycle, load, and recovery evidence
  remain required.

## References

- [Hackathon official rules](https://nebiusglobalaihackathon.devpost.com/rules)
- [Nebius VM public and private addresses](https://docs.nebius.com/compute/virtual-machines/network)
- [Nebius security groups](https://docs.nebius.com/vpc/security-groups/manage)
- [Caddy HTTPS quick start](https://caddyserver.com/docs/quick-starts/https)
- [Nebius Kubernetes load balancers](https://docs.nebius.com/kubernetes/clusters/load-balancer)
