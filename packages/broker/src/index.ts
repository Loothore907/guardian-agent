import { randomUUID } from "node:crypto";

import {
  GitHubAdapterError,
  GitHubPullRequestAdapter,
  type GitHubOperation,
} from "@guardian/adapter-github";
import type { AuthorityClient } from "@guardian/authority-client";
import {
  digestCanonicalRequest,
  digestGitHubConnectionScope,
  validateExactApproval,
} from "@guardian/authorization";
import {
  CanonicalRequestSchema,
  AuthorizationLevelSchema,
  ExactApprovalSchema,
  GuardianRecommendationSchema,
  OpaqueIdSchema,
  ProviderRequestIdSchema,
  type CanonicalRequest,
  type AuthorizationLevel,
  type DurableConnectionRecord,
  type DurableSessionRecord,
  type ExactApproval,
  type GitHubMergeResult,
  type GitHubPullRequestSnapshot,
  type GuardianRecommendation,
  type ToolProposal,
} from "@guardian/contracts";
import { applyGuardianRecommendation } from "@guardian/policy";

export interface BrokerExecutionRequest {
  readonly request: unknown;
  readonly approval?: unknown;
  readonly evidenceExposureIds?: readonly unknown[];
}

export type BrokerDenialCode =
  | "malformed"
  | "not_active"
  | "connection_unavailable"
  | "scope_mismatch"
  | "volume_exhausted"
  | "resource_changed"
  | "approval_mismatch"
  | "approval_expired"
  | "approval_replayed"
  | "guardian_confirmation_required"
  | "guardian_step_up"
  | "guardian_denied"
  | "guardian_unavailable"
  | "not_mergeable"
  | "audit_unavailable"
  | "provider_failed";

export type BrokerExecutionResult =
  | { readonly ok: true; readonly result: GitHubPullRequestSnapshot | GitHubMergeResult }
  | { readonly ok: false; readonly code: BrokerDenialCode };

export interface CredentialResolver {
  use<T>(handle: string, operation: (credential: Uint8Array) => Promise<T>): Promise<T>;
}

export interface GuardianRiskEnvelope {
  readonly proposal: ToolProposal;
  readonly deterministicFloor: AuthorizationLevel;
  readonly riskSignals: readonly (
    | "intent_action_mismatch"
    | "untrusted_imperative_content"
    | "authority_expansion"
    | "ambiguous_evidence"
    | "clean_context"
  )[];
  readonly untrustedExcerpts: readonly string[];
  readonly containsCredentials: false;
}

export type GuardianEvaluation =
  | {
      readonly status: "evaluated";
      readonly providerRequestId: string;
      readonly recommendation: GuardianRecommendation;
      readonly authorizationLevel: AuthorizationLevel;
    }
  | { readonly status: "unavailable"; readonly authorizationLevel: "deny" };

export interface GuardianEvaluator {
  evaluate(envelope: GuardianRiskEnvelope): Promise<GuardianEvaluation>;
}

function strictGuardianEvaluation(value: unknown): GuardianEvaluation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("guardian evaluation is invalid");
  }
  const evaluation = value as Record<string, unknown>;
  if (evaluation.status === "unavailable") {
    if (Object.keys(evaluation).length !== 2 || evaluation.authorizationLevel !== "deny") {
      throw new TypeError("guardian evaluation is invalid");
    }
    return { status: "unavailable", authorizationLevel: "deny" };
  }
  const fields = ["status", "providerRequestId", "recommendation", "authorizationLevel"];
  if (
    evaluation.status !== "evaluated" ||
    Object.keys(evaluation).length !== fields.length ||
    Object.keys(evaluation).some((field) => !fields.includes(field))
  ) {
    throw new TypeError("guardian evaluation is invalid");
  }
  return {
    status: "evaluated",
    providerRequestId: ProviderRequestIdSchema.parse(evaluation.providerRequestId),
    recommendation: GuardianRecommendationSchema.parse(evaluation.recommendation),
    authorizationLevel: AuthorizationLevelSchema.parse(evaluation.authorizationLevel),
  };
}

function brokerRequest(value: unknown): BrokerExecutionRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const allowedKeys = new Set(["request", "approval", "evidenceExposureIds"]);
  if (!("request" in record) || Object.keys(record).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  return {
    request: record.request,
    ...(record.approval === undefined ? {} : { approval: record.approval }),
    ...(record.evidenceExposureIds === undefined
      ? {}
      : { evidenceExposureIds: record.evidenceExposureIds as readonly unknown[] }),
  };
}

