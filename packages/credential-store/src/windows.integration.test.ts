import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { WindowsCredentialStore } from "./index.js";

const enabled =
  process.platform === "win32" && process.env.GUARDIAN_TEST_WINDOWS_CREDENTIAL_STORE === "1";

describe.runIf(enabled)("Windows Credential Manager integration", () => {
  it("writes, resolves, rotates, and deletes one isolated test credential", async () => {
    const store = new WindowsCredentialStore();
    const reference = {
      schemaVersion: 1,
      provider: "nebius",
      slot: `codex-${randomUUID()}`,
    } as const;
    try {
      expect(await store.status(reference)).toMatchObject({ state: "missing" });
      await store.write(reference, Buffer.from("first-platform-fixture"));
      expect(await store.status(reference)).toMatchObject({ state: "available" });
      await store.write(reference, Buffer.from("rotated-platform-fixture"));
      await expect(
        store.use(reference, (secret) => Promise.resolve(Buffer.from(secret).toString("utf8"))),
      ).resolves.toBe("rotated-platform-fixture");
    } finally {
      await store.delete(reference);
    }
    expect(await store.status(reference)).toMatchObject({ state: "missing" });
  });
});
