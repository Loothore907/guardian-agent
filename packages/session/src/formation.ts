import { randomUUID } from "node:crypto";

import { canonicalDigest, canonicalJson } from "@guardian/canonical";
import {
  CompiledMissionCandidateSchema,
  DEFAULT_GUARDIAN_MODEL_POLICY,
  isPermissionSubset,
  mechanicallyMissingMissionFields,
  MissionDraftReviewEnvelopeSchema,
  MissionDraftReviewOutcomeSchema,
  MissionFormationDraftSnapshotSchema,
  MissionFormationEffectiveRouteSchema,
  MissionSetupRiskEnvelopeSchema,
  MissionSetupRiskEvaluationSchema,
  MissionSetupRiskResultSchema,
  PermissionEnvelopeSchema,
  type CompiledMissionCandidate,
  type GuardianModelPolicy,
  type MissionDraftReviewEnvelope,
  type MissionDraftReviewOutcome,
  type MissionFormationDraftSnapshot,
  type MissionFormationEffectiveRoute,
  type MissionFormationState,
  type MissionSetupRiskEnvelope,
  type PermissionEnvelope,
  type UntrustedMissionDraftInput,
  UntrustedMissionDraftInputSchema,
} from "@guardian/contracts";

type Clock = () => Date;
type IdFactory = () => string;

interface FormationRecord {
  readonly draftId: string;
  revision: number;
  readonly createdAt: string;
  readonly expiresAt: string;
  draft: UntrustedMissionDraftInput;
  state: MissionFormationState;
  reviewTurn: number;
  setupRiskRequest?: MissionSetupRiskEnvelope;
  setupRiskResult?: unknown;
  candidate?: CompiledMissionCandidate;
}

export interface PreActivationMissionCoordinatorOptions {
  readonly maximumPermissions: PermissionEnvelope;
  readonly policyVersion: number;
  readonly modelPolicy?: GuardianModelPolicy;
  readonly maxReviewTurns?: number;
  readonly draftLifetimeSeconds?: number;
  readonly now?: Clock;
  readonly randomId?: IdFactory;
}

export interface CompileMissionCandidateInput {
  readonly draftId: string;
  readonly expectedRevision: number;
  readonly route: MissionFormationEffectiveRoute;
  readonly setupRisk: unknown;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requireCompletePermissions(draft: UntrustedMissionDraftInput): PermissionEnvelope {
  if (
    draft.requestedPermissions.tools === null ||
    draft.requestedPermissions.filesystem === null ||
    draft.requestedPermissions.network === null ||
    draft.requestedPermissions.sideEffects === null ||
    draft.requestedPermissions.time === null ||
    draft.requestedPermissions.volume === null
  ) {
    throw new TypeError("mission draft is incomplete");
  }

  return PermissionEnvelopeSchema.parse({
    tools: draft.requestedPermissions.tools,
    filesystem: draft.requestedPermissions.filesystem,
    network: draft.requestedPermissions.network,
    sideEffects: draft.requestedPermissions.sideEffects,
    time: draft.requestedPermissions.time,
    volume: draft.requestedPermissions.volume,
  });
}

const AUTHORIZATION_RANK = { allow: 0, confirm: 1, step_up: 2, deny: 3 } as const;

function setupRiskSignals(permissions: PermissionEnvelope) {
  const signals: (
    | "broad_network_scope"
    | "privileged_side_effects"
    | "large_volume"
    | "long_duration"
    | "clean_scope"
  )[] = [];
  if (permissions.network.destinations.length >= 10) signals.push("broad_network_scope");
  if (permissions.sideEffects.length > 0) signals.push("privileged_side_effects");
  if (
    permissions.volume.maxToolCalls > 100 ||
    permissions.volume.maxResearchRequests > 50 ||
    permissions.volume.maxPrivilegedActions > 10
  ) {
    signals.push("large_volume");
  }
  if (permissions.time.maxDurationSeconds > 3_600) signals.push("long_duration");
  if (signals.length === 0) signals.push("clean_scope");
  return signals;
}

export class PreActivationMissionCoordinator {
  readonly #records = new Map<string, FormationRecord>();
  readonly #maximumPermissions: PermissionEnvelope;
  readonly #policyVersion: number;
  readonly #modelPolicy: GuardianModelPolicy;
  readonly #maxReviewTurns: number;
  readonly #draftLifetimeSeconds: number;
  readonly #now: Clock;
  readonly #randomId: IdFactory;

