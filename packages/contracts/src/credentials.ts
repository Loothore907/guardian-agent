import { z } from "zod";

export const CredentialProviderSchema = z.enum(["nebius", "tavily", "github"]);
export type CredentialProvider = z.infer<typeof CredentialProviderSchema>;

export const CredentialCustodyProfileSchema = z.enum(["managed_demo", "byok"]);
export type CredentialCustodyProfile = z.infer<typeof CredentialCustodyProfileSchema>;

export const CredentialPoolSchema = z.enum(["personal", "public", "judge"]);
export type CredentialPool = z.infer<typeof CredentialPoolSchema>;

export const CredentialRuntimeSchema = z.enum(["windows", "linux", "macos"]);
export type CredentialRuntime = z.infer<typeof CredentialRuntimeSchema>;

export const CredentialStoreTargetSchema = z.enum([
  "windows_credential_manager",
  "linux_secret_service",
  "macos_keychain",
  "nebius_secretstash",
]);
export type CredentialStoreTarget = z.infer<typeof CredentialStoreTargetSchema>;

export const CredentialConsumerSchema = z.enum([
  "interaction_service",
  "guardian_service",
  "worker_service",
  "research_service",
  "broker_service",
]);
export type CredentialConsumer = z.infer<typeof CredentialConsumerSchema>;

export const CredentialMaterialKindSchema = z.enum(["secret", "credential_metadata"]);
export type CredentialMaterialKind = z.infer<typeof CredentialMaterialKindSchema>;

export const CredentialReferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  provider: CredentialProviderSchema,
  slot: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/u),
});
export type CredentialReference = z.infer<typeof CredentialReferenceSchema>;

export const RegisteredCredentialReferenceSchema = z.union([
  z.strictObject({
    schemaVersion: z.literal(1),
    provider: z.literal("nebius"),
    slot: z.literal("default"),
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    provider: z.literal("tavily"),
    slot: z.literal("default"),
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    provider: z.literal("github"),
    slot: z.literal("default"),
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    provider: z.literal("github"),
    slot: z.literal("refresh"),
  }),
  z.strictObject({
    schemaVersion: z.literal(1),
    provider: z.literal("github"),
    slot: z.literal("metadata"),
  }),
]);
export type RegisteredCredentialReference = z.infer<typeof RegisteredCredentialReferenceSchema>;

export function registeredCredentialReference(
  provider: CredentialProvider,
  slot: string,
): RegisteredCredentialReference {
  return RegisteredCredentialReferenceSchema.parse({ schemaVersion: 1, provider, slot });
}

export function credentialMaterialKind(referenceValue: unknown): CredentialMaterialKind {
  const reference = RegisteredCredentialReferenceSchema.parse(referenceValue);
  return reference.provider === "github" && reference.slot === "metadata"
    ? "credential_metadata"
    : "secret";
}

const CredentialLocationShape = z.strictObject({
  schemaVersion: z.literal(1),
  custodyProfile: CredentialCustodyProfileSchema,
  pool: CredentialPoolSchema,
  runtime: CredentialRuntimeSchema,
  storeTarget: CredentialStoreTargetSchema,
});

export const CredentialLocationSchema = CredentialLocationShape.superRefine((location, context) => {
  if (location.custodyProfile === "managed_demo") {
    if (location.pool === "personal") {
      context.addIssue({
        code: "custom",
        path: ["pool"],
        message: "managed demo credentials require a public or judge pool",
      });
    }
    if (location.runtime !== "linux") {
      context.addIssue({
        code: "custom",
        path: ["runtime"],
        message: "managed demo credentials require the Linux runtime",
      });
    }
    if (location.storeTarget !== "nebius_secretstash") {
      context.addIssue({
        code: "custom",
        path: ["storeTarget"],
        message: "managed demo credentials require SecretStash",
      });
    }
    return;
  }

  if (location.pool !== "personal") {
    context.addIssue({
      code: "custom",
      path: ["pool"],
      message: "BYOK credentials require the personal pool",
    });
  }
  const expectedStore: Record<CredentialRuntime, CredentialStoreTarget> = {
    windows: "windows_credential_manager",
    linux: "linux_secret_service",
    macos: "macos_keychain",
  };
  if (location.storeTarget !== expectedStore[location.runtime]) {
    context.addIssue({
      code: "custom",
      path: ["storeTarget"],
      message: "BYOK credential store does not match its runtime",
    });
  }
});
export type CredentialLocation = z.infer<typeof CredentialLocationSchema>;

const allowedConsumers: Readonly<Record<CredentialProvider, readonly CredentialConsumer[]>> = {
  nebius: ["interaction_service", "guardian_service", "worker_service"],
  tavily: ["research_service"],
  github: ["broker_service"],
};

export const CredentialCapabilityBindingSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    location: CredentialLocationSchema,
    reference: RegisteredCredentialReferenceSchema,
    consumer: CredentialConsumerSchema,
  })
  .superRefine((binding, context) => {
    if (!allowedConsumers[binding.reference.provider].includes(binding.consumer)) {
      context.addIssue({
        code: "custom",
        path: ["consumer"],
        message: "credential provider is not available to this consumer",
      });
    }
  });
export type CredentialCapabilityBinding = z.infer<typeof CredentialCapabilityBindingSchema>;

export const CredentialStatusSchema = z.strictObject({
  schemaVersion: z.literal(1),
  reference: CredentialReferenceSchema,
  state: z.enum(["available", "missing"]),
});
export type CredentialStatus = z.infer<typeof CredentialStatusSchema>;

export const CredentialVerificationResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  provider: CredentialProviderSchema,
  accountLabel: z
    .string()
    .min(1)
    .max(120)
    .refine((value) =>
      [...value].every((character) => {
        const codePoint = character.codePointAt(0);
        return codePoint !== undefined && codePoint >= 32 && codePoint !== 127;
      }),
    ),
});
export type CredentialVerificationResult = z.infer<typeof CredentialVerificationResultSchema>;

export const GitHubCredentialMetadataSchema = z.strictObject({
  schemaVersion: z.literal(1),
  accessExpiresAt: z.iso.datetime({ offset: false, precision: 3 }),
  refreshExpiresAt: z.iso.datetime({ offset: false, precision: 3 }),
});
export type GitHubCredentialMetadata = z.infer<typeof GitHubCredentialMetadataSchema>;
