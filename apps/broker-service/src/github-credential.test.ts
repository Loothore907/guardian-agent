import { describe, expect, it, vi } from "vitest";

import { InMemoryCredentialStore } from "@guardian/credential-store";
import type { CredentialStore } from "@guardian/credential-store";

import {
  GitHubCredentialError,
  GitHubStoredCredentialResolver,
  type GitHubCredentialRefreshDiagnostic,
} from "./github-credential.js";

const HANDLE = "guardian-credential://github/44444444-4444-4444-8444-444444444444";
const CLIENT_ID = "Iv23liP8Sq3ZEAyeIHju";
const NOW = Date.parse("2026-08-31T00:00:00.000Z");

async function seed(store: InMemoryCredentialStore, metadata = false) {
  await store.write(
    { schemaVersion: 1, provider: "github", slot: "default" },
    Buffer.from("ghu_old_access_token_fixture"),
  );
  await store.write(
    { schemaVersion: 1, provider: "github", slot: "refresh" },
    Buffer.from("ghr_old_refresh_token_fixture"),
  );
  if (metadata) {
    await store.write(
      { schemaVersion: 1, provider: "github", slot: "metadata" },
      Buffer.from(
        JSON.stringify({
          schemaVersion: 1,
          accessExpiresAt: "2026-08-31T08:00:00.000Z",
          refreshExpiresAt: "2027-03-03T00:00:00.000Z",
        }),
      ),
    );
  }
}

function refreshResponse() {
  return new Response(
    JSON.stringify({
      access_token: "ghu_new_access_token_fixture",
      expires_in: 28_800,
      refresh_token: "ghr_new_refresh_token_fixture",
      refresh_token_expires_in: 15_897_600,
      scope: "",
      token_type: "bearer",
    }),
    { headers: { "content-type": "application/json" } },
  );
}

