## Summary

Describe the user or security outcome and why this is the smallest coherent change.

## Linked issue

Closes #

## Trust-boundary impact

- [ ] No trust boundary changes
- [ ] Protocol or canonicalization
- [ ] Mission, session profile, sandbox, or assurance state
- [ ] Public research gateway or journey provenance
- [ ] Deterministic policy
- [ ] Guardian/model provider
- [ ] Credential broker or privileged execution
- [ ] Adapter or external destination
- [ ] Approval or user presence
- [ ] Audit, logging, or redaction

Explain the impact:

## Security review

- [ ] No credential or credential-equivalent value enters model-visible context, public output, errors, logs, or audit records
- [ ] Enforced, Observed, and Unknown assurance labels remain evidence-backed
- [ ] Alternate external pathways and outbound research leakage were considered
- [ ] Model output cannot weaken deterministic policy
- [ ] Mutation, replay, expiry, caller binding, and scope behavior were considered
- [ ] External side effects and destinations are explicit
- [ ] Unknown and malformed inputs fail closed
- [ ] Security claims were updated, or this change does not alter them

## Verification

List exact commands and results. Include both intended behavior and rejected near-miss cases.

## Documentation and dependencies

- [ ] Relevant documentation is updated
- [ ] No new production dependency
- [ ] New production dependencies are justified below
- [ ] No secrets, personal data, generated credentials, or private identifiers are included

## Reviewer notes

Call out uncertainty, deferred work, and the highest-risk line or decision.
