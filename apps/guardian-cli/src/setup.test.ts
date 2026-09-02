import { describe, expect, it, vi } from "vitest";

import { InMemoryCredentialStore } from "@guardian/credential-store";
import type { CredentialStore } from "@guardian/credential-store";
import { FixedOriginCredentialVerifier } from "@guardian/credential-verification";
import type { GitHubDeviceAuthorizer } from "@guardian/credential-verification";

import {
  parseGuardianSetupArguments,
  runGitHubDeviceSetup,
  runGuardianSetup,
  runGuardianSetupRevoke,
  runGuardianSetupStatus,
  type GuardianSetupIo,
  type GuardianSetupVerifier,
} from "./setup.js";

const SECRET = "setup-secret-fixture";

function setupIo(secretText = SECRET, interactive = true) {
  const output: string[] = [];
  let input: Uint8Array | undefined;
  const io: GuardianSetupIo = {
    interactive,
    write: (text) => output.push(text),
    readSecret: vi.fn(() => {
      input = Uint8Array.from(Buffer.from(secretText));
      return Promise.resolve(input);
    }),
  };
  return { io, output, input: () => input };
}

function verifier(provider: "nebius" | "tavily" | "github" = "nebius") {
  const verify = vi.fn(() =>
    Promise.resolve({
      schemaVersion: 1 as const,
      provider,
      accountLabel: "development-account",
    }),
  );
  const value: GuardianSetupVerifier = { verify };
  return { value, verify };
}

