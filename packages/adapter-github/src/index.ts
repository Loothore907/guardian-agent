import {
  GitHubMergeResultSchema,
  GitHubPullRequestMergeOperationSchema,
  GitHubPullRequestReadOperationSchema,
  GitHubPullRequestSnapshotSchema,
  type GitHubMergeResult,
  type GitHubPullRequestMergeOperation,
  type GitHubPullRequestReadOperation,
  type GitHubPullRequestSnapshot,
} from "@guardian/contracts";

const GITHUB_API_ORIGIN = "https://api.github.com";
const MAX_RESPONSE_BYTES = 65_536;

export type GitHubOperation = GitHubPullRequestReadOperation | GitHubPullRequestMergeOperation;
export type GitHubAdapterErrorCode =
  | "forbidden"
  | "not_found"
  | "not_mergeable"
  | "rate_limited"
  | "resource_changed"
  | "provider_failed"
  | "provider_response_invalid";

export class GitHubAdapterError extends Error {
  readonly code: GitHubAdapterErrorCode;

  constructor(code: GitHubAdapterErrorCode) {
    super(code);
    this.name = "GitHubAdapterError";
    this.code = code;
  }
}

function credential(value: unknown): string {
  if (value instanceof Uint8Array) {
    try {
      value = new TextDecoder("utf-8", { fatal: true }).decode(value);
    } catch {
      throw new TypeError("GitHub credential is invalid");
    }
  }
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 1_024 ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint !== undefined && (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f))
      );
    })
  ) {
    throw new TypeError("GitHub credential is invalid");
  }
  return value;
}

function responseError(status: number, merge: boolean): GitHubAdapterError {
  if (status === 401 || status === 403) return new GitHubAdapterError("forbidden");
  if (status === 404) return new GitHubAdapterError("not_found");
  if (status === 409) return new GitHubAdapterError("resource_changed");
  if (merge && status === 405) return new GitHubAdapterError("not_mergeable");
  if (status === 429) return new GitHubAdapterError("rate_limited");
  return new GitHubAdapterError("provider_failed");
}

async function boundedJson(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length !== null) {
    const declaredLength = Number(length);
    if (
      !Number.isInteger(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > MAX_RESPONSE_BYTES
    ) {
      throw new GitHubAdapterError("provider_response_invalid");
    }
  }
  if (response.body === null) throw new GitHubAdapterError("provider_response_invalid");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalLength += value.byteLength;
    if (totalLength > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new GitHubAdapterError("provider_response_invalid");
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: string;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(combined);
    return JSON.parse(body) as unknown;
  } catch {
    throw new GitHubAdapterError("provider_response_invalid");
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GitHubAdapterError("provider_response_invalid");
  }
  return value as Record<string, unknown>;
}

export class GitHubPullRequestAdapter {
  readonly #credential: string;
  readonly #fetch: typeof fetch;

  constructor(credentialValue: unknown, fetchImplementation: typeof fetch = fetch) {
    this.#credential = credential(credentialValue);
    this.#fetch = fetchImplementation;
  }

  async #request(path: string, init: RequestInit, merge = false): Promise<unknown> {
    let response: Response;
    try {
      response = await this.#fetch(`${GITHUB_API_ORIGIN}${path}`, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${this.#credential}`,
          "content-type": "application/json",
          "user-agent": "agentic-guardian",
          "x-github-api-version": "2022-11-28",
        },
      });
    } catch {
      throw new GitHubAdapterError("provider_failed");
    }
    if (!response.ok) throw responseError(response.status, merge);
    return boundedJson(response);
  }

  async read(value: unknown): Promise<GitHubPullRequestSnapshot> {
    const operation = GitHubPullRequestReadOperationSchema.parse(value);
    try {
      const payload = record(
        await this.#request(
          `/repos/${operation.owner}/${operation.repository}/pulls/${operation.pullRequest}`,
          { method: "GET" },
        ),
      );
      const head = record(payload.head);
      const base = record(payload.base);
      return GitHubPullRequestSnapshotSchema.parse({
        owner: operation.owner,
        repository: operation.repository,
        pullRequest: operation.pullRequest,
        headCommit: head.sha,
        state: payload.state,
        draft: payload.draft,
        title: payload.title,
        baseBranch: base.ref,
      });
    } catch (error) {
      if (error instanceof GitHubAdapterError) throw error;
      throw new GitHubAdapterError("provider_response_invalid");
    }
  }

  async merge(value: unknown): Promise<GitHubMergeResult> {
    const operation = GitHubPullRequestMergeOperationSchema.parse(value);
    try {
      const payload = record(
        await this.#request(
          `/repos/${operation.owner}/${operation.repository}/pulls/${operation.pullRequest}/merge`,
          {
            method: "PUT",
            body: JSON.stringify({
              merge_method: operation.method,
              sha: operation.expectedHeadSha,
            }),
          },
          true,
        ),
      );
      if (payload.merged !== true) throw new GitHubAdapterError("not_mergeable");
      return GitHubMergeResultSchema.parse({
        status: "merged",
        owner: operation.owner,
        repository: operation.repository,
        pullRequest: operation.pullRequest,
        headCommit: operation.expectedHeadSha,
        mergeCommit: payload.sha,
      });
    } catch (error) {
      if (error instanceof GitHubAdapterError) throw error;
      throw new GitHubAdapterError("provider_response_invalid");
    }
  }
}
