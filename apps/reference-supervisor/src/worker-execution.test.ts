import { describe, expect, it, vi } from "vitest";

import type { AuthorityWorkerClient } from "@guardian/authority-client";
import { DEFAULT_WORKER_VIOLATION_POLICY } from "@guardian/contracts";
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

function allowed() {
  return {
    schemaVersion: 1,
    policyId: DEFAULT_WORKER_VIOLATION_POLICY.policyId,
    policyVersion: DEFAULT_WORKER_VIOLATION_POLICY.version,
    outcome: "allowed",
    budget: budget(),
  } as const;
}

function denied(disposition: "continue" | "revoked") {
  return {
    schemaVersion: 1,
    policyId: DEFAULT_WORKER_VIOLATION_POLICY.policyId,
    policyVersion: DEFAULT_WORKER_VIOLATION_POLICY.version,
    outcome: "denied",
    disposition,
    publicCode: "request_denied",
    budget: budget(),
  } as const;
}

function unavailable(reason: "not_active" | "expired" | "revoked") {
  return {
    schemaVersion: 1,
    policyId: DEFAULT_WORKER_VIOLATION_POLICY.policyId,
    policyVersion: DEFAULT_WORKER_VIOLATION_POLICY.version,
    outcome: "unavailable",
    reason,
    budget: budget(),
  } as const;
}

function authority(overrides: Partial<AuthorityWorkerClient> = {}): AuthorityWorkerClient {
  return {
    consumeWorkerToolCall: () => Promise.resolve(allowed()),
    consumeLocalCommand: () => Promise.resolve(allowed()),
    recordWorkerViolation: () => Promise.resolve(denied("continue")),
    interruptWorkerSession: () =>
      Promise.resolve({
        schemaVersion: 1,
        policyId: DEFAULT_WORKER_VIOLATION_POLICY.policyId,
        policyVersion: DEFAULT_WORKER_VIOLATION_POLICY.version,
        outcome: "interrupted",
      }),
    ...overrides,
  };
}

function dispatcher(options: {
  readonly authority?: AuthorityWorkerClient;
  readonly runtime?: BoundSessionRuntime;
  readonly runLocalCommand?: () => Promise<{
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly timedOut: boolean;
    readonly truncated: boolean;
  }>;
}) {
  const exactRuntime = options.runtime ?? runtime();
  return new TrustedWorkerToolDispatcher({
    authority: options.authority ?? authority(),
    runtime: exactRuntime,
    workspace,
    runLocalCommand:
      options.runLocalCommand ??
      (() =>
        Promise.resolve({
          exitCode: 0,
          stdout: "bounded output",
          stderr: "",
          timedOut: false,
          truncated: false,
        })),
    revokeRuntime: () => {
      if (!exactRuntime.revoke(IDS.revocation)) throw new TypeError("test revocation failed");
    },
    interruptRuntime: () => {
      if (!exactRuntime.interrupt(IDS.revocation)) throw new TypeError("test interruption failed");
    },
    now: () => NOW,
  });
}

