import { z } from "zod";

import {
  boundedCredentialSafeText,
  ContractVersionSchema,
  type DeepReadonly,
  Sha256DigestSchema,
} from "./common.js";

export const SessionWorkspaceLimitsSchema = z
  .strictObject({
    maxFiles: z.number().int().min(1).max(20_000),
    maxBytes: z
      .number()
      .int()
      .min(1)
      .max(512 * 1_024 * 1_024),
    maxFileBytes: z
      .number()
      .int()
      .min(1)
      .max(64 * 1_024 * 1_024),
  })
  .superRefine((limits, context) => {
    if (limits.maxFileBytes > limits.maxBytes) {
      context.addIssue({
        code: "custom",
        message: "workspace per-file limit cannot exceed the total-byte limit",
        path: ["maxFileBytes"],
      });
    }
  });
export type SessionWorkspaceLimits = DeepReadonly<z.infer<typeof SessionWorkspaceLimitsSchema>>;

export const SessionWorkspaceSelectionSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  kind: z.literal("guardian_managed_copy"),
  projectName: boundedCredentialSafeText(120),
  sourceRootDigest: Sha256DigestSchema,
  sourceSnapshotDigest: Sha256DigestSchema,
  mountPath: z.literal("/workspace"),
  persistence: z.literal("session"),
  cleanup: z.literal("delete_on_close"),
  hostWriteback: z.literal("none"),
  limits: SessionWorkspaceLimitsSchema,
});
export type SessionWorkspaceSelection = DeepReadonly<
  z.infer<typeof SessionWorkspaceSelectionSchema>
>;

export const SessionWorkspaceResultSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    state: z.literal("ready"),
    selection: SessionWorkspaceSelectionSchema,
    fileCount: z.number().int().min(0).max(20_000),
    totalBytes: z
      .number()
      .int()
      .min(0)
      .max(512 * 1_024 * 1_024),
    baseline: z.literal("sanitized_git_repository"),
  })
  .superRefine((result, context) => {
    if (result.fileCount > result.selection.limits.maxFiles) {
      context.addIssue({
        code: "custom",
        message: "workspace result exceeds the confirmed file-count limit",
        path: ["fileCount"],
      });
    }
    if (result.totalBytes > result.selection.limits.maxBytes) {
      context.addIssue({
        code: "custom",
        message: "workspace result exceeds the confirmed total-byte limit",
        path: ["totalBytes"],
      });
    }
  });
export type SessionWorkspaceResult = DeepReadonly<z.infer<typeof SessionWorkspaceResultSchema>>;
