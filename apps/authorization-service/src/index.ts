import { DeploymentAuthorizationSchema } from "@guardian/contracts";
import { SessionPlanSchema, type SessionPlanGrant } from "@guardian/contracts";
import { randomUUID } from "node:crypto";

import type {
  AuthorityControlClient,
  AuthorityPlanControlClient,
} from "@guardian/authority-client";
import {
  digestCanonicalRequest,
  digestSessionPlan,
  digestSessionPlanIntent,
} from "@guardian/authorization";
import {
  AuthorityCapabilityBindingSchema,
  CanonicalRequestSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  type AuthorityCapabilityBinding,
  type CanonicalRequest,
  type ExactApproval,
} from "@guardian/contracts";

const MAXIMUM_DEVELOPMENT_APPROVAL_SECONDS = 300;
const MAXIMUM_CONFIRMATION_AGE_MS = 30_000;

/**
 * A lower-assurance local confirmation supplied by trusted application code.
 * This is deliberately not WebAuthn evidence and must not be used to claim a
 * user-verifying or hardware-backed approval ceremony.
 */
export interface DevelopmentConfirmation {
  readonly principalId: unknown;
  readonly confirmedAt: unknown;
}

export interface IssuedDevelopmentApproval {
  readonly assurance: "development_confirmation";
  readonly approval: ExactApproval;
}

export class DevelopmentAuthorizationIssuer {
  readonly #authority: AuthorityControlClient & AuthorityPlanControlClient;
  readonly #binding: AuthorityCapabilityBinding;
  readonly #now: () => string;

