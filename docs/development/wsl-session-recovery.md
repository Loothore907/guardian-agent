# Local WSL session recovery

Use for the documented WSL 2.6.1 / Ubuntu-22.04 user-manager cgroup failure.
[Diagnosis and samples](evidence/2026-09-04-wsl-cgroup-diagnosis.md) distinguish
verified recovery from the upstream-fix hypothesis.

## What to do

If the user manager/bus is unavailable, stop protected work. Preserve targeted
failure metadata before restarting if the failure has not already been captured.
Do not change or re-enroll credentials because a user bus or keyring is unavailable.

During an approved interruption window, run this from Windows PowerShell:

```powershell
wsl --shutdown
wsl -d Ubuntu-22.04 -u loothore907 -- sh -lc 'cd /home/loothore907/guardian-w27-session-20260904 && sh scripts/linux-credential-session.sh --hold 1800'
```

`--shutdown` ends all WSL distributions and the VM, including unrelated WSL
workloads. Check that interruption is acceptable before using it. The command
is an explicit operator recovery action; Guardian must not invoke it automatically
as a response to a failed provider request.

The second command must be the first normal-user startup after shutdown. Keep
that terminal open while using a second terminal for protected work. A short
startup check followed by an unheld gap can reintroduce the warm-start failure.
The hold lasts at most 30 minutes. Do not substitute `--terminate Ubuntu-22.04`
for full shutdown: distribution termination retained the VM boot ID in the
failing samples and did not reliably clear the condition.

If the helper reports success, complete the existing keyring's native user unlock.
The helper itself does not request an unlock dialog. A submitted native prompt
request is not proof of visibility; the operator must confirm the OS dialog.
Do not enter a password in chat or an agent-controlled terminal. Then run trusted
sanitized status in an interactive normal-user WSL terminal:

```sh
cd /home/loothore907/guardian-w27-session-20260904
export PATH=/home/loothore907/.cache/guardian-node-v24.19.0/bin:/usr/bin:/bin
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
export XDG_RUNTIME_DIR=/run/user/1000
node apps/guardian-cli/dist/main.js credentials status github
node apps/guardian-cli/dist/main.js credentials status nebius
```

Preserve an available enrollment. Missing/expired status requires its own
sanitized diagnosis; it does not authorize token copying or key replacement.
The existing protected commands still perform their own readiness preflight.
Do not rerun the now-merged W28 PR 3 ceremony to test recovery.

## Limits and escalation

- Hold expiry, a changed session, or a new WSL startup requires fresh readiness
  checks. A cold boot can require native unlock again even when enrollment persists.
- This procedure changes no PAM, linger, keyring-lock, firewall or cgroup settings.
  It is local operational recovery, not a production launcher.
- If a full cold start into the hold fails, stop and capture its metadata. Do not
  create an automatic restart loop or repeatedly perform provider operations.
- The upstream cgroup-isolation fix is documented in the 2.9.8 pre-release line.
  A future runtime update needs exact release selection, interruption authority,
  a rollback plan, and the same lifecycle plus Guardian runtime verification.
  Do not assume an ordinary stable update includes this cgroup fix.
- A dedicated Linux validation host remains an alternative if this workaround
  becomes disruptive. It requires its own setup/custody evidence and explicit scope.
