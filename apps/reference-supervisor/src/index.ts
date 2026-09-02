import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  LocalAuthorityIpcClient,
  createAuthorityIpcEndpoint,
  type AuthorityClient,
  type AuthorityControlClient,
  type AuthorityWorkerClient,
} from "@guardian/authority-client";
import { DevelopmentAuthorizationIssuer } from "@guardian/authorization-service";
import {
  AuthorityCapabilityBindingSchema,
  DEFAULT_NEBIUS_WORKER_SELECTION,
  DEFAULT_REFERENCE_WORKER_SELECTION,
  OpaqueIdSchema,
  TimestampSchema,
  type AuthorityCapabilityBinding,
  type AuthorityCallerRole,
  type AuthorityIpcOperation,
  type MissionDraftReviewEnvelope,
  type MissionSetupRiskEnvelope,
  type WorkerTurnEnvelope,
} from "@guardian/contracts";
import {
  createMissionSetupRiskIpcCredentials,
  LocalMissionSetupRiskIpcClient,
} from "@guardian/guardian";
import {
  createInteractionIpcCredentials,
  createMissionDraftReviewIpcCredentials,
  LocalInteractionIpcClient,
  LocalMissionDraftReviewIpcClient,
} from "@guardian/interaction";
import {
  launchReferenceSession,
  type LaunchedReferenceSession,
  type ReferenceSessionLaunchInput,
} from "@guardian/session-host/launcher";
import { createWorkerIpcCredentials, LocalWorkerIpcClient } from "@guardian/worker";
import { ManagedSessionWorkspace } from "@guardian/workspace";

import { ReferenceSessionBootstrapCoordinator, type InteractionRunnerInput } from "./bootstrap.js";
import { startSupervisedServiceProcess } from "./supervised-process.js";
import { TrustedWorkerToolDispatcher } from "./worker-execution.js";

export { ReferenceSessionBootstrapCoordinator } from "./bootstrap.js";
export { TrustedWorkerToolDispatcher, WorkerToolExecutionError } from "./worker-execution.js";

const ROLE_OPERATIONS = {
  launcher: ["connection.create", "session.create"],
  research_service: ["research.reserve", "research.settle"],
  authorization_service: ["approval.store"],
  broker_service: [
    "session.get",
    "connection.list",
    "approval.get",
    "approval.state",
    "budget.consume_tool",
    "approval.consume",
    "context.append_attempt",
    "context.append_decision",
  ],
  worker_dispatcher: [
    "budget.consume_worker_tool",
    "budget.consume_local_command",
    "worker.record_violation",
    "worker.interrupt",
  ],
} as const satisfies Readonly<Record<AuthorityCallerRole, readonly AuthorityIpcOperation[]>>;

export interface ReferenceAuthoritySupervisorConfig {
  readonly sessionId: unknown;
  readonly callerId: unknown;
  readonly authorityStorePath: unknown;
  readonly projectRoot: unknown;
  readonly workspaceRoots: readonly unknown[];
  readonly issuedAt: unknown;
  readonly expiresAt: unknown;
}

export interface ReferenceAuthoritySupervisor {
  readonly endpoint: string;
  readonly authorityProcessId: number;
  readonly authorityExited: Promise<void>;
  readonly launcher: Pick<AuthorityControlClient, "createConnection" | "createSession">;
  readonly research: Pick<AuthorityControlClient, "reserveResearch" | "settleResearchResults">;
  readonly broker: AuthorityClient;
  readonly workerAuthority: AuthorityWorkerClient;
  readonly authorizationIssuer: DevelopmentAuthorizationIssuer;
  readonly bootstrap: ReferenceSessionBootstrapCoordinator;
  readonly workspaceSelection: ManagedSessionWorkspace["selection"];
  readonly launchSession: (
    input: Omit<ReferenceSessionLaunchInput, "authority">,
  ) => Promise<LaunchedReferenceSession>;
  readonly close: () => Promise<void>;
}

function createBinding(options: {
  readonly role: AuthorityCallerRole;
  readonly sessionId: string;
  readonly callerId: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}): AuthorityCapabilityBinding {
  return AuthorityCapabilityBindingSchema.parse({
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole: options.role,
    callerId: options.callerId,
    sessionId: options.sessionId,
    allowedOperations: ROLE_OPERATIONS[options.role],
    issuedAt: options.issuedAt,
    expiresAt: options.expiresAt,
  });
}

