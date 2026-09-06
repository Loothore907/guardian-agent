import { workerRiskContext } from "./worker-risk-context.js";
import { fileURLToPath } from "node:url";
import { canonicalDigest } from "@guardian/canonical";
import { createBrokerIpcCredentials, LocalBrokerIpcClient } from "@guardian/broker";
import { createGuardianActionRiskIpcCredentials } from "@guardian/guardian";
import { LocalResearchIpcClient } from "@guardian/research";
import {
  BrokerExecutionRequestSchema,
  BrokerServiceProcessConfigSchema,
  CredentialStoreResearchServiceProcessConfigSchema,
  credentialStoreConfigForConsumer,
  type CredentialStoreConfig,
  type AuthorityCapabilityBinding,
  type WorkerToolExecutionEnvelope,
  type ManagedDemoJourneyUsageReporters,
} from "@guardian/contracts";
import type { AuthorityClient } from "@guardian/authority-client";
import type { LaunchedReferenceSession } from "@guardian/session-host/launcher";
import { WorkerExternalTools } from "./worker-external-tools.js";
import {
  startSupervisedServiceProcess,
  type SupervisedServiceProcess,
} from "./supervised-process.js";
import { credentialEnvironmentForStore } from "./credential-service-environment.js";

export interface WorkerResearchSession {
  pending?: Promise<LocalResearchIpcClient>;
  close?: () => Promise<void>;
}

/** Each broker action has its own exact-bound Guardian child. All children are
 * closed on completion, failure or deadline cancellation; no provider runs here. */
