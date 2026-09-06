import { describe, expect, it, vi } from "vitest";

import { registeredCredentialReference } from "@guardian/contracts";

import {
  CredentialStoreError,
  createCredentialStore,
  InMemoryCredentialStore,
  LinuxSecretServiceCredentialStore,
  linuxSecretServiceEnvironment,
  runLinuxSecretTool,
  SecretStashCredentialStore,
  WindowsCredentialStore,
  type CredentialHelperInvocation,
  type LinuxSecretToolInvocation,
  type LinuxSecretToolResult,
  type SecretStashRunner,
} from "./index.js";

const NEBIUS = { schemaVersion: 1, provider: "nebius", slot: "default" } as const;
const TAVILY = { schemaVersion: 1, provider: "tavily", slot: "default" } as const;
const GITHUB = { schemaVersion: 1, provider: "github", slot: "default" } as const;

describe("credential store contract", () => {
  it("isolates provider slots and returns only non-secret status", async () => {
    const store = new InMemoryCredentialStore();
    const secret = Buffer.from("nebius-test-secret");
    await store.write(NEBIUS, secret);

    expect(await store.status(NEBIUS)).toEqual({
      schemaVersion: 1,
      reference: NEBIUS,
      state: "available",
    });
    expect(await store.status(TAVILY)).toMatchObject({ state: "missing" });
    expect(JSON.stringify(await store.status(NEBIUS))).not.toContain("nebius-test-secret");
  });

  it("rotates and revokes only the exact provider slot", async () => {
    const store = new InMemoryCredentialStore();
    await store.write(NEBIUS, Buffer.from("first-value"));
    await store.write(TAVILY, Buffer.from("tavily-value"));
    await store.write(NEBIUS, Buffer.from("second-value"));

    await expect(
      store.use(NEBIUS, (secret) => Promise.resolve(Buffer.from(secret).toString("utf8"))),
    ).resolves.toBe("second-value");
    expect(await store.delete(NEBIUS)).toBe("deleted");
    expect(await store.delete(NEBIUS)).toBe("missing");
    await expect(store.use(NEBIUS, () => Promise.resolve(undefined))).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
    expect(await store.status(TAVILY)).toMatchObject({ state: "available" });
  });

  it("disables only the typed capability whose credential is missing", async () => {
    const store = new InMemoryCredentialStore();
    await store.write(NEBIUS, Buffer.from("nebius-available-fixture"));
    await store.write(TAVILY, Buffer.from("tavily-available-fixture"));

    await expect(store.use(GITHUB, () => Promise.resolve("unexpected"))).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
    await expect(
      store.use(NEBIUS, (secret) => Promise.resolve(Buffer.from(secret).toString("utf8"))),
    ).resolves.toBe("nebius-available-fixture");
    await expect(
      store.use(TAVILY, (secret) => Promise.resolve(Buffer.from(secret).toString("utf8"))),
    ).resolves.toBe("tavily-available-fixture");
    await expect(store.status(GITHUB)).resolves.toMatchObject({ state: "missing" });
    await expect(store.status(NEBIUS)).resolves.toMatchObject({ state: "available" });
    await expect(store.status(TAVILY)).resolves.toMatchObject({ state: "available" });
  });

  it("zeroes the temporary secret after credential-scoped use", async () => {
    const store = new InMemoryCredentialStore();
    await store.write(NEBIUS, Buffer.from("temporary-secret"));
    let exposed: Uint8Array | undefined;
    await store.use(NEBIUS, (secret) => {
      exposed = secret;
      return Promise.resolve();
    });
    expect(exposed).toBeDefined();
    expect(exposed?.every((byte) => byte === 0)).toBe(true);
  });
});

describe("Windows Credential Manager adapter", () => {
  it("keeps credential material out of argv and the helper environment", async () => {
    const invocations: CredentialHelperInvocation[] = [];
    const secretText = "windows-secret-fixture";
    const runner = vi.fn((invocation: CredentialHelperInvocation) => {
      invocations.push(invocation);
      const request = JSON.parse(invocation.stdin) as { operation: string; secret?: string };
      if (request.operation === "write") return Promise.resolve('{"ok":true}');
      if (request.operation === "read") {
        return Promise.resolve(
          JSON.stringify({ ok: true, secret: Buffer.from(secretText).toString("base64") }),
        );
      }
      return Promise.resolve('{"deleted":true}');
    });
    const store = new WindowsCredentialStore(runner);

    await store.write(NEBIUS, Buffer.from(secretText));
    await store.use(NEBIUS, (secret) => {
      expect(Buffer.from(secret).toString("utf8")).toBe(secretText);
      return Promise.resolve();
    });

    expect(invocations).toHaveLength(2);
    for (const invocation of invocations) {
      expect(invocation.file).toBe("powershell.exe");
      expect(invocation.arguments.join(" ")).not.toContain(secretText);
      expect(JSON.stringify(invocation.environment)).not.toContain(secretText);
    }
    expect(invocations[0]?.stdin).not.toContain(secretText);
    expect(invocations[0]?.stdin).toContain(Buffer.from(secretText).toString("base64"));
  });

  it("projects helper failures into a sanitized store error", async () => {
    const store = new WindowsCredentialStore(() =>
      Promise.reject(new Error("provider leaked windows-secret-fixture")),
    );
    await expect(store.status(NEBIUS)).rejects.toMatchObject({
      name: "CredentialStoreError",
      message: "credential store operation failed",
    });
  });

  it("rejects an operation-inappropriate helper response", async () => {
    const store = new WindowsCredentialStore(() => Promise.resolve('{"ok":true}'));
    await expect(store.status(NEBIUS)).rejects.toBeInstanceOf(CredentialStoreError);
    await expect(store.delete(NEBIUS)).rejects.toBeInstanceOf(CredentialStoreError);
  });
});

