import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { LinuxSecretServiceCredentialStore } from "./index.js";

const enabled =
  process.platform === "linux" && process.env.GUARDIAN_TEST_LINUX_SECRET_SERVICE === "1";

describe.runIf(enabled)("Linux Secret Service integration", () => {
  it("writes, resolves, rotates, and deletes one isolated test credential", async () => {
    const store = new LinuxSecretServiceCredentialStore();
    const reference = {
      schemaVersion: 1,
      provider: "nebius",
      slot: `codex-${randomUUID()}`,
    } as const;
    const isolatedReference = {
      schemaVersion: 1,
      provider: "tavily",
      slot: reference.slot,
    } as const;
    let stage = "initial status";
    let failure: Error | undefined;
    try {
      expect(await store.status(reference)).toMatchObject({ state: "missing" });
      expect(await store.status(isolatedReference)).toMatchObject({ state: "missing" });
      stage = "first write";
      await store.write(reference, Buffer.from("first-platform-fixture"));
      stage = "available status";
      expect(await store.status(reference)).toMatchObject({ state: "available" });
      expect(await store.status(isolatedReference)).toMatchObject({ state: "missing" });
      stage = "rotation";
      await store.write(reference, Buffer.from("rotated-platform-fixture"));
      stage = "scoped use";
      let exposed: Uint8Array | undefined;
      await expect(
        store.use(reference, (secret) => {
          exposed = secret;
          return Promise.resolve(Buffer.from(secret).toString("utf8"));
        }),
      ).resolves.toBe("rotated-platform-fixture");
      expect(exposed?.every((byte) => byte === 0)).toBe(true);
      stage = "delete";
      expect(await store.delete(reference)).toBe("deleted");
      stage = "post-delete status";
      expect(await store.status(reference)).toMatchObject({ state: "missing" });
    } catch {
      failure = new Error(`Linux Secret Service lifecycle failed during ${stage}`);
    } finally {
      try {
        await store.delete(reference);
      } catch {
        failure ??= new Error("Linux Secret Service lifecycle failed during cleanup");
      }
    }
    if (failure !== undefined) throw failure;
  }, 60_000);
});