  constructor(options: {
    readonly authority: AuthorityControlClient & AuthorityPlanControlClient;
    readonly binding: unknown;
    readonly now?: () => string;
  }) {
    this.#authority = options.authority;
    this.#binding = AuthorityCapabilityBindingSchema.parse(options.binding);
    if (
      this.#binding.callerRole !== "authorization_service" ||
      !this.#binding.allowedOperations.includes("approval.store")
    ) {
      throw new TypeError("authorization issuer requires approval storage authority");
    }
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async issueSessionPlan(options: {
    readonly plan: unknown;
    readonly confirmation: DevelopmentConfirmation;
  }): Promise<SessionPlanGrant> {
    const plan = SessionPlanSchema.parse(options.plan);
    const confirmedBy = OpaqueIdSchema.parse(options.confirmation.principalId);
    const confirmedAt = TimestampSchema.parse(options.confirmation.confirmedAt);
    const now = Date.parse(TimestampSchema.parse(this.#now()));
    if (
      !this.#binding.allowedOperations.includes("plan.store") ||
      plan.sessionId !== this.#binding.sessionId ||
      plan.callerId !== this.#binding.callerId ||
      Date.parse(plan.startsAt) < Date.parse(this.#binding.issuedAt) ||
      Date.parse(plan.expiresAt) > Date.parse(this.#binding.expiresAt) ||
      now < Date.parse(confirmedAt) ||
      now - Date.parse(confirmedAt) > MAXIMUM_CONFIRMATION_AGE_MS
    ) {
      throw new TypeError("plan requires fresh session-bound confirmation");
    }
    const grant: SessionPlanGrant = {
      grantId: randomUUID(),
      plan,
      planDigest: digestSessionPlan(plan),
      confirmedBy,
      confirmedAt,
      assurance: "development_confirmation",
    };
    await this.#authority.storeSessionPlan(grant);
    return grant;
  }

  async issueDeploymentSessionPlan(options: {
    readonly plan: unknown;
    readonly authorization: unknown;
  }): Promise<SessionPlanGrant> {
    const plan = SessionPlanSchema.parse(options.plan);
    const authorization = DeploymentAuthorizationSchema.parse(options.authorization);
    const now = Date.parse(TimestampSchema.parse(this.#now()));
    const intent = {
      maxActions: plan.maxActions,
      maxMutations: plan.maxMutations,
      mutationRetries: plan.mutationRetries,
      targets: plan.targets,
    };
    if (
      !this.#binding.allowedOperations.includes("plan.store") ||
      plan.sessionId !== this.#binding.sessionId ||
      plan.callerId !== this.#binding.callerId ||
      Date.parse(plan.startsAt) < Date.parse(this.#binding.issuedAt) ||
      Date.parse(plan.expiresAt) > Date.parse(this.#binding.expiresAt) ||
      now < Date.parse(authorization.authorizedAt) ||
      now >= Date.parse(authorization.expiresAt) ||
      Date.parse(plan.expiresAt) > Date.parse(authorization.expiresAt) ||
      authorization.sessionPlanIntentDigest !== digestSessionPlanIntent(intent)
    )
      throw new TypeError("deployment authorization does not cover session plan");
    const grant: SessionPlanGrant = {
      grantId: randomUUID(),
      plan,
      planDigest: digestSessionPlan(plan),
      confirmedBy: authorization.principalId,
      confirmedAt: authorization.authorizedAt,
      assurance: "deployment_authorization",
      deploymentAuthorization: authorization,
    };
    await this.#authority.storeSessionPlan(grant);
    return grant;
  }

  async getSessionPlan() {
    return await this.#authority.getSessionPlan();
  }
  async getPendingPlanRequests() {
    return await this.#authority.getPendingPlanRequests();
  }
  async revokeSessionPlan(grantId: unknown) {
    return await this.#authority.revokeSessionPlan(grantId);
  }

  async issueExactApproval(options: {
    readonly request: unknown;
    readonly scopeDigest: unknown;
    readonly confirmation: DevelopmentConfirmation;
    readonly lifetimeSeconds?: unknown;
  }): Promise<IssuedDevelopmentApproval> {
    const request: CanonicalRequest = CanonicalRequestSchema.parse(options.request);
    const scopeDigest = Sha256DigestSchema.parse(options.scopeDigest);
    const principalId = OpaqueIdSchema.parse(options.confirmation.principalId);
    const confirmedAt = TimestampSchema.parse(options.confirmation.confirmedAt);
    const evaluatedAt = TimestampSchema.parse(this.#now());
    const lifetimeSeconds = Number(options.lifetimeSeconds ?? 120);
    if (
      !Number.isInteger(lifetimeSeconds) ||
      lifetimeSeconds < 1 ||
      lifetimeSeconds > MAXIMUM_DEVELOPMENT_APPROVAL_SECONDS
    ) {
      throw new TypeError("development approval lifetime is invalid");
    }
    if (
      request.sessionId !== this.#binding.sessionId ||
      request.callerId !== this.#binding.callerId ||
      request.connectionId === null ||
      request.resourceVersion === null
    ) {
      throw new TypeError("approval request is not bound to issuer authority");
    }
    const confirmationAge = Date.parse(evaluatedAt) - Date.parse(confirmedAt);
    if (confirmationAge < 0 || confirmationAge > MAXIMUM_CONFIRMATION_AGE_MS) {
      throw new TypeError("development confirmation is not fresh");
    }

    const approval: ExactApproval = {
      schemaVersion: 1,
      approvalId: randomUUID(),
      requestId: request.requestId,
      requestDigest: digestCanonicalRequest(request),
      sessionId: request.sessionId,
      callerId: request.callerId,
      connectionId: request.connectionId,
      missionId: request.missionId,
      missionVersion: request.missionVersion,
      profileId: request.profileId,
      profileVersion: request.profileVersion,
      policyVersion: request.policyVersion,
      resourceVersion: request.resourceVersion,
      scopeDigest,
      nonce: randomUUID(),
      maxUses: 1,
      approvedBy: { kind: "human", principalId },
      approvedAt: evaluatedAt,
      expiresAt: new Date(Date.parse(evaluatedAt) + lifetimeSeconds * 1_000).toISOString(),
    };
    await this.#authority.storeApproval(approval);
    return { assurance: "development_confirmation", approval };
  }
}
