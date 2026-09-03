import { z } from "zod";

import { CredentialStoreHandleSchema } from "./authority-context.js";
import { AuthorityClientProcessConfigSchema } from "./authority-ipc.js";
import { BrokerIpcServiceConfigSchema } from "./broker-ipc.js";
import { ContractVersionSchema, type DeepReadonly } from "./common.js";
import { GuardianActionRiskServiceProcessConfigSchema } from "./guardian-action-ipc.js";

const BROKER_AUTHORITY_OPERATIONS = new Set([
  "session.get",
  "connection.list",
  "approval.get",
  "approval.state",
  "budget.consume_tool",
  "approval.consume",
  "context.append_attempt",
  "context.append_decision",
]);

export const GitHubOAuthClientIdSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const BrokerServiceProcessConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    serviceKind: z.literal("github_broker"),
    broker: BrokerIpcServiceConfigSchema,
    authority: AuthorityClientProcessConfigSchema,
    guardian: GuardianActionRiskServiceProcessConfigSchema,
    credentialStoreHandle: CredentialStoreHandleSchema,
    githubClientId: GitHubOAuthClientIdSchema,
  })
  .superRefine((config, context) => {
    const binding = config.authority.binding;
    if (
      binding.callerRole !== "broker_service" ||
      binding.sessionId !== config.broker.sessionId ||
      binding.callerId !== config.broker.callerId ||
      binding.allowedOperations.length !== BROKER_AUTHORITY_OPERATIONS.size ||
      binding.allowedOperations.some((operation) => !BROKER_AUTHORITY_OPERATIONS.has(operation))
    ) {
      context.addIssue({
        code: "custom",
        message: "broker authority binding must match the broker service",
        path: ["authority", "binding"],
      });
    }
    if (
      config.guardian.sessionId !== config.broker.sessionId ||
      config.guardian.callerId !== config.broker.callerId
    ) {
      context.addIssue({
        code: "custom",
        message: "guardian binding must match the broker service",
        path: ["guardian"],
      });
    }
    if (
      Date.parse(config.broker.startsAt) < Date.parse(binding.issuedAt) ||
      Date.parse(config.broker.expiresAt) > Date.parse(binding.expiresAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "broker lifetime must fit its authority capability",
        path: ["broker"],
      });
    }
    if (
      Date.parse(config.broker.startsAt) < Date.parse(config.guardian.startsAt) ||
      Date.parse(config.broker.expiresAt) > Date.parse(config.guardian.expiresAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "broker lifetime must fit its Guardian evaluator lifetime",
        path: ["guardian"],
      });
    }
  });

export type BrokerServiceProcessConfig = DeepReadonly<
  z.infer<typeof BrokerServiceProcessConfigSchema>
>;
