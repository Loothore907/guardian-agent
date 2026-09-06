import { describe, expect, it } from "vitest";

import {
  ManagedDemoJudgeJourneyPublicResultSchema,
  ManagedDemoJudgeJourneyRequestSchema,
} from "./managed-demo-ingress.js";

describe("managed-demo judge ingress contracts", () => {
  it("accepts only one credential-safe objective", () => {
    expect(
      ManagedDemoJudgeJourneyRequestSchema.parse({
        schemaVersion: 1,
        objective: "Review the bounded demonstration repository",
      }),
    ).toEqual({
      schemaVersion: 1,
      objective: "Review the bounded demonstration repository",
    });

    expect(() =>
      ManagedDemoJudgeJourneyRequestSchema.parse({
        schemaVersion: 1,
        objective: "Review the bounded demonstration repository",
        pool: "judge",
      }),
    ).toThrow();
    expect(() =>
      ManagedDemoJudgeJourneyRequestSchema.parse({
        schemaVersion: 1,
        objective: "token=abcdefghijklmnopqrstuvwxyz0123456789",
      }),
    ).toThrow(/secret-like/u);
  });

  it("keeps public results to an allowlisted state and code", () => {
    expect(
      ManagedDemoJudgeJourneyPublicResultSchema.parse({
        schemaVersion: 1,
        state: "denied",
        code: "capacity_unavailable",
      }),
    ).toEqual({ schemaVersion: 1, state: "denied", code: "capacity_unavailable" });

    expect(() =>
      ManagedDemoJudgeJourneyPublicResultSchema.parse({
        schemaVersion: 1,
        state: "stopped",
        code: "provider_failed",
      }),
    ).toThrow();
    expect(() =>
      ManagedDemoJudgeJourneyPublicResultSchema.parse({
        schemaVersion: 1,
        state: "completed",
        sourceFingerprint: "a".repeat(64),
      }),
    ).toThrow();
  });
});