  constructor(options: PreActivationMissionCoordinatorOptions) {
    this.#maximumPermissions = PermissionEnvelopeSchema.parse(options.maximumPermissions);
    if (!Number.isSafeInteger(options.policyVersion) || options.policyVersion < 1) {
      throw new TypeError("policyVersion must be a positive safe integer");
    }
    this.#policyVersion = options.policyVersion;
    this.#modelPolicy = options.modelPolicy ?? DEFAULT_GUARDIAN_MODEL_POLICY;
    this.#maxReviewTurns = options.maxReviewTurns ?? 4;
    this.#draftLifetimeSeconds = options.draftLifetimeSeconds ?? 300;
    this.#now = options.now ?? (() => new Date());
    this.#randomId = options.randomId ?? randomUUID;
    if (!Number.isSafeInteger(this.#maxReviewTurns) || this.#maxReviewTurns < 1) {
      throw new TypeError("maxReviewTurns must be a positive safe integer");
    }
    if (!Number.isSafeInteger(this.#draftLifetimeSeconds) || this.#draftLifetimeSeconds < 1) {
      throw new TypeError("draftLifetimeSeconds must be a positive safe integer");
    }
  }

  createDraft(value: unknown): MissionFormationDraftSnapshot {
    const draft = UntrustedMissionDraftInputSchema.parse(value);
    const now = this.#now();
    const record: FormationRecord = {
      draftId: this.#randomId(),
      revision: 1,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.#draftLifetimeSeconds * 1_000).toISOString(),
      draft,
      state: "awaiting_review",
      reviewTurn: 0,
    };
    this.#records.set(record.draftId, record);
    return this.#snapshot(record);
  }

  beginReview(draftId: string): MissionDraftReviewEnvelope {
    const record = this.#requireActive(draftId);
    if (record.draft.requestedRoute !== "qwen_assisted") {
      throw new TypeError("structured mission drafts do not use model review");
    }
    if (record.state !== "awaiting_review") {
      throw new TypeError("mission draft is not awaiting review");
    }
    if (record.reviewTurn >= this.#maxReviewTurns) {
      throw new TypeError("mission review turn limit reached");
    }
    record.reviewTurn += 1;
    record.state = "review_in_progress";
    return MissionDraftReviewEnvelopeSchema.parse({
      schemaVersion: 1,
      draftId: record.draftId,
      revision: record.revision,
      reviewTurn: record.reviewTurn,
      modelPolicyId: this.#modelPolicy.policyId,
      modelPolicyVersion: this.#modelPolicy.version,
      expiresAt: record.expiresAt,
      objective: record.draft.objective,
      constraints: record.draft.constraints,
      requestedPermissions: record.draft.requestedPermissions,
      mechanicallyMissingFields: mechanicallyMissingMissionFields(record.draft),
    });
  }

  completeReview(
    draftId: string,
    expectedRevision: number,
    expectedReviewTurn: number,
    value: unknown,
  ): MissionDraftReviewOutcome {
    const record = this.#requireActive(draftId);
    this.#assertExactRevision(record, expectedRevision);
    if (record.state !== "review_in_progress" || record.reviewTurn !== expectedReviewTurn) {
      throw new TypeError("mission review response is stale or unexpected");
    }
    const outcome = MissionDraftReviewOutcomeSchema.parse(value);
    const mechanicallyMissing = mechanicallyMissingMissionFields(record.draft);
    if (outcome.status === "ready") {
      if (mechanicallyMissing.length > 0) {
        throw new TypeError("model cannot mark a mechanically incomplete draft ready");
      }
      record.state = "ready_for_compilation";
    } else {
      const reported = new Set(outcome.missingFields);
      if (mechanicallyMissing.some((field) => !reported.has(field))) {
        throw new TypeError("model clarification omitted a mechanically missing field");
      }
      record.state = "needs_clarification";
    }
    return clone(outcome);
  }

  reviseDraft(
    draftId: string,
    expectedRevision: number,
    value: unknown,
  ): MissionFormationDraftSnapshot {
    const record = this.#requireActive(draftId);
    this.#assertExactRevision(record, expectedRevision);
    if (record.state !== "needs_clarification") {
      throw new TypeError("mission draft is not awaiting clarification");
    }
    const draft = UntrustedMissionDraftInputSchema.parse(value);
    if (draft.requestedRoute !== record.draft.requestedRoute) {
      throw new TypeError("mission route cannot change during clarification");
    }
    record.draft = draft;
    record.revision += 1;
    record.state = "awaiting_review";
    return this.#snapshot(record);
  }

  beginSetupRiskReview(
    draftId: string,
    expectedRevision: number,
    routeValue: MissionFormationEffectiveRoute,
  ): MissionSetupRiskEnvelope {
    const record = this.#requireActive(draftId);
    this.#assertExactRevision(record, expectedRevision);
    const route = MissionFormationEffectiveRouteSchema.parse(routeValue);
    if (route.requested !== "qwen_assisted") {
      throw new TypeError("structured mission drafts do not require setup risk review");
    }
    const expectedState =
      route.effective === "qwen_assisted" ? "ready_for_compilation" : "review_in_progress";
    if (record.state !== expectedState) {
      throw new TypeError("mission draft is not ready for setup risk review");
    }
    const permissions = requireCompletePermissions(record.draft);
    if (!isPermissionSubset(permissions, this.#maximumPermissions)) {
      throw new TypeError("mission draft exceeds the deterministic authority ceiling");
    }
    const payload = {
      schemaVersion: 1,
      draftId: record.draftId,
      revision: record.revision,
      modelPolicyId: this.#modelPolicy.policyId,
      modelPolicyVersion: this.#modelPolicy.version,
      expiresAt: record.expiresAt,
      route,
      deterministicFloor: "confirm" as const,
      objective: record.draft.objective,
      constraints: record.draft.constraints,
      permissions,
      riskSignals: setupRiskSignals(permissions),
      containsCredentials: false as const,
    };
    const request = MissionSetupRiskEnvelopeSchema.parse({
      ...payload,
      requestDigest: canonicalDigest("mission_formation.setup_risk", 1, payload),
    });
    record.setupRiskRequest = request;
    record.state = "setup_risk_in_progress";
    return clone(request);
  }

  completeSetupRiskReview(
    draftId: string,
    expectedRevision: number,
    requestDigest: string,
    value: unknown,
  ) {
    const record = this.#requireActive(draftId);
    this.#assertExactRevision(record, expectedRevision);
    if (record.state !== "setup_risk_in_progress" || record.setupRiskRequest === undefined) {
      throw new TypeError("mission setup risk review is not in progress");
    }
    if (record.setupRiskRequest.requestDigest !== requestDigest) {
      throw new TypeError("mission setup risk digest mismatch");
    }
    const evaluation = MissionSetupRiskEvaluationSchema.parse(value);
    const result =
      evaluation.status === "unavailable"
        ? MissionSetupRiskResultSchema.parse({
            status: "unavailable",
            authorizationFloor: "deny",
            requestDigest,
          })
        : MissionSetupRiskResultSchema.parse({
            status:
              evaluation.certainty === "uncertain"
                ? "uncertain"
                : AUTHORIZATION_RANK[evaluation.authorizationLevel] >
                    AUTHORIZATION_RANK[record.setupRiskRequest.deterministicFloor]
                  ? "escalated"
                  : "preserved",
            authorizationFloor:
              AUTHORIZATION_RANK[evaluation.authorizationLevel] >=
              AUTHORIZATION_RANK[record.setupRiskRequest.deterministicFloor]
                ? evaluation.authorizationLevel
                : record.setupRiskRequest.deterministicFloor,
            requestDigest,
            providerRequestId: evaluation.providerRequestId,
          });
    record.setupRiskResult = result;
    record.state = "setup_risk_complete";
    return clone(result);
  }

  compileCandidate(input: CompileMissionCandidateInput): CompiledMissionCandidate {
    const record = this.#requireActive(input.draftId);
    this.#assertExactRevision(record, input.expectedRevision);
    const route = MissionFormationEffectiveRouteSchema.parse(input.route);
    if (route.requested !== record.draft.requestedRoute) {
      throw new TypeError("effective route does not match the requested route");
    }
    if (route.effective === "qwen_assisted" && record.state !== "setup_risk_complete") {
      throw new TypeError("Qwen-assisted mission draft has not passed setup risk review");
    }
    if (route.effective === "deterministic_fallback" && record.state !== "setup_risk_complete") {
      throw new TypeError("fallback requires a completed setup risk review");
    }
    if (route.effective === "structured" && record.state !== "awaiting_review") {
      throw new TypeError("structured mission draft is not ready for compilation");
    }
    const missing = mechanicallyMissingMissionFields(record.draft);
    if (missing.length > 0) throw new TypeError("mission draft is incomplete");

    const permissions = requireCompletePermissions(record.draft);
    if (!isPermissionSubset(permissions, this.#maximumPermissions)) {
      throw new TypeError("mission draft exceeds the deterministic authority ceiling");
    }
    const setupRisk = MissionSetupRiskResultSchema.parse(input.setupRisk);
    if (route.requested === "qwen_assisted") {
      if (
        record.setupRiskRequest?.route.effective !== route.effective ||
        record.setupRiskResult === undefined ||
        canonicalJson(record.setupRiskResult) !== canonicalJson(setupRisk)
      ) {
        throw new TypeError("mission setup risk result is not bound to this candidate");
      }
    } else if (setupRisk.status !== "not_required") {
      throw new TypeError("structured mission draft cannot attach model setup risk");
    }
    const digestPayload = {
      schemaVersion: 1,
      draftId: record.draftId,
      revision: record.revision,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      policyVersion: this.#policyVersion,
      modelPolicyId: this.#modelPolicy.policyId,
      modelPolicyVersion: this.#modelPolicy.version,
      route,
      objective: record.draft.objective,
      constraints: record.draft.constraints,
      permissions,
      setupRisk,
    };
    const candidate = CompiledMissionCandidateSchema.parse({
      ...digestPayload,
      state: "awaiting_confirmation",
      previewDigest: canonicalDigest("mission_formation.preview", 1, digestPayload),
    });
    record.candidate = candidate;
    record.state = "awaiting_confirmation";
    return clone(candidate);
  }

  consumeConfirmedCandidate(
    draftId: string,
    expectedRevision: number,
    previewDigest: string,
  ): CompiledMissionCandidate {
    const record = this.#requireActive(draftId);
    this.#assertExactRevision(record, expectedRevision);
    if (record.state !== "awaiting_confirmation" || record.candidate === undefined) {
      throw new TypeError("mission candidate is not awaiting confirmation");
    }
    if (record.candidate.previewDigest !== previewDigest) {
      throw new TypeError("mission confirmation digest does not match");
    }
    record.state = "consumed";
    return clone(record.candidate);
  }

  #requireActive(draftId: string): FormationRecord {
    const record = this.#records.get(draftId);
    if (record === undefined) throw new TypeError("mission draft is unavailable");
    if (record.state === "consumed") throw new TypeError("mission draft was already consumed");
    if (this.#now().getTime() >= Date.parse(record.expiresAt)) {
      throw new TypeError("mission draft expired");
    }
    return record;
  }

  #assertExactRevision(record: FormationRecord, expectedRevision: number): void {
    if (record.revision !== expectedRevision)
      throw new TypeError("mission draft revision mismatch");
  }

  #snapshot(record: FormationRecord): MissionFormationDraftSnapshot {
    if (
      record.state !== "awaiting_review" &&
      record.state !== "review_in_progress" &&
      record.state !== "needs_clarification"
    ) {
      throw new TypeError("mission draft state cannot be represented as a draft snapshot");
    }
    return MissionFormationDraftSnapshotSchema.parse({
      schemaVersion: 1,
      draftId: record.draftId,
      revision: record.revision,
      state: record.state,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      modelPolicyId: this.#modelPolicy.policyId,
      modelPolicyVersion: this.#modelPolicy.version,
      draft: record.draft,
      mechanicallyMissingFields: mechanicallyMissingMissionFields(record.draft),
    });
  }
}
