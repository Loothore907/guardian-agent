import { describe, expect, it, vi } from "vitest";

import { BoundSessionRuntime } from "@guardian/session";
import {
  assertExactWorkerToolResult,
  createWorkerToolExecutionEnvelope,
  workerToolRequestDigest,
} from "@guardian/worker";

import { TrustedWorkerToolDispatcher } from "./worker-execution.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  mission: "33333333-3333-4333-8333-333333333333",
  profile: "44444444-4444-4444-8444-444444444444",
  turn: "55555555-5555-4555-8555-555555555555",
  execution: "66666666-6666-4666-8666-666666666666",
  revocation: "77777777-7777-4777-8777-777777777777",
  human: "88888888-8888-4888-8888-888888888888",
} as const;
const START = "2026-09-01T00:00:00.000Z";
const NOW = "2026-09-01T00:01:00.000Z";
const EXPIRY = "2026-09-01T00:05:00.000Z";

const permissions = {
  tools: ["guardian.session_status", "guardian.local_command"],
  filesystem: { mode: "workspace_write", roots: ["/workspace"] },
  network: { mode: "none", destinations: [] },
  sideEffects: ["write_workspace"],
  time: { maxDurationSeconds: 300 },
  volume: {
    maxToolCalls: 4,
    maxResearchRequests: 0,
    maxResearchResults: 0,
    maxLocalCommands: 2,
    maxPrivilegedActions: 0,
  },
} as const;

const workspace = {
  schemaVersion: 1,
  state: "ready",
  selection: {
    schemaVersion: 1,
    kind: "guardian_managed_copy",
    projectName: "guardian-project",
    sourceRootDigest: "a".repeat(64),
    sourceSnapshotDigest: "b".repeat(64),
    mountPath: "/workspace",
    persistence: "session",
    cleanup: "delete_on_close",
    hostWriteback: "none",
    limits: { maxFiles: 100, maxBytes: 1_000_000, maxFileBytes: 100_000 },
  },
  fileCount: 3,
  totalBytes: 100,
  baseline: "sanitized_git_repository",
} as const;

function runtime() {
  return BoundSessionRuntime.create({
    sessionId: IDS.session,
    callerId: IDS.caller,
    revocationHandle: IDS.revocation,
    policyVersion: 1,
    startsAt: START,
    expiresAt: EXPIRY,
    mission: {
      schemaVersion: 1,
      missionId: IDS.mission,
      version: 1,
      authoredBy: { kind: "human", principalId: IDS.human },
      authoredAt: START,
      objective: "Inspect the exact prepared workspace.",
      constraints: [],
      authority: permissions,
    },
    profile: {
      schemaVersion: 1,
      profileId: IDS.profile,
      version: 1,
      missionId: IDS.mission,
      missionVersion: 1,
      policyVersion: 1,
      permissions,
      assurance: { level: "unknown", evidence: [] },
    },
  });
}

function execution(request: unknown) {
  return createWorkerToolExecutionEnvelope({
    schemaVersion: 1,
    executionId: IDS.execution,
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    worker: { schemaVersion: 1, kind: "deterministic_reference" },
    sourceTurnId: IDS.turn,
    sourceTurnNumber: 1,
    sourceTurnDigest: "c".repeat(64),
    requestDigest: workerToolRequestDigest(request),
    request,
    workspace,
    requestedAt: NOW,
    expiresAt: "2026-09-01T00:02:00.000Z",
  });
}

function budget() {
  return {
    sessionId: IDS.session,
    remainingToolCalls: 3,
    remainingLocalCommands: 1,
    remainingResearchRequests: 0,
    remainingResearchResults: 0,
  } as const;
}

