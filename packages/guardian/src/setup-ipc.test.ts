import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LocalMissionSetupRiskIpcClient,
  LocalMissionSetupRiskIpcServer,
  createMissionSetupRiskIpcCredentials,
} from "./setup-ipc.js";

const NOW = "2026-09-01T00:00:00.000Z";
const envelope = {
  schemaVersion: 1,
  draftId: "11111111-1111-4111-8111-111111111111",
  revision: 1,
  modelPolicyId: "competition-2026-09-01",
  modelPolicyVersion: 1,
  requestDigest: "a".repeat(64),
  expiresAt: "2026-09-01T00:05:00.000Z",
  route: { requested: "qwen_assisted", effective: "qwen_assisted" },
  deterministicFloor: "confirm",
  objective: "Research public law.",
  constraints: [],
  permissions: {
    tools: [],
    filesystem: { mode: "none", roots: [] },
    network: { mode: "none", destinations: [] },
    sideEffects: [],
    time: { maxDurationSeconds: 60 },
    volume: {
      maxToolCalls: 1,
      maxResearchRequests: 0,
      maxResearchResults: 0,
      maxLocalCommands: 0,
      maxPrivilegedActions: 0,
    },
  },
  riskSignals: ["clean_scope"],
  containsCredentials: false,
} as const;
const servers: LocalMissionSetupRiskIpcServer[] = [];

afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

describe("mission setup risk IPC", () => {
  it("binds one evaluation to the exact normalized request digest", async () => {
    const credentials = createMissionSetupRiskIpcCredentials();
    const handler = vi.fn(() =>
      Promise.resolve({
        status: "evaluated" as const,
        providerRequestId: "setup_1",
        authorizationLevel: "confirm" as const,
        certainty: "certain" as const,
      }),
    );
    const server = new LocalMissionSetupRiskIpcServer(
      {
        schemaVersion: 1,
        serviceKind: "mission_setup_risk",
        ...credentials,
        startsAt: NOW,
        expiresAt: "2026-09-01T00:01:00.000Z",
        envelope,
      },
      handler,
      { now: () => NOW },
    );
    servers.push(server);
    await server.listen();
    const client = new LocalMissionSetupRiskIpcClient({
      ...credentials,
      draftId: envelope.draftId,
      revision: envelope.revision,
      requestDigest: envelope.requestDigest,
    });

    await expect(client.evaluate(NOW)).resolves.toMatchObject({ authorizationLevel: "confirm" });
    expect(handler).toHaveBeenCalledWith(envelope);
    await expect(client.evaluate(NOW)).rejects.toMatchObject({ reason: "turn_consumed" });
  });

  it("rejects a wrong digest before provider use", async () => {
    const credentials = createMissionSetupRiskIpcCredentials();
    const handler = vi.fn();
    const server = new LocalMissionSetupRiskIpcServer(
      {
        schemaVersion: 1,
        serviceKind: "mission_setup_risk",
        ...credentials,
        startsAt: NOW,
        expiresAt: "2026-09-01T00:01:00.000Z",
        envelope,
      },
      handler,
      { now: () => NOW },
    );
    servers.push(server);
    await server.listen();

    await expect(
      new LocalMissionSetupRiskIpcClient({
        ...credentials,
        draftId: envelope.draftId,
        revision: 1,
        requestDigest: "b".repeat(64),
      }).evaluate(NOW),
    ).rejects.toMatchObject({ reason: "unauthorized" });
    expect(handler).not.toHaveBeenCalled();
  });
});
