# Dedicated demo repository reset

This procedure seeds the next disposable pull request after a demonstration
merge. It never rewrites `main`, reopens a merged pull request, or targets any
repository except public repository ID `1352093544`,
`Loothore907/guardian-agent-demo`.

## Preconditions

- Read the current exact `main` commit from the fixed repository and retain it as
  the reset baseline.
- Confirm `guardian/demo-fixture-pr` is absent and there are zero open pull
  requests using that head branch. Any ambiguity fails closed.
- Confirm merge commits and rebase merges remain disabled and squash merge
  remains enabled.
- Run reset only as an attended operator provisioning action outside an Enforced
  Guardian Session. It creates demo state; it is not agent authority.

Generate the canonical credential-free plan:

```powershell
node scripts/demo-reset-plan.mjs <exact-main-commit>
```

The planner accepts only one lowercase 40-character baseline commit and fixes the
repository, immutable repository ID, base branch, fixture branch, fixture path,
commit message, pull-request title/body, and non-draft state. It rejects an
existing fixture branch, any open fixture pull request, and unknown input.

## Apply the plan

1. Create `guardian/demo-fixture-pr` from the exact baseline commit.
2. Replace `fixtures/approved-change.md` with the plan's canonical content. The
   final line binds the harmless change to the exact reset baseline, ensuring a
   new diff after every prior squash merge.
3. Commit with `test: seed Guardian demo fixture` on the fixture branch.
4. Open one non-draft pull request titled
   `test: exercise exact Guardian approval path`, from the fixed fixture branch
   to `main`, with the canonical body from the plan.
5. Re-read the pull request and record its number and exact head commit. Confirm
   it is open, non-draft, based on `main`, and contains only the fixture file.

If branch creation succeeds but the fixture commit or pull-request creation
fails, delete only `guardian/demo-fixture-pr`. Never force-push or reset `main`.
If an open fixture pull request or fixture branch already exists, inspect it
instead of creating or mutating another.

## Post-merge

After the exact approved squash merge, confirm the pull request is closed and
merged, record the squash commit, and confirm the fixture branch is deleted. The
new `main` commit becomes the next reset baseline. Pull-request history and audit
evidence remain intact across cycles.

## Verification

```powershell
node --test scripts/demo-reset-plan.test.mjs
```

The deterministic test covers the fixed plan and near-miss rejection. A protected
live reset additionally requires an exact read of the fixed public repository and
explicit authorization for the branch, fixture commit, and pull-request creation.

## Latest live reset evidence

The attended reset on 2026-08-31 AKDT revalidated repository ID `1352093544`,
the squash-only merge configuration, exact `main` commit
`16263e7a0e9bc81df55bac9b8413fc2256077a9d`, absence of the fixture branch, and
zero open fixture pull requests. It then created:

- branch `guardian/demo-fixture-pr` from that exact commit;
- commit `36251caf778466a7d08670ad8210375daf8a9bcb`, changing only
  `fixtures/approved-change.md`; and
- non-draft pull request
  [#2](https://github.com/Loothore907/guardian-agent-demo/pull/2) to `main`.

Post-write comparison reports the head one commit ahead, zero behind, with the
baseline as its merge base. The patch adds only the blank separator and exact
`Reset baseline` marker. `main` was neither rewritten nor merged by the reset.
