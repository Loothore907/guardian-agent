# ADR-0001: Project Scope and Trust Boundaries

- Status: Accepted
- Date: 2026-08-28
- Decision owners: Earl Ray

## Context

AI agents need to act through authenticated services, but common integrations either expose credentials to agent-controlled processes or grant broad authority through authenticated browsers and generic proxies. Preventing the model from reading a secret does not prevent misuse of the secret's authority.

The competition build must also use Nebius infrastructure and an NVIDIA open-source model without making cloud inference part of the credential-holding boundary.

## Decision

Guardian Agent will be a capability and authorization broker, not a password manager or general autonomous assistant.

The architecture separates:

- an untrusted interaction agent;
- deterministic schemas, normalization, and policy;
- an advisory guardian model receiving minimized credential-free context;
- explicit approval bound to an exact request; and
- a privileged broker performing narrow typed operations.

The deterministic policy and privileged broker are authoritative. The guardian model may recommend escalation but may not weaken deterministic requirements or execute tools.

For the competition, guardian inference will use an NVIDIA open-source model through Nebius Token Factory. Provider interchangeability remains a design goal so a local inference backend can be added without changing policy or execution semantics.

## Consequences

- The system cannot expose generic secret retrieval.
- Service adapters must be narrow and typed.
- Canonicalization and approval lifecycle become critical security code.
- The guardian provider must be testable with captured credential-free envelopes.
- Demo approval may be a clearly labeled prototype mechanism rather than a claim of production biometric assurance.
- Tavily, if used, belongs in the untrusted input/demo layer.

## Rejected alternatives

- **Universal encrypted vault:** duplicates password-manager obligations and distracts from authorization.
- **Generic authenticated HTTP proxy:** preserves excessive authority and weakens consequence modeling.
- **Guardian model as final authority:** makes a fallible model the security boundary.
- **Personal AI assistant positioning:** misstates the product; Guardian is a harness used by agents.
