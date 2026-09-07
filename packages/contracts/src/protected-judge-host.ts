import { z } from "zod";

import {
  ContractVersionSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  type DeepReadonly,
} from "./common.js";
import { ManagedDemoCredentialStoreConfigSchema } from "./credentials.js";
import {
  ManagedDemoBudgetServiceProcessConfigSchema,
  ManagedDemoJourneyBudgetClientBundleSchema,
} from "./managed-demo-budget-ipc.js";
import { ManagedDemoJudgeIngressSecretStoreConfigSchema } from "./managed-demo-ingress.js";

const HostnameSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u)
  .refine((value) => value === value.toLowerCase() && !value.includes(".."));

const ProtectedJudgeListenSchema = z.strictObject({
  host: z.literal("127.0.0.1"),
  port: z.number().int().min(1_024).max(65_535),
});

function sameBudgetBinding(
  left: z.infer<typeof ManagedDemoBudgetServiceProcessConfigSchema>["capabilities"][number],
  right: z.infer<typeof ManagedDemoJourneyBudgetClientBundleSchema>["controller"]["binding"],
) {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.capability === right.capability &&
    left.callerRole === right.callerRole &&
    left.callerId === right.callerId &&
    left.deploymentId === right.deploymentId &&
    left.issuedAt === right.issuedAt &&
    left.expiresAt === right.expiresAt &&
    left.allowedOperations.length === right.allowedOperations.length &&
    left.allowedOperations.every((operation, index) => operation === right.allowedOperations[index])
  );
}

export const DisabledProtectedJudgeHostConfigSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  executionMode: z.literal("disabled"),
  listen: ProtectedJudgeListenSchema,
});

export const ResearchOnlyProtectedJudgeHostConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    executionMode: z.literal("research_only"),
    listen: ProtectedJudgeListenSchema,
    expectedHost: HostnameSchema,
    deploymentId: OpaqueIdSchema,
    principalId: OpaqueIdSchema,
    projectRoot: z.string().min(1).max(4_096),
    stateRoot: z.string().min(1).max(4_096),
    credentialStore: ManagedDemoCredentialStoreConfigSchema,
    ingressSecrets: ManagedDemoJudgeIngressSecretStoreConfigSchema,
    budgetService: ManagedDemoBudgetServiceProcessConfigSchema,
    budgetClients: ManagedDemoJourneyBudgetClientBundleSchema,
  })
  .superRefine((config, context) => {
    if (config.credentialStore.pool !== "judge") {
      context.addIssue({
        code: "custom",
        path: ["credentialStore", "pool"],
        message: "research judge credentials require the judge pool",
      });
    }
    const credentialSlots = config.credentialStore.resources.map(
      (resource) => `${resource.reference.provider}/${resource.reference.slot}`,
    );
    if (
      credentialSlots.length !== 2 ||
      !credentialSlots.includes("nebius/default") ||
      !credentialSlots.includes("tavily/default")
    ) {
      context.addIssue({
        code: "custom",
        path: ["credentialStore", "resources"],
        message: "research-only startup requires exactly Nebius and Tavily judge credentials",
      });
    }
    if (
      config.budgetService.deployment.deploymentId !== config.deploymentId ||
      config.budgetService.deployment.pool !== "judge"
    ) {
      context.addIssue({
        code: "custom",
        path: ["budgetService", "deployment"],
        message: "research judge budget belongs to another deployment or pool",
      });
    }
    const clients = [
      config.budgetClients.controller,
      config.budgetClients.usage.interaction,
      config.budgetClients.usage.guardian,
      config.budgetClients.usage.worker,
      config.budgetClients.usage.research,
    ];
    const serviceCapabilities = new Map(
      config.budgetService.capabilities.map((binding) => [binding.capability, binding]),
    );
    clients.forEach((client, index) => {
      const serviceBinding = serviceCapabilities.get(client.binding.capability);
      if (
        client.endpoint !== config.budgetService.endpoint ||
        serviceBinding === undefined ||
        !sameBudgetBinding(serviceBinding, client.binding)
      ) {
        context.addIssue({
          code: "custom",
          path: ["budgetClients", index === 0 ? "controller" : "usage"],
          message: "research judge budget client is not bound to the configured service",
        });
      }
    });
  });

export const ProtectedJudgeHostConfigSchema = z.discriminatedUnion("executionMode", [
  DisabledProtectedJudgeHostConfigSchema,
  ResearchOnlyProtectedJudgeHostConfigSchema,
]);
export type ProtectedJudgeHostConfig = DeepReadonly<z.infer<typeof ProtectedJudgeHostConfigSchema>>;

export const ProtectedJudgeSourceManifestSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  executionMode: z.literal("disabled"),
  gitCommit: z.string().regex(/^[0-9a-f]{40}$/u),
  lockfileSha256: Sha256DigestSchema,
  sourceArchiveSha256: Sha256DigestSchema,
  nodeVersion: z.string().regex(/^v24\.[0-9]+\.[0-9]+$/u),
  pnpmVersion: z.string().regex(/^11\.[0-9]+\.[0-9]+$/u),
  listenHost: z.literal("127.0.0.1"),
  requiredSecretSlots: z.tuple([
    z.literal("access_credential_sha256"),
    z.literal("source_fingerprint_key"),
    z.literal("nebius/default"),
    z.literal("tavily/default"),
  ]),
});
export type ProtectedJudgeSourceManifest = DeepReadonly<
  z.infer<typeof ProtectedJudgeSourceManifestSchema>
>;