describe("guardian setup orchestration", () => {
  it("stores GitHub device-flow tokens in isolated slots and clears transient bytes", async () => {
    const store = new InMemoryCredentialStore();
    const accessToken = Uint8Array.from(Buffer.from("ghu_device_access_token_fixture"));
    const refreshToken = Uint8Array.from(Buffer.from("ghr_device_refresh_token_fixture"));
    const authorizer: GitHubDeviceAuthorizer = {
      authorize: (showChallenge) => {
        showChallenge({
          verificationUri: "https://github.com/login/device",
          userCode: "ABCD-1234",
          expiresInSeconds: 900,
        });
        return Promise.resolve({
          accessToken,
          refreshToken,
          accessTokenExpiresInSeconds: 28_800,
          refreshTokenExpiresInSeconds: 15_897_600,
        });
      },
    };
    const output: string[] = [];

    await runGitHubDeviceSetup({
      store,
      authorizer,
      verifier: verifier("github").value,
      io: { interactive: true, write: (text) => output.push(text) },
      now: () => Date.parse("2026-08-31T00:00:00.000Z"),
    });

    expect(output.join("")).toContain("https://github.com/login/device");
    expect(output.join("")).toContain("ABCD-1234");
    expect(output.join("")).not.toContain("ghu_device");
    expect(output.join("")).not.toContain("ghr_device");
    expect(accessToken.every((byte) => byte === 0)).toBe(true);
    expect(refreshToken.every((byte) => byte === 0)).toBe(true);
    await expect(
      store.use({ schemaVersion: 1, provider: "github", slot: "default" }, (secret) =>
        Promise.resolve(Buffer.from(secret).toString()),
      ),
    ).resolves.toBe("ghu_device_access_token_fixture");
    await expect(
      store.use({ schemaVersion: 1, provider: "github", slot: "refresh" }, (secret) =>
        Promise.resolve(Buffer.from(secret).toString()),
      ),
    ).resolves.toBe("ghr_device_refresh_token_fixture");
    await expect(
      store.use({ schemaVersion: 1, provider: "github", slot: "metadata" }, (secret) =>
        Promise.resolve(JSON.parse(Buffer.from(secret).toString()) as unknown),
      ),
    ).resolves.toEqual({
      schemaVersion: 1,
      accessExpiresAt: "2026-08-31T08:00:00.000Z",
      refreshExpiresAt: "2027-03-03T00:00:00.000Z",
    });

    await runGuardianSetupRevoke({
      provider: "github",
      store,
      io: {
        interactive: true,
        write: (text) => output.push(text),
        readConfirmation: () => Promise.resolve("REVOKE github"),
      },
    });
    await expect(
      store.status({ schemaVersion: 1, provider: "github", slot: "refresh" }),
    ).resolves.toMatchObject({ state: "missing" });
    await expect(
      store.status({ schemaVersion: 1, provider: "github", slot: "metadata" }),
    ).resolves.toMatchObject({ state: "missing" });
  });

  it("does not start GitHub device flow outside an interactive ceremony", async () => {
    const authorize = vi.fn();
    await expect(
      runGitHubDeviceSetup({
        store: new InMemoryCredentialStore(),
        authorizer: { authorize },
        verifier: verifier("github").value,
        io: { interactive: false, write: vi.fn() },
      }),
    ).rejects.toThrow("interactive credential enrollment is required");
    expect(authorize).not.toHaveBeenCalled();
  });

  it("rolls back the GitHub refresh token when access-token storage fails", async () => {
    const backingStore = new InMemoryCredentialStore();
    const store: CredentialStore = {
      status: (reference) => backingStore.status(reference),
      delete: (reference) => backingStore.delete(reference),
      use: (reference, operation) => backingStore.use(reference, operation),
      write: (reference, secret) => {
        const slot = (reference as { readonly slot?: unknown }).slot;
        if (slot === "default") return Promise.reject(new Error("fixture write failure"));
        return backingStore.write(reference, secret);
      },
    };
    const accessToken = Uint8Array.from(Buffer.from("ghu_device_access_token_fixture"));
    const refreshToken = Uint8Array.from(Buffer.from("ghr_device_refresh_token_fixture"));

    await expect(
      runGitHubDeviceSetup({
        store,
        authorizer: {
          authorize: () =>
            Promise.resolve({
              accessToken,
              refreshToken,
              accessTokenExpiresInSeconds: 28_800,
              refreshTokenExpiresInSeconds: 15_897_600,
            }),
        },
        verifier: verifier("github").value,
        io: { interactive: true, write: vi.fn() },
      }),
    ).rejects.toThrow("credential enrollment failed");
    await expect(
      backingStore.status({ schemaVersion: 1, provider: "github", slot: "refresh" }),
    ).resolves.toMatchObject({ state: "missing" });
    expect(accessToken.every((byte) => byte === 0)).toBe(true);
    expect(refreshToken.every((byte) => byte === 0)).toBe(true);
  });

  it("accepts only one supported provider", () => {
    expect(parseGuardianSetupArguments(["setup", "nebius"])).toEqual({
      operation: "enroll",
      provider: "nebius",
    });
    expect(parseGuardianSetupArguments(["setup", "status", "tavily"])).toEqual({
      operation: "status",
      provider: "tavily",
    });
    expect(parseGuardianSetupArguments(["setup", "revoke", "github"])).toEqual({
      operation: "revoke",
      provider: "github",
    });
    expect(() => parseGuardianSetupArguments(["setup", "unknown"])).toThrow("usage");
    expect(() => parseGuardianSetupArguments(["setup", "nebius", SECRET])).toThrow("usage");
  });

  it("reports only non-secret status and revokes only after exact confirmation", async () => {
    const store = new InMemoryCredentialStore();
    await store.write(
      { schemaVersion: 1, provider: "nebius", slot: "default" },
      Buffer.from(SECRET),
    );
    await store.write(
      { schemaVersion: 1, provider: "tavily", slot: "default" },
      Buffer.from("other-provider-secret"),
    );
    const output: string[] = [];
    await expect(
      runGuardianSetupStatus({
        provider: "nebius",
        store,
        io: { interactive: true, write: (text) => output.push(text) },
      }),
    ).resolves.toBe("available");
    expect(output.join("\n")).toBe("nebius: available\n");
    expect(output.join("\n")).not.toContain(SECRET);

    const cancelled = vi.fn(() => Promise.resolve("REVOKE tavily"));
    await expect(
      runGuardianSetupRevoke({
        provider: "nebius",
        store,
        io: { interactive: true, write: (text) => output.push(text), readConfirmation: cancelled },
      }),
    ).rejects.toThrow("not confirmed");
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "available",
    });

    const confirmed = vi.fn(() => Promise.resolve("REVOKE nebius"));
    await expect(
      runGuardianSetupRevoke({
        provider: "nebius",
        store,
        io: { interactive: true, write: (text) => output.push(text), readConfirmation: confirmed },
      }),
    ).resolves.toBe("deleted");
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "missing",
    });
    expect(
      await store.status({ schemaVersion: 1, provider: "tavily", slot: "default" }),
    ).toMatchObject({
      state: "available",
    });
  });

  it("rejects non-interactive status and revocation", async () => {
    const store = new InMemoryCredentialStore();
    await expect(
      runGuardianSetupStatus({
        provider: "github",
        store,
        io: { interactive: false, write: vi.fn() },
      }),
    ).rejects.toThrow("interactive credential management is required");
    await expect(
      runGuardianSetupRevoke({
        provider: "github",
        store,
        io: { interactive: false, write: vi.fn(), readConfirmation: vi.fn() },
      }),
    ).rejects.toThrow("interactive credential management is required");
  });

  it("verifies before storage and emits no credential material", async () => {
    const store = new InMemoryCredentialStore();
    const terminal = setupIo();
    const check = verifier();

    await runGuardianSetup({ provider: "nebius", store, verifier: check.value, io: terminal.io });

    expect(check.verify).toHaveBeenCalledOnce();
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "available",
    });
    expect(terminal.output.join("\n")).toContain("verified account development-account");
    expect(terminal.output.join("\n")).not.toContain(SECRET);
    expect(terminal.input()?.every((byte) => byte === 0)).toBe(true);
  });

  it("fails closed without interactive input", async () => {
    const store = new InMemoryCredentialStore();
    const terminal = setupIo(SECRET, false);
    await expect(
      runGuardianSetup({
        provider: "nebius",
        store,
        verifier: verifier().value,
        io: terminal.io,
      }),
    ).rejects.toThrow("interactive credential enrollment is required");
    expect(terminal.io.readSecret).not.toHaveBeenCalled();
  });

  it("rejects undersized credential input before verification", async () => {
    const store = new InMemoryCredentialStore();
    const terminal = setupIo("short");
    const check = verifier();
    await expect(
      runGuardianSetup({ provider: "nebius", store, verifier: check.value, io: terminal.io }),
    ).rejects.toThrow("credential input is invalid");
    expect(check.verify).not.toHaveBeenCalled();
    expect(terminal.input()?.every((byte) => byte === 0)).toBe(true);
  });

  it("does not store wrong-provider or failed verification material", async () => {
    const store = new InMemoryCredentialStore();
    const wrongProvider = setupIo();
    await expect(
      runGuardianSetup({
        provider: "nebius",
        store,
        verifier: verifier("tavily").value,
        io: wrongProvider.io,
      }),
    ).rejects.toThrow("provider mismatch");
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "missing",
    });

    const failed = setupIo();
    const failedVerifier: GuardianSetupVerifier = {
      verify: () => Promise.reject(new Error("verification unavailable")),
    };
    await expect(
      runGuardianSetup({ provider: "nebius", store, verifier: failedVerifier, io: failed.io }),
    ).rejects.toThrow("credential verification failed");
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "missing",
    });
    expect(failed.input()?.every((byte) => byte === 0)).toBe(true);
  });

  it("rejects credential-polluted verification metadata without storing it", async () => {
    const store = new InMemoryCredentialStore();
    const terminal = setupIo();
    const polluted: GuardianSetupVerifier = {
      verify: () => Promise.resolve({ schemaVersion: 1, provider: "nebius", accountLabel: SECRET }),
    };
    await expect(
      runGuardianSetup({ provider: "nebius", store, verifier: polluted, io: terminal.io }),
    ).rejects.toThrow("unsafe metadata");
    expect(terminal.output.join("\n")).not.toContain(SECRET);
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "missing",
    });
  });

  it("keeps the deterministic enroll-status-revoke journey credential-free", async () => {
    const store = new InMemoryCredentialStore();
    const terminal = setupIo();
    const requests: Array<{ url: string; body: BodyInit | null | undefined }> = [];
    const verifier = new FixedOriginCredentialVerifier({
      provider: "nebius",
      fetch: (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        requests.push({ url, body: init?.body });
        return Promise.resolve(Response.json({ object: "list", data: [] }));
      },
    });
    const enrollment = await runGuardianSetup({
      provider: "nebius",
      store,
      verifier,
      io: terminal.io,
    });
    const managementOutput: string[] = [];
    const status = await runGuardianSetupStatus({
      provider: "nebius",
      store,
      io: { interactive: true, write: (text) => managementOutput.push(text) },
    });
    const revocation = await runGuardianSetupRevoke({
      provider: "nebius",
      store,
      io: {
        interactive: true,
        write: (text) => managementOutput.push(text),
        readConfirmation: () => Promise.resolve("REVOKE nebius"),
      },
    });

    expect(requests).toEqual([
      { url: "https://api.tokenfactory.nebius.com/v1/models", body: undefined },
    ]);
    expect(
      JSON.stringify({ enrollment, status, revocation, output: terminal.output, managementOutput }),
    ).not.toContain(SECRET);
    expect(
      await store.status({ schemaVersion: 1, provider: "nebius", slot: "default" }),
    ).toMatchObject({
      state: "missing",
    });
  });
});
