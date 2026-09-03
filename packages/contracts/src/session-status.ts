import { z } from "zod";

import { AssuranceLevelSchema } from "./assurance.js";
import { ToolCapabilitySchema } from "./mission.js";

export const SessionIdSchema = z.string().uuid();
export type SessionId = z.infer<typeof SessionIdSchema>;

export const FoundationSessionStatusSchema = z.strictObject({
  status: z.literal("foundation"),
  assurance: AssuranceLevelSchema,
});

export const BoundSessionStatusSchema = z.strictObject({
  sessionId: SessionIdSchema,
  missionId: z.uuid(),
  missionVersion: z.number().int().positive(),
  profileId: z.uuid(),
  profileVersion: z.number().int().positive(),
  policyVersion: z.number().int().positive(),
  callerId: z.uuid(),
  state: z.enum(["pending", "active", "expired", "revoked", "interrupted"]),
  assurance: AssuranceLevelSchema,
  expiresAt: z.iso.datetime({ offset: false, precision: 3 }),
  tools: z.array(ToolCapabilitySchema),
});
export type BoundSessionStatus = z.infer<typeof BoundSessionStatusSchema>;

export const SessionStatusSchema = z.union([
  FoundationSessionStatusSchema,
  BoundSessionStatusSchema,
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