describe("trusted worker tool dispatcher", () => {
  it("reparses, authorizes, meters, executes, and binds one local command", async () => {
    const consumeLocalCommand = vi.fn(() => Promise.resolve(budget()));
    const runLocalCommand = vi.fn(() =>
      Promise.resolve({
        exitCode: 0,
        stdout: "bounded output",
        stderr: "",
        timedOut: false,
        truncated: false,
      }),
    );
    const exactExecution = execution({
      name: "guardian.local_command",
      arguments: {
        executable: "rg",
        arguments: ["TODO"],
        workingDirectory: "/workspace",
        timeoutSeconds: 10,
      },
    });
    const result = await new TrustedWorkerToolDispatcher({
      authority: {
        consumeWorkerToolCall: () => Promise.resolve(null),
        consumeLocalCommand,
      },
      runtime: runtime(),
      workspace,
      runLocalCommand,
      now: () => NOW,
    }).execute(exactExecution);

    expect(assertExactWorkerToolResult(result)).toEqual(result);
    expect(result).toMatchObject({
      executionId: exactExecution.executionId,
      executionDigest: exactExecution.executionDigest,
      requestDigest: exactExecution.requestDigest,
      name: "guardian.local_command",
      output: { stdout: "bounded output" },
      remainingBudget: { remainingToolCalls: 3, remainingLocalCommands: 1 },
    });
    expect(consumeLocalCommand).toHaveBeenCalledWith(
      IDS.session,
      exactExecution.executionId,
      exactExecution.executionDigest,
    );
    expect(runLocalCommand).toHaveBeenCalledWith(exactExecution.request.arguments);
  });

  it("meters read-only session status without consuming a local-command budget", async () => {
    const consumeWorkerToolCall = vi.fn(() => Promise.resolve(budget()));
    const result = await new TrustedWorkerToolDispatcher({
      authority: {
        consumeWorkerToolCall,
        consumeLocalCommand: () => Promise.resolve(null),
      },
      runtime: runtime(),
      workspace,
      runLocalCommand: () => Promise.reject(new Error("must not run")),
      now: () => NOW,
    }).execute(execution({ name: "guardian.session_status", arguments: {} }));

    expect(result).toMatchObject({
      name: "guardian.session_status",
      output: { sessionId: IDS.session, state: "active" },
      remainingBudget: { remainingLocalCommands: 1 },
    });
    expect(consumeWorkerToolCall).toHaveBeenCalledTimes(1);
  });

  it("rejects request mutation and workspace substitution before authority or effects", async () => {
    const consumeLocalCommand = vi.fn(() => Promise.resolve(budget()));
    const runLocalCommand = vi.fn();
    const dispatcher = new TrustedWorkerToolDispatcher({
      authority: {
        consumeWorkerToolCall: () => Promise.resolve(null),
        consumeLocalCommand,
      },
      runtime: runtime(),
      workspace,
      runLocalCommand,
      now: () => NOW,
    });
    const exactExecution = execution({
      name: "guardian.local_command",
      arguments: {
        executable: "rg",
        arguments: ["TODO"],
        workingDirectory: "/workspace",
        timeoutSeconds: 10,
      },
    });
    await expect(
      dispatcher.execute({
        ...exactExecution,
        request: {
          ...exactExecution.request,
          arguments: { ...exactExecution.request.arguments, arguments: ["SECRET"] },
        },
      }),
    ).rejects.toMatchObject({ reason: "tool_denied" });
    await expect(
      dispatcher.execute({
        ...exactExecution,
        workspace: {
          ...exactExecution.workspace,
          selection: {
            ...exactExecution.workspace.selection,
            sourceSnapshotDigest: "d".repeat(64),
          },
        },
      }),
    ).rejects.toMatchObject({ reason: "tool_denied" });
    const { executionDigest: _executionDigest, ...executionWithoutDigest } = exactExecution;
    void _executionDigest;
    const crossSessionExecution = createWorkerToolExecutionEnvelope({
      ...executionWithoutDigest,
      sessionId: "99999999-9999-4999-8999-999999999999",
    });
    await expect(dispatcher.execute(crossSessionExecution)).rejects.toMatchObject({
      reason: "tool_denied",
    });
    expect(consumeLocalCommand).not.toHaveBeenCalled();
    expect(runLocalCommand).not.toHaveBeenCalled();
  });

  it("fails closed on durable replay, authority failure, and secret-like output", async () => {
    const exactExecution = execution({
      name: "guardian.local_command",
      arguments: {
        executable: "node",
        arguments: ["script.js"],
        workingDirectory: "/workspace",
        timeoutSeconds: 10,
      },
    });
    let consumed = false;
    const dispatcher = new TrustedWorkerToolDispatcher({
      authority: {
        consumeWorkerToolCall: () => Promise.resolve(null),
        consumeLocalCommand: () => {
          if (consumed) return Promise.resolve(null);
          consumed = true;
          return Promise.resolve(budget());
        },
      },
      runtime: runtime(),
      workspace,
      runLocalCommand: () =>
        Promise.resolve({
          exitCode: 0,
          stdout: "token=unredacted-value",
          stderr: "",
          timedOut: false,
          truncated: false,
        }),
      now: () => NOW,
    });
    await expect(dispatcher.execute(exactExecution)).rejects.toMatchObject({
      reason: "tool_unavailable",
    });
    await expect(dispatcher.execute(exactExecution)).rejects.toMatchObject({
      reason: "tool_denied",
    });

    const hostPathOutput = new TrustedWorkerToolDispatcher({
      authority: {
        consumeWorkerToolCall: () => Promise.resolve(null),
        consumeLocalCommand: () => Promise.resolve(budget()),
      },
      runtime: runtime(),
      workspace,
      runLocalCommand: () =>
        Promise.resolve({
          exitCode: 0,
          stdout: "C:\\Users\\guardian\\private.txt",
          stderr: "",
          timedOut: false,
          truncated: false,
        }),
      now: () => NOW,
    });
    await expect(hostPathOutput.execute(exactExecution)).rejects.toMatchObject({
      reason: "tool_unavailable",
    });

    const unavailable = new TrustedWorkerToolDispatcher({
      authority: {
        consumeWorkerToolCall: () => Promise.reject(new Error("offline")),
        consumeLocalCommand: () => Promise.reject(new Error("offline")),
      },
      runtime: runtime(),
      workspace,
      runLocalCommand: () => Promise.reject(new Error("must not run")),
      now: () => NOW,
    });
    await expect(
      unavailable.execute(execution({ name: "guardian.session_status", arguments: {} })),
    ).rejects.toMatchObject({ reason: "authority_unavailable" });
  });
});