describe("Linux Secret Service adapter", () => {
  it("accepts only one local current-user D-Bus route", () => {
    expect(
      linuxSecretServiceEnvironment(
        {
          DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
          XDG_RUNTIME_DIR: "/run/user/1000/",
          PROVIDER_SECRET: "must-not-cross",
        },
        1000,
      ),
    ).toEqual({
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      XDG_RUNTIME_DIR: "/run/user/1000",
    });
    expect(
      linuxSecretServiceEnvironment(
        {
          DBUS_SESSION_BUS_ADDRESS:
            "unix:abstract=/tmp/dbus-AbCdEf0123,guid=0123456789abcdef0123456789abcdef",
          XDG_RUNTIME_DIR: "/run/user/1000",
        },
        1000,
      ),
    ).toEqual({
      DBUS_SESSION_BUS_ADDRESS:
        "unix:abstract=/tmp/dbus-AbCdEf0123,guid=0123456789abcdef0123456789abcdef",
      XDG_RUNTIME_DIR: "/run/user/1000",
    });
  });

  it.each([
    {},
    {
      DBUS_SESSION_BUS_ADDRESS: "tcp:host=127.0.0.1,port=1234",
      XDG_RUNTIME_DIR: "/run/user/1000",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus;unix:abstract=/tmp/dbus-AbCdEf0123",
      XDG_RUNTIME_DIR: "/run/user/1000",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/tmp/attacker-bus",
      XDG_RUNTIME_DIR: "/run/user/1000",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      XDG_RUNTIME_DIR: "/run/user/1001",
    },
  ])("rejects incomplete, remote, fallback, misplaced, or mismatched routing", (environment) => {
    expect(() => linuxSecretServiceEnvironment(environment, 1000)).toThrow(CredentialStoreError);
  });

  it("bounds helper time and output", async () => {
    await expect(
      runLinuxSecretTool({
        file: process.execPath,
        arguments: ["--eval", "setInterval(() => {}, 1000)"],
        stdin: new Uint8Array(),
        environment: {},
        timeoutMs: 100,
      }),
    ).rejects.toBeInstanceOf(CredentialStoreError);

    await expect(
      runLinuxSecretTool({
        file: process.execPath,
        arguments: ["--eval", 'process.stdout.write("x".repeat(4097))'],
        stdin: new Uint8Array(),
        environment: {},
        timeoutMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(CredentialStoreError);

    await expect(
      runLinuxSecretTool({
        file: process.execPath,
        arguments: ["--eval", 'process.stderr.write("x".repeat(8193))'],
        stdin: new Uint8Array(),
        environment: {},
        timeoutMs: 1_000,
      }),
    ).rejects.toBeInstanceOf(CredentialStoreError);
  });

  it("uses a fixed helper and attributes while passing the secret only through stdin", async () => {
    const invocations: LinuxSecretToolInvocation[] = [];
    const results: LinuxSecretToolResult[] = [];
    const secretText = "linux-secret-fixture";
    const runner = vi.fn((invocation: LinuxSecretToolInvocation) => {
      invocations.push(invocation);
      const operation = invocation.arguments[0];
      const result =
        operation === "lookup"
          ? {
              code: 0,
              stdout: Uint8Array.from(Buffer.from(secretText)),
              stderr: new Uint8Array(),
            }
          : { code: 0, stdout: new Uint8Array(), stderr: new Uint8Array() };
      results.push(result);
      if (operation === "store") {
        expect(Buffer.from(invocation.stdin).toString("utf8")).toBe(secretText);
      }
      return Promise.resolve(result);
    });
    const store = new LinuxSecretServiceCredentialStore(runner);

    await store.write(NEBIUS, Buffer.from(secretText));
    let exposed: Uint8Array | undefined;
    await store.use(NEBIUS, (secret) => {
      exposed = secret;
      expect(Buffer.from(secret).toString("utf8")).toBe(secretText);
      return Promise.resolve();
    });

    expect(invocations).toHaveLength(2);
    for (const invocation of invocations) {
      expect(invocation.file).toBe("/usr/bin/secret-tool");
      expect(invocation.arguments).toContain("AgenticGuardian");
      expect(invocation.arguments).toContain("nebius");
      expect(invocation.arguments.join(" ")).not.toContain(secretText);
      expect(JSON.stringify(invocation.environment)).not.toContain(secretText);
    }
    expect(invocations[0]?.stdin.every((byte) => byte === 0)).toBe(true);
    expect(results.every((result) => result.stdout.every((byte) => byte === 0))).toBe(true);
    expect(exposed?.every((byte) => byte === 0)).toBe(true);
  });

  it("distinguishes a missing item from a Secret Service diagnostic", async () => {
    const missing = new LinuxSecretServiceCredentialStore(() =>
      Promise.resolve({
        code: 1,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
      }),
    );
    await expect(missing.status(TAVILY)).resolves.toMatchObject({ state: "missing" });
    await expect(missing.use(TAVILY, () => Promise.resolve(undefined))).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
    await expect(missing.delete(TAVILY)).resolves.toBe("missing");

    const failed = new LinuxSecretServiceCredentialStore(() =>
      Promise.resolve({
        code: 1,
        stdout: new Uint8Array(),
        stderr: Uint8Array.from(Buffer.from("private provider diagnostic")),
      }),
    );
    await expect(failed.status(TAVILY)).rejects.toMatchObject({
      name: "CredentialStoreError",
      message: "credential store operation failed",
    });
    await expect(failed.delete(TAVILY)).rejects.toBeInstanceOf(CredentialStoreError);
  });

  it("rejects invalid textual secrets before calling Secret Service", async () => {
    const runner = vi.fn(() =>
      Promise.resolve({ code: 0, stdout: new Uint8Array(), stderr: new Uint8Array() }),
    );
    const store = new LinuxSecretServiceCredentialStore(runner);

    await expect(
      store.write(NEBIUS, Uint8Array.from([0xff, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8])),
    ).rejects.toBeInstanceOf(CredentialStoreError);
    await expect(store.write(NEBIUS, Buffer.from("nul-byte\0fixture"))).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it("rejects empty, oversized, or operation-inappropriate helper output", async () => {
    const emptyLookup = new LinuxSecretServiceCredentialStore(() =>
      Promise.resolve({ code: 0, stdout: new Uint8Array(), stderr: new Uint8Array() }),
    );
    await expect(emptyLookup.status(GITHUB)).rejects.toBeInstanceOf(CredentialStoreError);

    const noisyStore = new LinuxSecretServiceCredentialStore(() =>
      Promise.resolve({
        code: 0,
        stdout: Uint8Array.from(Buffer.from("unexpected")),
        stderr: new Uint8Array(),
      }),
    );
    await expect(noisyStore.write(GITHUB, Buffer.from("github-fixture"))).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
  });
});

describe("Nebius SecretStash managed-demo adapter", () => {
  function resource(
    provider: "nebius" | "tavily" | "github",
    slot: string,
    pool: "public" | "judge" = "public",
  ) {
    const payloadKeys = {
      "nebius/default": "nebius_api_key",
      "tavily/default": "tavily_api_key",
      "github/default": "github_access_token",
      "github/refresh": "github_refresh_token",
      "github/metadata": "github_metadata",
    } as const;
    return {
      schemaVersion: 1,
      location: {
        schemaVersion: 1,
        custodyProfile: "managed_demo",
        pool,
        runtime: "linux",
        storeTarget: "nebius_secretstash",
      },
      reference: registeredCredentialReference(provider, slot),
      secretId: `mbsec-${provider}${pool}123`,
      payloadKey: payloadKeys[`${provider}/${slot}` as keyof typeof payloadKeys],
    } as const;
  }

  it("retrieves only one fixed payload key inside a zeroed callback", async () => {
    const stdout = Uint8Array.from(Buffer.from("managed-demo-secret-fixture\n"));
    const stderr = new Uint8Array();
    const runner = vi.fn<SecretStashRunner>(() => Promise.resolve({ code: 0, stdout, stderr }));
    const store = new SecretStashCredentialStore({
      pool: "public",
      resources: [resource("nebius", "default")],
      runner,
    });
    let callbackSecret: Uint8Array | undefined;

    await expect(
      store.use(NEBIUS, (secret) => {
        callbackSecret = secret;
        return Promise.resolve(Buffer.from(secret).toString());
      }),
    ).resolves.toBe("managed-demo-secret-fixture");

    expect(runner).toHaveBeenCalledWith({
      file: "/usr/local/bin/nebius",
      arguments: [
        "mysterybox",
        "payload",
        "get-by-key",
        "--key",
        "nebius_api_key",
        "--secret-id",
        "mbsec-nebiuspublic123",
        "--format",
        "text",
        "--no-browser",
        "--no-check-update",
        "--no-progress",
        "--retries",
        "1",
        "--timeout",
        "15s",
        "--per-retry-timeout",
        "15s",
        "--auth-timeout",
        "15s",
      ],
      stdin: new Uint8Array(),
      environment: {},
      timeoutMs: 15_000,
    });
    expect(callbackSecret?.every((byte) => byte === 0)).toBe(true);
    expect(stdout.every((byte) => byte === 0)).toBe(true);
    expect(stderr.every((byte) => byte === 0)).toBe(true);
  });

  it("returns missing without invoking SecretStash for an unconfigured registered slot", async () => {
    const runner = vi.fn<SecretStashRunner>();
    const store = new SecretStashCredentialStore({
      pool: "judge",
      resources: [resource("nebius", "default", "judge")],
      runner,
    });

    await expect(store.status(TAVILY)).resolves.toMatchObject({ state: "missing" });
    await expect(store.use(TAVILY, () => Promise.resolve())).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it("is read-only and rejects cross-pool, duplicate, and malformed resource configuration", async () => {
    const runner = vi.fn<SecretStashRunner>();
    const publicResource = resource("nebius", "default");
    const store = new SecretStashCredentialStore({
      pool: "public",
      resources: [publicResource],
      runner,
    });

    await expect(store.write(NEBIUS, Buffer.from("replacement-fixture"))).rejects.toBeInstanceOf(
      CredentialStoreError,
    );
    await expect(store.delete(NEBIUS)).rejects.toBeInstanceOf(CredentialStoreError);
    expect(
      () =>
        new SecretStashCredentialStore({
          pool: "judge",
          resources: [publicResource],
          runner,
        }),
    ).toThrow(CredentialStoreError);
    expect(
      () =>
        new SecretStashCredentialStore({
          pool: "public",
          resources: [publicResource, publicResource],
          runner,
        }),
    ).toThrow(CredentialStoreError);
  });

  it.each([
    { code: 1, value: "provider failure" },
    { code: 0, value: "secret\nwith-extra-line\n" },
    { code: 0, value: "short\n" },
  ])("sanitizes invalid SecretStash helper output", async ({ code, value }) => {
    const stdout = Uint8Array.from(Buffer.from(value));
    const stderr = Uint8Array.from(Buffer.from(code === 0 ? "" : "untrusted diagnostic"));
    const store = new SecretStashCredentialStore({
      pool: "public",
      resources: [resource("nebius", "default")],
      runner: () => Promise.resolve({ code, stdout, stderr }),
    });

    await expect(store.use(NEBIUS, () => Promise.resolve())).rejects.toMatchObject({
      name: "CredentialStoreError",
      message: "credential store operation failed",
    });
    expect(stdout.every((byte) => byte === 0)).toBe(true);
    expect(stderr.every((byte) => byte === 0)).toBe(true);
  });

  it("selects managed-demo custody only from strict non-secret configuration", async () => {
    const stdout = Uint8Array.from(Buffer.from("managed-demo-secret-fixture\n"));
    const store = createCredentialStore(
      {
        schemaVersion: 1,
        custodyProfile: "managed_demo",
        pool: "judge",
        resources: [resource("tavily", "default", "judge")],
      },
      {
        consumer: "research_service",
        secretStashRunner: () => Promise.resolve({ code: 0, stdout, stderr: new Uint8Array() }),
      },
    );

    await expect(store.status(TAVILY)).resolves.toMatchObject({ state: "available" });
    expect(stdout.every((byte) => byte === 0)).toBe(true);
    expect(() =>
      createCredentialStore(
        {
          schemaVersion: 1,
          custodyProfile: "managed_demo",
          pool: "public",
          resources: [resource("tavily", "default", "judge")],
        },
        { consumer: "research_service" },
      ),
    ).toThrow();
  });

  it("binds each store instance to one credential consumer capability", () => {
    const stdout = Uint8Array.from(Buffer.from("managed-demo-secret-fixture\n"));
    const store = createCredentialStore(
      {
        schemaVersion: 1,
        custodyProfile: "managed_demo",
        pool: "public",
        resources: [resource("nebius", "default"), resource("tavily", "default")],
      },
      {
        consumer: "research_service",
        secretStashRunner: () => Promise.resolve({ code: 0, stdout, stderr: new Uint8Array() }),
      },
    );

    expect(() => store.status(NEBIUS)).toThrow(CredentialStoreError);
    expect(() => store.use(NEBIUS, () => Promise.resolve())).toThrow(CredentialStoreError);
    expect(stdout.every((byte) => byte !== 0)).toBe(true);
  });
});
