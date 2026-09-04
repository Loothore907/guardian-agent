import { z } from "zod";

import {
  ContractVersionSchema,
  OpaqueIdSchema,
  TimestampSchema,
  addDuplicateIssue,
  type DeepReadonly,
} from "./common.js";
import {
  ManagedDemoAdmissionRequestSchema,
  ManagedDemoAdmissionResultSchema,
  ManagedDemoBudgetPolicySchema,
  ManagedDemoBudgetSnapshotSchema,
  ManagedDemoDeploymentIdentitySchema,
  ManagedDemoOperatorPolicyUpdateSchema,
  ManagedDemoOperatorPriceUpdateSchema,
  ManagedDemoPriceSnapshotSchema,
  ManagedDemoSettlementResultSchema,
  ManagedDemoUsageObservationSchema,
} from "./managed-demo-budget.js";

export const ManagedDemoBudgetIpcOperationSchema = z.enum([
  "admission.request",
  "usage.record",
  "journey.settle",
  "budget.snapshot",
  "policy.update",
  "prices.update",
]);
export type ManagedDemoBudgetIpcOperation = z.infer<typeof ManagedDemoBudgetIpcOperationSchema>;

export const ManagedDemoBudgetCallerRoleSchema = z.enum([
  "journey_controller",
  "interaction_service",
  "guardian_service",
  "worker_service",
  "research_service",
  "operator",
]);
export type ManagedDemoBudgetCallerRole = z.infer<typeof ManagedDemoBudgetCallerRoleSchema>;

export const ManagedDemoBudgetCapabilityBindingSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    capability: OpaqueIdSchema,
    callerRole: ManagedDemoBudgetCallerRoleSchema,
    callerId: OpaqueIdSchema,
    deploymentId: OpaqueIdSchema,
    allowedOperations: z.array(ManagedDemoBudgetIpcOperationSchema).min(1).max(3),
    issuedAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .superRefine((binding, context) => {
    if (Date.parse(binding.expiresAt) <= Date.parse(binding.issuedAt)) {
      context.addIssue({
        code: "custom",
        message: "managed-demo capability expiry must follow issuance",
        path: ["expiresAt"],
      });
    }
    addDuplicateIssue(binding.allowedOperations, context, ["allowedOperations"]);
  });
export type ManagedDemoBudgetCapabilityBinding = DeepReadonly<
  z.infer<typeof ManagedDemoBudgetCapabilityBindingSchema>
>;

const RequestBindingShape = {
  schemaVersion: ContractVersionSchema,
  requestId: OpaqueIdSchema,
  capability: OpaqueIdSchema,
  callerRole: ManagedDemoBudgetCallerRoleSchema,
  callerId: OpaqueIdSchema,
  deploymentId: OpaqueIdSchema,
} as const;

export const ManagedDemoBudgetIpcRequestSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    ...RequestBindingShape,
    operation: z.literal("admission.request"),
    admission: ManagedDemoAdmissionRequestSchema,
  }),
  z.strictObject({
    ...RequestBindingShape,
    operation: z.literal("usage.record"),
    reservationId: OpaqueIdSchema,
    journeyId: OpaqueIdSchema,
    usage: ManagedDemoUsageObservationSchema,
  }),
  z.strictObject({
    ...RequestBindingShape,
    operation: z.literal("journey.settle"),
    reservationId: OpaqueIdSchema,
    journeyId: OpaqueIdSchema,
    outcome: z.enum(["completed", "failed"]),
    settledAt: TimestampSchema,
  }),
  z.strictObject({ ...RequestBindingShape, operation: z.literal("budget.snapshot") }),
  z.strictObject({
    ...RequestBindingShape,
    operation: z.literal("policy.update"),
    update: ManagedDemoOperatorPolicyUpdateSchema,
  }),
  z.strictObject({
    ...RequestBindingShape,
    operation: z.literal("prices.update"),
    update: ManagedDemoOperatorPriceUpdateSchema,
  }),
]);
export type ManagedDemoBudgetIpcRequest = DeepReadonly<
  z.infer<typeof ManagedDemoBudgetIpcRequestSchema>
>;

