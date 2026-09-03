import {
  CredentialReferenceSchema,
  CredentialVerificationResultSchema,
  type CredentialProvider,
  type CredentialReference,
  type CredentialVerificationResult,
} from "@guardian/contracts";

const ENDPOINTS = {
  nebius: "https://api.tokenfactory.nebius.com/v1/models",
  tavily: "https://api.tavily.com/usage",
  github: "https://api.github.com/user",
} as const;
const MAX_RESPONSE_BYTES = 64 * 1_024;
const DEFAULT_TIMEOUT_MS = 10_000;
const GITHUB_DEVICE_CODE_ENDPOINT = "https://github.com/login/device/code";
const GITHUB_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

export class CredentialVerificationError extends Error {
  constructor() {
    super("credential verification failed");
    this.name = "CredentialVerificationError";
  }
}

export interface CredentialVerifier {
  verify(reference: CredentialReference, secret: Uint8Array): Promise<CredentialVerificationResult>;
}

export type GitHubDeviceChallenge = {
  readonly verificationUri: "https://github.com/login/device";
  readonly userCode: string;
  readonly expiresInSeconds: number;
};

export type GitHubDeviceCredential = {
  readonly accessToken: Uint8Array;
  readonly refreshToken: Uint8Array;
  readonly accessTokenExpiresInSeconds: number;
  readonly refreshTokenExpiresInSeconds: number;
};

export interface GitHubDeviceAuthorizer {
  authorize(
    showChallenge: (challenge: GitHubDeviceChallenge) => void,
  ): Promise<GitHubDeviceCredential>;
}

function credentialText(secret: Uint8Array): string {
  if (secret.byteLength < 8 || secret.byteLength > 4_096) {
    throw new CredentialVerificationError();
  }
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(secret);
  } catch {
    throw new CredentialVerificationError();
  }
  if (
    value.length < 8 ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint === undefined || codePoint <= 0x20 || codePoint >= 0x7f;
    })
  ) {
    throw new CredentialVerificationError();
  }
  return value;
}

async function boundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType === null || !contentType.toLowerCase().startsWith("application/json")) {
    throw new CredentialVerificationError();
  }
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!Number.isInteger(length) || length < 0 || length > MAX_RESPONSE_BYTES) {
      throw new CredentialVerificationError();
    }
  }
  if (response.body === null) throw new CredentialVerificationError();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new CredentialVerificationError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new CredentialVerificationError();
  } finally {
    bytes.fill(0);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CredentialVerificationError();
  }
  return value as Record<string, unknown>;
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new CredentialVerificationError();
  }
  return value as number;
}

function boundedToken(value: unknown, prefix: "ghu_" | "ghr_"): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    value.length > 512 ||
    !value.startsWith(prefix) ||
    !/^[A-Za-z0-9_]+$/u.test(value)
  ) {
    throw new CredentialVerificationError();
  }
  return Uint8Array.from(Buffer.from(value, "utf8"));
}

async function fixedFormPost(
  fetchImplementation: typeof fetch,
  endpoint: string,
  parameters: Readonly<Record<string, string>>,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImplementation(endpoint, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "agentic-guardian",
      },
      body: new URLSearchParams(parameters).toString(),
    });
  } catch {
    throw new CredentialVerificationError();
  }
  if (!response.ok) throw new CredentialVerificationError();
  return await boundedJson(response);
}

export class GitHubDeviceFlow implements GitHubDeviceAuthorizer {
  readonly #clientId: string;
  readonly #repositoryId: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #wait: (milliseconds: number) => Promise<void>;

