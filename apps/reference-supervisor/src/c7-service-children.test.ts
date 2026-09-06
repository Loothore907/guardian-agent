import type * as SupervisedModule from "./supervised-process.js";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalAuthorityIpcClient, createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { DevelopmentAuthorizationIssuer } from "@guardian/authorization-service";
import { BoundSessionRuntime } from "@guardian/session";
import { createWorkerIpcCredentials, LocalWorkerIpcClient } from "@guardian/worker";
import { createResearchIpcCredentials } from "@guardian/research";
import {
  ControlledContentJourneyResultSchema,
  type AuthorityCapabilityBinding,
  type AuthorityCallerRole,
  type AuthorityIpcOperation,
  type WorkerToolResult,
  type WorkerTurnEnvelope,
} from "@guardian/contracts";
import { ReferenceSessionBootstrapCoordinator } from "./bootstrap.js";
import { TrustedWorkerToolDispatcher } from "./worker-execution.js";
import {
  executeSupervisedWorkerExternal,
  type WorkerResearchSession,
} from "./worker-service-composition.js";
import { judgeRuntimeScope } from "./judge-runtime-scope.js";
import {
  startSupervisedServiceProcess,
  type SupervisedServiceProcess,
} from "./supervised-process.js";

let syntheticFailure = "";
let syntheticClock: string | undefined;
vi.mock("./supervised-process.js", async (original) => {
  const actual = await original<typeof SupervisedModule>();
  return {
    ...actual,
    startSupervisedServiceProcess: (
      options: Parameters<typeof actual.startSupervisedServiceProcess>[0],
    ) => {
      const replacements = [
        ["authority-service", "c7-authority"],
        ["broker-service", "c7-broker"],
        ["research-service", "c7-research"],
        ["guardian-service", "c7-guardian"],
      ];
      const found = replacements.find(([name]) => options.entrypoint.includes(name!));
      return actual.startSupervisedServiceProcess({
        ...options,
        environment: {
          ...options.environment,
          ...(syntheticClock === undefined ? {} : { C7_SYNTHETIC_NOW: syntheticClock }),
          ...(syntheticFailure === "service" && options.entrypoint.includes("broker-service")
            ? { C7_SYNTHETIC_FAIL: "1" }
            : {}),
        },
        ...(found === undefined
          ? {}
          : {
              entrypoint: fileURLToPath(
                new URL(`../../../scripts/test-fixtures/${found[1]}.mjs`, import.meta.url),
              ),
            }),
      });
    },
  };
});

const workspace = {
  schemaVersion: 1,
  state: "ready",
  selection: {
    schemaVersion: 1,
    kind: "guardian_managed_copy",
    projectName: "fixture",
    sourceRootDigest: "a".repeat(64),
    sourceSnapshotDigest: "b".repeat(64),
    mountPath: "/workspace",
    persistence: "session",
    cleanup: "delete_on_close",
    hostWriteback: "none",
    limits: { maxFiles: 10, maxBytes: 10000, maxFileBytes: 1000 },
  },
  fileCount: 1,
  totalBytes: 10,
  baseline: "sanitized_git_repository",
} as const;

