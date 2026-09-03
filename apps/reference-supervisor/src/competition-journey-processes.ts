import { fileURLToPath } from "node:url";

import { LocalBrokerIpcClient } from "@guardian/broker";
import { CompetitionJourneyServiceBundleSchema } from "@guardian/contracts";
import { LocalResearchIpcClient } from "@guardian/research";

import {
  attachControlledCompetitionJourney,
  type SupervisedCompetitionJourneyAttachment,
} from "./competition-journey-attachment.js";
import {
  startSupervisedServiceProcess,
  type SupervisedServiceProcess,
} from "./supervised-process.js";

function brokerStack(
  guardian: SupervisedServiceProcess,
  broker: SupervisedServiceProcess,
): SupervisedServiceProcess {
  return {
    processId: broker.processId,
    exited: Promise.race([guardian.exited, broker.exited]),
    close: async () => {
      const results = await Promise.allSettled([broker.close(), guardian.close()]);
      if (results.some((result) => result.status === "rejected")) {
        throw new TypeError("competition broker stack shutdown failed");
      }
    },
  };
}

export async function startSupervisedControlledCompetitionJourney(options: {
  readonly services: unknown;
  readonly riskProvider: "fake" | "nemotron";
}): Promise<SupervisedCompetitionJourneyAttachment> {
  const services = CompetitionJourneyServiceBundleSchema.parse(options.services);
  if (options.riskProvider !== "fake" && options.riskProvider !== "nemotron") {
    throw new TypeError("competition Guardian provider selection is invalid");
  }

  let guardianProcess: SupervisedServiceProcess | undefined;
  let brokerProcess: SupervisedServiceProcess | undefined;
  let researchProcess: SupervisedServiceProcess | undefined;
  try {
    guardianProcess = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../guardian-service/dist/main.js", import.meta.url)),
      bootstrap: services.broker.guardian,
      readyLine: "guardian risk service ready",
      environment: { GUARDIAN_RISK_PROVIDER: options.riskProvider },
    });
    brokerProcess = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../broker-service/dist/main.js", import.meta.url)),
      bootstrap: services.broker,
      readyLine: "guardian broker service ready",
    });
    researchProcess = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../research-service/dist/main.js", import.meta.url)),
      bootstrap: services.research,
      readyLine: "guardian research service ready",
    });

    return attachControlledCompetitionJourney({
      researchProcess,
      brokerProcess: brokerStack(guardianProcess, brokerProcess),
      research: new LocalResearchIpcClient(services.research.research),
      broker: new LocalBrokerIpcClient(services.broker.broker),
    });
  } catch (error) {
    await Promise.allSettled([
      researchProcess?.close(),
      brokerProcess?.close(),
      guardianProcess?.close(),
    ]);
    throw error;
  }
}
