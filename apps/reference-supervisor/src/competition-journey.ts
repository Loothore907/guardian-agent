import { canonicalDigest } from "@guardian/canonical";
import {
  CanonicalRequestSchema,
  ExactApprovalSchema,
  GitHubMergeResultSchema,
  ResearchBudgetSnapshotSchema,
  ResearchJourneyResultSchema,
  ResearchRequestSchema,
  TimestampSchema,
  type ExactApproval,
  type GitHubMergeResult,
  type ResearchBudgetSnapshot,
  type ResearchJourneyResult,
  type ResearchRequest,
} from "@guardian/contracts";

const EXPECTED_UNSAFE_DENIAL = "scope_mismatch" as const;
const BROKER_DENIAL_CODES = [
  "malformed",
  "not_active",
  "connection_unavailable",
  "scope_mismatch",
  "volume_exhausted",
  "resource_changed",
  "approval_mismatch",
  "approval_expired",
  "approval_replayed",
  "guardian_confirmation_required",
  "guardian_step_up",
  "guardian_denied",
  "guardian_unavailable",
  "not_mergeable",
  "audit_unavailable",
  "provider_failed",
] as const;
export type CompetitionJourneyBrokerDenialCode = (typeof BROKER_DENIAL_CODES)[number];

export interface CompetitionJourneyBroker {
  execute(value: unknown): Promise<unknown>;
}

export interface CompetitionJourneyResearchClient {
  search(request: ResearchRequest, requestedAt: string): Promise<unknown>;
}

export type CompetitionJourneyBrokerResult =
  | {
      readonly ok: true;
      readonly result: unknown;
    }
  | {
      readonly ok: false;
      readonly code: CompetitionJourneyBrokerDenialCode;
    };

type BrokerExecutionResult = CompetitionJourneyBrokerResult;

export interface ControlledCompetitionJourneyInput {
  readonly requestedAt: unknown;
  readonly researchRequest: unknown;
  readonly unsafeRequest: unknown;
  readonly legitimateRequest: unknown;
  readonly legitimateApproval: unknown;
}

export type ControlledCompetitionJourneyResult =
  | {
      readonly state: "completed";
      readonly research: ResearchJourneyResult;
      readonly researchBudget: ResearchBudgetSnapshot;
      readonly unsafeAttempt: {
        readonly outcome: "denied";
        readonly code: typeof EXPECTED_UNSAFE_DENIAL;
      };
      readonly legitimateAttempt: {
        readonly outcome: "succeeded";
        readonly result: GitHubMergeResult;
      };
    }
  | {
      readonly state: "stopped";
      readonly stage: "input" | "research" | "unsafe_attempt" | "legitimate_attempt";
      readonly code:
        | "invalid_input"
        | "research_unavailable"
        | "research_binding_mismatch"
        | "unsafe_attempt_succeeded"
        | "unsafe_attempt_unexpected_denial"
        | "legitimate_attempt_denied"
        | "legitimate_result_invalid";
      readonly brokerCode?: CompetitionJourneyBrokerDenialCode;
    };

interface ParsedJourneyInput {
  readonly requestedAt: string;
  readonly researchRequest: ResearchRequest;
  readonly unsafeRequest: ReturnType<typeof CanonicalRequestSchema.parse>;
  readonly legitimateRequest: ReturnType<typeof CanonicalRequestSchema.parse>;
  readonly legitimateApproval: ExactApproval;
}

function sameAuthorityBinding(
  left: ReturnType<typeof CanonicalRequestSchema.parse>,
  right: ReturnType<typeof CanonicalRequestSchema.parse>,
): boolean {
  return (
    left.sessionId === right.sessionId &&
    left.callerId === right.callerId &&
    left.connectionId === right.connectionId &&
    left.missionId === right.missionId &&
    left.missionVersion === right.missionVersion &&
    left.profileId === right.profileId &&
    left.profileVersion === right.profileVersion &&
    left.policyVersion === right.policyVersion
  );
}

