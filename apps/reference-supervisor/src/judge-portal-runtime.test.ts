import { DEFAULT_NEBIUS_WORKER_SELECTION } from "@guardian/contracts";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { ReferenceSessionBootstrapCoordinator } from "./bootstrap.js";
import { SupervisorJudgePortalRuntime } from "./judge-portal-runtime.js";
import { judgeRuntimeScope } from "./judge-runtime-scope.js";
import { BoundSessionRuntime } from "@guardian/session";
import type { ReferenceAuthoritySupervisor } from "./index.js";

const scope = {
  objective: "Summarize the public update.",
  researchUrls: ["https://fixture.example.org/update"],
  githubTarget: null,
  durationSeconds: 300,
} as const;
const credentialStore = {
  schemaVersion: 1,
  custodyProfile: "byok",
  location: {
    schemaVersion: 1,
    custodyProfile: "byok",
    pool: "personal",
    runtime: process.platform === "win32" ? "windows" : "linux",
    storeTarget:
      process.platform === "win32" ? "windows_credential_manager" : "linux_secret_service",
  },
};
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

describe("portal to supervisor confirmation", () => {
  it.each([false, "permissions", "constraints"])(
    "requires confirmation before an actual bootstrap worker; altered preview=%s",
    async (altered) => {
      const root = await mkdtemp(join(tmpdir(), "guardian-c7-portal-"));
      const state = join(root, "state");
      await mkdir(state, { mode: 0o700 });
      const calls: string[] = [];
      const close = vi.fn(async () => {
        await Promise.resolve();
        calls.push("close");
      });
      const runtime = new SupervisorJudgePortalRuntime({
        projectRoot: join(root, "project"),
        stateRoot: state,
        credentialStore,
        principalId: randomUUID(),
        startSupervisor: async (config, options) => {
          await Promise.resolve();
          const mission = judgeRuntimeScope(options!.judgeScope, undefined);
          const coordinator = new ReferenceSessionBootstrapCoordinator({
            sessionId: String(config.sessionId),
            callerId: String(config.callerId),
            missionTemplate: altered
              ? {
                  ...mission,
                  ...(altered === "constraints"
                    ? { constraints: ["Read a different source."] }
                    : {
                        permissions: {
                          ...mission.permissions,
                          volume: { ...mission.permissions.volume, maxToolCalls: 19 },
                        },
                      }),
                }
              : mission,
            workerMaxTurns: 8,
            workerSelection: DEFAULT_NEBIUS_WORKER_SELECTION,
            workspaceSelection: workspace.selection,
            prepareWorkspace: async () =>
              await Promise.resolve({ sessionId: config.sessionId, result: workspace } as never),
            workerAuthority: {
              getWorkerBudget: async () => await Promise.resolve({ sessionId: config.sessionId }),
              completeWorkerSession: async () =>
                await Promise.resolve({ schemaVersion: 1, outcome: "completed" }),
            } as never,
            launchSession: async (input) => {
              await Promise.resolve();
              calls.push("activate");
              const startsAt = new Date().toISOString();
              const boundary = BoundSessionRuntime.create({
                ...input,
                startsAt,
                expiresAt: new Date(Date.parse(startsAt) + 300000).toISOString(),
              });
              return {
                runtime: boundary,
                workspace,
                profile: input.profile,
                durableAuthority: true,
                interrupt: () => boundary.interrupt(input.revocationHandle),
                revoke: () => boundary.revoke(input.revocationHandle),
              } as never;
            },
            runWorkerTurn: async (turn) => {
              await Promise.resolve();
              calls.push("worker");
              return {
                providerRequestId: "synthetic",
                turnId: turn.turnId,
                turnNumber: turn.turnNumber,
                turnDigest: turn.turnDigest,
                outcome: { kind: "final_response", response: "A bounded fixture answer." },
              };
            },
          });
          return { bootstrap: coordinator, close } as unknown as ReferenceAuthoritySupervisor;
        },
      });
      try {
        const input = {
          mode: "piloted" as const,
          scenarioId: null,
          scope: { ...scope, researchUrls: [...scope.researchUrls] },
          sourceFingerprint: "a".repeat(64),
          journeyId: randomUUID(),
          reporters: {} as never,
        };
        if (altered) {
          await expect(runtime.prepare(input)).rejects.toThrow("preparation unavailable");
          expect(calls).toEqual(["close"]);
        } else {
          const prepared = await runtime.prepare(input);
          expect(calls).toEqual([]);
          const result = await prepared.confirmAndRun(new AbortController().signal);
          expect(result).toMatchObject({
            state: "completed",
            answer: "A bounded fixture answer.",
            assurance: "observed",
          });
          expect(calls).toEqual(["activate", "worker", "close"]);
          await expect(prepared.confirmAndRun(new AbortController().signal)).rejects.toThrow();
          await prepared.close();
          expect(close).toHaveBeenCalledOnce();
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