describe("GitHub stored credential resolver", () => {
  it("uses a fresh access token without invoking the refresh endpoint and clears callback bytes", async () => {
    const store = new InMemoryCredentialStore();
    await seed(store, true);
    const fetchMock = vi.fn<typeof fetch>();
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: fetchMock,
      now: () => NOW,
    });
    let observed: Uint8Array | undefined;
    await expect(
      resolver.use(HANDLE, (secret) => {
        observed = secret;
        return Promise.resolve(Buffer.from(secret).toString("utf8"));
      }),
    ).resolves.toBe("ghu_old_access_token_fixture");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(observed?.every((byte) => byte === 0)).toBe(true);
  });

  it("migrates metadata-less enrollment through the one fixed refresh endpoint", async () => {
    const store = new InMemoryCredentialStore();
    await seed(store);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(refreshResponse());
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: fetchMock,
      now: () => NOW,
    });

    await expect(
      Promise.all([
        resolver.use(HANDLE, (secret) => Promise.resolve(Buffer.from(secret).toString("utf8"))),
        resolver.use(HANDLE, (secret) => Promise.resolve(Buffer.from(secret).toString("utf8"))),
      ]),
    ).resolves.toEqual(["ghu_new_access_token_fixture", "ghu_new_access_token_fixture"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect(init).toMatchObject({ method: "POST", redirect: "error" });
    if (typeof init?.body !== "string") throw new TypeError("expected form body");
    expect(init.body).toContain(`client_id=${CLIENT_ID}`);
    expect(init.body).toContain("grant_type=refresh_token");
    expect(init.body).not.toContain("ghu_old_access");
    await expect(
      store.use({ schemaVersion: 1, provider: "github", slot: "refresh" }, (secret) =>
        Promise.resolve(Buffer.from(secret).toString("utf8")),
      ),
    ).resolves.toBe("ghr_new_refresh_token_fixture");
    await expect(
      store.status({ schemaVersion: 1, provider: "github", slot: "metadata" }),
    ).resolves.toMatchObject({ state: "available" });
  });

  it("fails closed for the wrong handle and invalid refresh responses without exposing secrets", async () => {
    const store = new InMemoryCredentialStore();
    await seed(store);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "bad_verification_code" }), {
        headers: { "content-type": "application/json" },
      }),
    );
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: fetchMock,
      now: () => NOW,
    });
    await expect(
      resolver.use("guardian-credential://github/wrong", () => Promise.resolve()),
    ).rejects.toEqual(new GitHubCredentialError());
    await expect(resolver.use(HANDLE, () => Promise.resolve())).rejects.toEqual(
      new GitHubCredentialError(),
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("ghu_old_access");
    await expect(
      store.status({ schemaVersion: 1, provider: "github", slot: "default" }),
    ).resolves.toMatchObject({ state: "missing" });
    await expect(
      store.status({ schemaVersion: 1, provider: "github", slot: "refresh" }),
    ).resolves.toMatchObject({ state: "missing" });
  });

  it("allowlists a provider rejection code without exposing its polluted description", async () => {
    const store = new InMemoryCredentialStore();
    await seed(store);
    const diagnostics: GitHubCredentialRefreshDiagnostic[] = [];
    const pollutedDescription = "ghr_polluted_provider_description_fixture";
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "bad_refresh_token",
            error_description: pollutedDescription,
          }),
          {
            status: 400,
            headers: {
              "content-type": "application/json",
              "x-github-request-id": "ABCD:1234:5678:9ABC",
            },
          },
        ),
      ),
      now: () => NOW,
      onRefreshDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    await expect(resolver.use(HANDLE, () => Promise.resolve())).rejects.toEqual(
      new GitHubCredentialError(),
    );
    expect(diagnostics).toContainEqual({
      stage: "provider_response",
      outcome: "failed",
      providerCode: "bad_refresh_token",
      providerRequestId: "ABCD:1234:5678:9ABC",
      responseStatus: 400,
    });
    expect(JSON.stringify(diagnostics)).not.toContain(pollutedDescription);
    await expect(
      store.status({ schemaVersion: 1, provider: "github", slot: "refresh" }),
    ).resolves.toMatchObject({ state: "available" });
  });

  it("rejects a provider request ID outside the fixed safe syntax", async () => {
    const store = new InMemoryCredentialStore();
    await seed(store);
    const diagnostics: GitHubCredentialRefreshDiagnostic[] = [];
    const pollutedRequestId = "ghr_polluted_request_id_fixture";
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ error: "provider_failure" }), {
          status: 500,
          headers: {
            "content-type": "application/json",
            "x-github-request-id": pollutedRequestId,
          },
        }),
      ),
      now: () => NOW,
      onRefreshDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    await expect(resolver.use(HANDLE, () => Promise.resolve())).rejects.toEqual(
      new GitHubCredentialError(),
    );
    expect(diagnostics).toContainEqual({
      stage: "provider_response",
      outcome: "failed",
      providerCode: "unknown",
      responseStatus: 500,
    });
    expect(JSON.stringify(diagnostics)).not.toContain(pollutedRequestId);
  });

  it("reports a sanitized response-read failure and deletes the possibly rotated pair", async () => {
    const store = new InMemoryCredentialStore();
    await seed(store);
    const diagnostics: GitHubCredentialRefreshDiagnostic[] = [];
    const pollutedFailure = "ghr_provider_response_failure_fixture";
    const partialResponseBytes = Uint8Array.from(
      Buffer.from('{"access_token":"ghu_partial_response_fixture",', "utf8"),
    );
    let read = false;
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          if (!read) {
            read = true;
            controller.enqueue(partialResponseBytes);
            return;
          }
          controller.error(new Error(pollutedFailure));
        },
      }),
      { headers: { "content-type": "application/json" } },
    );
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response),
      now: () => NOW,
      onRefreshDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    await expect(resolver.use(HANDLE, () => Promise.resolve())).rejects.toEqual(
      new GitHubCredentialError(),
    );
    expect(diagnostics).toEqual([
      { stage: "refresh_token_read", outcome: "started" },
      { stage: "refresh_token_read", outcome: "succeeded" },
      { stage: "provider_request", outcome: "started" },
      { stage: "provider_request", outcome: "succeeded" },
      { stage: "provider_response", outcome: "started" },
      { stage: "provider_response", outcome: "failed" },
      { stage: "fail_closed_cleanup", outcome: "started" },
      { stage: "fail_closed_cleanup", outcome: "succeeded" },
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain(pollutedFailure);
    expect(partialResponseBytes.every((byte) => byte === 0)).toBe(true);
    for (const slot of ["default", "refresh", "metadata"] as const) {
      await expect(
        store.status({ schemaVersion: 1, provider: "github", slot }),
      ).resolves.toMatchObject({ state: "missing" });
    }
  });

  it.each([
    ["refresh", "refresh_token_write"],
    ["default", "access_token_write"],
    ["metadata", "metadata_write"],
  ] as const)("deletes a remotely rotated pair when the %s write fails", async (slot, stage) => {
    const backingStore = new InMemoryCredentialStore();
    await seed(backingStore);
    const diagnostics: GitHubCredentialRefreshDiagnostic[] = [];
    const store: CredentialStore = {
      status: (value) => backingStore.status(value),
      use: (value, operation) => backingStore.use(value, operation),
      delete: (value) => backingStore.delete(value),
      write: (value, secret) =>
        (value as { readonly slot?: unknown }).slot === slot
          ? Promise.reject(new Error("ghu_polluted_write_failure_fixture"))
          : backingStore.write(value, secret),
    };
    const resolver = new GitHubStoredCredentialResolver({
      store,
      credentialStoreHandle: HANDLE,
      clientId: CLIENT_ID,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(refreshResponse()),
      now: () => NOW,
      onRefreshDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    await expect(resolver.use(HANDLE, () => Promise.resolve())).rejects.toEqual(
      new GitHubCredentialError(),
    );
    for (const slot of ["default", "refresh", "metadata"] as const) {
      await expect(
        backingStore.status({ schemaVersion: 1, provider: "github", slot }),
      ).resolves.toMatchObject({ state: "missing" });
    }
    expect(diagnostics).toContainEqual({ stage, outcome: "failed" });
    expect(diagnostics).toContainEqual({ stage: "fail_closed_cleanup", outcome: "succeeded" });
    expect(JSON.stringify(diagnostics)).not.toMatch(/gh[ur]_/u);
    expect(
      diagnostics.every(
        (diagnostic) => Object.keys(diagnostic).sort().join(",") === "outcome,stage",
      ),
    ).toBe(true);
  });
});
