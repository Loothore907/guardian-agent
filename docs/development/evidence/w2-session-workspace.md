# W2 credential-safe session workspace evidence

Date: 2026-09-01 (AKDT)

## Implemented boundary

- Strict public workspace selection and result contracts expose digests and
  lifecycle policy, never host paths.
- The exact selection is included in the session preview digest and the prepared
  result is returned after launch.
- `@guardian/workspace` creates a bounded Git-visible manifest, rejects unsafe or
  credential-bearing inputs, revalidates it after confirmation, and builds a
  sanitized no-remote Git baseline in a Guardian-owned session copy.
- The trusted launcher accepts only the branded prepared workspace for the exact
  session and binds it into every local command. Callers cannot provide a host
  path through the public command request.
- The WSL command chroot bind-mounts the copy at `/workspace` with public network
  denied and the rest of the host hidden. Changes persist between commands.
- Session close deletes only the exact Guardian-owned session root; target reuse
  and cleanup ownership are covered by rejection tests.

## Reproducible checks

Ordinary component evidence:

```powershell
pnpm test -- packages/workspace/src/index.test.ts packages/contracts/src/workspace.test.ts packages/contracts/src/bootstrap.test.ts apps/session-host/src/launcher.test.ts apps/session-host/src/server.test.ts apps/reference-supervisor/src/bootstrap.test.ts apps/reference-supervisor/src/index.test.ts apps/guardian-cli/src/index.test.ts
pnpm check
```

Protected Windows/WSL evidence:

```powershell
pnpm test:reference-runtime
```

The protected test writes a file through one sandboxed command and reads it in a
second command from the same session workspace, verifies the source checkout did
not change, and directly rechecks hidden host paths, credential absence, and
blocked public egress in the command sandbox while retaining the existing C4
isolation probe.

## Covered near misses

- ignored credential file, reserved `.guardian` state, credential-bearing path,
  and high-confidence secret content;
- symlink or junction ancestor, unsupported file type, traversal, case collision,
  exact-root substitution, and source-root identity change;
- file-content, executable-bit, path-addition, or path-removal mutation after the
  preview;
- per-file, total-byte, file-count, Git-output, and subprocess bounds;
- pre-existing target reuse without deleting the unrelated target;
- source checkout mutation through the session copy;
- inherited Git remote or credential-helper configuration; and
- public host-path disclosure in workspace contracts.

## Residual limits

This is the supported Windows/WSL reference boundary, not Linux parity. W2 has no
automatic writeback or retention option, does not execute W1 pending requests,
and does not implement a multi-turn coding loop. Protected execution evidence is
host-specific and must pass before describing the reference filesystem boundary
as `Enforced` on a new host.
