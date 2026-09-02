import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";

import { LocalAuthorityIpcClient, createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { afterEach, describe, expect, it } from "vitest";

import { startAuthorityService } from "./index.js";

const temporaryDirectories: string[] = [];
const SESSION = "11111111-1111-4111-8111-111111111111";
const CALLER = "22222222-2222-4222-8222-222222222222";
const START = "2026-08-30T22:30:00.000Z";
const NOW = "2026-08-30T22:32:00.000Z";
const EXPIRY = "2026-08-30T22:40:00.000Z";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function location() {
  const directory = await mkdtemp(join(tmpdir(), "guardian-authority-service-"));
  temporaryDirectories.push(directory);
  if (process.platform !== "win32") await chmod(directory, 0o700);
  return { directory, databasePath: join(directory, "authority.sqlite") };
}

function binding(
  capability: string,
  callerRole: "launcher" | "broker_service" | "worker_dispatcher",
  allowedOperations: readonly string[],
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: 1,
    capability,
    callerRole,
    callerId: CALLER,
    sessionId: SESSION,
    allowedOperations,
    issuedAt: START,
    expiresAt: EXPIRY,
    ...overrides,
  };
}

function session() {
  return {
    schemaVersion: 1,
    sessionId: SESSION,
    callerId: CALLER,
    missionId: "33333333-3333-4333-8333-333333333333",
    missionVersion: 1,
    profileId: "44444444-4444-4444-8444-444444444444",
    profileVersion: 1,
    policyVersion: 1,
    startsAt: START,
    expiresAt: EXPIRY,
    status: "active",
    createdAt: START,
    updatedAt: START,
  } as const;
}

function budget() {
  return {
    sessionId: SESSION,
    remainingToolCalls: 2,
    remainingLocalCommands: 0,
    remainingResearchRequests: 1,
    remainingResearchResults: 2,
  };
}

function rawRequest(endpoint: string, frame: string): Promise<Record<string, unknown>> {
  return new Promise((resolveResponse, rejectResponse) => {
    const socket = createConnection(endpoint);
    let response = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      response += chunk;
    });
    socket.once("error", rejectResponse);
    socket.once("end", () => {
      try {
        resolveResponse(JSON.parse(response.trim()) as Record<string, unknown>);
      } catch (error) {
        rejectResponse(error instanceof Error ? error : new Error("invalid authority response"));
      }
    });
    socket.write(frame);
  });
}

