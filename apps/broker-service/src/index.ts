import { GitHubInstallationCredentialResolver } from "./github-installation.js";
import { LocalAuthorityIpcClient } from "@guardian/authority-client";
import {
  GitHubBroker,
  LocalBrokerIpcServer,
  type BrokerExecutionResult,
  type GuardianEvaluator,
} from "@guardian/broker";
import {
  AuthorityCapabilityBindingSchema,
  BrokerServiceProcessConfigSchema,
  CredentialStoreHandleSchema,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";
import { LocalGuardianActionRiskIpcClient } from "@guardian/guardian";

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
  readonly useInstallationCredentials?: boolean;
  readonly guardian: GuardianEvaluator;
  readonly guardianContext?: ConstructorParameters<typeof GitHubBroker>[2]["guardianContext"];
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
    options.useInstallationCredentials === true
      ? new GitHubInstallationCredentialResolver({
          store: options.credentialStore,
          credentialStoreHandle,
          expectedRepository: async () => {
            const connection = (
              await authority.getSessionConnections(authorityBinding.sessionId)
            ).find(
              (c) => c.status === "active" && c.credentialStoreHandle === credentialStoreHandle,
            );
            if (connection === undefined)
              throw new TypeError("installation connection unavailable");
            return { owner: connection.owner, repository: connection.repository };
          },
          ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
          ...(options.now === undefined ? {} : { now: () => Date.parse(options.now!()) }),
        })
      : new GitHubStoredCredentialResolver({
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
      ...(options.guardianContext === undefined
        ? {}
        : { guardianContext: options.guardianContext }),
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

export async function startBrokerServiceIpcServer(options: {
  readonly config: unknown;
  readonly credentialStore: CredentialStore;
  readonly fetch?: typeof fetch;
  readonly now?: () => string;
  readonly onCredentialRefreshDiagnostic?: GitHubCredentialRefreshDiagnosticSink;
}): Promise<LocalBrokerIpcServer> {
  const config = BrokerServiceProcessConfigSchema.parse(options.config);
  const guardian = new LocalGuardianActionRiskIpcClient(config.guardian, {
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const broker = createBrokerService({
    authorityEndpoint: config.authority.endpoint,
    authorityBinding: config.authority.binding,
    credentialStoreHandle: config.credentialStoreHandle,
    credentialStore: options.credentialStore,
    githubClientId: config.githubClientId,
    useInstallationCredentials:
      config.credentialStore.custodyProfile === "managed_demo" &&
      config.credentialStore.resources.some(
        (r) => r.reference.provider === "github" && r.reference.slot === "app_private_key",
      ),
    guardian,
    guardianContext: {
      requestDigest: config.guardian.requestDigest,
      envelope: config.guardian.envelope,
    },
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...(options.onCredentialRefreshDiagnostic === undefined
      ? {}
      : { onCredentialRefreshDiagnostic: options.onCredentialRefreshDiagnostic }),
  });
  const server = new LocalBrokerIpcServer(
    config.broker,
    (execution) => broker.execute(execution),
    options.now === undefined ? {} : { now: options.now },
  );
  await server.listen();
  return server;
}
