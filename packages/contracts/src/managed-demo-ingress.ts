import { z } from "zod";

import { boundedCredentialSafeText, ContractVersionSchema, type DeepReadonly } from "./common.js";

export const ManagedDemoJudgeJourneyRequestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  objective: boundedCredentialSafeText(1_000),
});
export type ManagedDemoJudgeJourneyRequest = DeepReadonly<
  z.infer<typeof ManagedDemoJudgeJourneyRequestSchema>
>;

export const ManagedDemoJudgeJourneyPublicResultSchema = z.discriminatedUnion("state", [
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    state: z.literal("completed"),
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    state: z.literal("denied"),
    code: z.literal("capacity_unavailable"),
  }),
  z.strictObject({
    schemaVersion: ContractVersionSchema,
    state: z.literal("stopped"),
    code: z.enum(["unauthorized", "invalid_request", "journey_failed", "service_unavailable"]),
  }),
]);
export type ManagedDemoJudgeJourneyPublicResult = DeepReadonly<
  z.infer<typeof ManagedDemoJudgeJourneyPublicResultSchema>
>;
