import { ManagedDemoJourneyUsageReportersSchema } from "@guardian/contracts";
import { describe, expect, it } from "vitest";

import { normalizeManagedDemoJourneyUsageReporters } from "./index.js";

const roles = [
  "interaction_service",
  "guardian_service",
  "worker_service",
  "research_service",
] as const;

function reporters() {
  const capabilityIds = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444",
  ] as const;
  const values = roles.map((role, index) => ({
    schemaVersion: 1 as const,
    budget: {
      schemaVersion: 1 as const,
      endpoint: "guardian-managed-demo-budget",
      binding: {
        schemaVersion: 1 as const,
        capability: capabilityIds[index],
        callerRole: role,
        callerId: "55555555-5555-4555-8555-555555555555",
        deploymentId: "66666666-6666-4666-8666-666666666666",
        allowedOperations: ["usage.record" as const],
        issuedAt: "2026-09-04T12:00:00.000Z",
        expiresAt: "2026-09-04T12:05:00.000Z",
      },
    },
    reservationId: "77777777-7777-4777-8777-777777777777",
    journeyId: "88888888-8888-4888-8888-888888888888",
  }));
  return {
    interaction: values[0],
    guardian: values[1],
    worker: values[2],
    research: values[3],
  };
}

describe("managed-demo supervisor reporter projection", () => {
  it("accepts one exact four-role journey reporter set", () => {
    const expected = ManagedDemoJourneyUsageReportersSchema.parse(reporters());
    expect(normalizeManagedDemoJourneyUsageReporters(expected)).toEqual(expected);
  });

  it("rejects role and reservation substitution before supervisor startup", () => {
    const candidate = reporters();
    expect(() =>
      normalizeManagedDemoJourneyUsageReporters({
        ...candidate,
        worker: { ...candidate.worker, reservationId: "99999999-9999-4999-8999-999999999999" },
      }),
    ).toThrow("inconsistent bindings");
    expect(() =>
      normalizeManagedDemoJourneyUsageReporters({
        ...candidate,
        worker: {
          ...candidate.worker,
          budget: {
            ...candidate.worker?.budget,
            binding: {
              ...candidate.worker?.budget?.binding,
              callerRole: "guardian_service",
            },
          },
        },
      }),
    ).toThrow("wrong caller capability");
  });
});