describe("central authority service", () => {
  it("gives the worker dispatcher only replay-bound atomic budget operations", async () => {
    const { databasePath } = await location();
    const endpoint = createAuthorityIpcEndpoint();
    const launcherBinding = binding(randomUUID(), "launcher", ["session.create"]);
    const workerBinding = binding(randomUUID(), "worker_dispatcher", [
      "budget.consume_worker_tool",
      "budget.consume_local_command",
      "worker.record_violation",
      "worker.interrupt",
    ]);
    const service = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [launcherBinding, workerBinding],
      },
      { now: () => NOW },
    );
    try {
      const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
      await launcher.createSession(session(), {
        ...budget(),
        remainingToolCalls: 2,
        remainingLocalCommands: 1,
      });
      const worker = new LocalAuthorityIpcClient({ endpoint, binding: workerBinding });
      const executionId = randomUUID();
      const executionDigest = "a".repeat(64);
      await expect(
        worker.consumeLocalCommand(SESSION, executionId, executionDigest),
      ).resolves.toMatchObject({
        outcome: "allowed",
        budget: { remainingToolCalls: 1, remainingLocalCommands: 0 },
      });
      await expect(
        worker.consumeLocalCommand(SESSION, executionId, executionDigest),
      ).resolves.toMatchObject({ outcome: "denied", disposition: "revoked" });
      await expect(
        worker.consumeLocalCommand(SESSION, executionId, "b".repeat(64)),
      ).resolves.toMatchObject({ outcome: "unavailable", reason: "revoked" });
      await expect(
        worker.consumeWorkerToolCall(SESSION, randomUUID(), "c".repeat(64)),
      ).resolves.toMatchObject({ outcome: "unavailable", reason: "revoked" });
      await expect(worker.consumeToolCall(SESSION)).rejects.toMatchObject({
        reason: "operation_not_allowed",
      });
    } finally {
      await service.close();
    }
  });

  it("contains ordinary worker violations and durably interrupts trusted-boundary failure", async () => {
    const { databasePath } = await location();
    const endpoint = createAuthorityIpcEndpoint();
    const launcherBinding = binding(randomUUID(), "launcher", ["session.create"]);
    const workerBinding = binding(randomUUID(), "worker_dispatcher", [
      "worker.record_violation",
      "worker.interrupt",
    ]);
    const brokerBinding = binding(randomUUID(), "broker_service", ["session.get"]);
    const service = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [launcherBinding, workerBinding, brokerBinding],
      },
      { now: () => NOW },
    );
    try {
      const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
      await launcher.createSession(session(), budget());
      const worker = new LocalAuthorityIpcClient({ endpoint, binding: workerBinding });
      await expect(
        worker.recordWorkerViolation(
          SESSION,
          randomUUID(),
          "d".repeat(64),
          "filesystem_not_allowed",
        ),
      ).resolves.toMatchObject({ outcome: "denied", disposition: "continue" });
      const broker = new LocalAuthorityIpcClient({ endpoint, binding: brokerBinding });
      await expect(broker.getSession(SESSION)).resolves.toMatchObject({ status: "active" });
      await expect(
        worker.interruptWorkerSession(SESSION, randomUUID(), "e".repeat(64), "tool_unavailable"),
      ).resolves.toMatchObject({ outcome: "interrupted" });
      await expect(broker.getSession(SESSION)).resolves.toMatchObject({ status: "interrupted" });
    } finally {
      await service.close();
    }
  });

  it("authenticates exact caller bindings and never persists IPC capabilities", async () => {
    const { databasePath } = await location();
    const endpoint = createAuthorityIpcEndpoint();
    const launcherCapability = randomUUID();
    const brokerCapability = randomUUID();
    const launcherBinding = binding(launcherCapability, "launcher", ["session.create"]);
    const brokerBinding = binding(brokerCapability, "broker_service", ["session.get"]);
    const service = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [launcherBinding, brokerBinding],
      },
      { now: () => NOW },
    );
    try {
      const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
      await launcher.createSession(session(), budget());
      const broker = new LocalAuthorityIpcClient({ endpoint, binding: brokerBinding });
      await expect(broker.getSession(SESSION)).resolves.toMatchObject({ status: "active" });

      const wrongCaller = new LocalAuthorityIpcClient({
        endpoint,
        binding: { ...brokerBinding, callerId: randomUUID() },
      });
      await expect(wrongCaller.getSession(SESSION)).rejects.toMatchObject({
        reason: "binding_mismatch",
      });

      const unknownCapability = new LocalAuthorityIpcClient({
        endpoint,
        binding: { ...brokerBinding, capability: randomUUID() },
      });
      await expect(unknownCapability.getSession(SESSION)).rejects.toMatchObject({
        reason: "unauthorized",
      });
    } finally {
      await service.close();
    }

    const databaseBytes = await readFile(databasePath);
    expect(databaseBytes.includes(Buffer.from(launcherCapability))).toBe(false);
    expect(databaseBytes.includes(Buffer.from(brokerCapability))).toBe(false);
  });

  it("rejects expired and prior-instance capabilities after restart", async () => {
    const { databasePath } = await location();
    const endpoint = createAuthorityIpcEndpoint();
    const launcherBinding = binding(randomUUID(), "launcher", ["session.create"]);
    const oldBrokerBinding = binding(randomUUID(), "broker_service", ["session.get"]);
    const first = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [launcherBinding, oldBrokerBinding],
      },
      { now: () => NOW },
    );
    const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
    await launcher.createSession(session(), budget());
    const oldBroker = new LocalAuthorityIpcClient({ endpoint, binding: oldBrokerBinding });
    await first.close();

    const newBrokerBinding = binding(randomUUID(), "broker_service", ["session.get"]);
    const second = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [newBrokerBinding],
      },
      { now: () => NOW },
    );
    try {
      expect(second.interruptedSessions).toBe(1);
      await expect(oldBroker.getSession(SESSION)).rejects.toMatchObject({
        reason: "unauthorized",
      });
      const currentBroker = new LocalAuthorityIpcClient({ endpoint, binding: newBrokerBinding });
      await expect(currentBroker.getSession(SESSION)).resolves.toMatchObject({
        status: "interrupted",
      });

      const expiredBinding = binding(randomUUID(), "broker_service", ["session.get"], {
        expiresAt: NOW,
      });
      await second.close();
      const expiredService = await startAuthorityService(
        {
          schemaVersion: 1,
          serviceInstanceId: randomUUID(),
          endpoint,
          authorityStorePath: databasePath,
          workspaceRoots: [],
          capabilities: [expiredBinding],
        },
        { now: () => NOW },
      );
      try {
        const expiredClient = new LocalAuthorityIpcClient({ endpoint, binding: expiredBinding });
        await expect(expiredClient.getSession(SESSION)).rejects.toMatchObject({
          reason: "stale_capability",
        });
      } finally {
        await expiredService.close();
      }
    } finally {
      await second.close();
    }
  });

  it("rejects capabilities that grant operations outside their caller role", async () => {
    const { databasePath } = await location();
    await expect(
      startAuthorityService(
        {
          schemaVersion: 1,
          serviceInstanceId: randomUUID(),
          endpoint: createAuthorityIpcEndpoint(),
          authorityStorePath: databasePath,
          workspaceRoots: [],
          capabilities: [binding(randomUUID(), "broker_service", ["session.create"])],
        },
        { now: () => NOW },
      ),
    ).rejects.toThrow(/outside its caller role/u);
  });

  it("rejects oversized frames without invoking an authority operation", async () => {
    const { databasePath } = await location();
    const endpoint = createAuthorityIpcEndpoint();
    const brokerBinding = binding(randomUUID(), "broker_service", ["session.get"]);
    const service = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [brokerBinding],
      },
      { now: () => NOW },
    );
    try {
      await expect(rawRequest(endpoint, `${"x".repeat(16 * 1_024 + 1)}\n`)).resolves.toMatchObject({
        ok: false,
        error: "invalid_request",
      });
    } finally {
      await service.close();
    }
  });
});
