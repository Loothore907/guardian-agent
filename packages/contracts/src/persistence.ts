import { z } from "zod";

import {
  ContractVersionSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
  type DeepReadonly,
} from "./common.js";

export const DurableSessionStatusSchema = z.enum(["active", "interrupted", "revoked", "expired"]);
export type DurableSessionStatus = z.infer<typeof DurableSessionStatusSchema>;

export const DurableSessionRecordSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    sessionId: OpaqueIdSchema,
    callerId: OpaqueIdSchema,
    missionId: OpaqueIdSchema,
    missionVersion: VersionNumberSchema,
    profileId: OpaqueIdSchema,
    profileVersion: VersionNumberSchema,
    policyVersion: VersionNumberSchema,
    startsAt: TimestampSchema,
    expiresAt: TimestampSchema,
    status: DurableSessionStatusSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .superRefine((session, context) => {
    if (Date.parse(session.expiresAt) <= Date.parse(session.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "durable session expiry must follow its start",
        path: ["expiresAt"],
      });
    }
    if (Date.parse(session.updatedAt) < Date.parse(session.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "durable session update cannot precede creation",
        path: ["updatedAt"],
      });
    }
  });
export type DurableSessionRecord = DeepReadonly<z.infer<typeof DurableSessionRecordSchema>>;

const RemainingCountSchema = z.number().int().min(0).max(10_000);

export const DurableSessionBudgetSchema = z.strictObject({
  sessionId: OpaqueIdSchema,
  remainingToolCalls: RemainingCountSchema,
  remainingLocalCommands: RemainingCountSchema,
  remainingResearchRequests: RemainingCountSchema,
  remainingResearchResults: RemainingCountSchema,
});
export type DurableSessionBudget = DeepReadonly<z.infer<typeof DurableSessionBudgetSchema>>;

export const ApprovalConsumptionRequestSchema = z.strictObject({
  approvalId: OpaqueIdSchema,
  nonce: OpaqueIdSchema,
  requestDigest: Sha256DigestSchema,
  sessionId: OpaqueIdSchema,
  callerId: OpaqueIdSchema,
  connectionId: OpaqueIdSchema,
  policyVersion: VersionNumberSchema,
});
export type ApprovalConsumptionRequest = DeepReadonly<
  z.infer<typeof ApprovalConsumptionRequestSchema>
>;
