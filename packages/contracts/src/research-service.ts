import { z } from "zod";

import { AuthorityClientProcessConfigSchema } from "./authority-ipc.js";
import { ContractVersionSchema, type DeepReadonly } from "./common.js";
import { ResearchServiceProcessConfigSchema } from "./research-ipc.js";

const RESEARCH_AUTHORITY_OPERATIONS = new Set([
  "research.reserve",
  "research.settle",
  "context.append_exposures",
]);

export const CredentialStoreResearchServiceProcessConfigSchema = z
  .strictObject({
    schemaVersion: ContractVersionSchema,
    serviceKind: z.literal("tavily_research"),
    research: ResearchServiceProcessConfigSchema,
    authority: AuthorityClientProcessConfigSchema,
  })
  .superRefine((config, context) => {
    const binding = config.authority.binding;
    if (
      binding.callerRole !== "research_service" ||
      binding.sessionId !== config.research.sessionId ||
      binding.callerId !== config.research.callerId ||
      binding.allowedOperations.length !== RESEARCH_AUTHORITY_OPERATIONS.size ||
      binding.allowedOperations.some((operation) => !RESEARCH_AUTHORITY_OPERATIONS.has(operation))
    ) {
      context.addIssue({
        code: "custom",
        message: "research authority binding must exactly match the research service",
        path: ["authority", "binding"],
      });
    }
    if (
      Date.parse(config.research.startsAt) < Date.parse(binding.issuedAt) ||
      Date.parse(config.research.expiresAt) > Date.parse(binding.expiresAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "research lifetime must fit its authority capability",
        path: ["research"],
      });
    }
  });

export type CredentialStoreResearchServiceProcessConfig = DeepReadonly<
  z.infer<typeof CredentialStoreResearchServiceProcessConfigSchema>
>;