export async function executeSupervisedWorkerExternal(options: {
  execution: WorkerToolExecutionEnvelope;
  riskTurn?: unknown;
  launched: LaunchedReferenceSession;
  authorityEndpoint: string;
  brokerBinding: AuthorityCapabilityBinding;
  researchBinding: AuthorityCapabilityBinding;
  records: AuthorityClient;
  getPlan: () => Promise<unknown>;
  credentialStore: CredentialStoreConfig;
  githubClientId?: string;
  riskProvider: "fake" | "nemotron";
  reporters?: ManagedDemoJourneyUsageReporters;
  now: () => string;
  signal?: AbortSignal;
  researchSession?: WorkerResearchSession;
  onServiceFailure?: () => void;
}) {
  const children: SupervisedServiceProcess[] = [];
  const close = async () => {
    const results = await Promise.allSettled(children.map((child) => child.close()));
    if (results.some((r) => r.status === "rejected"))
      throw new TypeError("worker service cleanup failed");
  };
  const abort = () => {
    void close().catch(() => undefined);
    void options.researchSession?.close?.().catch(() => undefined);
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  const start = async (
    entry: string,
    bootstrap: unknown,
    readyLine: string,
    environment: Record<string, string>,
  ) => {
    if (options.signal?.aborted) throw new TypeError("worker cancelled");
    const process = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL(entry, import.meta.url)),
      bootstrap,
      readyLine,
      environment,
    });
    let closing = false;
    const failed = () => {
      if (closing) return;
      options.launched.interrupt();
      options.onServiceFailure?.();
    };
    void process.exited.then(failed, failed);
    const child: SupervisedServiceProcess = {
      ...process,
      close: () => {
        closing = true;
        return process.close();
      },
    };
    children.push(child);
    if (options.signal?.aborted) {
      await child.close();
      throw new TypeError("worker cancelled");
    }
    return child;
  };
  try {
    const { execution, launched } = options;
    const status = launched.runtime.status(options.now());
    const session = await options.records.getSession(execution.sessionId);
    if (
      !launched.durableAuthority ||
      status.state !== "active" ||
      session?.status !== "active" ||
      session.sessionId !== status.sessionId ||
      session.callerId !== execution.callerId ||
      session.missionId !== execution.missionId ||
      session.missionVersion !== execution.missionVersion ||
      session.profileId !== execution.profileId ||
      session.profileVersion !== execution.profileVersion ||
      session.policyVersion !== execution.policyVersion ||
      Date.parse(options.now()) >= Date.parse(session.expiresAt)
    )
      throw new TypeError("worker session unavailable");
    let research: LocalResearchIpcClient | undefined;
    if (execution.request.name === "guardian.research") {
      const config = CredentialStoreResearchServiceProcessConfigSchema.parse({
        schemaVersion: 1,
        serviceKind: "tavily_research",
        credentialStore: credentialStoreConfigForConsumer(
          options.credentialStore,
          "research_service",
        ),
        research: launched.research?.serviceConfig,
        authority: {
          schemaVersion: 1,
          endpoint: options.authorityEndpoint,
          binding: options.researchBinding,
        },
        ...(options.reporters === undefined
          ? {}
          : { managedDemoBudget: options.reporters.research }),
      });
      const prepare = async () => {
        const child = await start(
          "../../research-service/dist/main.js",
          config,
          "guardian research service ready",
          credentialEnvironmentForStore(config.credentialStore),
        );
        if (options.researchSession !== undefined) {
          // Ownership transfers to the session; never restart after a failed child.
          options.researchSession.close = () => child.close();
          children.splice(children.indexOf(child), 1);
        }
        return new LocalResearchIpcClient(config.research);
      };
      research =
        options.researchSession === undefined
          ? await prepare()
          : await (options.researchSession.pending ??= prepare());
    }
    const tools = new WorkerExternalTools({
      ...(research === undefined ? {} : { research }),
      getPlan: options.getPlan,
      now: options.now,
      broker: {
        execute: async (value) => {
          const input = BrokerExecutionRequestSchema.parse(value);
          const request = input.request;
          if (
            request.proposal.operation !== "github.pull_request.read" &&
            request.proposal.operation !== "github.pull_request.merge"
          )
            throw new TypeError("unsupported broker request");
          const connection = (
            await options.records.getSessionConnections(execution.sessionId)
          ).find((c) => c.connectionId === request.connectionId && c.status === "active");
          if (!connection) throw new TypeError("connection unavailable");
          const read = request.proposal.operation === "github.pull_request.read";
          const riskContext =
            options.riskTurn === undefined ? {} : workerRiskContext(execution, options.riskTurn);
          const config = BrokerServiceProcessConfigSchema.parse({
            schemaVersion: 1,
            serviceKind: "github_broker",
            credentialStore: credentialStoreConfigForConsumer(
              options.credentialStore,
              "broker_service",
            ),
            broker: {
              schemaVersion: 1,
              ...createBrokerIpcCredentials(),
              sessionId: session.sessionId,
              callerId: session.callerId,
              startsAt: session.startsAt,
              expiresAt: execution.expiresAt,
            },
            authority: {
              schemaVersion: 1,
              endpoint: options.authorityEndpoint,
              binding: options.brokerBinding,
            },
            guardian: {
              schemaVersion: 1,
              serviceKind: "action_risk",
              ...createGuardianActionRiskIpcCredentials(),
              credentialStore: credentialStoreConfigForConsumer(
                options.credentialStore,
                "guardian_service",
              ),
              ...(options.reporters === undefined
                ? {}
                : { managedDemoBudget: options.reporters.guardian }),
              sessionId: session.sessionId,
              callerId: session.callerId,
              requestDigest: canonicalDigest("canonical_request", 1, request),
              startsAt: session.startsAt,
              expiresAt: execution.expiresAt,
              envelope: {
                proposal: {
                  tool: request.proposal.operation,
                  arguments: read
                    ? {
                        owner: request.proposal.arguments.owner,
                        repository: request.proposal.arguments.repository,
                        pullRequest: request.proposal.arguments.pullRequest,
                      }
                    : request.proposal.arguments,
                },
                deterministicFloor: read ? "allow" : "confirm",
                riskSignals: [read ? "clean_context" : "authority_expansion"],
                untrustedExcerpts: [],
                containsCredentials: false,
                ...riskContext,
              },
            },
            credentialStoreHandle: connection.credentialStoreHandle,
            githubClientId: options.githubClientId,
          });
          await start(
            "../../guardian-service/dist/main.js",
            config.guardian,
            "guardian risk service ready",
            options.riskProvider === "nemotron"
              ? credentialEnvironmentForStore(config.guardian.credentialStore, {
                  GUARDIAN_RISK_PROVIDER: options.riskProvider,
                })
              : { GUARDIAN_RISK_PROVIDER: "fake" },
          );
          await start(
            "../../broker-service/dist/main.js",
            config,
            "guardian broker service ready",
            credentialEnvironmentForStore(config.credentialStore),
          );
          return new LocalBrokerIpcClient({ ...config.broker, now: options.now }).execute(input);
        },
      },
    });
    return await tools.execute(execution);
  } finally {
    options.signal?.removeEventListener("abort", abort);
    await close();
  }
}
