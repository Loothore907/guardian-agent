import { z } from "zod";

import { AssuranceLevelSchema } from "./assurance.js";
import {
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

export const SessionDraftPreviewSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  draftId: OpaqueIdSchema,
  previewDigest: Sha256DigestSchema,
  state: z.literal("awaiting_confirmation"),
  createdAt: TimestampSchema,
  expiresAt: TimestampSchema,
  objective: boundedVisibleText(1_000),
  constraints: z.array(boundedVisibleText(500)).min(1).max(32),
  permissions: PermissionEnvelopeSchema,
  integration: SessionIntegrationAssessmentSchema,
  worker: SessionWorkerSelectionSchema,
  workspace: SessionWorkspaceSelectionSchema,
});
export type SessionDraftPreview = DeepReadonly<z.infer<typeof SessionDraftPreviewSchema>>;

export const DevelopmentSessionConfirmationSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  draftId: OpaqueIdSchema,
  previewDigest: Sha256DigestSchema,
  confirmedBy: z.strictObject({ kind: z.literal("human"), principalId: OpaqueIdSchema }),
  confirmedAt: TimestampSchema,
  assurance: z.literal("development_confirmation"),
});
export type DevelopmentSessionConfirmation = DeepReadonly<
  z.infer<typeof DevelopmentSessionConfirmationSchema>
>;

export const SessionBootstrapResultSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  draftId: OpaqueIdSchema,
  sessionId: OpaqueIdSchema,
  missionId: OpaqueIdSchema,
  missionVersion: z.literal(1),
  profileId: OpaqueIdSchema,
  profileVersion: z.literal(1),
  state: z.enum(["active", "expired", "revoked", "interrupted"]),
  assurance: AssuranceLevelSchema,
  expiresAt: TimestampSchema,
  tools: z.array(ToolCapabilitySchema).max(16),
  confirmationAssurance: z.literal("development_confirmation"),
  worker: SessionWorkerSelectionSchema,
  workspace: SessionWorkspaceResultSchema,
  runner: InteractionRunnerStateSchema,
  workerTurn: WorkerTurnBoundaryStateSchema,
});
export type SessionBootstrapResult = DeepReadonly<z.infer<typeof SessionBootstrapResultSchema>>;