export async function startReferenceAuthoritySupervisor(
  config: ReferenceAuthoritySupervisorConfig,
  options: {
    readonly now?: () => string;
    readonly interactionProcess?: "fake" | "qwen";
    readonly riskProcess?: "fake" | "nemotron";
    readonly workerMode?: "deterministic_reference" | "nebius_native";
  } = {},
): Promise<ReferenceAuthoritySupervisor> {
  const sessionId = OpaqueIdSchema.parse(config.sessionId);
  const callerId = OpaqueIdSchema.parse(config.callerId);
  const issuedAt = TimestampSchema.parse(config.issuedAt);
  const expiresAt = TimestampSchema.parse(config.expiresAt);
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) {
    throw new TypeError("supervisor capability expiry must follow issuance");
  }
  if (typeof config.authorityStorePath !== "string" || config.authorityStorePath.length === 0) {
    throw new TypeError("supervisor authority store path is required");
  }
  const workspaceRoots = config.workspaceRoots.map((root) => {
    if (typeof root !== "string" || root.length === 0) {
      throw new TypeError("supervisor workspace root is invalid");
    }
    return root;
  });
  if (workspaceRoots.length !== 1) {
    throw new TypeError("the reference supervisor requires one workspace storage root");
  }
  if (typeof config.projectRoot !== "string" || config.projectRoot.length === 0) {
    throw new TypeError("supervisor project root is required");
  }
  const managedWorkspace = await ManagedSessionWorkspace.plan({
    sourceRoot: config.projectRoot,
    storageRoot: workspaceRoots[0],
    sessionId,
  });

  const bindings = Object.keys(ROLE_OPERATIONS).map((role) =>
    createBinding({
      role: role as AuthorityCallerRole,
      sessionId,
      callerId,
      issuedAt,
      expiresAt,
    }),
  );
  const bindingFor = (role: AuthorityCallerRole) => {
    const binding = bindings.find((candidate) => candidate.callerRole === role);
    if (binding === undefined) throw new TypeError("supervisor role binding is unavailable");
    return binding;
  };
  const endpoint = createAuthorityIpcEndpoint();
  let authorityProcess: Awaited<ReturnType<typeof startSupervisedServiceProcess>> | undefined;
  try {
    authorityProcess = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../authority-service/dist/main.js", import.meta.url)),
      bootstrap: {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: config.authorityStorePath,
        workspaceRoots,
        capabilities: bindings,
      },
      readyLine: "guardian authority service ready",
    });
    const launcherBinding = bindingFor("launcher");
    const researchBinding = bindingFor("research_service");
    const authorizationBinding = bindingFor("authorization_service");
    const brokerBinding = bindingFor("broker_service");
    const workerBinding = bindingFor("worker_dispatcher");
    const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
    const research = new LocalAuthorityIpcClient({ endpoint, binding: researchBinding });
    const authorization = new LocalAuthorityIpcClient({
      endpoint,
      binding: authorizationBinding,
    });
    const broker = new LocalAuthorityIpcClient({ endpoint, binding: brokerBinding });
    const workerAuthority = new LocalAuthorityIpcClient({ endpoint, binding: workerBinding });
    const runningAuthorityProcess = authorityProcess;
    const launchSession = (input: Omit<ReferenceSessionLaunchInput, "authority">) =>
      launchReferenceSession({
        ...input,
        authority: { endpoint, binding: launcherBinding },
      });
    const interactionProcessMode = options.interactionProcess;
    const runInteraction =
      interactionProcessMode === undefined
        ? undefined
        : async (input: InteractionRunnerInput) => {
            const credentials = createInteractionIpcCredentials();
            const interactionProcess = await startSupervisedServiceProcess({
              entrypoint: fileURLToPath(
                new URL("../../interaction-service/dist/main.js", import.meta.url),
              ),
              bootstrap: {
                schemaVersion: 1,
                ...input,
                ...credentials,
              },
              readyLine: "guardian interaction service ready",
              environment: { GUARDIAN_INTERACTION_PROVIDER: interactionProcessMode },
            });
            try {
              const result = await new LocalInteractionIpcClient({
                ...credentials,
                sessionId: input.sessionId,
                callerId: input.callerId,
                missionId: input.missionId,
                missionVersion: input.missionVersion,
                profileId: input.profileId,
                profileVersion: input.profileVersion,
                policyVersion: input.policyVersion,
              }).runFirstTurn(options.now?.() ?? new Date().toISOString());
              return { state: "completed" as const, ...result };
            } finally {
              await interactionProcess.close();
            }
          };
    const runMissionDraftReview =
      interactionProcessMode === undefined
        ? undefined
        : async (envelope: MissionDraftReviewEnvelope) => {
            const credentials = createMissionDraftReviewIpcCredentials();
            const startsAt = options.now?.() ?? new Date().toISOString();
            const expiresAt = new Date(
              Math.min(Date.parse(envelope.expiresAt), Date.parse(startsAt) + 60_000),
            ).toISOString();
            const interactionProcess = await startSupervisedServiceProcess({
              entrypoint: fileURLToPath(
                new URL("../../interaction-service/dist/main.js", import.meta.url),
              ),
              bootstrap: {
                schemaVersion: 1,
                serviceKind: "mission_draft_review",
                ...credentials,
                startsAt,
                expiresAt,
                envelope,
              },
              readyLine: "guardian interaction service ready",
              environment: { GUARDIAN_INTERACTION_PROVIDER: interactionProcessMode },
            });
            try {
              return await new LocalMissionDraftReviewIpcClient({
                ...credentials,
                draftId: envelope.draftId,
                revision: envelope.revision,
                reviewTurn: envelope.reviewTurn,
              }).review(startsAt);
            } finally {
              await interactionProcess.close();
            }
          };
    const riskProcessMode = options.riskProcess;
    const runMissionSetupRisk =
      riskProcessMode === undefined
        ? undefined
        : async (envelope: MissionSetupRiskEnvelope) => {
            const credentials = createMissionSetupRiskIpcCredentials();
            const startsAt = options.now?.() ?? new Date().toISOString();
            const expiresAt = new Date(
              Math.min(Date.parse(envelope.expiresAt), Date.parse(startsAt) + 60_000),
            ).toISOString();
            const guardianProcess = await startSupervisedServiceProcess({
              entrypoint: fileURLToPath(
                new URL("../../guardian-service/dist/main.js", import.meta.url),
              ),
              bootstrap: {
                schemaVersion: 1,
                serviceKind: "mission_setup_risk",
                ...credentials,
                startsAt,
                expiresAt,
                envelope,
              },
              readyLine: "guardian risk service ready",
              environment: { GUARDIAN_RISK_PROVIDER: riskProcessMode },
            });
            try {
              return await new LocalMissionSetupRiskIpcClient({
                ...credentials,
                draftId: envelope.draftId,
                revision: envelope.revision,
                requestDigest: envelope.requestDigest,
              }).evaluate(startsAt);
            } finally {
              await guardianProcess.close();
            }
          };
    const workerProcessMode =
      options.workerMode === "nebius_native" ? ("nebius" as const) : ("fake" as const);
    const runWorkerTurn = async (turn: WorkerTurnEnvelope) => {
      const credentials = createWorkerIpcCredentials();
      const workerProcess = await startSupervisedServiceProcess({
        entrypoint: fileURLToPath(new URL("../../worker-service/dist/main.js", import.meta.url)),
        bootstrap: {
          schemaVersion: 1,
          serviceKind: "worker_turn",
          ...credentials,
          turn,
        },
        readyLine: "guardian worker service ready",
        environment: { GUARDIAN_WORKER_PROVIDER: workerProcessMode },
      });
      try {
        return await new LocalWorkerIpcClient({
          ...credentials,
          sessionId: turn.sessionId,
          turnId: turn.turnId,
          turnNumber: turn.turnNumber,
          turnDigest: turn.turnDigest,
        }).run(options.now?.() ?? new Date().toISOString());
      } finally {
        await workerProcess.close();
      }
    };
    return {
      endpoint,
      authorityProcessId: runningAuthorityProcess.processId,
      authorityExited: runningAuthorityProcess.exited,
      launcher,
      research,
      broker,
      workerAuthority,
      authorizationIssuer: new DevelopmentAuthorizationIssuer({
        authority: authorization,
        binding: authorizationBinding,
        ...(options.now === undefined ? {} : { now: options.now }),
      }),
      bootstrap: new ReferenceSessionBootstrapCoordinator({
        sessionId,
        callerId,
        launchSession,
        workspaceSelection: managedWorkspace.selection,
        prepareWorkspace: () => managedWorkspace.prepare(),
        ...(runInteraction === undefined ? {} : { runInteraction }),
        ...(runMissionDraftReview === undefined ? {} : { runMissionDraftReview }),
        ...(runMissionSetupRisk === undefined ? {} : { runMissionSetupRisk }),
        runWorkerTurn,
        executeWorkerTool: (execution, launched) =>
          new TrustedWorkerToolDispatcher({
            authority: workerAuthority,
            runtime: launched.runtime,
            workspace: launched.workspace,
            runLocalCommand: launched.localCommand,
            revokeRuntime: launched.revoke,
            interruptRuntime: launched.interrupt,
            ...(options.now === undefined ? {} : { now: options.now }),
          }).execute(execution),
        workerAuthority,
        workerSelection:
          options.workerMode === "nebius_native"
            ? DEFAULT_NEBIUS_WORKER_SELECTION
            : DEFAULT_REFERENCE_WORKER_SELECTION,
        ...(options.now === undefined ? {} : { now: options.now }),
      }),
      workspaceSelection: managedWorkspace.selection,
      launchSession,
      close: async () => {
        const results = await Promise.allSettled([
          managedWorkspace.close(),
          runningAuthorityProcess.close(),
        ]);
        const failure = results.find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        if (failure !== undefined) throw failure.reason;
      },
    };
  } catch (error) {
    await Promise.allSettled([managedWorkspace.close(), authorityProcess?.close()]);
    throw error;
  }
}
