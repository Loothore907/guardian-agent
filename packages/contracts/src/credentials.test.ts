import { describe, expect, it } from "vitest";

import {
  CredentialCapabilityBindingSchema,
  CredentialLocationSchema,
  RegisteredCredentialReferenceSchema,
  credentialMaterialKind,
  registeredCredentialReference,
} from "./credentials.js";

describe("credential registry contracts", () => {
  it.each([
    ["nebius", "default"],
    ["tavily", "default"],
    ["github", "default"],
    ["github", "refresh"],
    ["github", "metadata"],
  ] as const)("registers %s/%s", (provider, slot) => {
    expect(registeredCredentialReference(provider, slot)).toEqual({
      schemaVersion: 1,
      provider,
      slot,
    });
  });

  it.each([
    { schemaVersion: 1, provider: "nebius", slot: "refresh" },
    { schemaVersion: 1, provider: "tavily", slot: "metadata" },
    { schemaVersion: 1, provider: "github", slot: "arbitrary" },
    { schemaVersion: 1, provider: "unknown", slot: "default" },
  ])("rejects an unregistered provider and slot pair", (reference) => {
    expect(() => RegisteredCredentialReferenceSchema.parse(reference)).toThrow();
  });

  it("distinguishes GitHub metadata from secret material", () => {
    expect(credentialMaterialKind(registeredCredentialReference("github", "metadata"))).toBe(
      "credential_metadata",
    );
    expect(credentialMaterialKind(registeredCredentialReference("github", "refresh"))).toBe(
      "secret",
    );
  });

  it.each([
    {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "public",
      runtime: "linux",
      storeTarget: "nebius_secretstash",
    },
    {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "judge",
      runtime: "linux",
      storeTarget: "nebius_secretstash",
    },
    {
      schemaVersion: 1,
      custodyProfile: "byok",
      pool: "personal",
      runtime: "windows",
      storeTarget: "windows_credential_manager",
    },
    {
      schemaVersion: 1,
      custodyProfile: "byok",
      pool: "personal",
      runtime: "linux",
      storeTarget: "linux_secret_service",
    },
    {
      schemaVersion: 1,
      custodyProfile: "byok",
      pool: "personal",
      runtime: "macos",
      storeTarget: "macos_keychain",
    },
  ])("accepts a supported custody location", (location) => {
    expect(CredentialLocationSchema.parse(location)).toEqual(location);
  });

  it.each([
    {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "personal",
      runtime: "linux",
      storeTarget: "nebius_secretstash",
    },
    {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "public",
      runtime: "windows",
      storeTarget: "nebius_secretstash",
    },
    {
      schemaVersion: 1,
      custodyProfile: "managed_demo",
      pool: "judge",
      runtime: "linux",
      storeTarget: "linux_secret_service",
    },
    {
      schemaVersion: 1,
      custodyProfile: "byok",
      pool: "public",
      runtime: "linux",
      storeTarget: "linux_secret_service",
    },
    {
      schemaVersion: 1,
      custodyProfile: "byok",
      pool: "personal",
      runtime: "macos",
      storeTarget: "linux_secret_service",
    },
  ])("rejects cross-profile, cross-pool, and cross-store locations", (location) => {
    expect(() => CredentialLocationSchema.parse(location)).toThrow();
  });

  it.each([
    ["nebius", "default", "interaction_service"],
    ["nebius", "default", "guardian_service"],
    ["nebius", "default", "worker_service"],
    ["tavily", "default", "research_service"],
    ["github", "default", "broker_service"],
    ["github", "refresh", "broker_service"],
    ["github", "metadata", "broker_service"],
  ] as const)("binds %s/%s only to %s", (provider, slot, consumer) => {
    const location = {
      schemaVersion: 1,
      custodyProfile: "byok",
      pool: "personal",
      runtime: "linux",
      storeTarget: "linux_secret_service",
    } as const;
    expect(
      CredentialCapabilityBindingSchema.parse({
        schemaVersion: 1,
        location,
        reference: registeredCredentialReference(provider, slot),
        consumer,
      }),
    ).toMatchObject({ reference: { provider, slot }, consumer });
  });

  it("rejects a provider binding to the wrong credential-holding service", () => {
    expect(() =>
      CredentialCapabilityBindingSchema.parse({
        schemaVersion: 1,
        location: {
          schemaVersion: 1,
          custodyProfile: "managed_demo",
          pool: "public",
          runtime: "linux",
          storeTarget: "nebius_secretstash",
        },
        reference: registeredCredentialReference("github", "default"),
        consumer: "worker_service",
      }),
    ).toThrow();
  });
});
