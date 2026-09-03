import { z } from "zod";

import { BrokerServiceProcessConfigSchema } from "./broker-service.js";
import { ContractVersionSchema, type DeepReadonly } from "./common.js";
import { CredentialStoreResearchServiceProcessConfigSchema } from "./research-service.js";

export const CompetitionJourneyServiceBundleSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    broker: BrokerServiceProcessConfigSchema,
    research: CredentialStoreResearchServiceProcessConfigSchema,
  })
  .superRefine((config, context) => {
    if (
      config.broker.broker.sessionId !== config.research.research.sessionId ||
      config.broker.broker.callerId !== config.research.research.callerId
    ) {
      context.addIssue({
        code: "custom",
        message: "competition services must share the exact session and caller",
      });
    }
    if (
      Date.parse(config.broker.broker.startsAt) !== Date.parse(config.research.research.startsAt) ||
      Date.parse(config.broker.broker.expiresAt) !== Date.parse(config.research.research.expiresAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "competition services must share the exact lifetime",
      });
    }
  });

export type CompetitionJourneyServiceBundle = DeepReadonly<
  z.infer<typeof CompetitionJourneyServiceBundleSchema>
>;
