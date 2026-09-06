# ADR-0039: Persistent plan-bound session authority

- Status: Accepted
- Date: 2026-09-03

## Context

An approved engineering session may require a sequence of related external actions, such as committing a reviewed change, pushing one feature branch, creating or updating one pull request, and observing CI. Requiring a new human confirmation for every step creates approval fatigue, even though the user already approved the bounded workflow. That friction encourages reflexive approval and weakens the signal of a real step-up.

The opposite failure is worse: vague intent, conversation history, or model inference must not become durable general authority. A plan grant therefore needs the same exactness, scope, expiry, and revocation discipline as other Guardian grants while allowing concrete values, such as a future commit hash, to be resolved safely at execution time.

## Decision

A directly confirmed, normalized session plan may create a persistent, revocable plan grant. The grant records:

- session and human-issuer evidence;
- plan digest, version, and policy version;
- enumerated typed operation classes;
- repository, destination, and ref selectors;
- side-effect ceiling;
- time, count, volume, and retry limits;
- required preconditions and evidence; and
- expiry and revocation state.

Every concrete action is independently schema-validated and normalized immediately before execution. The authority service verifies that the action is a member of the confirmed plan grant, that all selectors and limits still match, and that no policy or relevant resource change invalidates the grant. The action receives no authority merely because a model says it is necessary.

Plans may bind a future value by a narrow selector and trusted derivation rule. For example, a grant may permit pushing the current session-created head of `codex/13-c6-linux-peer-credentials` to the same named feature branch and creating or updating its pull request. It need not know the eventual commit hash at confirmation time. The executor must still bind the final normalized action to the actual trusted repository state.

A fresh step-up is required for:

- a new operation class, repository, remote, destination, or ref;
- greater side effects, time, volume, retries, or credential scope;
- protected-branch writes, force pushes, deletion, release, deployment, or merge unless that action class was explicitly included;
- an expired, exhausted, revoked, ambiguous, or policy-invalidated grant; or
- any material plan expansion.

Public content, tool output, model rationale, and compressed conversation state cannot create, widen, or renew the grant. The user can revoke it at any time. Denial of an out-of-plan action does not silently rewrite the plan.

## Consequences

- Routine steps inside a confirmed workflow proceed without repetitive prompts.
- Approval prompts regain meaning because they occur at actual authority boundaries.
- A session plan becomes security state, not merely conversational guidance.
- Guardian must expose the active grant and remaining limits clearly enough for review and revocation.
- The current implementation does not yet provide this runtime grant. This ADR defines the target contract; `docs/security-claims.md` must continue to label it as a goal until reproducible evidence exists.

## Rejected alternatives

- **Prompt for every external write:** creates approval fatigue and discards already confirmed workflow authority.
- **Treat general intent or prior conversation as authority:** is ambiguous, difficult to revoke, and vulnerable to context drift.
- **Let the model decide whether an action is in scope:** permits a lower-authority component to expand authority.
- **Bind only exact future request digests:** cannot represent legitimate plan steps whose trusted concrete values do not yet exist.

## Required evidence

Runtime implementation must test in-plan continuation, near-miss destinations and refs, protected-branch and force-push rejection, expiry, exhaustion, revocation, policy-version change, retry bounds, conversation compaction, and attempted expansion by model or retrieved content. Audit must link each concrete action to the confirmed plan digest without exposing credentials or private request data.
