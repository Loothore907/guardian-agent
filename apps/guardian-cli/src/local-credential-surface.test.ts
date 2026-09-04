import { afterEach, describe, expect, it } from "vitest";

import {
  startLocalCredentialSurface,
  type LocalCredentialSurface,
} from "./local-credential-surface.js";

const active: LocalCredentialSurface[] = [];

afterEach(async () => {
  await Promise.all(active.splice(0).map(async (surface) => await surface.close()));
});

function endpoints(surface: LocalCredentialSurface) {
  const url = new URL(surface.url);
  const capability = url.hash.slice(1);
  url.hash = "";
  return { origin: url.origin, capability };
}

function headers(origin: string, capability: string) {
  return {
    "Content-Type": "application/octet-stream",
    Origin: origin,
    "Sec-Fetch-Site": "same-origin",
    "X-Guardian-Capability": capability,
  };
}

describe("local credential enrollment surface", () => {
  it("serves a no-store one-time modal without putting its capability in the document", async () => {
    const surface = await startLocalCredentialSurface({
      mode: "enroll",
      provider: "nebius",
      destination: "linux_secret_service",
      onSubmit: () => Promise.resolve(),
    });
    active.push(surface);
    const { origin, capability } = endpoints(surface);

    const response = await fetch(`${origin}/`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(body).toContain("Add Nebius credential");
    expect(body).toContain("linux secret service");
    expect(body).not.toContain(capability);
  });

  it("labels review mode as fake-only and does not promise storage", async () => {
    const surface = await startLocalCredentialSurface({
      mode: "review",
      provider: "tavily",
      destination: "windows_credential_manager",
      onSubmit: () => Promise.resolve(),
    });
    active.push(surface);
    const { origin } = endpoints(surface);

    const response = await fetch(`${origin}/`);
    const body = await response.text();

    expect(body).toContain("Review Tavily credential setup");
    expect(body).toContain("Use only an obvious fake value");
    expect(body).toContain("Nothing is stored or sent to Tavily");
    expect(body).toContain("Submit fake value");
    expect(body).not.toContain("Verify and save");
  });

  it("rejects cross-origin submission and accepts exactly one bound secret with zeroing", async () => {
    let callbackSecret: Uint8Array | undefined;
    const surface = await startLocalCredentialSurface({
      mode: "enroll",
      provider: "tavily",
      destination: "windows_credential_manager",
      onSubmit: (secret) => {
        callbackSecret = secret;
        return Promise.resolve();
      },
    });
    active.push(surface);
    const { origin, capability } = endpoints(surface);

    const rejected = await fetch(`${origin}/submit`, {
      method: "POST",
      headers: headers("http://untrusted.invalid", capability),
      body: "fake-credential-value",
    });
    expect(rejected.status).toBe(404);

    const accepted = await fetch(`${origin}/submit`, {
      method: "POST",
      headers: headers(origin, capability),
      body: "fake-credential-value",
    });
    expect(accepted.status).toBe(204);
    await expect(surface.completed).resolves.toBe("submitted");
    expect(callbackSecret?.every((byte) => byte === 0)).toBe(true);

    const replay = await fetch(`${origin}/submit`, {
      method: "POST",
      headers: headers(origin, capability),
      body: "second-fake-credential",
    });
    expect(replay.status).toBe(404);
  });

  it("supports bounded one-use cancellation without invoking credential handling", async () => {
    let invoked = false;
    const surface = await startLocalCredentialSurface({
      mode: "enroll",
      provider: "nebius",
      destination: "linux_secret_service",
      onSubmit: () => {
        invoked = true;
        return Promise.resolve();
      },
    });
    active.push(surface);
    const { origin, capability } = endpoints(surface);

    const response = await fetch(`${origin}/cancel`, {
      method: "POST",
      headers: headers(origin, capability),
      body: new Uint8Array(),
    });

    expect(response.status).toBe(204);
    await expect(surface.completed).resolves.toBe("cancelled");
    expect(invoked).toBe(false);
  });

  it("returns a sanitized failure and zeroes input when verification fails", async () => {
    let callbackSecret: Uint8Array | undefined;
    const surface = await startLocalCredentialSurface({
      mode: "enroll",
      provider: "tavily",
      destination: "linux_secret_service",
      onSubmit: (secret) => {
        callbackSecret = secret;
        return Promise.reject(new TypeError(`provider rejected ${Buffer.from(secret).toString()}`));
      },
    });
    active.push(surface);
    const { origin, capability } = endpoints(surface);
    const response = await fetch(`${origin}/submit`, {
      method: "POST",
      headers: headers(origin, capability),
      body: "fake-credential-value",
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Credential verification failed\n");
    await expect(surface.completed).resolves.toBe("failed");
    expect(callbackSecret?.every((byte) => byte === 0)).toBe(true);
  });

  it("rejects unknown providers, non-local destinations, modes, and unsafe secret bytes", async () => {
    await expect(
      startLocalCredentialSurface({
        mode: "enroll",
        provider: "github",
        destination: "linux_secret_service",
        onSubmit: () => Promise.resolve(),
      }),
    ).rejects.toThrow();
    await expect(
      startLocalCredentialSurface({
        mode: "enroll",
        provider: "nebius",
        destination: "nebius_secretstash",
        onSubmit: () => Promise.resolve(),
      }),
    ).rejects.toThrow("unsupported");
    await expect(
      startLocalCredentialSurface({
        mode: "invalid" as never,
        provider: "nebius",
        destination: "linux_secret_service",
        onSubmit: () => Promise.resolve(),
      }),
    ).rejects.toThrow("mode");
    await expect(
      startLocalCredentialSurface({
        mode: "enroll",
        provider: "nebius",
        destination: "arbitrary-file",
        onSubmit: () => Promise.resolve(),
      }),
    ).rejects.toThrow();

    const surface = await startLocalCredentialSurface({
      mode: "enroll",
      provider: "nebius",
      destination: "linux_secret_service",
      onSubmit: () => Promise.resolve(),
    });
    active.push(surface);
    const { origin, capability } = endpoints(surface);
    const response = await fetch(`${origin}/submit`, {
      method: "POST",
      headers: headers(origin, capability),
      body: "fake credential with spaces",
    });
    expect(response.status).toBe(400);
    await expect(surface.completed).resolves.toBe("failed");
  });

  it("rejects an oversized body before credential handling", async () => {
    let invoked = false;
    const surface = await startLocalCredentialSurface({
      mode: "enroll",
      provider: "nebius",
      destination: "linux_secret_service",
      onSubmit: () => {
        invoked = true;
        return Promise.resolve();
      },
    });
    active.push(surface);
    const { origin, capability } = endpoints(surface);
    const response = await fetch(`${origin}/submit`, {
      method: "POST",
      headers: headers(origin, capability),
      body: "x".repeat(4_097),
    });

    expect(response.status).toBe(400);
    expect(invoked).toBe(false);
    await expect(surface.completed).resolves.toBe("failed");
  });

  it("expires and closes an unused surface after its bounded lifetime", async () => {
    const surface = await startLocalCredentialSurface({
      mode: "review",
      provider: "nebius",
      destination: "windows_credential_manager",
      lifetimeMs: 1_000,
      onSubmit: () => Promise.resolve(),
    });
    active.push(surface);

    await expect(surface.completed).resolves.toBe("expired");
    await surface.close();
  });
});
