# ADR-0050: Seeded scenarios and custom piloted judging

Status: Accepted product direction, 2026-09-05. Implementation and hosted evidence pending.

## Decision

Provide three small seeded scenarios in the testing portal alongside custom piloted
tasks, initially limited to public research and bounded GitHub operations. Each
scenario pairs a useful authorized task with untrusted content attempting an
unauthorized destination, read-to-write expansion or approved-action substitution.

This extends ADR-0049's fixed headless workflow as planned work. Registered seeded
sessions may use exact standing deployment authorization. Custom objectives cannot
inherit or modify that authorization through HTTP; they require a reviewed launch
scope. Existing deterministic boundaries and final execution checks remain mandatory.

Read-only fixtures are versioned and reusable. Mutation sessions require exclusive
exact fixtures prepared under operator authority; automatic remote reset is not
assumed. Preserve the five-minute profile. Report actual observations and
evidence-backed assurance, including exposure without a forbidden model request.

## Consequences

Scenario dispatch, fixture lifecycle, custom execution and portal evidence still
need implementation and verification. Open-ended tasks demonstrate flexibility;
they do not establish an unconstrained environment or guarantee an attack encounter.
Follow the [action plan](../development/judge-portal-action-plan.md), retaining C6
containment and hosted acceptance gates.