function sameRepositoryTarget(
  left: ReturnType<typeof CanonicalRequestSchema.parse>,
  right: ReturnType<typeof CanonicalRequestSchema.parse>,
): boolean {
  if (
    left.proposal.operation !== "github.pull_request.merge" ||
    right.proposal.operation !== "github.pull_request.merge"
  ) {
    return false;
  }
  return (
    left.proposal.arguments.owner === right.proposal.arguments.owner &&
    left.proposal.arguments.repository === right.proposal.arguments.repository
  );
}

function approvalMatchesLegitimateRequest(
  approval: ExactApproval,
  request: ReturnType<typeof CanonicalRequestSchema.parse>,
): boolean {
  return (
    approval.requestId === request.requestId &&
    approval.requestDigest ===
      canonicalDigest("canonical_request", request.schemaVersion, request) &&
    approval.sessionId === request.sessionId &&
    approval.callerId === request.callerId &&
    approval.connectionId === request.connectionId &&
    approval.missionId === request.missionId &&
    approval.missionVersion === request.missionVersion &&
    approval.profileId === request.profileId &&
    approval.profileVersion === request.profileVersion &&
    approval.policyVersion === request.policyVersion &&
    JSON.stringify(approval.resourceVersion) === JSON.stringify(request.resourceVersion)
  );
}

function parseJourneyInput(value: ControlledCompetitionJourneyInput): ParsedJourneyInput {
  const requestedAt = TimestampSchema.parse(value.requestedAt);
  const researchRequest = ResearchRequestSchema.parse(value.researchRequest);
  const unsafeRequest = CanonicalRequestSchema.parse(value.unsafeRequest);
  const legitimateRequest = CanonicalRequestSchema.parse(value.legitimateRequest);
  const legitimateApproval = ExactApprovalSchema.parse(value.legitimateApproval);
  if (
    unsafeRequest.proposal.operation !== "github.pull_request.merge" ||
    legitimateRequest.proposal.operation !== "github.pull_request.merge" ||
    unsafeRequest.connectionId === null ||
    legitimateRequest.connectionId === null ||
    !sameAuthorityBinding(unsafeRequest, legitimateRequest) ||
    sameRepositoryTarget(unsafeRequest, legitimateRequest) ||
    !approvalMatchesLegitimateRequest(legitimateApproval, legitimateRequest)
  ) {
    throw new TypeError("controlled competition journey input is invalid");
  }
  return {
    requestedAt,
    researchRequest,
    unsafeRequest,
    legitimateRequest,
    legitimateApproval,
  };
}

function validMergeResult(
  result: BrokerExecutionResult & { readonly ok: true },
  request: ParsedJourneyInput["legitimateRequest"],
): GitHubMergeResult | null {
  const parsed = GitHubMergeResultSchema.safeParse(result.result);
  if (!parsed.success || request.proposal.operation !== "github.pull_request.merge") return null;
  return parsed.data.owner === request.proposal.arguments.owner &&
    parsed.data.repository === request.proposal.arguments.repository &&
    parsed.data.pullRequest === request.proposal.arguments.pullRequest &&
    parsed.data.headCommit === request.proposal.arguments.expectedHeadCommit
    ? parsed.data
    : null;
}

function parseBrokerResult(value: unknown): BrokerExecutionResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (result.ok === true && Object.keys(result).length === 2 && "result" in result) {
    return { ok: true, result: result.result };
  }
  if (
    result.ok === false &&
    Object.keys(result).length === 2 &&
    typeof result.code === "string" &&
    (BROKER_DENIAL_CODES as readonly string[]).includes(result.code)
  ) {
    return { ok: false, code: result.code as CompetitionJourneyBrokerDenialCode };
  }
  return null;
}

function parseResearchResponse(value: unknown): {
  readonly result: ResearchJourneyResult;
  readonly budget: ResearchBudgetSnapshot;
} | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const response = value as Record<string, unknown>;
  if (Object.keys(response).length !== 2 || !("result" in response) || !("budget" in response)) {
    return null;
  }
  const result = ResearchJourneyResultSchema.safeParse(response.result);
  const budget = ResearchBudgetSnapshotSchema.safeParse(response.budget);
  if (
    !result.success ||
    !budget.success ||
    result.data.provenance.length === 0 ||
    new Set(result.data.provenance.map((event) => event.eventId)).size !==
      result.data.provenance.length
  ) {
    return null;
  }
  return { result: result.data, budget: budget.data };
}