describe("C7 synthetic service-child integration (not live model evidence)", () => {
  beforeEach(() => {
    if (process.platform !== "linux") return;
    // Synthetic provider children never contact Secret Service. Keep descriptor
    // validation real without depending on the CI runner's desktop bus format.
    const runtime = `/run/user/${process.getuid!()}`;
    vi.stubEnv("XDG_RUNTIME_DIR", runtime);
    vi.stubEnv("DBUS_SESSION_BUS_ADDRESS", `unix:path=${runtime}/bus`);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "research",
    "read",
    "merge",
    "read_service",
    "read_worker",
    "read_revoked",
    "read_context",
  ])(
    "runs %s seed exposure, an injected near miss, and useful completion",
    async (label) => {
      const [scenario, fault] = label.split("_");
      syntheticFailure = fault ?? "";
      const directory = await mkdtemp(join(tmpdir(), "guardian-c7-children-"));
      // Retain Linux real-clock coverage. Windows clock skew is a separate C6 gate.
      syntheticClock = process.platform === "win32" ? new Date().toISOString() : undefined;
      if (syntheticClock !== undefined) {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(syntheticClock));
      }
      const children: SupervisedServiceProcess[] = [];
      const researchSession: WorkerResearchSession = {};
      let riskTurn: WorkerTurnEnvelope | undefined;
      const sessionId = randomUUID(),
        callerId = randomUUID(),
        principalId = randomUUID(),
        connectionId = randomUUID();
      const issuedAt = new Date(Date.now() - 5000).toISOString(),
        expiresAt = new Date(Date.now() + 600000).toISOString();
      const binding = (
        callerRole: AuthorityCallerRole,
        allowedOperations: AuthorityIpcOperation[],
      ): AuthorityCapabilityBinding => ({
        schemaVersion: 1,
        capability: randomUUID(),
        callerRole,
        callerId,
        sessionId,
        allowedOperations,
        issuedAt,
        expiresAt,
      });
      const launcherBinding = binding("launcher", ["connection.create", "session.create"]);
      const brokerBinding = binding("broker_service", [
        "session.get",
        "connection.list",
        "approval.get",
        "plan.check",
        "approval.state",
        "budget.consume_tool",
        "approval.consume",
        "context.append_attempt",
        "context.append_decision",
      ]);
      const researchBinding = binding("research_service", [
        "research.reserve",
        "research.settle",
        "context.append_exposures",
      ]);
      const workerBinding = binding("worker_dispatcher", [
        "budget.consume_worker_tool",
        "budget.consume_local_command",
        "worker.claim_external",
        "worker.budget",
        "worker.record_violation",
        "worker.interrupt",
      ]);
      const authBinding = binding("authorization_service", [
        "approval.store",
        "plan.store",
        "plan.get",
        "plan.revoke",
        "plan.pending",
      ]);
      const endpoint = createAuthorityIpcEndpoint();
      const target = {
        operation: scenario === "merge" ? "github.pull_request.merge" : "github.pull_request.read",
        owner: "fixture",
        repository: "demo",
        pullRequest: 1,
        headCommit: "a".repeat(40),
        baseBranch: "main",
      };
      const scope = {
        objective: `Complete the ${scenario} fixture.`,
        researchUrls: scenario === "research" ? ["https://fixture.example.org/update"] : [],
        githubTarget: scenario === "research" ? null : target,
        durationSeconds: 300,
      };
      const intent =
        scenario === "research"
          ? undefined
          : {
              maxActions: scenario === "merge" ? 2 : 1,
              maxMutations: scenario === "merge" ? 1 : 0,
              mutationRetries: 0,
              targets: [
                { ...target, operation: "github.pull_request.read", connectionId },
                ...(scenario === "merge" ? [{ ...target, connectionId }] : []),
              ],
            };
      const mission = judgeRuntimeScope(scope, intent);
      const now = () => new Date().toISOString();
      try {
        children.push(
          await startSupervisedServiceProcess({
            entrypoint: fileURLToPath(
              new URL("../../authority-service/dist/main.js", import.meta.url),
            ),
            bootstrap: {
              schemaVersion: 1,
              serviceInstanceId: randomUUID(),
              endpoint,
              authorityStorePath: join(directory, "authority.sqlite"),
              workspaceRoots: [],
              capabilities: [
                launcherBinding,
                brokerBinding,
                researchBinding,
                workerBinding,
                authBinding,
              ],
            },
            readyLine: "guardian authority service ready",
          }),
        );
        const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
        const broker = new LocalAuthorityIpcClient({ endpoint, binding: brokerBinding });
        const worker = new LocalAuthorityIpcClient({ endpoint, binding: workerBinding });
        const auth = new LocalAuthorityIpcClient({ endpoint, binding: authBinding });
        const issuer = new DevelopmentAuthorizationIssuer({
          authority: auth,
          binding: authBinding,
        });
        if (intent)
          await launcher.createConnection({
            schemaVersion: 1,
            connectionId,
            provider: "github",
            credentialStoreHandle: `guardian-credential://github/${connectionId}`,
            owner: "fixture",
            repository: "demo",
            permissions:
              scenario === "merge"
                ? ["pull_request:read", "pull_request:merge"]
                : ["pull_request:read"],
            status: "active",
            createdAt: issuedAt,
            updatedAt: issuedAt,
          });
        const tools: WorkerToolResult[] = [];
        let grantActivated = false,
          workerStarted = false;
        const coordinator = new ReferenceSessionBootstrapCoordinator({
          sessionId,
          callerId,
          workerMaxTurns: 8,
          workerAuthority: worker,
          missionTemplate: mission,
          workspaceSelection: workspace.selection,
          prepareWorkspace: async () =>
            await Promise.resolve({ sessionId, result: workspace } as never),
          ...(intent === undefined
            ? {}
            : {
                sessionPlan: intent,
                activateSessionPlan: async (plan, launched, confirmation) => {
                  const status = launched.runtime.status(now());
                  const record = await broker.getSession(sessionId);
                  const grant = await issuer.issueSessionPlan({
                    plan: {
                      schemaVersion: 1,
                      ...plan,
                      sessionId,
                      callerId,
                      missionId: status.missionId,
                      missionVersion: 1,
                      profileId: status.profileId,
                      profileVersion: 1,
                      policyVersion: 1,
                      version: 1,
                      startsAt: record!.startsAt,
                      expiresAt: status.expiresAt,
                    },
                    confirmation: { principalId, confirmedAt: confirmation.confirmedAt },
                  });
                  grantActivated = true;
                  return grant.grantId;
                },
              }),
          launchSession: async (input) => {
            const startsAt = now(),
              endsAt = new Date(Date.parse(startsAt) + 300000).toISOString();
            const runtime = BoundSessionRuntime.create({ ...input, startsAt, expiresAt: endsAt });
            const status = runtime.status(now());
            await launcher.createSession(
              {
                schemaVersion: 1,
                sessionId,
                callerId,
                missionId: status.missionId,
                missionVersion: 1,
                profileId: status.profileId,
                profileVersion: 1,
                policyVersion: 1,
                startsAt,
                expiresAt: endsAt,
                status: "active",
                createdAt: startsAt,
                updatedAt: startsAt,
              },
              {
                sessionId,
                remainingToolCalls: 20,
                remainingLocalCommands: 0,
                remainingResearchRequests: 2,
                remainingResearchResults: 3,
              },
              intent ? [connectionId] : [],
            );
            return {
              runtime,
              profile: input.profile,
              durableAuthority: true,
              workspace,
              localCommand: async () => {
                await Promise.resolve();
                throw Error("no local tools");
              },
              revoke: () => {
                runtime.revoke(input.revocationHandle);
              },
              interrupt: () => {
                runtime.interrupt(input.revocationHandle);
              },
              ...(scenario !== "research"
                ? {}
                : {
                    research: {
                      serviceConfig: {
                        schemaVersion: 1,
                        ...createResearchIpcCredentials(),
                        sessionId,
                        callerId,
                        missionId: status.missionId,
                        missionVersion: 1,
                        profileId: status.profileId,
                        profileVersion: 1,
                        policyVersion: 1,
                        startsAt,
                        expiresAt: endsAt,
                        scope: {
                          allowedDomains: mission.domains,
                          maxResultsPerRequest: 3,
                          remainingRequests: 2,
                          remainingResults: 3,
                          requiredTerms: ["public"],
                        },
                        controlledContent: {
                          allowedUrls: scope.researchUrls,
                          allowedDomains: mission.domains,
                          maxContentCharacters: 1000,
                          remainingRequests: 2,
                        },
                      },
                    },
                  }),
            } as never;
          },
          runWorkerTurn: async (turn) => {
            if (intent) expect(grantActivated).toBe(true);
            workerStarted = true;
            const credentials = createWorkerIpcCredentials();
            const child = await startSupervisedServiceProcess({
              entrypoint: fileURLToPath(
                new URL("../../../scripts/test-fixtures/c7-worker.mjs", import.meta.url),
              ),
              bootstrap: { schemaVersion: 1, serviceKind: "worker_turn", ...credentials, turn },
              readyLine: "guardian worker service ready",
              environment: fault === "worker" ? { C7_SYNTHETIC_FAIL: "1" } : {},
            });
            children.push(child);
            try {
              return await new LocalWorkerIpcClient({
                ...credentials,
                sessionId,
                turnId: turn.turnId,
                turnNumber: turn.turnNumber,
                turnDigest: turn.turnDigest,
              }).run(now());
            } finally {
              await child.close();
            }
          },
          executeWorkerTool: (execution, launched, signal) =>
            new TrustedWorkerToolDispatcher({
              authority: worker,
              runtime: launched.runtime,
              workspace,
              workerMaxTurns: 8,
              runLocalCommand: launched.localCommand,
              revokeRuntime: launched.revoke,
              interruptRuntime: launched.interrupt,
              remainingPrivilegedActions: async () => {
                const p = await issuer.getSessionPlan();
                return p === null || p.revoked ? 0 : p.grant.plan.maxMutations - p.usedMutations;
              },
              externalTools: {
                execute: (e) =>
                  executeSupervisedWorkerExternal({
                    researchSession,
                    riskTurn:
                      fault === "context" ? { ...riskTurn, sessionId: randomUUID() } : riskTurn,
                    execution: e,
                    launched,
                    authorityEndpoint: endpoint,
                    brokerBinding,
                    researchBinding,
                    records: broker,
                    getPlan: () => issuer.getSessionPlan(),
                    credentialStore: {
                      schemaVersion: 1,
                      custodyProfile: "byok",
                      location: {
                        schemaVersion: 1,
                        custodyProfile: "byok",
                        pool: "personal",
                        runtime: process.platform === "win32" ? "windows" : "linux",
                        storeTarget:
                          process.platform === "win32"
                            ? "windows_credential_manager"
                            : "linux_secret_service",
                      },
                    },
                    githubClientId: "fixture-client-id",
                    riskProvider: "fake",
                    now,
                    ...(signal === undefined ? {} : { signal }),
                  }),
              },
            })
              .execute(execution)
              .then(async (result) => {
                if (fault === "revoked") {
                  const p = await issuer.getSessionPlan();
                  await issuer.revokeSessionPlan(p!.grant.grantId);
                }
                return result;
              }),
          observeWorker: (event) => {
            if (event.kind === "turn") riskTurn = event.turn;
            if (event.kind === "tool") tools.push(event.result);
          },
        });
        const preview = coordinator.createDraft({ schemaVersion: 1, objective: scope.objective });
        expect(workerStarted).toBe(false);
        const result = await coordinator.confirmAndLaunch({
          schemaVersion: 1,
          draftId: preview.draftId,
          previewDigest: preview.previewDigest,
          confirmedBy: { kind: "human", principalId },
          confirmedAt: now(),
          assurance: "development_confirmation",
        });
        if (fault) {
          expect(result.workerTurn.state).toBe("failed_closed");
          expect(tools.filter((t) => t.outcome === "succeeded")).toHaveLength(
            fault === "revoked" ? 1 : 0,
          );
          return;
        }
        expect(
          result.workerTurn,
          JSON.stringify({
            boundary: result.workerTurn,
            tools: tools.map((t) => ({ name: t.name, outcome: t.outcome })),
          }),
        ).toMatchObject({ state: "completed", result: { outcome: { kind: "final_response" } } });
        expect(tools.map((t) => t.outcome)).toEqual(
          scenario === "merge" || scenario === "research"
            ? ["succeeded", "denied", "succeeded"]
            : ["succeeded", "denied"],
        );
        if (scenario === "research") {
          const sequences = tools.flatMap((t) =>
            t.name === "guardian.research" && t.outcome === "succeeded"
              ? [ControlledContentJourneyResultSchema.parse(t.output).provenance.sequence]
              : [],
          );
          expect(sequences).toHaveLength(2);
          expect(sequences[1]).toBeGreaterThan(sequences[0] ?? Number.MAX_SAFE_INTEGER);
        }
        expect(JSON.stringify(tools)).not.toContain("ghu_c7_synthetic");
        expect((await worker.getWorkerBudget(sessionId))?.remainingToolCalls).toBe(
          scenario === "merge" || scenario === "research" ? 18 : 19,
        );
      } finally {
        vi.useRealTimers();
        syntheticClock = undefined;
        await researchSession.close?.();
        await Promise.allSettled(children.map((c) => c.close()));
        await rm(directory, { recursive: true, force: true });
      }
    },
    30_000,
  );
});
