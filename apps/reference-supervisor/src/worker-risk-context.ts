import {
  GuardianRiskEnvelopeSchema,
  WorkerTurnEnvelopeSchema,
  type WorkerToolExecutionEnvelope,
  type GuardianRiskSignal,
} from "@guardian/contracts";
import { assertExactWorkerToolResult, workerTurnDigest } from "@guardian/worker";

/** Only trusted, already delivered turn context may enter the action-risk child. */
export function workerRiskContext(execution: WorkerToolExecutionEnvelope, value: unknown) {
  const turn = WorkerTurnEnvelopeSchema.parse(value);
  if (
    workerTurnDigest(turn) !== turn.turnDigest ||
    turn.turnId !== execution.sourceTurnId ||
    turn.turnNumber !== execution.sourceTurnNumber ||
    turn.turnDigest !== execution.sourceTurnDigest ||
    turn.sessionId !== execution.sessionId ||
    turn.callerId !== execution.callerId ||
    turn.missionId !== execution.missionId ||
    turn.missionVersion !== execution.missionVersion ||
    turn.profileId !== execution.profileId ||
    turn.profileVersion !== execution.profileVersion ||
    turn.policyVersion !== execution.policyVersion ||
    turn.sessionPlanGrantId !== execution.sessionPlanGrantId
  )
    throw new TypeError("risk context does not match the worker execution");
  const results = [turn.previousToolResult, ...(turn.toolHistory ?? []).slice().reverse()];
  const excerpts: string[] = [];
  for (const result of results) {
    if (result === undefined) continue;
    assertExactWorkerToolResult(result);
    if (result.outcome !== "succeeded") continue;
    if (result.name === "guardian.research") {
      const evidence = result.output.evidence;
      if ("excerpt" in evidence) excerpts.push(evidence.excerpt);
      else excerpts.push(...evidence.map((e) => e.excerpt));
    } else if (result.name === "github.pull_request.read" && result.output.review) {
      excerpts.push(result.output.review.body);
      excerpts.push(
        ...result.output.review.files.flatMap((f) => (f.patch === null ? [] : [f.patch])),
      );
    }
  }
  const selected = excerpts
    .filter(Boolean)
    .slice(0, 4)
    .map((text) => text.slice(0, 500));
  const signals: GuardianRiskSignal[] = ["ambiguous_evidence"];
  if (
    selected.some((text) =>
      /\b(ignore|override|instruction|must|send|merge|instead|permission)\b/iu.test(text),
    )
  )
    signals.push("untrusted_imperative_content");
  if (execution.request.name === "github.pull_request.merge") signals.push("authority_expansion");
  const request = execution.request;
  if (request.name !== "github.pull_request.read" && request.name !== "github.pull_request.merge")
    throw new TypeError("risk context requires a supported broker operation");
  // The full schema validates even the projected subset. These signals guide
  // inference only; they never weaken the broker's deterministic floor.
  const parsed = GuardianRiskEnvelopeSchema.parse({
    proposal: {
      tool: request.name,
      arguments:
        request.name === "github.pull_request.read"
          ? {
              owner: request.arguments.owner,
              repository: request.arguments.repository,
              pullRequest: request.arguments.pullRequest,
            }
          : request.arguments,
    },
    deterministicFloor: "allow",
    containsCredentials: false,
    missionObjective: turn.objective.slice(0, 500),
    riskSignals: signals,
    untrustedExcerpts: selected,
  });
  return {
    missionObjective: parsed.missionObjective!,
    riskSignals: parsed.riskSignals,
    untrustedExcerpts: parsed.untrustedExcerpts,
  };
}
