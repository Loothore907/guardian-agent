import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LocalInteractionIpcClient,
  LocalInteractionIpcServer,
  createInteractionIpcCredentials,
} from "./ipc.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  mission: "33333333-3333-4333-8333-333333333333",
  profile: "44444444-4444-4444-8444-444444444444",
} as const;
const NOW = "2026-08-31T10:00:00.000Z";
const servers: LocalInteractionIpcServer[] = [];

function config(
  allowedTools: readonly ("guardian.local_command" | "guardian.session_status")[] = [
    "guardian.local_command",
  ],
) {
  return {
    schemaVersion: 1,
    ...createInteractionIpcCredentials(),
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    startsAt: NOW,
    expiresAt: "2026-08-31T10:05:00.000Z",
    context: {
      objective: "Review the PR.",
      constraints: ["Do not change external services."],
      allowedTools,
    },
  } as const;
}

function client(value: ReturnType<typeof config>, overrides: Record<string, unknown> = {}) {
  return new LocalInteractionIpcClient({
    endpoint: value.endpoint,
    capability: value.capability,
    sessionId: value.sessionId,
    callerId: value.callerId,
    missionId: value.missionId,
    missionVersion: value.missionVersion,
    profileId: value.profileId,
    profileVersion: value.profileVersion,
    policyVersion: value.policyVersion,
    ...overrides,
  });
}

afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

describe("local interaction IPC", () => {
  it("delivers fixed context once and rejects replay", async () => {
    const value = config();
    const handler = vi.fn(() =>
      Promise.resolve({
        providerRequestId: "provider_request_1",
        outcome: { kind: "mission_brief" as const, summary: "Mission received." },
      }),
    );
    const server = new LocalInteractionIpcServer(value, handler, { now: () => NOW });
    servers.push(server);
    await server.listen();
    const ipcClient = client(value);

    await expect(ipcClient.runFirstTurn(NOW)).resolves.toMatchObject({
      providerRequestId: "provider_request_1",
      outcome: { kind: "mission_brief" },
    });
    expect(handler).toHaveBeenCalledWith(value.context, NOW);
    await expect(ipcClient.runFirstTurn(NOW)).rejects.toMatchObject({ reason: "turn_consumed" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects the wrong capability and expired service before provider use", async () => {
    const value = config();
    const handler = vi.fn();
    const server = new LocalInteractionIpcServer(value, handler, {
      now: () => "2026-08-31T10:05:00.000Z",
    });
    servers.push(server);
    await server.listen();

    await expect(
      client(value, { capability: "55555555-5555-4555-8555-555555555555" }).runFirstTurn(NOW),
    ).rejects.toMatchObject({ reason: "unauthorized" });
    await expect(client(value).runFirstTurn(NOW)).rejects.toMatchObject({ reason: "expired" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("fails closed when a Guardian interaction provider attempts to propose a tool", async () => {
    const value = config(["guardian.session_status"]);
    const server = new LocalInteractionIpcServer(
      value,
      () =>
        Promise.resolve({
          providerRequestId: "provider_request_1",
          outcome: {
            kind: "tool_proposal" as const,
            tool: "guardian.local_command" as const,
            arguments: {
              executable: "git" as const,
              arguments: ["status"],
              workingDirectory: "/workspace",
              timeoutSeconds: 10,
            },
          } as never,
        }),
      { now: () => NOW },
    );
    servers.push(server);
    await server.listen();

    await expect(client(value).runFirstTurn(NOW)).rejects.toMatchObject({
      reason: "provider_unavailable",
    });
  });
});
