# ADR-0030: Confirmed mission and worker-tool separation

- Status: Accepted
- Date: 2026-09-02

## Context

The reference bootstrap originally reused one permission envelope as all of the
following:

- the human-confirmed mission authority;
- the active session profile and mediated capability set; and
- the native worker's first-turn tool catalog.

That equivalence held for the early local-command slice. It does not hold for the
controlled end-to-end journey. The confirmed mission and session may permit
Guardian-mediated public research and a separately exact-approved GitHub merge,
while the current W3 worker dispatcher still supports only session status and one
bound local command. Giving the worker every session capability would widen its
model-visible catalog; omitting the mediated capabilities from the confirmed
mission would make the later journey inconsistent with what the human approved.

## Decision

The session preview and bootstrap result bind a separate `workerTools` catalog in
addition to the mission/session `permissions` envelope.

- `permissions` remains the human-confirmed ceiling for the mission and active
  session. It includes every mediated research or authenticated capability that
  trusted orchestration may use for that session.
- `workerTools` is the exact subset exposed to the native worker turn. It must be
  unique and must remain a subset of the confirmed session tools.
- The final session preview digest binds `workerTools`, the selected worker,
  workspace, integration assessment, and compiled mission candidate.
- Mission-dialogue context and worker-turn envelopes receive only `workerTools`.
- The trusted launcher may recognize research and typed GitHub capabilities only
  when the corresponding trusted research binding or attached durable connection
  exists. This does not create an arbitrary transport or expose those operations
  to the worker.
- The current controlled journey gives the worker only
  `guardian.session_status` and `guardian.local_command`. Research and GitHub
  execution remain in the fixed trusted orchestration and privileged broker
  boundaries.

Neither the CLI, worker, model, retrieved content, nor a session draft can add a
worker tool or mediated capability. The trusted deployment selects a bounded
mission template, deterministic formation enforces that ceiling, and the human
confirms the complete preview digest.

## Consequences

- A broader confirmed session no longer silently widens the worker's model-visible
  tool catalog.
- The terminal separately displays mission capabilities and worker tools.
- Worker-tool mutation changes the preview digest and fails subset validation.
- Adding a future worker-visible research or GitHub operation requires its own
  dispatcher, result, denial, budget, and near-miss evidence; session authority
  alone is insufficient.
- This changes an unreleased bootstrap contract on the active feature branch. No
  compatibility promise exists for the earlier local-only preview shape.
