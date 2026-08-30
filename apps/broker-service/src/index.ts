import type { BrokerExecutionRequest } from "@guardian/broker";

export interface BrokerServiceBoundary {
  readonly credentialSource: "trusted-github-connection";
  readonly execute: (request: BrokerExecutionRequest) => Promise<unknown>;
}
