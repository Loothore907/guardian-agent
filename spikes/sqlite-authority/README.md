# C6 SQLite authority spike

This disposable spike evaluates the pinned Node 24 `node:sqlite` release-candidate
API before production persistence is admitted under ADR-0005. Production packages
must not import it.

It exercises:

- rollback and session-identifier uniqueness;
- fail-closed restart interruption;
- recovery from an uncommitted child-process crash;
- conservative recovery when committed nonce or budget consumption loses its
  response;
- atomic one-time nonce consumption across competing processes;
- atomic research-budget reservation across competing processes;
- exclusion from disposable session workspaces;
- read-only database failure; and
- private POSIX state-directory modes where the host exposes meaningful mode bits.

Run it with:

```sh
pnpm test:sqlite-spike
```

Windows ACL validation is not claimed by this cross-platform spike. The supported
Windows build proves database placement and read-only failure; hosted Linux parity
must additionally pass the POSIX mode test before release.