function operation(request: CanonicalRequest): GitHubOperation | null {
  const proposal = request.proposal;
  if (proposal.operation === "github.pull_request.read") {
    return {
      type: proposal.operation,
      owner: proposal.arguments.owner,
      repository: proposal.arguments.repository,
      pullRequest: proposal.arguments.pullRequest,
    };
  }
  if (proposal.operation === "github.pull_request.merge") {
    return {
      type: proposal.operation,
      owner: proposal.arguments.owner,
      repository: proposal.arguments.repository,
      pullRequest: proposal.arguments.pullRequest,
      expectedHeadSha: proposal.arguments.expectedHeadCommit,
      method: proposal.arguments.method,
    };
  }
  return null;
}

function adapterFailure(error: unknown): BrokerDenialCode {
  if (!(error instanceof GitHubAdapterError)) return "provider_failed";
  if (error.code === "resource_changed") return "resource_changed";
  if (error.code === "not_mergeable") return "not_mergeable";
  if (error.code === "not_found" || error.code === "forbidden") return "connection_unavailable";
  return "provider_failed";
}

function decisionReason(code: BrokerDenialCode) {
  const reasons = {
    malformed: "malformed_input",
    not_active: "scope_expansion",
    connection_unavailable: "connection_unavailable",
    scope_mismatch: "scope_expansion",
    volume_exhausted: "volume_exhausted",
    resource_changed: "resource_changed",
    approval_mismatch: "approval_mismatch",
    approval_expired: "approval_expired",
    approval_replayed: "approval_replayed",
    guardian_confirmation_required: "within_scope",
    guardian_step_up: "within_scope",
    guardian_denied: "within_scope",
    guardian_unavailable: "external_failure",
    not_mergeable: "not_mergeable",
    audit_unavailable: "external_failure",
    provider_failed: "external_failure",
  } as const;
  return reasons[code];
}

export class GitHubBroker {
  readonly #authority: AuthorityClient;
  readonly #credentials: CredentialResolver;
  readonly #guardian: GuardianEvaluator;
  readonly #fetch: typeof fetch;
  readonly #now: () => string;

