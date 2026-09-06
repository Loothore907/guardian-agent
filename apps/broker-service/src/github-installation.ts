import { createPrivateKey, sign } from "node:crypto";
import {
  GitHubInstallationMetadataSchema,
  registeredCredentialReference,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";
import { GitHubCredentialError, boundedGitHubCredentialJson } from "./github-credential.js";

const permissions = { contents: "write", pull_requests: "write" } as const;
const reference = (slot: "installation" | "app_private_key") =>
  registeredCredentialReference("github", slot);
const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Mints a new repository-restricted token per credential callback; no refresh token or store writes. */
export class GitHubInstallationCredentialResolver {
  constructor(
    private readonly options: {
      store: CredentialStore;
      credentialStoreHandle: string;
      expectedRepository: () => Promise<{ owner: string; repository: string }>;
      fetch?: typeof fetch;
      now?: () => number;
    },
  ) {}

  async #mint(): Promise<Uint8Array> {
    try {
      const metadata = await this.options.store.use(reference("installation"), (bytes) =>
        Promise.resolve(
          GitHubInstallationMetadataSchema.parse(
            JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown,
          ),
        ),
      );
      const expected = await this.options.expectedRepository();
      if (expected.owner !== metadata.owner || expected.repository !== metadata.repository)
        throw new GitHubCredentialError();
      const now = (this.options.now ?? Date.now)();
      const seconds = Math.floor(now / 1000);
      const jwt = await this.options.store.use(reference("app_private_key"), async (bytes) => {
        const keyBytes = Buffer.from(bytes);
        let key;
        try {
          key = createPrivateKey({ key: keyBytes, format: "pem" });
        } finally {
          keyBytes.fill(0);
        }
        if (
          key.asymmetricKeyType !== "rsa" ||
          (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
        )
          return await Promise.reject(new GitHubCredentialError());
        const payload = `${encoded({ alg: "RS256", typ: "JWT" })}.${encoded({ iat: seconds - 60, exp: seconds + 540, iss: metadata.appId })}`;
        return await Promise.resolve(
          `${payload}.${sign("RSA-SHA256", Buffer.from(payload), key).toString("base64url")}`,
        );
      });
      const response = await (this.options.fetch ?? fetch)(
        `https://api.github.com/app/installations/${metadata.installationId}/access_tokens`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${jwt}`,
            "content-type": "application/json",
            "x-github-api-version": "2026-03-10",
            "user-agent": "agentic-guardian",
          },
          body: JSON.stringify({ repository_ids: [metadata.repositoryId], permissions }),
        },
      );
      if (response.status !== 201) {
        await response.body?.cancel();
        throw new GitHubCredentialError();
      }
      const result = await boundedGitHubCredentialJson(response);
      if (typeof result !== "object" || result === null || Array.isArray(result))
        throw new GitHubCredentialError();
      const value = result as Record<string, unknown>;
      if (
        typeof value.token !== "string" ||
        !/^ghs_[A-Za-z0-9_.-]{20,8188}$/u.test(value.token) ||
        typeof value.expires_at !== "string"
      )
        throw new GitHubCredentialError();
      const expiry = Date.parse(value.expires_at);
      const receivedAt = (this.options.now ?? Date.now)();
      if (
        !Number.isFinite(expiry) ||
        expiry <= receivedAt + 60_000 ||
        expiry > receivedAt + 3_660_000
      )
        throw new GitHubCredentialError();
      const scope = value.permissions;
      if (typeof scope !== "object" || scope === null || Array.isArray(scope))
        throw new GitHubCredentialError();
      const actual = scope as Record<string, unknown>;
      if (
        actual.contents !== "write" ||
        actual.pull_requests !== "write" ||
        Object.entries(actual).some(
          ([k, v]) => !Object.hasOwn(permissions, k) && !(k === "metadata" && v === "read"),
        )
      )
        throw new GitHubCredentialError();
      if (!Array.isArray(value.repositories) || value.repositories.length !== 1)
        throw new GitHubCredentialError();
      const repo = value.repositories[0] as {
        id?: unknown;
        name?: unknown;
        owner?: { login?: unknown };
      };
      if (
        repo?.id !== metadata.repositoryId ||
        typeof repo.name !== "string" ||
        repo.name.toLowerCase() !== metadata.repository ||
        typeof repo.owner?.login !== "string" ||
        repo.owner.login.toLowerCase() !== metadata.owner
      )
        throw new GitHubCredentialError();
      return Uint8Array.from(Buffer.from(value.token, "utf8"));
    } catch {
      throw new GitHubCredentialError();
    }
  }

  async use<T>(handle: string, operation: (secret: Uint8Array) => Promise<T>): Promise<T> {
    if (handle !== this.options.credentialStoreHandle) throw new GitHubCredentialError();
    const bytes = await this.#mint();
    try {
      return await operation(bytes);
    } finally {
      bytes.fill(0);
    }
  }
}
