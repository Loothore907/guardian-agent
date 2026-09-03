import { z } from "zod";

export const CredentialProviderSchema = z.enum(["nebius", "tavily", "github"]);
export type CredentialProvider = z.infer<typeof CredentialProviderSchema>;

export const CredentialReferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  provider: CredentialProviderSchema,
  slot: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/u),
});
export type CredentialReference = z.infer<typeof CredentialReferenceSchema>;

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