  constructor(options: {
    readonly clientId: string;
    readonly repositoryId: string;
    readonly fetch?: typeof fetch;
    readonly timeoutMs?: number;
    readonly wait?: (milliseconds: number) => Promise<void>;
  }) {
    if (!/^[A-Za-z0-9_-]{8,128}$/u.test(options.clientId)) {
      throw new TypeError("GitHub App client ID is invalid");
    }
    if (!/^[1-9][0-9]{0,19}$/u.test(options.repositoryId)) {
      throw new TypeError("GitHub repository ID is invalid");
    }
    this.#clientId = options.clientId;
    this.#repositoryId = options.repositoryId;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(this.#timeoutMs) || this.#timeoutMs < 100 || this.#timeoutMs > 60_000) {
      throw new TypeError("GitHub device-flow timeout is invalid");
    }
    this.#wait =
      options.wait ??
      ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  async authorize(
    showChallenge: (challenge: GitHubDeviceChallenge) => void,
  ): Promise<GitHubDeviceCredential> {
    try {
      const start = record(
        await fixedFormPost(
          this.#fetch,
          GITHUB_DEVICE_CODE_ENDPOINT,
          { client_id: this.#clientId },
          this.#timeoutMs,
        ),
      );
      if (
        typeof start.device_code !== "string" ||
        !/^[\x21-\x7e]{20,128}$/u.test(start.device_code) ||
        typeof start.user_code !== "string" ||
        !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/u.test(start.user_code) ||
        start.verification_uri !== "https://github.com/login/device"
      ) {
        throw new CredentialVerificationError();
      }
      const expiresInSeconds = boundedInteger(start.expires_in, 60, 1_800);
      let intervalSeconds = boundedInteger(start.interval, 1, 60);
      showChallenge({
        verificationUri: "https://github.com/login/device",
        userCode: start.user_code,
        expiresInSeconds,
      });

      let elapsedSeconds = 0;
      while (elapsedSeconds < expiresInSeconds) {
        await this.#wait(intervalSeconds * 1_000);
        elapsedSeconds += intervalSeconds;
        const tokenResponse = record(
          await fixedFormPost(
            this.#fetch,
            GITHUB_TOKEN_ENDPOINT,
            {
              client_id: this.#clientId,
              device_code: start.device_code,
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
              repository_id: this.#repositoryId,
            },
            this.#timeoutMs,
          ),
        );
        if (tokenResponse.error === "authorization_pending") continue;
        if (tokenResponse.error === "slow_down") {
          intervalSeconds = Math.min(intervalSeconds + 5, 60);
          continue;
        }
        if (tokenResponse.error !== undefined) throw new CredentialVerificationError();
        if (tokenResponse.token_type !== "bearer" || tokenResponse.scope !== "") {
          throw new CredentialVerificationError();
        }
        const accessToken = boundedToken(tokenResponse.access_token, "ghu_");
        let refreshToken: Uint8Array | undefined;
        try {
          refreshToken = boundedToken(tokenResponse.refresh_token, "ghr_");
          return {
            accessToken,
            refreshToken,
            accessTokenExpiresInSeconds: boundedInteger(tokenResponse.expires_in, 60, 86_400),
            refreshTokenExpiresInSeconds: boundedInteger(
              tokenResponse.refresh_token_expires_in,
              86_400,
              31_536_000,
            ),
          };
        } catch {
          accessToken.fill(0);
          refreshToken?.fill(0);
          throw new CredentialVerificationError();
        }
      }
      throw new CredentialVerificationError();
    } catch {
      throw new CredentialVerificationError();
    }
  }
}

function project(provider: CredentialProvider, value: unknown): CredentialVerificationResult {
  const response = record(value);
  let accountLabel: string;
  if (provider === "nebius") {
    if (response.object !== "list" || !Array.isArray(response.data)) {
      throw new CredentialVerificationError();
    }
    accountLabel = "Nebius Token Factory";
  } else if (provider === "tavily") {
    const account = record(response.account);
    const plan = account.current_plan;
    if (typeof plan !== "string" || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/u.test(plan)) {
      throw new CredentialVerificationError();
    }
    accountLabel = `Tavily ${plan}`;
  } else {
    const login = response.login;
    if (
      typeof login !== "string" ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(login)
    ) {
      throw new CredentialVerificationError();
    }
    accountLabel = `GitHub @${login}`;
  }
  return CredentialVerificationResultSchema.parse({ schemaVersion: 1, provider, accountLabel });
}

export class FixedOriginCredentialVerifier implements CredentialVerifier {
  readonly #provider: CredentialProvider;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly provider: CredentialProvider;
    readonly fetch?: typeof fetch;
    readonly timeoutMs?: number;
  }) {
    this.#provider = options.provider;
    this.#fetch = options.fetch ?? globalThis.fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError("credential verification timeout is invalid");
    }
    this.#timeoutMs = timeoutMs;
  }

  async verify(
    referenceValue: CredentialReference,
    secret: Uint8Array,
  ): Promise<CredentialVerificationResult> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    if (reference.provider !== this.#provider) throw new CredentialVerificationError();
    const credential = credentialText(secret);
    let response: Response;
    try {
      response = await this.#fetch(ENDPOINTS[this.#provider], {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(this.#timeoutMs),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${credential}`,
          ...(this.#provider === "github"
            ? {
                "user-agent": "agentic-guardian",
                "x-github-api-version": "2022-11-28",
              }
            : {}),
        },
      });
    } catch {
      throw new CredentialVerificationError();
    }
    if (!response.ok) throw new CredentialVerificationError();
    try {
      const result = project(this.#provider, await boundedJson(response));
      if (result.accountLabel.includes(credential)) throw new CredentialVerificationError();
      return result;
    } catch {
      throw new CredentialVerificationError();
    }
  }
}

export function createCredentialVerifier(
  provider: CredentialProvider,
  fetchImplementation: typeof fetch = globalThis.fetch,
): CredentialVerifier {
  return new FixedOriginCredentialVerifier({ provider, fetch: fetchImplementation });
}

export const credentialVerificationBoundary = {
  endpoints: ENDPOINTS,
  methods: { nebius: "GET", tavily: "GET", github: "GET" },
  githubDeviceFlow: {
    deviceCodeEndpoint: GITHUB_DEVICE_CODE_ENDPOINT,
    tokenEndpoint: GITHUB_TOKEN_ENDPOINT,
    method: "POST",
  },
} as const;
