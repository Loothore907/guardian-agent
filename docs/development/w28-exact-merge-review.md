# W28 exact Linux GitHub effect review

Status: explicitly approved and executed once. Merge commit
`5d78d261e024d9e93e59c30368c7c9797c765a2c`; GitHub merged state and `main` were
verified. No branch-deletion command was issued; the fixture branch was absent
on the post-merge ref check. The supervised Linux read passed
for this exact target after user-operated GitHub App enrollment. This review
records the bounded disposable-repository squash authority.

- Repository: `Loothore907/guardian-agent-demo`, ID `1352093544`.
- PR: [3](https://github.com/Loothore907/guardian-agent-demo/pull/3), open/unmerged.
- Base: `main` at `7df353afe005b74811dfcd081ac98af5695a8170`.
- Head: `guardian/demo-fixture-pr` at
  `b8e2e559fe60d182566909fec47d3cd5d1d48243`.
- Effect: squash this PR into `main`. The only changed file is
  `fixtures/approved-change.md`; replace baseline
  `16263e7a0e9bc81df55bac9b8413fc2256077a9d` with
  `7df353afe005b74811dfcd081ac98af5695a8170` in its existing text line.
- Bound: one harness invocation, independent broker target re-read and at most
  one fixed GitHub squash PUT; existing bounded credential refresh may occur.
  No paid model calls, branch deletion, retries, source writes or deployments.
- Approval uses the lower-assurance development issuer and fake Guardian in
  this narrow gate. It is not WebAuthn or live Nemotron integration evidence.
- Stop before invocation if remote state/base/head/diff changed. On failure,
  inspect sanitized state; do not blindly retry an uncertain mutation.
- After success: record sanitized merge SHA, verify remote merged state and
  `main`, and verify supervised children exited. The harness deletes its private
  temporary authority database during cleanup; this gate does not export a live
  durable audit artifact. Do not claim a retained audit inspection from it.
- Rollback, if needed, is a separately reviewed revert; never rewrite `main`.

Executed command (historical; do not rerun against the merged PR):

```sh
cd /home/loothore907/guardian-w27-session-20260904
export PATH=/home/loothore907/.cache/guardian-node-v24.19.0/bin:/usr/bin:/bin
DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus XDG_RUNTIME_DIR=/run/user/1000 GUARDIAN_TEST_SUPERVISED_GITHUB=1 GUARDIAN_GITHUB_EXACT_MERGE='guardian-agent-demo#3@b8e2e559fe60d182566909fec47d3cd5d1d48243:squash' node scripts/github-supervised-live.mjs merge 3 b8e2e559fe60d182566909fec47d3cd5d1d48243
```
