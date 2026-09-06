# ADR-0052: C7 risk context and development cost accounting

- Status: Accepted
- Date: 2026-09-05
- Extends: ADR-0051 and ADR-0043

The multi-turn worker receives untrusted research and PR review content. Guardian
must receive minimized relevant context without trusting the worker to create
authority, and budget accounting must accommodate the bounded continuation loop.

The trusted supervisor retains the current validated worker-turn envelope. Before
broker dispatch, it verifies the turn digest and execution/session/mission/profile/
policy/grant bindings, projects at most four 500-character excerpts, and adds the
mission objective. Context without clear evidence remains ambiguous. A keyword
signal may increase risk but absence of a keyword does not establish clean context.

The broker binds this context to the independently normalized final request digest,
proposal and deterministic authorization floor before invoking Guardian. A mismatch
fails closed without crossing the provider boundary. Model recommendations retain
the existing rule that they may never lower the deterministic authorization floor.

Budget policies may explicitly allow up to eight calls per role and two basic
Extracts, retaining the two-credit research ceiling. Initial policies remain
unchanged. The bounded usage collector and settlement schema retain up to 34 usage
entries (four roles with eight calls each, plus two research calls). This permits
accounting; it does not grant the worker additional execution authority.

Judge results expose only the current session's estimated charge or unresolved
reservation. Provider-billed amounts remain pending until reconciled. The operator
report separately tracks API usage, pending/forfeited reservations, infrastructure,
prepaid cash and credits. A prepaid balance does not increase the approved USD 25
service-cost allowance. The current campaign allocates USD 20 to APIs and reserves
USD 5 for infrastructure. Runtime ledger ceilings must fit that API allocation.

The operator report is currently a local, read-only artifact. It must not be served
through the shared judge route. Automatic provider-bill reconciliation and hosted
operator access remain deployment work. Cost reports do not promise an exact
provider billing cutoff or independently enforce cloud shutdown.

Evidence: focused risk/cost tests, managed-demo budget tests, static fixture/cost
report tests, and the complete Windows check suite (655 passed, 18 platform skips)
on 2026-09-05. Hosted and real-provider evidence is still required before live C7
acceptance or an expanded assurance claim.