/**
 * Executes the fixed competition ordering without creating a general agent loop.
 * Retrieved text is never used to construct authority; only provenance event IDs
 * cross into the two already-normalized broker attempts.
 */
export class ControlledCompetitionJourney {
  readonly #research: CompetitionJourneyResearchClient;
  readonly #broker: CompetitionJourneyBroker;

  constructor(options: {
    readonly research: CompetitionJourneyResearchClient;
    readonly broker: CompetitionJourneyBroker;
  }) {
    this.#research = options.research;
    this.#broker = options.broker;
  }

  async run(value: ControlledCompetitionJourneyInput): Promise<ControlledCompetitionJourneyResult> {
    let input: ParsedJourneyInput;
    try {
      input = parseJourneyInput(value);
    } catch {
      return { state: "stopped", stage: "input", code: "invalid_input" };
    }

    let research: ResearchJourneyResult;
    let researchBudget: ResearchBudgetSnapshot;
    try {
      const response = parseResearchResponse(
        await this.#research.search(input.researchRequest, input.requestedAt),
      );
      if (response === null) throw new TypeError("research response is invalid");
      research = response.result;
      researchBudget = response.budget;
    } catch {
      return { state: "stopped", stage: "research", code: "research_unavailable" };
    }
    if (
      researchBudget.sessionId !== input.unsafeRequest.sessionId ||
      research.provenance.some((event) => event.sessionId !== input.unsafeRequest.sessionId)
    ) {
      return { state: "stopped", stage: "research", code: "research_binding_mismatch" };
    }
    const evidenceExposureIds = research.provenance.map((event) => event.eventId);

    let unsafeResult: BrokerExecutionResult | null;
    try {
      unsafeResult = parseBrokerResult(
        await this.#broker.execute({
          request: input.unsafeRequest,
          evidenceExposureIds,
        }),
      );
    } catch {
      return {
        state: "stopped",
        stage: "unsafe_attempt",
        code: "unsafe_attempt_unexpected_denial",
      };
    }
    if (unsafeResult === null) {
      return {
        state: "stopped",
        stage: "unsafe_attempt",
        code: "unsafe_attempt_unexpected_denial",
      };
    }
    if (unsafeResult.ok) {
      return { state: "stopped", stage: "unsafe_attempt", code: "unsafe_attempt_succeeded" };
    }
    if (unsafeResult.code !== EXPECTED_UNSAFE_DENIAL) {
      return {
        state: "stopped",
        stage: "unsafe_attempt",
        code: "unsafe_attempt_unexpected_denial",
        brokerCode: unsafeResult.code,
      };
    }

    let legitimateResult: BrokerExecutionResult | null;
    try {
      legitimateResult = parseBrokerResult(
        await this.#broker.execute({
          request: input.legitimateRequest,
          approval: input.legitimateApproval,
          evidenceExposureIds,
        }),
      );
    } catch {
      return {
        state: "stopped",
        stage: "legitimate_attempt",
        code: "legitimate_attempt_denied",
      };
    }
    if (legitimateResult === null) {
      return {
        state: "stopped",
        stage: "legitimate_attempt",
        code: "legitimate_result_invalid",
      };
    }
    if (!legitimateResult.ok) {
      return {
        state: "stopped",
        stage: "legitimate_attempt",
        code: "legitimate_attempt_denied",
        brokerCode: legitimateResult.code,
      };
    }
    const mergeResult = validMergeResult(legitimateResult, input.legitimateRequest);
    if (mergeResult === null) {
      return {
        state: "stopped",
        stage: "legitimate_attempt",
        code: "legitimate_result_invalid",
      };
    }
    return {
      state: "completed",
      research,
      researchBudget,
      unsafeAttempt: { outcome: "denied", code: EXPECTED_UNSAFE_DENIAL },
      legitimateAttempt: { outcome: "succeeded", result: mergeResult },
    };
  }
}
