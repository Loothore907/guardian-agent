import { describe, expect, it, vi } from "vitest";

import { GitHubAdapterError, GitHubPullRequestAdapter } from "./index.js";

const TOKEN = "github-demo-token-value";
const HEAD = "a".repeat(40);
const MERGE = "b".repeat(40);

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GitHub pull-request adapter", () => {
  it("reads only a fixed endpoint and returns a bounded projection", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        head: { sha: HEAD, secret: TOKEN },
        base: { ref: "main" },
        state: "open",
        draft: false,
        title: "C6 broker",
        body: `provider prose ${TOKEN}`,
      }),
    );
    const adapter = new GitHubPullRequestAdapter(TOKEN, fetchMock);
    await expect(
      adapter.read({
        type: "github.pull_request.read",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
      }),
    ).resolves.toEqual({
      owner: "loothore907",
      repository: "guardian-agent",
      pullRequest: 13,
      headCommit: HEAD,
      state: "open",
      draft: false,
      title: "C6 broker",
      baseBranch: "main",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.github.com/repos/loothore907/guardian-agent/pulls/13");
    expect(init).toMatchObject({ method: "GET", redirect: "error" });
    expect((init?.headers as Record<string, string>).authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("sends only squash and the expected head commit for a merge", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ merged: true, sha: MERGE, message: TOKEN }));
    const adapter = new GitHubPullRequestAdapter(TOKEN, fetchMock);
    await expect(
      adapter.merge({
        type: "github.pull_request.merge",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
        expectedHeadSha: HEAD,
        method: "squash",
      }),
    ).resolves.toEqual({
      status: "merged",
      owner: "loothore907",
      repository: "guardian-agent",
      pullRequest: 13,
      headCommit: HEAD,
      mergeCommit: MERGE,
    });
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe(JSON.stringify({ merge_method: "squash", sha: HEAD }));
  });

  it("rejects widened operations and sanitizes provider failures", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ message: TOKEN }, 409));
    const adapter = new GitHubPullRequestAdapter(TOKEN, fetchMock);
    await expect(
      adapter.merge({
        type: "github.pull_request.merge",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
        expectedHeadSha: HEAD,
        method: "merge",
      }),
    ).rejects.toThrow();
    await expect(
      adapter.merge({
        type: "github.pull_request.merge",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
        expectedHeadSha: HEAD,
        method: "squash",
      }),
    ).rejects.toMatchObject({ name: "GitHubAdapterError", code: "resource_changed" });
    try {
      await adapter.merge({
        type: "github.pull_request.merge",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
        expectedHeadSha: HEAD,
        method: "squash",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubAdapterError);
      expect(String(error)).not.toContain(TOKEN);
    }
  });

  it("fails closed on malformed or oversized provider responses", async () => {
    const malformed = new GitHubPullRequestAdapter(
      TOKEN,
      vi.fn<typeof fetch>().mockResolvedValue(new Response("not json")),
    );
    await expect(
      malformed.read({
        type: "github.pull_request.read",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
      }),
    ).rejects.toMatchObject({ code: "provider_response_invalid" });

    const oversized = new GitHubPullRequestAdapter(
      TOKEN,
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("{}", { headers: { "content-length": "65537" } })),
    );
    await expect(
      oversized.read({
        type: "github.pull_request.read",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
      }),
    ).rejects.toMatchObject({ code: "provider_response_invalid" });

    let cancelled = false;
    const chunkedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(40_000));
        controller.enqueue(new Uint8Array(40_000));
      },
      cancel() {
        cancelled = true;
      },
    });
    const chunked = new GitHubPullRequestAdapter(
      TOKEN,
      vi.fn<typeof fetch>().mockResolvedValue(new Response(chunkedBody)),
    );
    await expect(
      chunked.read({
        type: "github.pull_request.read",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
      }),
    ).rejects.toMatchObject({ code: "provider_response_invalid" });
    expect(cancelled).toBe(true);
  });
});