const ResponseBindingShape = {
  schemaVersion: ContractVersionSchema,
  requestId: OpaqueIdSchema,
} as const;

export const ManagedDemoBudgetIpcSuccessResponseSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    ...ResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("admission.request"),
    result: ManagedDemoAdmissionResultSchema,
  }),
  z.strictObject({
    ...ResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("usage.record"),
    result: z.literal("recorded"),
  }),
  z.strictObject({
    ...ResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("journey.settle"),
    result: ManagedDemoSettlementResultSchema,
  }),
  z.strictObject({
    ...ResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("budget.snapshot"),
    result: ManagedDemoBudgetSnapshotSchema,
  }),
  z.strictObject({
    ...ResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("policy.update"),
    result: ManagedDemoBudgetSnapshotSchema,
  }),
  z.strictObject({
    ...ResponseBindingShape,
    ok: z.literal(true),
    operation: z.literal("prices.update"),
    result: ManagedDemoBudgetSnapshotSchema,
  }),
]);

export const ManagedDemoBudgetIpcFailureReasonSchema = z.enum([
  "invalid_request",
  "unauthorized",
  "stale_capability",
  "binding_mismatch",
  "operation_not_allowed",
  "budget_unavailable",
]);
export type ManagedDemoBudgetIpcFailureReason = z.infer<
  typeof ManagedDemoBudgetIpcFailureReasonSchema
>;

export const ManagedDemoBudgetIpcFailureResponseSchema = z.strictObject({
  ...ResponseBindingShape,
  ok: z.literal(false),
  error: ManagedDemoBudgetIpcFailureReasonSchema,
});

export const ManagedDemoBudgetIpcResponseSchema = z.union([
  ManagedDemoBudgetIpcSuccessResponseSchema,
  ManagedDemoBudgetIpcFailureResponseSchema,
]);
export type ManagedDemoBudgetIpcResponse = DeepReadonly<
  z.infer<typeof ManagedDemoBudgetIpcResponseSchema>
>;

export const ManagedDemoBudgetClientProcessConfigSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  endpoint: z.string().min(1).max(260),
  binding: ManagedDemoBudgetCapabilityBindingSchema,
});
export type ManagedDemoBudgetClientProcessConfig = DeepReadonly<
  z.infer<typeof ManagedDemoBudgetClientProcessConfigSchema>
>;

function usageReporterSchema(
  role: Exclude<ManagedDemoBudgetCallerRole, "journey_controller" | "operator">,
) {
  return z
    .strictObject({
      schemaVersion: ContractVersionSchema,
      budget: ManagedDemoBudgetClientProcessConfigSchema,
      reservationId: OpaqueIdSchema,
      journeyId: OpaqueIdSchema,
    })
    .superRefine((reporter, context) => {
      const binding = reporter.budget.binding;
      if (
        binding.callerRole !== role ||
        binding.allowedOperations.length !== 1 ||
        binding.allowedOperations[0] !== "usage.record"
      ) {
        context.addIssue({
          code: "custom",
          message: "managed-demo usage reporter has the wrong caller capability",
          path: ["budget", "binding"],
        });
      }
    });
}

export const ManagedDemoInteractionUsageReporterConfigSchema =
  usageReporterSchema("interaction_service");
export const ManagedDemoGuardianUsageReporterConfigSchema = usageReporterSchema("guardian_service");
export const ManagedDemoWorkerUsageReporterConfigSchema = usageReporterSchema("worker_service");
export const ManagedDemoResearchUsageReporterConfigSchema = usageReporterSchema("research_service");

export type ManagedDemoInteractionUsageReporterConfig = DeepReadonly<
  z.infer<typeof ManagedDemoInteractionUsageReporterConfigSchema>
>;
export type ManagedDemoGuardianUsageReporterConfig = DeepReadonly<
  z.infer<typeof ManagedDemoGuardianUsageReporterConfigSchema>
>;
export type ManagedDemoWorkerUsageReporterConfig = DeepReadonly<
  z.infer<typeof ManagedDemoWorkerUsageReporterConfigSchema>
>;
export type ManagedDemoResearchUsageReporterConfig = DeepReadonly<
  z.infer<typeof ManagedDemoResearchUsageReporterConfigSchema>
