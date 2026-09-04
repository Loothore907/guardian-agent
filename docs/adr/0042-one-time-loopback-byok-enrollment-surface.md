# ADR-0042: One-time loopback BYOK enrollment surface

- Status: Accepted for Windows and Linux BYOK
- Date: 2026-09-03
- Windows interaction accepted: 2026-09-04
- Extends: ADR-0007, ADR-0008, ADR-0009, and ADR-0041

## Context

Guardian needs a low-friction local surface for Nebius and Tavily BYOK input. The
existing raw-terminal reader failed its protected Linux paste journey. A hidden
terminal prompt also gives too little context about the provider, destination,
persistence, cancellation, and replacement behavior.

A full native desktop toolkit would add a production dependency and three
platform-specific packaging paths before the interaction has been proven. A
public web or MCP form is ineligible because it would place reusable credentials
in an agent-visible or remotely reachable ingestion path.

GitHub is different: it retains its fixed App device flow and does not use this
pasted-secret surface.

## Proposed decision

Use a short-lived browser modal served by a user-launched Guardian CLI process on
an ephemeral `127.0.0.1` port. The CLI displays the provider, OS store,
persistence, and operation before giving the user the local URL. The URL carries
a random one-use capability in its fragment, which is not sent in the HTTP
request or included in the served document. Page JavaScript removes the fragment
from browser history and presents only the fixed local form.

Submission is accepted only when all of these checks hold:

- exact loopback `Host` and same-origin `Origin`;
- browser `Sec-Fetch-Site: same-origin` evidence;
- exact custom one-use capability header;
- fixed binary submission route and content type;
- printable non-whitespace ASCII input between 8 and 4,096 bytes;
- unexpired five-minute lifetime and unused state.

The page uses a nonce-bound Content Security Policy, disables all other resource
types and framing, sends no CORS permission, stores no cache or referrer, requests
autocomplete suppression, warns against browser-password-manager storage, clears
the input immediately, and zeroes its encoded byte buffer after submission. The
local Node boundary zeroes request chunks and the callback-scoped secret buffer.
Provider diagnostics are replaced with a fixed failure message.

The CLI exposes the fake ceremony as
`guardian credentials review <nebius|tavily>`. Review mode preflights the actual
platform store, labels the page as fake-only, and has no provider or store-write
callback. The real enrollment composition is compiled and deterministically
tested. The first Windows review exposed an autofill hint that could encourage
browser persistence; a corrected-field review then passed without a browser
generation or autofill attempt. The subsequent Linux review passed against the
real intended-host Secret Service preflight. Real enrollment is enabled on both
platforms. `guardian setup` remains a compatibility alias. Each claimed host still
requires replacement, provider-verification, cancellation, terminal-loss,
browser-close, expiry, concurrency, and secret-corpus evidence.

## Security posture

The loopback surface is a trusted local ceremony, not a public application and
not an Enforced-session component. It protects against cross-origin browser
submission, accidental URL/referrer disclosure, replay, oversized input, and
ordinary application logging. It does not protect against a compromised host,
malicious browser extension, privileged local malware, or an agent that controls
the user's browser. The CLI must instruct the user to launch and complete it
outside any agent-controlled browser automation.

Provider verification remains mandatory before commit. A successful local POST
means only that input was received; it does not mean the credential was stored.

## Alternatives not selected for the spike

- **Raw or hidden terminal input:** already failed the protected paste journey
  and does not provide a sufficiently legible ceremony.
- **Public web or MCP enrollment:** crosses an ineligible remote/agent boundary.
- **Environment variables, command arguments, or files:** widen persistence and
  diagnostic exposure and bypass the transactional lifecycle.
- **Immediate native desktop toolkit:** potentially attractive later, but it adds
  packaging and dependency scope before the fake-secret interaction is reviewed.
- **Provider-side hosted BYOK custody:** changes Guardian from local-first
  software into a multi-tenant secret custodian.

## Acceptance evidence

- deterministic GET, cross-origin, one-use submission, replay, cancellation,
  invalid provider/store, unsafe-byte, failure-sanitization, and zeroing tests;
- an intended-Linux fake-secret typing and clipboard-paste walkthrough reviewed
  by the user;
- process argument, environment, filesystem, browser history, log, trace, audit,
  error, and public-result inspection;
- verification-before-commit and prior-value preservation under every modeled
  failure;
- a separate accepted ADR update before real credential entry is enabled.

The Windows user-operated review passed on 2026-09-04. One first submission
reached the generic failed outcome, exposing that the page did not state its
ASCII/no-space constraint. A later browser-generated fake password submitted and
was explicitly reported as discarded with nothing stored or sent. A separate run
cancelled successfully. The page now states and checks the input constraint before
submission. The user's browser also offered a generated password, revealing that
`autocomplete="new-password"` encouraged unintended browser persistence. The
field now requests autocomplete suppression, includes common password-manager
ignore hints, omits a credential-like form name, and warns the user not to save
the value in the browser. No submitted value or one-time URL was copied into the
repository or agent conversation. The user then confirmed that the corrected page
displayed the no-save warning and made no generation or autofill attempt. This
accepts and enables the interaction for Windows only; it does not establish a real
credential write, provider verification, or Linux/WSL usability by itself.

The subsequent user-operated Windows enrollment verified one Nebius credential
against the fixed provider endpoint and stored it in Windows Credential Manager.
A sanitized host-context status check returned `nebius: available`; the sandboxed
agent context returned only `nebius: missing`. After correcting a stale protected
harness to supply the explicit non-secret BYOK store configuration, the bounded
supervised Qwen/Nemotron live-inference test passed. No credential value, raw
provider response, or one-time URL was printed or added to repository state.

The Linux user then ran the same fake-only ceremony from the clean ext4 WSL2
stage with the exact current-user `/run/user/1000/bus` route. The real Secret
Service preflight returned `nebius: missing`, the page named Linux Secret Service,
and the fake submission completed successfully without storage or provider use.
This accepts Linux enrollment interaction; it does not establish real Linux
credential storage or protected Linux provider consumption.
