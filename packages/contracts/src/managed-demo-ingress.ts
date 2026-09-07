import { z } from "zod";

import { boundedCredentialSafeText, ContractVersionSchema, type DeepReadonly } from "./common.js";
import { CredentialLocationSchema, SecretStashSecretIdSchema } from "./credentials.js";

export const ManagedDemoJudgeIngressSecretSlotSchema = z.enum([
  "access_credential_sha256",
  "source_fingerprint_key",
]);
export type ManagedDemoJudgeIngressSecretSlot = z.infer<
  typeof ManagedDemoJudgeIngressSecretSlotSchema
>;

export const ManagedDemoJudgeIngressSecretPayloadKeySchema = z.enum([
  "judge_access_credential_sha256",
  "judge_source_fingerprint_key",
]);
export type ManagedDemoJudgeIngressSecretPayloadKey = z.infer<
  typeof ManagedDemoJudgeIngressSecretPayloadKeySchema
>;

const expectedPayloadKey: Readonly<
  Record<ManagedDemoJudgeIngressSecretSlot, ManagedDemoJudgeIngressSecretPayloadKey>
> = {
  access_credential_sha256: "judge_access_credential_sha256",
  source_fingerprint_key: "judge_source_fingerprint_key",
};

export const ManagedDemoJudgeIngressSecretResourceSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    location: CredentialLocationSchema,
    slot: ManagedDemoJudgeIngressSecretSlotSchema,
    secretId: SecretStashSecretIdSchema,
    payloadKey: ManagedDemoJudgeIngressSecretPayloadKeySchema,
  })
  .superRefine((resource, context) => {
    if (
      resource.location.custodyProfile !== "managed_demo" ||
      resource.location.pool !== "judge" ||
      resource.location.runtime !== "linux" ||
      resource.location.storeTarget !== "nebius_secretstash"
    ) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "judge ingress secrets require the managed Linux judge pool",
      });
    }
    if (resource.payloadKey !== expectedPayloadKey[resource.slot]) {
      context.addIssue({
        code: "custom",
        path: ["payloadKey"],
        message: "judge ingress secret payload key does not match its fixed slot",
      });
    }
  });
export type ManagedDemoJudgeIngressSecretResource = DeepReadonly<
  z.infer<typeof ManagedDemoJudgeIngressSecretResourceSchema>
>;

export const ManagedDemoJudgeIngressSecretStoreConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    custodyProfile: z.literal("managed_demo"),
    pool: z.literal("judge"),
    resources: z.array(ManagedDemoJudgeIngressSecretResourceSchema).length(2),
  })
  .superRefine((config, context) => {
    for (const slot of ManagedDemoJudgeIngressSecretSlotSchema.options) {
      if (config.resources.filter((resource) => resource.slot === slot).length !== 1) {
        context.addIssue({
          code: "custom",
          path: ["resources"],
          message: `judge ingress secret slot ${slot} must appear exactly once`,
        });
      }
    }
    if (new Set(config.resources.map((resource) => resource.secretId)).size !== 2) {
      context.addIssue({
        code: "custom",
        path: ["resources"],
        message: "judge ingress secrets require two distinct SecretStash resources",
      });
    }
  });
export type ManagedDemoJudgeIngressSecretStoreConfig = DeepReadonly<
  z.infer<typeof ManagedDemoJudgeIngressSecretStoreConfigSchema>
>;

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