>;

export const ManagedDemoJourneyBudgetClientBundleSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    controller: ManagedDemoBudgetClientProcessConfigSchema,
    usage: z.strictObject({
      interaction: ManagedDemoBudgetClientProcessConfigSchema,
      guardian: ManagedDemoBudgetClientProcessConfigSchema,
      worker: ManagedDemoBudgetClientProcessConfigSchema,
      research: ManagedDemoBudgetClientProcessConfigSchema,
    }),
  })
  .superRefine((bundle, context) => {
    const expected = [
      {
        binding: bundle.controller.binding,
        role: "journey_controller",
        operations: ["admission.request", "journey.settle"],
      },
      {
        binding: bundle.usage.interaction.binding,
        role: "interaction_service",
        operations: ["usage.record"],
      },
      {
        binding: bundle.usage.guardian.binding,
        role: "guardian_service",
        operations: ["usage.record"],
      },
      {
        binding: bundle.usage.worker.binding,
        role: "worker_service",
        operations: ["usage.record"],
      },
      {
        binding: bundle.usage.research.binding,
        role: "research_service",
        operations: ["usage.record"],
      },
    ] as const;
    const deploymentId = bundle.controller.binding.deploymentId;
    const endpoint = bundle.controller.endpoint;
    expected.forEach((item, index) => {
      if (
        item.binding.callerRole !== item.role ||
        item.binding.deploymentId !== deploymentId ||
        item.binding.allowedOperations.length !== item.operations.length ||
        item.binding.allowedOperations.some(
          (operation, operationIndex) => operation !== item.operations[operationIndex],
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "managed-demo journey capability bundle is inconsistent",
          path: [index === 0 ? "controller" : "usage"],
        });
      }
    });
    const clients = [
      bundle.controller,
      bundle.usage.interaction,
      bundle.usage.guardian,
      bundle.usage.worker,
      bundle.usage.research,
    ];
    clients.forEach((client, index) => {
      if (client.endpoint !== endpoint) {
        context.addIssue({
          code: "custom",
          message: "managed-demo journey clients must share one exact endpoint",
          path: [index === 0 ? "controller" : "usage"],
        });
      }
    });
    addDuplicateIssue(
      clients.map((client) => client.binding.capability),
      context,
      ["usage"],
    );
  });
export type ManagedDemoJourneyBudgetClientBundle = DeepReadonly<
  z.infer<typeof ManagedDemoJourneyBudgetClientBundleSchema>
>;

export const ManagedDemoBudgetServiceProcessConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    serviceInstanceId: OpaqueIdSchema,
    endpoint: z.string().min(1).max(260),
    ledgerPath: z.string().min(1).max(4_096),
    deployment: ManagedDemoDeploymentIdentitySchema,
    policy: ManagedDemoBudgetPolicySchema,
    prices: ManagedDemoPriceSnapshotSchema,
    capabilities: z.array(ManagedDemoBudgetCapabilityBindingSchema).min(1).max(16),
  })
  .superRefine((config, context) => {
    if (
      config.deployment.pool !== config.policy.pool ||
      config.deployment.policyId !== config.policy.policyId ||
      config.deployment.policyVersion !== config.policy.version ||
      config.prices.modelPolicyId !== config.policy.modelPolicyId ||
      config.prices.modelPolicyVersion !== config.policy.modelPolicyVersion
    ) {
      context.addIssue({
        code: "custom",
        message: "managed-demo service configuration bindings are inconsistent",
      });
    }
    config.capabilities.forEach((binding, index) => {
      if (binding.deploymentId !== config.deployment.deploymentId) {
        context.addIssue({
          code: "custom",
          message: "managed-demo capability belongs to another deployment",
          path: ["capabilities", index, "deploymentId"],
        });
      }
    });
    addDuplicateIssue(
      config.capabilities.map((binding) => binding.capability),
      context,
      ["capabilities"],
    );
  });
export type ManagedDemoBudgetServiceProcessConfig = DeepReadonly<
  z.infer<typeof ManagedDemoBudgetServiceProcessConfigSchema>
>;
