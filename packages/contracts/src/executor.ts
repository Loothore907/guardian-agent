import { z } from "zod";

import { TimestampSchema, type DeepReadonly } from "./common.js";

export const IsolationProbeResultSchema = z.strictObject({
  runtimeProfile: z.literal("windows_wsl2_ubuntu_22_04_namespace_v1"),
  observedAt: TimestampSchema,
  checks: z.strictObject({
    localCommandSucceeded: z.boolean(),
    directPublicEgressBlocked: z.boolean(),
    directGitPushBlocked: z.boolean(),
    hostFilesystemHidden: z.boolean(),
    providerCredentialsAbsent: z.boolean(),
    runtimeIdentityReduced: z.boolean(),
  }),
});
export type IsolationProbeResult = DeepReadonly<z.infer<typeof IsolationProbeResultSchema>>;

export const LocalCommandResultSchema = z.strictObject({
  exitCode: z.number().int().min(0).max(255),
  stdout: z.string().max(32_768),
  stderr: z.string().max(8_192),
  timedOut: z.boolean(),
  truncated: z.boolean(),
});
export type LocalCommandResult = DeepReadonly<z.infer<typeof LocalCommandResultSchema>>;
