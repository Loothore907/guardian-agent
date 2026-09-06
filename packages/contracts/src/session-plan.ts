import { z } from "zod";
import { CanonicalRequestSchema } from "./authorization.js";
import {
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
  type DeepReadonly,
} from "./common.js";

const Name = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/u);
export const SessionPlanTargetSchema = z.strictObject({
  operation: z.enum(["github.pull_request.read", "github.pull_request.merge"]),
  connectionId: OpaqueIdSchema,
  owner: Name,
  repository: Name,
  pullRequest: z.number().int().min(1).max(2_147_483_647),
  headCommit: z.string().regex(/^[a-f0-9]{40}$/u),
  baseBranch: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_./-]+$/u),
});

export const SessionPlanSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    profileId: OpaqueIdSchema,
    profileVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    version: VersionNumberSchema,
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    maxActions: z.number().int().min(1).max(10_000),
    maxMutations: z.number().int().min(0).max(100),
    // Failed/uncertain mutations are never automatically retried under this grant.
    mutationRetries: z.literal(0),
    targets: z.array(SessionPlanTargetSchema).min(1).max(16),
  })
  .superRefine((plan, ctx) => {
    const duration = Date.parse(plan.expiresAt) - Date.parse(plan.startsAt);
    if (duration <= 0 || duration > 86_400_000 || plan.maxMutations > plan.maxActions)
      ctx.addIssue({ code: "custom", message: "invalid plan limits" });
    const keys = plan.targets.map((t) => JSON.stringify(t));
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: "custom", message: "duplicate plan target" });
    if (
      plan.targets.some((t) => t.operation === "github.pull_request.merge") &&
      plan.maxMutations === 0
    )
      ctx.addIssue({ code: "custom", message: "merge requires an explicit mutation allowance" });
  });
export type SessionPlan = DeepReadonly<z.infer<typeof SessionPlanSchema>>;

export const DeploymentAuthorizationSchema = z
  .strictObject({
    authorizationId: OpaqueIdSchema,
    deploymentId: OpaqueIdSchema,
    principalId: OpaqueIdSchema,
    authorizedAt: TimestampSchema,
    expiresAt: TimestampSchema,
    objectiveDigest: Sha256DigestSchema,
    permissionsDigest: Sha256DigestSchema,
    sessionPlanIntentDigest: Sha256DigestSchema,
    workspaceSnapshotDigest: Sha256DigestSchema,
    workerProfileDigest: Sha256DigestSchema.optional(),
  })
  .refine(
    (a) => Date.parse(a.expiresAt) > Date.parse(a.authorizedAt),
    "invalid deployment authorization window",
  );
export type DeploymentAuthorization = DeepReadonly<z.infer<typeof DeploymentAuthorizationSchema>>;

export const SessionPlanGrantSchema = z
  .strictObject({
    grantId: OpaqueIdSchema,
    plan: SessionPlanSchema,
    planDigest: Sha256DigestSchema,
    confirmedBy: OpaqueIdSchema,
    confirmedAt: TimestampSchema,
    assurance: z.enum(["development_confirmation", "deployment_authorization"]),
    deploymentAuthorization: DeploymentAuthorizationSchema.optional(),
  })
  .superRefine((grant, ctx) => {
    if (
      (grant.assurance === "deployment_authorization") !==
        (grant.deploymentAuthorization !== undefined) ||
      (grant.deploymentAuthorization !== undefined &&
        (grant.confirmedBy !== grant.deploymentAuthorization.principalId ||
          grant.confirmedAt !== grant.deploymentAuthorization.authorizedAt ||
          Date.parse(grant.plan.expiresAt) > Date.parse(grant.deploymentAuthorization.expiresAt)))
    )
      ctx.addIssue({ code: "custom", message: "grant deployment authorization mismatch" });
  });
export type SessionPlanGrant = DeepReadonly<z.infer<typeof SessionPlanGrantSchema>>;

export const SessionPlanStateSchema = z.strictObject({
  grant: SessionPlanGrantSchema,
  revoked: z.boolean(),
  usedActions: z.number().int().min(0),
  usedMutations: z.number().int().min(0),
});
export type SessionPlanState = DeepReadonly<z.infer<typeof SessionPlanStateSchema>>;
export const PlanBlockReasonSchema = z.enum([
  "out_of_plan",
  "expired",
  "revoked",
  "exhausted",
  "replayed",
  "binding_mismatch",
  "resource_changed",
  "guardian_step_up",
  "guardian_denied",
  "guardian_unavailable",
  "guardian_confirmation_required",
]);
export const PlanCheckResultSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("absent") }),
  z.strictObject({
    status: z.literal("allowed"),
    grantId: OpaqueIdSchema,
    planDigest: Sha256DigestSchema,
    baseBranch: z.string().min(1).max(100),
  }),
  z.strictObject({ status: z.literal("blocked"), reason: PlanBlockReasonSchema }),
]);
export type PlanCheckResult = DeepReadonly<z.infer<typeof PlanCheckResultSchema>>;
export const PlanCheckRequestSchema = z.strictObject({
  request: CanonicalRequestSchema,
  requestDigest: Sha256DigestSchema,
  phase: z.enum(["inspect", "consume", "defer"]),
  blockReason: PlanBlockReasonSchema.optional(),
  expectedGrantId: OpaqueIdSchema.optional(),
  observedBaseBranch: z.string().min(1).max(100).optional(),
});
export const PendingPlanRequestSchema = z.strictObject({
  request: CanonicalRequestSchema,
  requestDigest: Sha256DigestSchema,
  reason: PlanBlockReasonSchema,
  firstSeenAt: TimestampSchema,
});
export type PendingPlanRequest = DeepReadonly<z.infer<typeof PendingPlanRequestSchema>>;

/** Trusted launch configuration, bound into the human-visible preview digest. */
export const SessionPlanIntentSchema = z
  .strictObject({
    maxActions: z.number().int().min(1).max(10_000),
    maxMutations: z.number().int().min(0).max(100),
    mutationRetries: z.literal(0),
    targets: z.array(SessionPlanTargetSchema).min(1).max(16),
  })
  .superRefine((intent, ctx) => {
    if (
      intent.maxMutations > intent.maxActions ||
      (intent.maxMutations === 0 &&
        intent.targets.some((t) => t.operation === "github.pull_request.merge")) ||
      new Set(intent.targets.map((t) => JSON.stringify(t))).size !== intent.targets.length
    )
      ctx.addIssue({ code: "custom", message: "invalid plan intent limits or targets" });
  });
export type SessionPlanIntent = DeepReadonly<z.infer<typeof SessionPlanIntentSchema>>;

export const HeadlessJudgeDeploymentSchema = z.strictObject({
  authorization: DeploymentAuthorizationSchema,
  objective: z.string().min(1).max(1_000),
  sessionPlan: SessionPlanIntentSchema,
  projectRoot: z.string().min(1).max(4096),
  stateRoot: z.string().min(1).max(4096),
});
