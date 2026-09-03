import {
  CredentialReferenceSchema,
  GitHubCredentialMetadataSchema,
  type CredentialReference,
  type GitHubCredentialMetadata,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";

const TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const MAX_RESPONSE_BYTES = 65_536;
const REFRESH_MARGIN_MS = 60_000;

export type GitHubCredentialRefreshStage =
  | "refresh_token_read"
  | "provider_request"
  | "provider_response"
  | "refresh_token_write"
  | "access_token_write"
  | "metadata_write"
  | "fail_closed_cleanup";

export interface GitHubCredentialRefreshDiagnostic {
  readonly stage: GitHubCredentialRefreshStage;
  readonly outcome: "started" | "succeeded" | "failed";
  readonly providerCode?: GitHubCredentialRefreshProviderCode;
  readonly providerRequestId?: string;
  readonly responseStatus?: number;
}

export type GitHubCredentialRefreshProviderCode =
  | "access_denied"
  | "bad_refresh_token"
  | "bad_verification_code"
  | "device_flow_disabled"
  | "expired_token"
  | "incorrect_client_credentials"
  | "incorrect_device_code"
  | "unsupported_grant_type"
  | "unknown";

export type GitHubCredentialRefreshDiagnosticSink = (
  diagnostic: GitHubCredentialRefreshDiagnostic,
) => void;

export class GitHubCredentialError extends Error {
  constructor() {
    super("GitHub credential is unavailable");
    this.name = "GitHubCredentialError";
  }
}

function reference(slot: "default" | "refresh" | "metadata"): CredentialReference {
  return CredentialReferenceSchema.parse({ schemaVersion: 1, provider: "github", slot });
}

function text(secret: Uint8Array, prefix: "ghu_" | "ghr_"): string {
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(secret);
  } catch {
    throw new GitHubCredentialError();
  }
  if (
    value.length < 12 ||
    value.length > 512 ||
    !value.startsWith(prefix) ||
    !/^[A-Za-z0-9_]+$/u.test(value)
  ) {
    throw new GitHubCredentialError();
  }
  return value;
}

function integer(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new GitHubCredentialError();
  }
  return value as number;
}

function token(value: unknown, prefix: "ghu_" | "ghr_"): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    value.length > 512 ||
    !value.startsWith(prefix) ||
    !/^[A-Za-z0-9_]+$/u.test(value)
  ) {
    throw new GitHubCredentialError();
  }
  return Uint8Array.from(Buffer.from(value, "utf8"));
}

async function boundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType === null || !contentType.toLowerCase().startsWith("application/json")) {
    throw new GitHubCredentialError();
  }
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!Number.isInteger(length) || length < 0 || length > MAX_RESPONSE_BYTES) {
      throw new GitHubCredentialError();
    }
  }
  if (response.body === null) throw new GitHubCredentialError();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let bytes: Uint8Array | undefined;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new GitHubCredentialError();
      }
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new GitHubCredentialError();
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    bytes?.fill(0);
  }
}

function refreshResponse(value: unknown, now: number) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GitHubCredentialError();
  }
  const record = value as Record<string, unknown>;
  const expected = new Set([
    "access_token",
    "expires_in",
    "refresh_token",
    "refresh_token_expires_in",
    "scope",
    "token_type",
  ]);
  if (Object.keys(record).some((key) => !expected.has(key)) || Object.keys(record).length !== 6) {
    throw new GitHubCredentialError();
  }
  if (record.token_type !== "bearer" || record.scope !== "") throw new GitHubCredentialError();
  const accessToken = token(record.access_token, "ghu_");
  let refreshToken: Uint8Array | undefined;
  try {
    refreshToken = token(record.refresh_token, "ghr_");
    const accessSeconds = integer(record.expires_in, 60, 86_400);
    const refreshSeconds = integer(record.refresh_token_expires_in, 86_400, 31_536_000);
    return {
      accessToken,
      refreshToken,
      metadata: GitHubCredentialMetadataSchema.parse({
        schemaVersion: 1,
        accessExpiresAt: new Date(now + accessSeconds * 1_000).toISOString(),
        refreshExpiresAt: new Date(now + refreshSeconds * 1_000).toISOString(),
      }),
    };
  } catch {
    accessToken.fill(0);
    refreshToken?.fill(0);
    throw new GitHubCredentialError();
  }
}

function refreshProviderCode(value: unknown): GitHubCredentialRefreshProviderCode {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "unknown";
  const error = (value as Record<string, unknown>).error;
  if (
    error === "access_denied" ||
    error === "bad_refresh_token" ||
    error === "bad_verification_code" ||
    error === "device_flow_disabled" ||
    error === "expired_token" ||
    error === "incorrect_client_credentials" ||
    error === "incorrect_device_code" ||
    error === "unsupported_grant_type"
  ) {
    return error;
  }
  return "unknown";
}

function providerRequestId(response: Response): string | undefined {
  const value = response.headers.get("x-github-request-id");
  if (value === null || value.length < 8 || value.length > 128 || !/^[A-F0-9:-]+$/u.test(value)) {
    return undefined;
  }
  return value;
}

export class GitHubStoredCredentialResolver {
  readonly #store: CredentialStore;
  readonly #handle: string;
  readonly #clientId: string;
  readonly #fetch: typeof fetch;
  readonly #now: () => number;
  readonly #diagnostic: GitHubCredentialRefreshDiagnosticSink;
  #refreshing: Promise<void> | null = null;

