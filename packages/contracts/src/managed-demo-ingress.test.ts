import { describe, expect, it } from "vitest";

import {
  ManagedDemoJudgeIngressSecretStoreConfigSchema,
  ManagedDemoJudgeJourneyPublicResultSchema,
  ManagedDemoJudgeJourneyRequestSchema,
} from "./managed-demo-ingress.js";

describe("managed-demo judge ingress contracts", () => {
  it("binds two distinct SecretStash resources to the fixed judge ingress slots", () => {
    const location = {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "judge",
      runtime: "linux",
      storeTarget: "nebius_secretstash",
    } as const;
    const config = {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "judge",
      resources: [
        {
          schemaVersion: 1,
          location,
          slot: "access_credential_sha256",
          secretId: "mbsec-judgeaccess123",
          payloadKey: "judge_access_credential_sha256",
        },
        {
          schemaVersion: 1,
          location,
          slot: "source_fingerprint_key",
          secretId: "mbsec-judgefingerprint123",
          payloadKey: "judge_source_fingerprint_key",
        },
      ],
    } as const;

    expect(ManagedDemoJudgeIngressSecretStoreConfigSchema.parse(config)).toEqual(config);
    expect(() =>
      ManagedDemoJudgeIngressSecretStoreConfigSchema.parse({
        ...config,
        resources: [config.resources[0], config.resources[0]],
      }),
    ).toThrow(/exactly once|distinct/u);
    expect(() =>
      ManagedDemoJudgeIngressSecretStoreConfigSchema.parse({
        ...config,
        resources: [
          config.resources[0],
          { ...config.resources[1], payloadKey: "judge_access_credential_sha256" },
        ],
      }),
    ).toThrow(/payload key/u);
    expect(() =>
      ManagedDemoJudgeIngressSecretStoreConfigSchema.parse({
        ...config,
        resources: [
          config.resources[0],
          {
            ...config.resources[1],
            location: { ...location, pool: "public" },
          },
        ],
      }),
    ).toThrow(/judge pool/u);
  });

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
