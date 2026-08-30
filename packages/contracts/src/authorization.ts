import { z } from "zod";

import { ActionProposalSchema, ResourceVersionSchema } from "./actions.js";
import {
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";

export const CanonicalRequestSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    requestId: OpaqueIdSchema,
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    connectionId: OpaqueIdSchema.nullable(),
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    profileId: OpaqueIdSchema,
    profileVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    proposal: ActionProposalSchema,
    resourceVersion: ResourceVersionSchema.nullable(),
  })
  .superRefine((request, context) => {
    const bindingFields = [
      ["sessionId", request.sessionId, request.proposal.sessionId],
      ["callerId", request.callerId, request.proposal.callerId],
      ["missionId", request.missionId, request.proposal.missionId],
      ["missionVersion", request.missionVersion, request.proposal.missionVersion],
      ["profileId", request.profileId, request.proposal.profileId],
      ["profileVersion", request.profileVersion, request.proposal.profileVersion],
    ] as const;
    for (const [field, requestValue, proposalValue] of bindingFields) {
      if (requestValue !== proposalValue) {
        context.addIssue({
          code: "custom",
          message: `${field} must match the proposal`,
          path: [field],
        });
      }
    }

    if (
      JSON.stringify(request.resourceVersion) !== JSON.stringify(request.proposal.resourceVersion)
    ) {
      context.addIssue({
        code: "custom",
        message: "resourceVersion must match the proposal",
        path: ["resourceVersion"],
      });
    }
    const authenticated = request.proposal.operation.startsWith("github.");
    if (authenticated !== (request.connectionId !== null)) {
      context.addIssue({
        code: "custom",
        message: "connection binding does not match the operation",
        path: ["connectionId"],
      });
    }
  });
export type CanonicalRequest = DeepReadonly<z.infer<typeof CanonicalRequestSchema>>;

export const ExactApprovalSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    approvalId: OpaqueIdSchema,
    requestId: OpaqueIdSchema,
    requestDigest: Sha256DigestSchema,
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    connectionId: OpaqueIdSchema,
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    profileId: OpaqueIdSchema,
    profileVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    resourceVersion: ResourceVersionSchema,
    scopeDigest: Sha256DigestSchema,
    nonce: OpaqueIdSchema,
    maxUses: z.literal(1),
    approvedBy: z.strictObject({ kind: z.literal("human"), principalId: OpaqueIdSchema }),
    approvedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .superRefine((approval, context) => {
    if (Date.parse(approval.expiresAt) <= Date.parse(approval.approvedAt)) {
      context.addIssue({
        code: "custom",
        message: "approval must expire after it is created",
        path: ["expiresAt"],
      });
    }
  });
export type ExactApproval = DeepReadonly<z.infer<typeof ExactApprovalSchema>>;
