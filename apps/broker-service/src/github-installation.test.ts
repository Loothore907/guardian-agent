import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  InMemoryCredentialStore,
  SecretStashCredentialStore,
  type CredentialStore,
} from "@guardian/credential-store";
import { GitHubInstallationCredentialResolver } from "./github-installation.js";

const NOW = Date.parse("2026-09-05T12:00:00.000Z");
const HANDLE = "guardian-credential://github/11111111-1111-4111-8111-111111111111";
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = keys.privateKey.export({ type: "pkcs8", format: "pem" });
const metadata = {
  schemaVersion: 1,
  appId: "123",
  installationId: "456",
  repositoryId: 789,
  owner: "owner",
  repository: "demo",
};
const token = "ghs_123_" + "a".repeat(1100) + "." + "b".repeat(64);
const body = (now = NOW) => ({
  token,
  expires_at: new Date(now + 3_600_000).toISOString(),
  permissions: { contents: "write", pull_requests: "write", metadata: "read" },
  repositories: [{ id: 789, name: "demo", owner: { login: "owner" } }],
});
async function store() {
  const result = new InMemoryCredentialStore();
  await result.write(
    { schemaVersion: 1, provider: "github", slot: "app_private_key" },
    Buffer.from(pem),
  );
  await result.write(
    { schemaVersion: 1, provider: "github", slot: "installation" },
    Buffer.from(JSON.stringify(metadata)),
  );
  return result;
}
const scope = () => Promise.resolve({ owner: "owner", repository: "demo" });

describe("headless GitHub installation credentials", () => {
  it("mints narrowly scoped JWT-backed tokens again two hours later without store writes", async () => {
    let now = NOW;
    const credentials = await store();
    const write = vi.spyOn(credentials, "write");
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify(body(now)), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const resolver = new GitHubInstallationCredentialResolver({
      store: credentials,
      credentialStoreHandle: HANDLE,
      expectedRepository: scope,
      fetch: fetchMock,
      now: () => now,
    });
    const observed: Uint8Array[] = [];
    for (let i = 0; i < 2; i++) {
      expect(
        await resolver.use(HANDLE, async (bytes) => {
          observed.push(bytes);
          expect(Buffer.from(bytes).toString()).toBe(token);
          return await Promise.resolve("sanitized result");
        }),
      ).toBe("sanitized result");
      now += 7_200_000;
    }
    expect(write).not.toHaveBeenCalled();
    expect(observed.every((bytes) => bytes.every((b) => b === 0))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/app/installations/456/access_tokens");
    expect(request?.redirect).toBe("error");
    expect(JSON.parse(typeof request?.body === "string" ? request.body : "null")).toEqual({
      repository_ids: [789],
      permissions: { contents: "write", pull_requests: "write" },
    });
    const jwt = new Headers(request?.headers).get("authorization")!.slice(7).split(".");
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(jwt.slice(0, 2).join(".")),
        keys.publicKey,
        Buffer.from(jwt[2]!, "base64url"),
      ),
    ).toBe(true);
    expect(JSON.parse(Buffer.from(jwt[1]!, "base64url").toString())).toMatchObject({
      iss: "123",
      iat: NOW / 1000 - 60,
      exp: NOW / 1000 + 540,
    });
  });

  it.each(["scope", "expiry", "permissions", "repositories", "malformed", "unavailable"])(
    "denies %s without calling the credential consumer or falling back",
    async (reason) => {
      const response = {
        ...body(),
        ...(reason === "expiry" ? { expires_at: new Date(NOW).toISOString() } : {}),
        ...(reason === "permissions"
          ? { permissions: { ...body().permissions, administration: "write" } }
          : {}),
        ...(reason === "repositories" ? { repositories: [] } : {}),
      };
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(reason === "malformed" ? "secret invalid json" : JSON.stringify(response), {
            status: reason === "unavailable" ? 403 : 201,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      const resolver = new GitHubInstallationCredentialResolver({
        store: await store(),
        credentialStoreHandle: HANDLE,
        expectedRepository:
          reason === "scope"
            ? () => Promise.resolve({ owner: "other", repository: "demo" })
            : scope,
        fetch: fetchMock,
        now: () => NOW,
      });
      const consumer = vi.fn();
      await expect(resolver.use(HANDLE, consumer)).rejects.toThrow(
        "GitHub credential is unavailable",
      );
      expect(consumer).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(reason === "scope" ? 0 : 1);
    },
  );

  it("uses read-only SecretStash callbacks with no desktop authentication", async () => {
    const resources = (["app_private_key", "installation"] as const).map((slot) => ({
      schemaVersion: 1,
      location: {
        schemaVersion: 1,
        custodyProfile: "managed_demo",
        pool: "judge",
        runtime: "linux",
        storeTarget: "nebius_secretstash",
      },
      reference: { schemaVersion: 1, provider: "github", slot },
      secretId: "mbsec-judge123",
      payloadKey:
        slot === "app_private_key" ? "github_app_private_key" : "github_installation_metadata",
    }));
    const runner = vi.fn((invocation: { arguments: readonly string[] }) =>
      Promise.resolve({
        code: 0,
        stdout: Buffer.from(
          JSON.stringify({
            version_id: "mbsecver-fixture123",
            data: {
              key: invocation.arguments.includes("github_app_private_key")
                ? "github_app_private_key"
                : "github_installation_metadata",
              string_value: invocation.arguments.includes("github_app_private_key")
                ? pem
                : JSON.stringify(metadata),
            },
          }),
        ),
        stderr: new Uint8Array(),
      }),
    );
    const credentials: CredentialStore = new SecretStashCredentialStore({
      pool: "judge",
      resources,
      runner,
    });
    const resolver = new GitHubInstallationCredentialResolver({
      store: credentials,
      credentialStoreHandle: HANDLE,
      expectedRepository: scope,
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify(body()), {
            status: 201,
            headers: { "content-type": "application/json" },
          }),
        ),
      now: () => NOW,
    });
    await expect(resolver.use(HANDLE, () => Promise.resolve("done"))).resolves.toBe("done");
    expect(runner).toHaveBeenCalledTimes(2);
    for (const [invocation] of runner.mock.calls)
      expect(invocation).toMatchObject({
        environment: {},
        stdin: new Uint8Array(),
        arguments: expect.arrayContaining(["--no-browser", "get-by-key"]) as unknown,
      });
  });
});
