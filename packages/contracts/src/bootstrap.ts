import { SessionPlanIntentSchema } from "./session-plan.js";
import { z } from "zod";

import { AssuranceLevelSchema } from "./assurance.js";
import {
  addDuplicateIssue,
  boundedCredentialSafeText,
  boundedVisibleText,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
} from "./common.js";
import { PermissionEnvelopeSchema, ToolCapabilitySchema } from "./mission.js";
import { InteractionRunnerStateSchema } from "./interaction-ipc.js";
import { SessionWorkerSelectionSchema, WorkerTurnBoundaryStateSchema } from "./worker.js";
import { SessionWorkspaceResultSchema, SessionWorkspaceSelectionSchema } from "./workspace.js";

export const SessionObjectiveSchema = boundedCredentialSafeText(1_000);

export const SessionDraftInputSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  objective: SessionObjectiveSchema,
});
export type SessionDraftInput = DeepReadonly<z.infer<typeof SessionDraftInputSchema>>;

export const SessionIntegrationAssessmentSchema = z
  .strictObject({
    mode: z.enum(["guardian_launched_reference", "tool_only_unrestricted"]),
    maximumAssurance: AssuranceLevelSchema,
  })
  .superRefine((assessment, context) => {
    if (
      assessment.mode === "guardian_launched_reference" &&
      assessment.maximumAssurance !== "enforced"
    ) {
      context.addIssue({
        code: "custom",
        message: "the reference launcher assessment must permit Enforced evidence",
        path: ["maximumAssurance"],
      });
    }
    if (
      assessment.mode === "tool_only_unrestricted" &&
      assessment.maximumAssurance === "enforced"
    ) {
      context.addIssue({
        code: "custom",
        message: "an unrestricted tool-only integration cannot be Enforced",
        path: ["maximumAssurance"],
      });
    }
  });
export type SessionIntegrationAssessment = DeepReadonly<
  z.infer<typeof SessionIntegrationAssessmentSchema>
>;

export const SessionDraftPreviewSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    draftId: OpaqueIdSchema,
    previewDigest: Sha256DigestSchema,
    sessionPlan: SessionPlanIntentSchema.optional(),
    workerMaxTurns: z.number().int().min(2).max(20).optional(),
    state: z.literal("awaiting_confirmation"),
    createdAt: TimestampSchema,
    expiresAt: TimestampSchema,
    objective: boundedVisibleText(1_000),
    constraints: z.array(boundedVisibleText(500)).min(1).max(32),
    permissions: PermissionEnvelopeSchema,
    workerTools: z.array(ToolCapabilitySchema).max(16),
    integration: SessionIntegrationAssessmentSchema,
    worker: SessionWorkerSelectionSchema,
    workspace: SessionWorkspaceSelectionSchema,
  })
  .superRefine((preview, context) => {
    const plan = preview.sessionPlan;
    if (
      plan !== undefined &&
      (plan.maxActions > preview.permissions.volume.maxToolCalls ||
        plan.maxMutations > preview.permissions.volume.maxPrivilegedActions ||
        plan.targets.some(
          (t) =>
            !preview.permissions.tools.includes(t.operation) ||
            !preview.permissions.network.destinations.some(
              (d) =>
                d.kind === "github_repository" &&
                d.owner === t.owner &&
                d.repository === t.repository,
            ) ||
            (t.operation === "github.pull_request.merge" &&
              !preview.permissions.sideEffects.includes("merge_pull_request")),
        ))
    ) {
      context.addIssue({ code: "custom", message: "session plan exceeds mission permissions" });
    }
    addDuplicateIssue(preview.workerTools, context, ["workerTools"]);
    preview.workerTools.forEach((tool, index) => {
      if (!preview.permissions.tools.includes(tool)) {
        context.addIssue({
          code: "custom",
          message: "worker tool catalog must remain within the confirmed mission permissions",
          path: ["workerTools", index],
        });
      }
    });
  });
export type SessionDraftPreview = DeepReadonly<z.infer<typeof SessionDraftPreviewSchema>>;

const LaunchConfirmationShape = {
  schemaVersion: ContractVersionSchema,
  draftId: OpaqueIdSchema,
  previewDigest: Sha256DigestSchema,
  confirmedBy: z.strictObject({ kind: z.literal("human"), principalId: OpaqueIdSchema }),
  confirmedAt: TimestampSchema,
};
export const DevelopmentSessionConfirmationSchema = z.strictObject({
  ...LaunchConfirmationShape,
  assurance: z.literal("development_confirmation"),
});
export const DeploymentSessionConfirmationSchema = z.strictObject({
  ...LaunchConfirmationShape,
  assurance: z.literal("deployment_authorization"),
  authorizationId: OpaqueIdSchema,
  journeyId: OpaqueIdSchema,
});
export const SessionLaunchConfirmationSchema = z.union([
  DevelopmentSessionConfirmationSchema,
  DeploymentSessionConfirmationSchema,
]);
export type SessionLaunchConfirmation = DeepReadonly<
  z.infer<typeof SessionLaunchConfirmationSchema>
>;
export type DevelopmentSessionConfirmation = DeepReadonly<
  z.infer<typeof DevelopmentSessionConfirmationSchema>
>;

export const SessionBootstrapResultSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    draftId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    missionId: OpaqueIdSchema,
    missionVersion: z.literal(1),
    profileId: OpaqueIdSchema,
    profileVersion: z.literal(1),
    policyVersion: z.number().int().positive(),
    state: z.enum(["active", "expired", "revoked", "interrupted"]),
    assurance: AssuranceLevelSchema,
    expiresAt: TimestampSchema,
    tools: z.array(ToolCapabilitySchema).max(16),
    workerTools: z.array(ToolCapabilitySchema).max(16),
    confirmationAssurance: z.enum(["development_confirmation", "deployment_authorization"]),
    sessionPlanGrantId: OpaqueIdSchema.optional(),
    worker: SessionWorkerSelectionSchema,
    workspace: SessionWorkspaceResultSchema,
    runner: InteractionRunnerStateSchema,
    workerTurn: WorkerTurnBoundaryStateSchema,
  })
  .superRefine((result, context) => {
    addDuplicateIssue(result.tools, context, ["tools"]);
    addDuplicateIssue(result.workerTools, context, ["workerTools"]);
    result.workerTools.forEach((tool, index) => {
      if (!result.tools.includes(tool)) {
        context.addIssue({
          code: "custom",
          message: "worker tool catalog must remain within the active session tools",
          path: ["workerTools", index],
        });
      }
    });
  });
export type SessionBootstrapResult = DeepReadonly<z.infer<typeof SessionBootstrapResultSchema>>;
