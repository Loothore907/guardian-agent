import { describe, expect, it, vi } from "vitest";

import {
  CredentialVerificationError,
  FixedOriginCredentialVerifier,
  credentialVerificationBoundary,
} from "./index.js";

const SECRET = "provider-secret-fixture";
const REFERENCES = {
  nebius: { schemaVersion: 1, provider: "nebius", slot: "default" },
  tavily: { schemaVersion: 1, provider: "tavily", slot: "default" },
  github: { schemaVersion: 1, provider: "github", slot: "default" },
} as const;

function responseFor(provider: keyof typeof REFERENCES): unknown {
  if (provider === "nebius") return { object: "list", data: [{ id: "model" }] };
  if (provider === "tavily") return { account: { current_plan: "Bootstrap" } };
  return { login: "guardian-demo" };
}

describe("fixed-origin credential verification", () => {
  for (const provider of ["nebius", "tavily", "github"] as const) {
    it(`verifies ${provider} through only its fixed read endpoint`, async () => {
      const calls: Array<{ url: string; init: RequestInit }> = [];
      const fetchImplementation = vi.fn((url: string | URL | Request, init?: RequestInit) => {
        const urlText = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
        calls.push({ url: urlText, init: init ?? {} });
        return Promise.resolve(Response.json(responseFor(provider)));
      }) as unknown as typeof fetch;
      const verifier = new FixedOriginCredentialVerifier({ provider, fetch: fetchImplementation });

      const result = await verifier.verify(REFERENCES[provider], Buffer.from(SECRET));

      expect(result).toMatchObject({ schemaVersion: 1, provider });
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(credentialVerificationBoundary.endpoints[provider]);
      expect(calls[0]?.init.method).toBe("GET");
      expect(calls[0]?.init.redirect).toBe("error");
      expect(calls[0]?.init.body).toBeUndefined();
      expect(calls[0]?.url).not.toContain(SECRET);
      expect(JSON.stringify(result)).not.toContain(SECRET);
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers.authorization).toBe(`Bearer ${SECRET}`);
      if (provider === "github") {
        expect(headers["user-agent"]).toBe("agentic-guardian");
        expect(headers["x-github-api-version"]).toBe("2022-11-28");
      } else {
        expect(headers).not.toHaveProperty("user-agent");
      }
    });
  }

  it("rejects cross-provider use before invoking fetch", async () => {
    const fetchImplementation = vi.fn() as unknown as typeof fetch;
    const verifier = new FixedOriginCredentialVerifier({
      provider: "nebius",
      fetch: fetchImplementation,
    });
    await expect(verifier.verify(REFERENCES.github, Buffer.from(SECRET))).rejects.toBeInstanceOf(
      CredentialVerificationError,
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("sanitizes provider errors and rejects malformed or oversized responses", async () => {
    const polluted = new FixedOriginCredentialVerifier({
      provider: "github",
      fetch: () => Promise.reject(new Error(`failed with ${SECRET}`)),
    });
    await expect(polluted.verify(REFERENCES.github, Buffer.from(SECRET))).rejects.toMatchObject({
      name: "CredentialVerificationError",
      message: "credential verification failed",
    });

    const malformed = new FixedOriginCredentialVerifier({
      provider: "github",
      fetch: () => Promise.resolve(Response.json({ login: SECRET })),
    });
    await expect(malformed.verify(REFERENCES.github, Buffer.from(SECRET))).rejects.toBeInstanceOf(
      CredentialVerificationError,
    );

    const oversized = new FixedOriginCredentialVerifier({
      provider: "github",
      fetch: () =>
        Promise.resolve(
          new Response("{}", { status: 200, headers: { "content-length": "65537" } }),
        ),
    });
    await expect(oversized.verify(REFERENCES.github, Buffer.from(SECRET))).rejects.toBeInstanceOf(
      CredentialVerificationError,
    );
  });

  it("treats every non-success provider status as the same sanitized failure", async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const verifier = new FixedOriginCredentialVerifier({
        provider: "tavily",
        fetch: () => Promise.resolve(new Response(`provider ${SECRET}`, { status })),
      });
      await expect(verifier.verify(REFERENCES.tavily, Buffer.from(SECRET))).rejects.toMatchObject({
        message: "credential verification failed",
      });
    }
  });
});
