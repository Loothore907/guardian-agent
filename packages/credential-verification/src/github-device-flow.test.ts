import { describe, expect, it, vi } from "vitest";

import { CredentialVerificationError, GitHubDeviceFlow } from "./index.js";

const CLIENT_ID = "Iv23guardianclient";
const REPOSITORY_ID = "123456789";
const ACCESS_TOKEN = "ghu_device_access_token_fixture";
const REFRESH_TOKEN = "ghr_device_refresh_token_fixture";

function json(value: unknown, init?: ResponseInit): Response {
  return Response.json(value, init);
}

describe("GitHub App device flow", () => {
  it("uses only fixed endpoints, respects polling intervals, and returns expiring tokens", async () => {
    const responses = [
      json({
        device_code: "device-code-value-that-is-forty-characters-long",
        user_code: "ABCD-1234",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5,
      }),
      json({ error: "authorization_pending" }),
      json({ error: "slow_down", interval: 10 }),
      json({
        access_token: ACCESS_TOKEN,
        expires_in: 28_800,
        refresh_token: REFRESH_TOKEN,
        refresh_token_expires_in: 15_897_600,
        scope: "",
        token_type: "bearer",
      }),
    ];
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetchImplementation: typeof fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      requests.push({ url, init });
      const response = responses.shift();
      if (response === undefined) throw new Error("unexpected request");
      return Promise.resolve(response);
    };
    const waits: number[] = [];
    const challenge = vi.fn();
    const flow = new GitHubDeviceFlow({
      clientId: CLIENT_ID,
      repositoryId: REPOSITORY_ID,
      fetch: fetchImplementation,
      wait: (milliseconds) => {
        waits.push(milliseconds);
        return Promise.resolve();
      },
    });

    const credential = await flow.authorize(challenge);

    expect(challenge).toHaveBeenCalledWith({
      verificationUri: "https://github.com/login/device",
      userCode: "ABCD-1234",
      expiresInSeconds: 900,
    });
    expect(waits).toEqual([5_000, 5_000, 10_000]);
    expect(requests.map(({ url }) => url)).toEqual([
      "https://github.com/login/device/code",
      "https://github.com/login/oauth/access_token",
      "https://github.com/login/oauth/access_token",
      "https://github.com/login/oauth/access_token",
    ]);
    for (const { init } of requests) {
      expect(init).toMatchObject({ method: "POST", redirect: "error" });
      expect(init?.headers).not.toHaveProperty("authorization");
    }
    expect(requests[0]?.init?.body).toBe(`client_id=${CLIENT_ID}`);
    const tokenRequestBody = requests[1]?.init?.body;
    expect(typeof tokenRequestBody).toBe("string");
    expect(tokenRequestBody as string).toContain(
      "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code",
    );
    expect(tokenRequestBody as string).toContain(`repository_id=${REPOSITORY_ID}`);
    expect(Buffer.from(credential.accessToken).toString()).toBe(ACCESS_TOKEN);
    expect(Buffer.from(credential.refreshToken).toString()).toBe(REFRESH_TOKEN);
    expect(credential.accessTokenExpiresInSeconds).toBe(28_800);
    expect(credential.refreshTokenExpiresInSeconds).toBe(15_897_600);
  });

  it("fails closed on denial, malformed challenges, and non-expiring credentials", async () => {
    const cases: readonly unknown[][] = [
      [
        {
          device_code: "device-code-value-that-is-forty-characters-long",
          user_code: "ABCD-1234",
          verification_uri: "https://github.com/login/device",
          expires_in: 60,
          interval: 1,
        },
        { error: "access_denied", error_description: ACCESS_TOKEN },
      ],
      [
        {
          device_code: "too-short",
          user_code: "ABCD-1234",
          verification_uri: "https://github.com/login/device",
          expires_in: 900,
          interval: 5,
        },
      ],
      [
        {
          device_code: "device-code-value-that-is-forty-characters-long",
          user_code: "ABCD-1234",
          verification_uri: "https://github.com/login/device",
          expires_in: 60,
          interval: 1,
        },
        { access_token: ACCESS_TOKEN, scope: "", token_type: "bearer" },
      ],
    ];

    for (const values of cases) {
      const responses = [...values];
      const flow = new GitHubDeviceFlow({
        clientId: CLIENT_ID,
        repositoryId: REPOSITORY_ID,
        fetch: (input, init) => {
          void input;
          void init;
          return Promise.resolve(json(responses.shift()));
        },
        wait: () => Promise.resolve(),
      });
      const error = await flow.authorize(vi.fn()).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(CredentialVerificationError);
      expect((error as Error).message).toBe("credential verification failed");
      expect((error as Error).message).not.toContain(ACCESS_TOKEN);
    }
  });

  it("rejects invalid client IDs before making a request", () => {
    expect(() => new GitHubDeviceFlow({ clientId: "bad id", repositoryId: REPOSITORY_ID })).toThrow(
      "GitHub App client ID is invalid",
    );
    expect(() => new GitHubDeviceFlow({ clientId: CLIENT_ID, repositoryId: "all" })).toThrow(
      "GitHub repository ID is invalid",
    );
  });
});