  constructor(options: {
    readonly store: CredentialStore;
    readonly credentialStoreHandle: string;
    readonly clientId: string;
    readonly fetch?: typeof fetch;
    readonly now?: () => number;
    readonly onRefreshDiagnostic?: GitHubCredentialRefreshDiagnosticSink;
  }) {
    if (!/^[A-Za-z0-9_-]{8,128}$/u.test(options.clientId)) {
      throw new TypeError("GitHub App client ID is invalid");
    }
    this.#store = options.store;
    this.#handle = options.credentialStoreHandle;
    this.#clientId = options.clientId;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#now = options.now ?? Date.now;
    this.#diagnostic = options.onRefreshDiagnostic ?? (() => undefined);
  }

  #report(
    stage: GitHubCredentialRefreshStage,
    outcome: GitHubCredentialRefreshDiagnostic["outcome"],
    providerCode?: GitHubCredentialRefreshProviderCode,
    responseStatus?: number,
    requestId?: string,
  ) {
    try {
      this.#diagnostic({
        stage,
        outcome,
        ...(providerCode === undefined ? {} : { providerCode }),
        ...(requestId === undefined ? {} : { providerRequestId: requestId }),
        ...(responseStatus === undefined ? {} : { responseStatus }),
      });
    } catch {
      // Diagnostics must never alter credential availability or refresh behavior.
    }
  }

  async #cleanup(): Promise<void> {
    this.#report("fail_closed_cleanup", "started");
    const results = await Promise.allSettled([
      this.#store.delete(reference("default")),
      this.#store.delete(reference("refresh")),
      this.#store.delete(reference("metadata")),
    ]);
    this.#report(
      "fail_closed_cleanup",
      results.every((result) => result.status === "fulfilled") ? "succeeded" : "failed",
    );
  }

  async #metadata(): Promise<GitHubCredentialMetadata | null> {
    if ((await this.#store.status(reference("metadata"))).state === "missing") return null;
    try {
      return await this.#store.use(reference("metadata"), (bytes) => {
        const value = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        ) as unknown;
        return Promise.resolve(GitHubCredentialMetadataSchema.parse(value));
      });
    } catch {
      throw new GitHubCredentialError();
    }
  }

  async #rotate(): Promise<void> {
    const now = this.#now();
    let response: Response;
    let refreshTokenRead = false;
    this.#report("refresh_token_read", "started");
    try {
      response = await this.#store.use(reference("refresh"), async (bytes) => {
        const refreshToken = text(bytes, "ghr_");
        refreshTokenRead = true;
        this.#report("refresh_token_read", "succeeded");
        this.#report("provider_request", "started");
        try {
          const result = await this.#fetch(TOKEN_ENDPOINT, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
            headers: {
              accept: "application/json",
              "content-type": "application/x-www-form-urlencoded",
              "user-agent": "agentic-guardian",
            },
            body: new URLSearchParams({
              client_id: this.#clientId,
              grant_type: "refresh_token",
              refresh_token: refreshToken,
            }).toString(),
          });
          this.#report("provider_request", "succeeded");
          return result;
        } catch {
          this.#report("provider_request", "failed");
          throw new GitHubCredentialError();
        }
      });
    } catch {
      if (!refreshTokenRead) this.#report("refresh_token_read", "failed");
      throw new GitHubCredentialError();
    }
    this.#report("provider_response", "started");
    if (!response.ok) {
      let providerCode: GitHubCredentialRefreshProviderCode = "unknown";
      try {
        providerCode = refreshProviderCode(await boundedJson(response));
      } catch {
        // The fixed unknown code is sufficient when a rejected body is not safely parseable.
      }
      this.#report(
        "provider_response",
        "failed",
        providerCode,
        response.status,
        providerRequestId(response),
      );
      throw new GitHubCredentialError();
    }
    let rotated: ReturnType<typeof refreshResponse>;
    try {
      rotated = refreshResponse(await boundedJson(response), now);
    } catch {
      this.#report("provider_response", "failed");
      await this.#cleanup();
      throw new GitHubCredentialError();
    }
    this.#report("provider_response", "succeeded");
    const metadataBytes = Uint8Array.from(Buffer.from(JSON.stringify(rotated.metadata), "utf8"));
    let writeStage: Extract<
      GitHubCredentialRefreshStage,
      "refresh_token_write" | "access_token_write" | "metadata_write"
    > = "refresh_token_write";
    try {
      this.#report(writeStage, "started");
      await this.#store.write(reference("refresh"), rotated.refreshToken);
      this.#report(writeStage, "succeeded");
      writeStage = "access_token_write";
      this.#report(writeStage, "started");
      await this.#store.write(reference("default"), rotated.accessToken);
      this.#report(writeStage, "succeeded");
      writeStage = "metadata_write";
      this.#report(writeStage, "started");
      await this.#store.write(reference("metadata"), metadataBytes);
      this.#report(writeStage, "succeeded");
    } catch {
      this.#report(writeStage, "failed");
      await this.#cleanup();
      throw new GitHubCredentialError();
    } finally {
      rotated.accessToken.fill(0);
      rotated.refreshToken.fill(0);
      metadataBytes.fill(0);
    }
  }

  async #ensureFresh(): Promise<void> {
    const metadata = await this.#metadata();
    const now = this.#now();
    if (metadata !== null) {
      if (Date.parse(metadata.refreshExpiresAt) <= now) throw new GitHubCredentialError();
      if (Date.parse(metadata.accessExpiresAt) > now + REFRESH_MARGIN_MS) return;
    }
    if (this.#refreshing === null) {
      this.#refreshing = this.#rotate().finally(() => {
        this.#refreshing = null;
      });
    }
    await this.#refreshing;
  }

  async use<T>(handle: string, operation: (credential: Uint8Array) => Promise<T>): Promise<T> {
    if (handle !== this.#handle) throw new GitHubCredentialError();
    await this.#ensureFresh();
    return await this.#store.use(reference("default"), operation);
  }
}

export const githubCredentialBoundary = { tokenEndpoint: TOKEN_ENDPOINT } as const;
