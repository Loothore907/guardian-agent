import { LocalAuthorityIpcClient } from "@guardian/authority-client";
import { GitHubBroker, type BrokerExecutionResult, type GuardianEvaluator } from "@guardian/broker";
import { AuthorityCapabilityBindingSchema, CredentialStoreHandleSchema } from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";

import {
  GitHubStoredCredentialResolver,
  type GitHubCredentialRefreshDiagnosticSink,
} from "./github-credential.js";

export * from "./github-credential.js";

export interface BrokerServiceBoundary {
  readonly credentialSource: "trusted-github-connection";
  readonly authorityTransport: "authenticated-local-ipc";
  readonly execute: (request: unknown) => Promise<BrokerExecutionResult>;
}

export function createBrokerService(options: {
  readonly authorityEndpoint: unknown;
  readonly authorityBinding: unknown;
  readonly credentialStoreHandle: unknown;
  readonly credentialStore: CredentialStore;
  readonly githubClientId: string;
  readonly guardian: GuardianEvaluator;
  readonly fetch?: typeof fetch;
  readonly now?: () => string;
  readonly onCredentialRefreshDiagnostic?: GitHubCredentialRefreshDiagnosticSink;
}): BrokerServiceBoundary {
  const credentialStoreHandle = CredentialStoreHandleSchema.parse(options.credentialStoreHandle);
  const authorityBinding = AuthorityCapabilityBindingSchema.parse(options.authorityBinding);
  if (authorityBinding.callerRole !== "broker_service") {
    throw new TypeError("broker service requires a broker authority capability");
  }
  const authority = new LocalAuthorityIpcClient({
    endpoint: options.authorityEndpoint,
    binding: authorityBinding,
  });
  const broker = new GitHubBroker(
    authority,
    new GitHubStoredCredentialResolver({
      store: options.credentialStore,
      credentialStoreHandle,
      clientId: options.githubClientId,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.now === undefined ? {} : { now: () => Date.parse(options.now!()) }),
      ...(options.onCredentialRefreshDiagnostic === undefined
        ? {}
        : { onRefreshDiagnostic: options.onCredentialRefreshDiagnostic }),
    }),
    {
      guardian: options.guardian,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.now === undefined ? {} : { now: options.now }),
    },
  );
  return {
    credentialSource: "trusted-github-connection",
    authorityTransport: "authenticated-local-ipc",
    execute: (request) => broker.execute(request),
  };
}
