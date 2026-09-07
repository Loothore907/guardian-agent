# KC protected hosted retry 3 abort — September 7, 2026

Tracking: issue [#19](https://github.com/Loothore907/guardian-agent/issues/19)
and run-sheet PR
[#48](https://github.com/Loothore907/guardian-agent/pull/48).

## Result

Retry 3 reached a prepared, credential-free, disabled Guardian host but did not
activate credentials, call a provider or admit a journey. The operator aborted
after one Windows TLS probe failed, dismantled the transient deployment before
independent corroboration, and then lost Nebius operator authentication during
cloud-stop verification.

The replacement VM later auto-recovered from guest shutdown and remained billed
until a follow-up audit found it running and completed a cloud stop. This was an
operator-session execution failure. It is not evidence of a Guardian runtime
credential defect and does not establish a successful public endpoint or hosted
journey.

## Bound execution and verified host gates

- reviewed source commit: `95648b58a871664ef6e29c9713bb2e7dacaa4f05`;
- source archive SHA-256:
  `de1584e28603873dc9a90fba9355664b65c844cb98537be4eefd86143dce8a12`;
- replacement VM: `computeinstance-u00dkgrgnqdmy4vz67`;
- original VM: `computeinstance-u00jbhqf6qg9jwag4g`; it remained stopped;
- replacement start requested at `2026-09-07T20:15:29Z` and completed at
  `2026-09-07T20:16:06Z`;
- the exact credential-free bundle built successfully and the reviewed Linux,
  reference-runtime and standalone containment checks passed;
- Guardian ran in disabled mode on loopback only, and Caddy's isolation check
  passed before public probing.

The first Windows request at `2026-09-07T20:41:08Z` failed during the Schannel
handshake with `SEC_E_INVALID_TOKEN`. The operator incorrectly treated that
single client result as a definitive endpoint failure. Guardian and Caddy were
stopped and the exact transient directory
`/home/guardianops/guardian-c7-retry3-95648b5` was removed. Persistent disks,
addresses, DNS, fixtures, SecretStash resources, IAM bindings and the private
ledger were preserved.

## Independent TLS audit

A follow-up audit deliberately did not infer endpoint state from the Windows
result alone:

- Windows `curl` reproduced Schannel `SEC_E_INVALID_TOKEN`;
- a fresh Chromium client returned `ERR_SSL_PROTOCOL_ERROR`;
- WSL OpenSSL returned `ssl3_get_record:wrong version number`;
- TCP port 443 accepted connections for `judge.agentic-guardian.com`;
- both `judge.agentic-guardian.com` and `fixtures.agentic-guardian.com` resolved
  to `18.204.152.241`, not the replacement VM's retained `204.12.168.166`;
- `fixtures.homegrowncannalytics.com` resolved directly to `204.12.168.166` and
  refused connections after the host services were stopped.

These results corroborate a real public hostname/TLS-path failure and rule out
the original result being only one stale Windows browser. Because the independent
probes occurred after the transient Caddy and Guardian processes had been
removed, they do not localize the defect to Caddy, Guardian, DNS or an upstream
proxy. The next prepared run must preserve the environment while comparing the
hostname route, exact DNS answers, direct origin TLS and an independent external
client.

## Runtime authority and effects

- Guardian credential activation: none;
- temporary judge bearer: never created;
- Nebius model calls: 0;
- Tavily calls: 0;
- journey admissions: 0;
- new reservations: 0;
- durable ledger reset or policy widening: none;
- GitHub access or mutation: none.

Guardian's judge-facing authentication remains the existing unattended VM
workload identity plus exact-resource SecretStash path. The expired browser and
CLI sessions belonged only to the Codex/operator control plane. Issue
[#49](https://github.com/Loothore907/guardian-agent/issues/49) owns pre-session
operator-access readiness and explicitly does not redefine Guardian runtime
authentication.

## Cloud stop and cost reconciliation

Nebius audit logs show an automatic recovery requested by Nebius at
`2026-09-07T20:46:37Z` and completed at `2026-09-07T20:48:44Z`. A follow-up
authenticated console audit found the replacement running, requested a cloud
stop at `2026-09-07T21:27:31Z`, and recorded `STOP Done` at
`2026-09-07T21:28:09Z`. The original was independently observed stopped. The
22:00 UTC cutoff automation was then paused.

The conservative retry-3 compute interval is therefore
`20:15:29Z`–`21:28:09Z`. Including earlier intervals, the local infrastructure
estimate is USD 1.256279. Nebius billing showed USD 1.13 compute usage and a
USD 23.87 prepaid balance, last updated at 19:40 UTC and therefore potentially
lagging this interval. The earlier USD 0.10 forfeited reservation remains pending
provider reconciliation.

## Next-session boundary

The retry-3 sheet was executed once and is spent. A later hosted attempt requires
a fresh integrated clock and stop fallback. Before starting paid compute, prove
fresh operator access to both exact VM states, billing and the stop operation.
During the public gate, preserve the disabled prepared host after the first client
failure long enough to obtain independent DNS, TLS and origin-path evidence.
Never rely on guest shutdown as cloud-stop evidence; Nebius auto-recovery is now
an observed near miss.
