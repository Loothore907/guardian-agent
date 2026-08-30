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