  constructor(
    authority: AuthorityClient,
    credentials: CredentialResolver,
    options: {
      readonly guardian: GuardianEvaluator;
      readonly fetch?: typeof fetch;
      readonly now?: () => string;
    },
  ) {
    this.#authority = authority;
    this.#credentials = credentials;
    this.#guardian = options.guardian;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async execute(value: unknown): Promise<BrokerExecutionResult> {
    const input = brokerRequest(value);
    if (input === null) return { ok: false, code: "malformed" };
    const parsed = CanonicalRequestSchema.safeParse(input.request);
    if (!parsed.success) return { ok: false, code: "malformed" };
    const request = parsed.data;
    const requestedOperation = operation(request);
    if (requestedOperation === null || request.connectionId === null) {
      return { ok: false, code: "scope_mismatch" };
    }

    const evaluatedAt = this.#now();
    let session: DurableSessionRecord | null;
    try {
      session = await this.#authority.getSession(request.sessionId);
    } catch {
      return { ok: false, code: "audit_unavailable" };
    }
    if (
      session === null ||
      session.status !== "active" ||
      session.callerId !== request.callerId ||
      session.missionId !== request.missionId ||
      session.missionVersion !== request.missionVersion ||
      session.profileId !== request.profileId ||
      session.profileVersion !== request.profileVersion ||
      session.policyVersion !== request.policyVersion ||
      Date.parse(evaluatedAt) < Date.parse(session.startsAt) ||
      Date.parse(evaluatedAt) >= Date.parse(session.expiresAt)
    ) {
      return { ok: false, code: "not_active" };
    }

    if (!Array.isArray(input.evidenceExposureIds ?? [])) {
      return { ok: false, code: "malformed" };
    }
    let evidenceExposureIds: string[];
    try {
      evidenceExposureIds = (input.evidenceExposureIds ?? []).map((item) =>
        OpaqueIdSchema.parse(item),
      );
      if (
        evidenceExposureIds.length > 16 ||
        new Set(evidenceExposureIds).size !== evidenceExposureIds.length
      ) {
        return { ok: false, code: "malformed" };
      }
    } catch {
      return { ok: false, code: "malformed" };
    }
    const attemptId = randomUUID();
    try {
      await this.#authority.appendAuthorityAttempt({
        schemaVersion: 1,
        attemptId,
        sessionId: request.sessionId,
        callerId: request.callerId,
        connectionId: request.connectionId,
        operation: requestedOperation.type,
        effectClass:
          requestedOperation.type === "github.pull_request.read" ? "read_authenticated" : "merge",
        destinationClass: "github_connection",
        requestDigest: digestCanonicalRequest(request),
        evidenceExposureIds,
        attemptedAt: evaluatedAt,
      });
    } catch {
      return { ok: false, code: "audit_unavailable" };
    }
    let adapterCrossed = false;
    let toolConsumed = false;
    let approvalConsumed = false;
    let providerCrossed = false;
    let guardianOutcome: "not_assessed" | "preserved" | "escalated" | "uncertain" | "unavailable" =
      "not_assessed";
    let authorizationFloor: AuthorizationLevel =
      requestedOperation.type === "github.pull_request.merge" ? "confirm" : "allow";
    const deny = async (code: BrokerDenialCode): Promise<BrokerExecutionResult> => {
      try {
        await this.#authority.appendAuthorityDecision({
          schemaVersion: 1,
          decisionId: randomUUID(),
          attemptId,
          sessionId: request.sessionId,
          deterministicReasons: [decisionReason(code)],
          authorizationFloor,
          guardianOutcome,
          providerBoundary: providerCrossed ? "crossed" : "not_crossed",
          adapterBoundary: adapterCrossed ? "crossed" : "not_crossed",
          toolConsumption: toolConsumed ? "consumed" : "not_consumed",
          approvalConsumption:
            requestedOperation.type === "github.pull_request.merge"
              ? approvalConsumed
                ? "consumed"
                : "not_consumed"
              : "not_applicable",
          controlOutcome:
            code === "provider_failed" || code === "guardian_unavailable"
              ? "failed"
              : code === "guardian_confirmation_required" || code === "guardian_step_up"
                ? "step_up"
                : "denied",
          decidedAt: this.#now(),
        });
      } catch {
        return { ok: false, code: "audit_unavailable" };
      }
      return { ok: false, code };
    };
    const allow = async (
      result: GitHubPullRequestSnapshot | GitHubMergeResult,
    ): Promise<BrokerExecutionResult> => {
      try {
        await this.#authority.appendAuthorityDecision({
          schemaVersion: 1,
          decisionId: randomUUID(),
          attemptId,
          sessionId: request.sessionId,
          deterministicReasons: ["within_scope"],
          authorizationFloor,
          guardianOutcome,
          providerBoundary: providerCrossed ? "crossed" : "not_crossed",
          adapterBoundary: "crossed",
          toolConsumption: "consumed",
          approvalConsumption:
            requestedOperation.type === "github.pull_request.merge" ? "consumed" : "not_applicable",
          controlOutcome: "allowed",
          decidedAt: this.#now(),
        });
      } catch {
        return { ok: false, code: "audit_unavailable" };
      }
      return { ok: true, result };
    };

    let connections: readonly DurableConnectionRecord[];
    try {
      connections = await this.#authority.getSessionConnections(request.sessionId);
    } catch {
      return deny("audit_unavailable");
    }
    const connection = connections.find(
      (candidate) => candidate.connectionId === request.connectionId,
    );
    if (connection === undefined || connection.status !== "active") {
      return await deny("connection_unavailable");
    }
    const requiredPermission =
      requestedOperation.type === "github.pull_request.read"
        ? "pull_request:read"
        : "pull_request:merge";
    if (
      connection.owner !== requestedOperation.owner ||
      connection.repository !== requestedOperation.repository ||
      !connection.permissions.includes(requiredPermission)
    ) {
      return await deny("scope_mismatch");
    }

    const deterministicFloor = authorizationFloor;
    let guardianEvaluation: GuardianEvaluation;
    providerCrossed = true;
    try {
      const evaluated = strictGuardianEvaluation(
        await this.#guardian.evaluate({
          proposal:
            requestedOperation.type === "github.pull_request.read"
              ? {
                  tool: requestedOperation.type,
                  arguments: {
                    owner: requestedOperation.owner,
                    repository: requestedOperation.repository,
                    pullRequest: requestedOperation.pullRequest,
                  },
                }
              : {
                  tool: requestedOperation.type,
                  arguments: {
                    owner: requestedOperation.owner,
                    repository: requestedOperation.repository,
                    pullRequest: requestedOperation.pullRequest,
                    expectedHeadCommit: requestedOperation.expectedHeadSha,
                    method: requestedOperation.method,
                  },
                },
          deterministicFloor,
          riskSignals:
            requestedOperation.type === "github.pull_request.merge"
              ? ["authority_expansion"]
              : ["clean_context"],
          untrustedExcerpts: [],
          containsCredentials: false,
        }),
      );
      if (
        evaluated.status === "evaluated" &&
        evaluated.authorizationLevel !==
          applyGuardianRecommendation(deterministicFloor, evaluated.recommendation)
      ) {
        throw new TypeError("guardian evaluation is inconsistent");
      }
      guardianEvaluation = evaluated;
    } catch {
      guardianEvaluation = { status: "unavailable", authorizationLevel: "deny" };
    }
    if (guardianEvaluation.status === "unavailable") {
      guardianOutcome = "unavailable";
      authorizationFloor = "deny";
      return await deny("guardian_unavailable");
    }
    authorizationFloor = applyGuardianRecommendation(
      deterministicFloor,
      guardianEvaluation.recommendation,
    );
    guardianOutcome =
      guardianEvaluation.recommendation.certainty === "uncertain"
        ? "uncertain"
        : authorizationFloor === deterministicFloor
          ? "preserved"
          : "escalated";
    if (authorizationFloor === "deny") return await deny("guardian_denied");
    if (authorizationFloor === "step_up") return await deny("guardian_step_up");
    if (
      authorizationFloor === "confirm" &&
      requestedOperation.type === "github.pull_request.read"
    ) {
      return await deny("guardian_confirmation_required");
    }

    let mergeApproval: ReturnType<typeof ExactApprovalSchema.parse> | null = null;
    let initialDigest: string | null = null;
    if (requestedOperation.type === "github.pull_request.merge") {
      const suppliedApproval = ExactApprovalSchema.safeParse(input.approval);
      if (!suppliedApproval.success) return await deny("approval_mismatch");
      let storedApproval: ExactApproval | null;
      let approvalState: "available" | "consumed" | null;
      try {
        [storedApproval, approvalState] = await Promise.all([
          this.#authority.getApproval(request.sessionId, suppliedApproval.data.approvalId),
          this.#authority.getApprovalState(request.sessionId, suppliedApproval.data.approvalId),
        ]);
      } catch {
        return await deny("audit_unavailable");
      }
      if (approvalState === "consumed") return await deny("approval_replayed");
      if (
        approvalState === null ||
        storedApproval === null ||
        JSON.stringify(storedApproval) !== JSON.stringify(suppliedApproval.data)
      ) {
        return await deny("approval_mismatch");
      }
      const approvalValidation = validateExactApproval(
        storedApproval,
        request,
        digestGitHubConnectionScope(connection),
        evaluatedAt,
      );
      if (!approvalValidation.ok) {
        return await deny(
          approvalValidation.reason === "expired"
            ? "approval_expired"
            : approvalValidation.reason === "not_active"
              ? "not_active"
              : "approval_mismatch",
        );
      }
      mergeApproval = storedApproval;
      initialDigest = digestCanonicalRequest(request);
    }

    try {
      if ((await this.#authority.consumeToolCall(request.sessionId)) === null) {
        return await deny("volume_exhausted");
      }
    } catch {
      return await deny("audit_unavailable");
    }
    toolConsumed = true;

    let snapshot: GitHubPullRequestSnapshot;
    try {
      adapterCrossed = true;
      snapshot = await this.#credentials.use(connection.credentialStoreHandle, async (secret) => {
        const adapter = new GitHubPullRequestAdapter(secret, this.#fetch);
        return await adapter.read({
          type: "github.pull_request.read",
          owner: requestedOperation.owner,
          repository: requestedOperation.repository,
          pullRequest: requestedOperation.pullRequest,
        });
      });
    } catch (error) {
      if (!(error instanceof GitHubAdapterError)) return await deny("connection_unavailable");
      return await deny(adapterFailure(error));
    }
    if (
      request.resourceVersion?.kind !== "github_pull_request" ||
      snapshot.headCommit !== request.resourceVersion.headCommit
    ) {
      return await deny("resource_changed");
    }
    if (requestedOperation.type === "github.pull_request.read") {
      return await allow(snapshot);
    }
    if (snapshot.state !== "open" || snapshot.draft) {
      return await deny("not_mergeable");
    }

    const finalRequest = CanonicalRequestSchema.parse(request);
    const finalDigest = digestCanonicalRequest(finalRequest);
    if (
      mergeApproval === null ||
      initialDigest === null ||
      initialDigest !== finalDigest ||
      mergeApproval.requestDigest !== finalDigest
    ) {
      return await deny("approval_mismatch");
    }
    const consumption = await this.#authority.consumeApproval({
      approvalId: mergeApproval.approvalId,
      nonce: mergeApproval.nonce,
      requestDigest: finalDigest,
      sessionId: finalRequest.sessionId,
      callerId: finalRequest.callerId,
      connectionId: finalRequest.connectionId,
      policyVersion: finalRequest.policyVersion,
    });
    if (consumption !== "consumed") {
      if (consumption === "replayed") return await deny("approval_replayed");
      if (consumption === "expired") return await deny("approval_expired");
      if (consumption === "not_active") return await deny("not_active");
      return await deny("approval_mismatch");
    }
    approvalConsumed = true;

    try {
      const result = await this.#credentials.use(
        connection.credentialStoreHandle,
        async (secret) =>
          await new GitHubPullRequestAdapter(secret, this.#fetch).merge(requestedOperation),
      );
      return await allow(result);
    } catch (error) {
      if (!(error instanceof GitHubAdapterError)) return await deny("connection_unavailable");
      return await deny(adapterFailure(error));
    }
  }
}
