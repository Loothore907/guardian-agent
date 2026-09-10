import {
  CanonicalRequestSchema,
  SessionPlanStateSchema,
  type WorkerToolExecutionEnvelope,
  type ResearchJourneyResult,
  type ControlledContentJourneyResult,
  type GitHubPullRequestSnapshot,
  type GitHubMergeResult,
  type WorkerDenialCause,
  type WorkerDenialStage,
} from "@guardian/contracts";
import {
  ResearchIpcError,
  type ResearchServiceClient,
  type ControlledContentServiceClient,
} from "@guardian/research";
import type { LocalBrokerIpcClient } from "@guardian/broker";

export type ExternalWorkerResult =
  | {
      outcome: "succeeded";
      name: "guardian.research";
      output: ResearchJourneyResult | ControlledContentJourneyResult;
      remainingPrivilegedActions: number;
    }
  | {
      outcome: "succeeded";
      name: "github.pull_request.read";
      output: GitHubPullRequestSnapshot;
      remainingPrivilegedActions: number;
    }
  | {
      outcome: "succeeded";
      name: "github.pull_request.merge";
      output: GitHubMergeResult;
      remainingPrivilegedActions: number;
    }
  | {
      outcome: "denied";
      cause: WorkerDenialCause;
      stage: WorkerDenialStage;
      providerBoundary: "not_crossed";
      adapterBoundary: "not_crossed";
    };

/** Trusted composition over the same IPC clients as the competition journey.
 * No credentials, arbitrary transport, or agent-supplied connection IDs. */
export class WorkerExternalTools {
  constructor(
    private readonly options: {
      research?: ResearchServiceClient & ControlledContentServiceClient;
      broker?: Pick<LocalBrokerIpcClient, "execute">;
      getPlan: () => Promise<unknown>;
      now: () => string;
    },
  ) {}

  async execute(execution: WorkerToolExecutionEnvelope): Promise<ExternalWorkerResult> {
    const request = execution.request;
    const remaining = async () => {
      const value = await this.options.getPlan();
      if (value === null) return 0;
      const state = SessionPlanStateSchema.parse(value);
      if (
        state.revoked ||
        state.grant.plan.sessionId !== execution.sessionId ||
        state.grant.plan.callerId !== execution.callerId ||
        Date.parse(this.options.now()) >= Date.parse(state.grant.plan.expiresAt)
      )
        throw new TypeError("worker authority unavailable");
      return Math.max(0, state.grant.plan.maxMutations - state.usedMutations);
    };
    if (request.name === "guardian.research") {
      const client = this.options.research;
      if (!client) throw new TypeError("research unavailable");
      try {
        let output: ResearchJourneyResult | ControlledContentJourneyResult;
        if ("sourceUrl" in request.arguments) {
          const result = await client.extract(
            { url: request.arguments.sourceUrl },
            this.options.now(),
          );
          output = result.result;
          if (output.evidence.sourceUrl !== request.arguments.sourceUrl)
            throw new TypeError("research result target mismatch");
        } else {
          output = (await client.search(request.arguments, this.options.now())).result;
        }
        return {
          outcome: "succeeded",
          name: request.name,
          output,
          remainingPrivilegedActions: await remaining(),
        };
      } catch (error) {
        if (
          error instanceof ResearchIpcError &&
          [
            "domain_not_allowed",
            "query_not_relevant",
            "unsafe_outbound_content",
            "url_not_allowed",
          ].includes(error.reason)
        )
          return {
            outcome: "denied",
            cause: error.reason as WorkerDenialCause,
            stage: "research_request_policy",
            providerBoundary: "not_crossed",
            adapterBoundary: "not_crossed",
          };
        throw Object.assign(new TypeError("research unavailable"), {
          code: error instanceof ResearchIpcError ? error.reason : "service_unavailable",
        });
      }
    }
    if (request.name !== "github.pull_request.read" && request.name !== "github.pull_request.merge")
      throw new TypeError("unsupported external tool");
    if (!this.options.broker) throw new TypeError("broker unavailable");
    const state = SessionPlanStateSchema.parse(await this.options.getPlan());
    const plan = state.grant.plan;
    if (
      state.grant.grantId !== execution.sessionPlanGrantId ||
      state.revoked ||
      plan.sessionId !== execution.sessionId ||
      plan.callerId !== execution.callerId ||
      plan.missionId !== execution.missionId ||
      plan.missionVersion !== execution.missionVersion ||
      plan.profileId !== execution.profileId ||
      plan.profileVersion !== execution.profileVersion ||
      plan.policyVersion !== execution.policyVersion
    )
      throw new TypeError("worker authority unavailable");
    const target = plan.targets.find(
      (t) =>
        t.owner === request.arguments.owner &&
        t.repository === request.arguments.repository &&
        t.pullRequest === request.arguments.pullRequest &&
        t.operation === request.name,
    );
    // Unknown targets have no trustworthy version/connection. Deny without inventing either.
    if (!target)
      return {
        outcome: "denied",
        cause: "destination_not_allowed",
        stage: "session_plan_policy",
        providerBoundary: "not_crossed",
        adapterBoundary: "not_crossed",
      };
    const resourceVersion = {
      kind: "github_pull_request",
      owner: target.owner,
      repository: target.repository,
      pullRequest: target.pullRequest,
      headCommit: target.headCommit,
    };
    const binding = {
      sessionId: execution.sessionId,
      callerId: execution.callerId,
      missionId: execution.missionId,
      missionVersion: execution.missionVersion,
      profileId: execution.profileId,
      profileVersion: execution.profileVersion,
    };
    const canonical = CanonicalRequestSchema.parse({
      schemaVersion: 1,
      ...binding,
      requestId: execution.executionId,
      policyVersion: execution.policyVersion,
      connectionId: target.connectionId,
      proposal: {
        schemaVersion: 1,
        ...binding,
        proposalId: execution.executionId,
        proposedAt: execution.requestedAt,
        operation: request.name,
        arguments: request.arguments,
        resourceVersion,
      },
      resourceVersion,
    });
    const result = await this.options.broker.execute({ request: canonical });
    if (!result.ok) {
      if (["scope_mismatch", "resource_changed"].includes(result.code))
        return {
          outcome: "denied",
          cause: result.code as "scope_mismatch" | "resource_changed",
          stage: "broker_policy",
          providerBoundary: "not_crossed",
          adapterBoundary: "not_crossed",
        };
      // Step-up, uncertainty, replay, expiry and service failure cannot become ordinary continuation.
      throw Object.assign(new TypeError("broker authorization unavailable"), { code: result.code });
    }
    const output = result.result;
    if (
      request.name === "github.pull_request.read" &&
      "state" in output &&
      output.headCommit === target.headCommit &&
      output.baseBranch === target.baseBranch &&
      (request.arguments.content !== "review" || output.review !== undefined)
    )
      return {
        outcome: "succeeded",
        name: request.name,
        output,
        remainingPrivilegedActions: await remaining(),
      };
    if (request.name === "github.pull_request.merge" && "status" in output)
      return {
        outcome: "succeeded",
        name: request.name,
        output,
        remainingPrivilegedActions: await remaining(),
      };
    throw new TypeError("broker result mismatch");
  }
}
