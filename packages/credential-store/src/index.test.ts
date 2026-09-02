import { describe, expect, it, vi } from "vitest";

import {
  CredentialStoreError,
  InMemoryCredentialStore,
  WindowsCredentialStore,
  type CredentialHelperInvocation,
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