describe("trusted worker tool dispatcher", () => {
  it("reparses, authorizes, meters, executes, and binds one local command", async () => {
    const consumeLocalCommand = vi.fn(() => Promise.resolve(allowed()));
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
    const result = await dispatcher({
      authority: authority({ consumeLocalCommand }),
      runLocalCommand,
    }).execute(exactExecution);

    expect(assertExactWorkerToolResult(result)).toEqual(result);
    expect(result).toMatchObject({
      outcome: "succeeded",
      executionId: exactExecution.executionId,
      executionDigest: exactExecution.executionDigest,
      requestDigest: exactExecution.requestDigest,
      name: "guardian.local_command",
      output: { stdout: "bounded output" },
      remainingBudget: { remainingToolCalls: 3, remainingLocalCommands: 1 },
    });
    expect(runLocalCommand).toHaveBeenCalledWith(exactExecution.request.arguments);
  });

  it("returns an exact sanitized denial while an ordinary rejected action stays contained", async () => {
    const recordWorkerViolation = vi.fn(() => Promise.resolve(denied("continue")));
    const runLocalCommand = vi.fn();
    const exactExecution = execution({
      name: "guardian.local_command",
      arguments: {
        executable: "rg",
        arguments: ["TODO"],
        workingDirectory: "/outside",
        timeoutSeconds: 10,
      },
    });
    const result = await dispatcher({
      authority: authority({ recordWorkerViolation }),
      runLocalCommand,
    }).execute(exactExecution);

    expect(assertExactWorkerToolResult(result)).toEqual(result);
    expect(result).toMatchObject({
      outcome: "denied",
      name: "guardian.local_command",
      denial: { code: "request_denied", disposition: "continue" },
      remainingBudget: { remainingToolCalls: 3, remainingLocalCommands: 1 },
    });
    expect(result).not.toHaveProperty("reason");
    expect(recordWorkerViolation).toHaveBeenCalledWith(
      IDS.session,
      IDS.execution,
      exactExecution.executionDigest,
      "filesystem_not_allowed",
    );
    expect(runLocalCommand).not.toHaveBeenCalled();
  });

  it("applies an authority-selected revocation and never executes a critical near miss", async () => {
    const exactRuntime = runtime();
    const recordWorkerViolation = vi.fn(() => Promise.resolve(denied("revoked")));
    const runLocalCommand = vi.fn();
    const exactExecution = execution({ name: "guardian.session_status", arguments: {} });
    const result = await dispatcher({
      authority: authority({ recordWorkerViolation }),
      runtime: exactRuntime,
      runLocalCommand,
    }).execute({ ...exactExecution, executionDigest: "f".repeat(64) });

    expect(result).toMatchObject({
      outcome: "denied",
      denial: { code: "request_denied", disposition: "revoked" },
    });
    expect(recordWorkerViolation).toHaveBeenCalledWith(
      IDS.session,
      IDS.execution,
      "f".repeat(64),
      "execution_binding_mismatch",
    );
    expect(exactRuntime.status(NOW).state).toBe("revoked");
    expect(runLocalCommand).not.toHaveBeenCalled();
  });

  it("attributes cross-session and workspace substitution to the bound runtime session", async () => {
    const base = execution({ name: "guardian.session_status", arguments: {} });
    const { executionDigest: _baseDigest, ...withoutDigest } = base;
    void _baseDigest;
    const crossSession = createWorkerToolExecutionEnvelope({
      ...withoutDigest,
      sessionId: "99999999-9999-4999-8999-999999999999",
    });
    const crossSessionRecord = vi.fn(() => Promise.resolve(denied("revoked")));
    await dispatcher({
      authority: authority({ recordWorkerViolation: crossSessionRecord }),
    }).execute(crossSession);
    expect(crossSessionRecord).toHaveBeenCalledWith(
      IDS.session,
      crossSession.executionId,
      crossSession.executionDigest,
      "execution_binding_mismatch",
    );

    const substitutedWorkspace = createWorkerToolExecutionEnvelope({
      ...withoutDigest,
      workspace: {
        ...workspace,
        selection: { ...workspace.selection, sourceSnapshotDigest: "d".repeat(64) },
      },
    });
    const workspaceRecord = vi.fn(() => Promise.resolve(denied("revoked")));
    await dispatcher({
      authority: authority({ recordWorkerViolation: workspaceRecord }),
    }).execute(substitutedWorkspace);
    expect(workspaceRecord).toHaveBeenCalledWith(
      IDS.session,
      substitutedWorkspace.executionId,
      substitutedWorkspace.executionDigest,
      "workspace_binding_mismatch",
    );
  });

  it("interrupts the trusted runtime when execution or result sanitization fails", async () => {
    const exactRuntime = runtime();
    const interruptWorkerSession = vi.fn(() =>
      Promise.resolve({
        schemaVersion: 1 as const,
        policyId: DEFAULT_WORKER_VIOLATION_POLICY.policyId,
        policyVersion: DEFAULT_WORKER_VIOLATION_POLICY.version,
        outcome: "interrupted" as const,
      }),
    );
    const exactExecution = execution({
      name: "guardian.local_command",
      arguments: {
        executable: "node",
        arguments: ["script.js"],
        workingDirectory: "/workspace",
        timeoutSeconds: 10,
      },
    });
    await expect(
      dispatcher({
        authority: authority({ interruptWorkerSession }),
        runtime: exactRuntime,
        runLocalCommand: () =>
          Promise.resolve({
            exitCode: 0,
            stdout: "token=unredacted-value",
            stderr: "",
            timedOut: false,
            truncated: false,
          }),
      }).execute(exactExecution),
    ).rejects.toMatchObject({ reason: "tool_unavailable" });
    expect(interruptWorkerSession).toHaveBeenCalledWith(
      IDS.session,
      IDS.execution,
      exactExecution.executionDigest,
      "result_invalid",
    );
    expect(exactRuntime.status(NOW).state).toBe("interrupted");
  });

  it("fails closed and interrupts locally when durable authority is unavailable", async () => {
    const exactRuntime = runtime();
    await expect(
      dispatcher({
        authority: authority({
          consumeWorkerToolCall: () => Promise.reject(new Error("offline")),
        }),
        runtime: exactRuntime,
      }).execute(execution({ name: "guardian.session_status", arguments: {} })),
    ).rejects.toMatchObject({ reason: "authority_unavailable" });
    expect(exactRuntime.status(NOW).state).toBe("interrupted");
  });

  it("mirrors a durable revoked or interrupted state into the local runtime", async () => {
    const revokedRuntime = runtime();
    await expect(
      dispatcher({
        authority: authority({
          consumeWorkerToolCall: () => Promise.resolve(unavailable("revoked")),
        }),
        runtime: revokedRuntime,
      }).execute(execution({ name: "guardian.session_status", arguments: {} })),
    ).rejects.toMatchObject({ reason: "not_active" });
    expect(revokedRuntime.status(NOW).state).toBe("revoked");

    const interruptedRuntime = runtime();
    await expect(
      dispatcher({
        authority: authority({
          consumeWorkerToolCall: () => Promise.resolve(unavailable("not_active")),
        }),
        runtime: interruptedRuntime,
      }).execute(execution({ name: "guardian.session_status", arguments: {} })),
    ).rejects.toMatchObject({ reason: "not_active" });
    expect(interruptedRuntime.status(NOW).state).toBe("interrupted");
  });
});
