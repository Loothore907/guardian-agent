import { describe, expect, it, vi } from "vitest";

import { registeredCredentialReference } from "@guardian/contracts";
import { InMemoryCredentialStore } from "@guardian/credential-store";
import type { CredentialStore } from "@guardian/credential-store";
import { FixedOriginCredentialVerifier } from "@guardian/credential-verification";
import type { GitHubDeviceAuthorizer } from "@guardian/credential-verification";

import {
  parseGuardianSetupArguments,
  runGitHubDeviceSetup,
  runGuardianLocalCredentialEnrollment,
  runGuardianLocalCredentialReview,
  runGuardianSetup,
  runGuardianSetupRevoke,
  runGuardianSetupStatus,
  type GuardianSetupIo,
  type GuardianSetupVerifier,
  type GuardianLocalCredentialSurfaceFactory,
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

function localSurface(
  outcome: "submitted" | "cancelled" | "failed" | "expired",
  secretText = SECRET,
) {
  const close = vi.fn(() => Promise.resolve());
  let input: Uint8Array | undefined;
  const implementation: GuardianLocalCredentialSurfaceFactory = (options) => {
    const completed = new Promise<typeof outcome>((resolve) => {
      queueMicrotask(() => {
        if (outcome !== "submitted") {
          resolve(outcome);
          return;
        }
        input = Uint8Array.from(Buffer.from(secretText));
        void options.onSubmit(input).then(
          () => {
            input?.fill(0);
            resolve("submitted");
          },
          () => {
            input?.fill(0);
            resolve("failed");
          },
        );
      });
    });
    return Promise.resolve({
      url: "http://127.0.0.1:43127/#fake-one-use-capability",
      completed,
      close,
    });
  };
  const start = vi.fn(implementation);
  return { start, close, input: () => input };
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

  it("preflights every GitHub slot before starting device authorization", async () => {
    const authorize = vi.fn();
    const store: CredentialStore = {
      status: () => Promise.reject(new Error("fixture store unavailable")),
      delete: vi.fn(),
      use: vi.fn(),
      write: vi.fn(),
    };
    await expect(
      runGitHubDeviceSetup({
        store,
        authorizer: { authorize },
        verifier: verifier("github").value,
        io: { interactive: true, write: vi.fn() },
      }),
    ).rejects.toThrow("credential store is unavailable");
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

  it("preserves every prior GitHub slot when replacement fails", async () => {
    const backingStore = new InMemoryCredentialStore();
    const previous = {
      default: "ghu_previous_access_fixture",
      refresh: "ghr_previous_refresh_fixture",
      metadata:
        '{"schemaVersion":1,"accessExpiresAt":"2026-09-01T08:00:00.000Z","refreshExpiresAt":"2027-03-04T00:00:00.000Z"}',
    } as const;
    for (const [slot, value] of Object.entries(previous)) {
      await backingStore.write(registeredCredentialReference("github", slot), Buffer.from(value));
    }
    let rejectedNewAccess = false;
    const store: CredentialStore = {
      status: (reference) => backingStore.status(reference),
      delete: (reference) => backingStore.delete(reference),
      use: (reference, operation) => backingStore.use(reference, operation),
      write: (reference, secret) => {
        const value = Buffer.from(secret).toString();
        if (!rejectedNewAccess && value === "ghu_device_access_token_fixture") {
          rejectedNewAccess = true;
          return Promise.reject(new Error("fixture replacement failure"));
        }
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

    for (const [slot, value] of Object.entries(previous)) {
      await expect(
        backingStore.use(registeredCredentialReference("github", slot), (secret) =>
          Promise.resolve(Buffer.from(secret).toString()),
        ),
      ).resolves.toBe(value);
    }
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
    expect(parseGuardianSetupArguments(["credentials", "review", "nebius"])).toEqual({
      operation: "review",
      provider: "nebius",
    });
    expect(parseGuardianSetupArguments(["credentials", "tavily"])).toEqual({
      operation: "enroll",
      provider: "tavily",
    });
    expect(() => parseGuardianSetupArguments(["setup", "unknown"])).toThrow("usage");
    expect(() => parseGuardianSetupArguments(["setup", "nebius", SECRET])).toThrow("usage");
  });

  it("preflights, verifies, and stores through the one-use local surface", async () => {
    const store = new InMemoryCredentialStore();
    const check = verifier();
    const surface = localSurface("submitted");
    const output: string[] = [];

    await expect(
      runGuardianLocalCredentialEnrollment({
        provider: "nebius",
        destination: "windows_credential_manager",
        store,
        verifier: check.value,
        startSurface: surface.start,
        io: { interactive: true, write: (text) => output.push(text) },
      }),
    ).resolves.toMatchObject({ provider: "nebius", accountLabel: "development-account" });

    expect(surface.start).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "enroll",
        provider: "nebius",
        destination: "windows_credential_manager",
      }),
    );
    expect(check.verify).toHaveBeenCalledOnce();
    expect(surface.input()?.every((byte) => byte === 0)).toBe(true);
    expect(surface.close).toHaveBeenCalledOnce();
    expect(output.join("\n")).toContain("normal browser");
    expect(output.join("\n")).not.toContain(SECRET);
    await expect(
      store.status(registeredCredentialReference("nebius", "default")),
    ).resolves.toMatchObject({ state: "available" });
  });

  it("keeps review mode provider-free and store-read-only", async () => {
    const status = vi.fn(() =>
      Promise.resolve({
        schemaVersion: 1 as const,
        reference: registeredCredentialReference("tavily", "default"),
        state: "missing" as const,
      }),
    );
    const write = vi.fn();
    const use = vi.fn();
    const deleteCredential = vi.fn();
    const store: CredentialStore = {
      status,
      write,
      use,
      delete: deleteCredential,
    };
    const surface = localSurface("submitted", "obvious-fake-review-value");
    const output: string[] = [];

    await expect(
      runGuardianLocalCredentialReview({
        provider: "tavily",
        destination: "linux_secret_service",
        store,
        startSurface: surface.start,
        io: { interactive: true, write: (text) => output.push(text) },
      }),
    ).resolves.toBe("submitted");

    expect(status).toHaveBeenCalledOnce();
    expect(write).not.toHaveBeenCalled();
    expect(use).not.toHaveBeenCalled();
    expect(deleteCredential).not.toHaveBeenCalled();
    expect(surface.start).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "review", provider: "tavily" }),
    );
    expect(surface.input()?.every((byte) => byte === 0)).toBe(true);
    expect(output.join("\n")).toContain("Nothing was stored or sent");
    expect(output.join("\n")).not.toContain("obvious-fake-review-value");
  });

  it("does not start a local credential surface when preflight fails", async () => {
    const store: CredentialStore = {
      status: () => Promise.reject(new Error("fixture unavailable")),
      write: vi.fn(),
      use: vi.fn(),
      delete: vi.fn(),
    };
    const surface = localSurface("submitted");

    await expect(
      runGuardianLocalCredentialEnrollment({
        provider: "nebius",
        destination: "linux_secret_service",
        store,
        verifier: verifier().value,
        startSurface: surface.start,
        io: { interactive: true, write: vi.fn() },
      }),
    ).rejects.toThrow("credential store is unavailable");
    expect(surface.start).not.toHaveBeenCalled();
  });

  it("closes cancelled, failed, and expired local surfaces with sanitized errors", async () => {
    for (const [outcome, message] of [
      ["cancelled", "credential enrollment cancelled"],
      ["failed", "credential enrollment failed"],
      ["expired", "credential enrollment expired"],
    ] as const) {
      const surface = localSurface(outcome);
      await expect(
        runGuardianLocalCredentialEnrollment({
          provider: "nebius",
          destination: "windows_credential_manager",
          store: new InMemoryCredentialStore(),
          verifier: verifier().value,
          startSurface: surface.start,
          io: { interactive: true, write: vi.fn() },
        }),
      ).rejects.toThrow(message);
      expect(surface.close).toHaveBeenCalledOnce();
    }
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

  it("preflights the credential store before requesting secret input", async () => {
    const terminal = setupIo();
    const check = verifier();
    const store: CredentialStore = {
      status: () => Promise.reject(new Error("fixture store unavailable")),
      delete: vi.fn(),
      use: vi.fn(),
      write: vi.fn(),
    };
    await expect(
      runGuardianSetup({ provider: "nebius", store, verifier: check.value, io: terminal.io }),
    ).rejects.toThrow("credential store is unavailable");
    expect(terminal.io.readSecret).not.toHaveBeenCalled();
    expect(check.verify).not.toHaveBeenCalled();
  });

  it("preserves a prior credential when replacement storage fails", async () => {
    const backingStore = new InMemoryCredentialStore();
    const reference = registeredCredentialReference("nebius", "default");
    await backingStore.write(reference, Buffer.from("previous-secret-fixture"));
    let rejectedReplacement = false;
    const store: CredentialStore = {
      status: (value) => backingStore.status(value),
      delete: (value) => backingStore.delete(value),
      use: (value, operation) => backingStore.use(value, operation),
      write: (value, secret) => {
        if (!rejectedReplacement && Buffer.from(secret).toString() === SECRET) {
          rejectedReplacement = true;
          return Promise.reject(new Error("fixture replacement failure"));
        }
        return backingStore.write(value, secret);
      },
    };
    const terminal = setupIo();

    await expect(
      runGuardianSetup({ provider: "nebius", store, verifier: verifier().value, io: terminal.io }),
    ).rejects.toThrow("credential replacement failed");
    await expect(
      backingStore.use(reference, (secret) => Promise.resolve(Buffer.from(secret).toString())),
    ).resolves.toBe("previous-secret-fixture");
    expect(terminal.input()?.every((byte) => byte === 0)).toBe(true);
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
