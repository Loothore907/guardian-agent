import { afterEach, describe, expect, it } from "vitest";

import {
  InteractionIpcError,
  LocalInteractionIpcClient,
  createInteractionIpcCredentials,
} from "@guardian/interaction";

import { startInteractionService } from "./index.js";

const NOW = "2026-08-31T10:00:00.000Z";
const services: Awaited<ReturnType<typeof startInteractionService>>[] = [];

function config() {
  return {
    schemaVersion: 1,
    ...createInteractionIpcCredentials(),
    sessionId: "11111111-1111-4111-8111-111111111111",
    callerId: "22222222-2222-4222-8222-222222222222",
    missionId: "33333333-3333-4333-8333-333333333333",
    missionVersion: 1,
    profileId: "44444444-4444-4444-8444-444444444444",
    profileVersion: 1,
    policyVersion: 1,
    startsAt: NOW,
    expiresAt: "2026-08-31T10:05:00.000Z",
    context: {
      objective: "Review the PR.",
      constraints: ["Do not change external services."],
      allowedTools: ["guardian.session_status"],
    },
  } as const;
}

function client(value: ReturnType<typeof config>) {
  return new LocalInteractionIpcClient(value);
}

afterEach(async () => Promise.all(services.splice(0).map((service) => service.close())));

describe("interaction provider service", () => {
  it("projects only fixed mission context to the provider", async () => {
    const value = config();
    let received: unknown;
    const service = await startInteractionService(
      value,
      {
        runFirstTurn: (context) => {
          received = context;
          return Promise.resolve({
            requestId: "provider_request_1",
            outcome: { kind: "mission_brief", summary: "Mission received." },
          });
        },
      },
      { now: () => NOW },
    );
    services.push(service);

    await expect(client(value).runFirstTurn(NOW)).resolves.toMatchObject({
      outcome: { kind: "mission_brief" },
    });
    expect(received).toEqual(value.context);
    expect(received).not.toHaveProperty("capability");
  });

  it("maps malformed provider output to a sanitized failure", async () => {
    const value = config();
    const service = await startInteractionService(
      value,
      {
        runFirstTurn: () =>
          Promise.resolve({
            requestId: "provider_request_1",
            outcome: { kind: "mission_brief", summary: "Done", secret: "do-not-leak" },
          }),
      },
      { now: () => NOW },
    );
    services.push(service);

    await expect(client(value).runFirstTurn(NOW)).rejects.toMatchObject({
      name: InteractionIpcError.name,
      reason: "provider_malformed",
    });
  });

  it("redacts recognizable credential material from a bounded completion", async () => {
    const value = config();
    const service = await startInteractionService(
      value,
      {
        runFirstTurn: () =>
          Promise.resolve({
            requestId: "provider_request_1",
            outcome: { kind: "mission_brief", summary: "Do not return token=credential-value" },
          }),
      },
      { now: () => NOW },
    );
    services.push(service);

    await expect(client(value).runFirstTurn(NOW)).resolves.toMatchObject({
      outcome: { kind: "mission_brief", summary: "Do not return token=[redacted]" },
    });
  });
});
