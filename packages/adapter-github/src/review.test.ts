import { describe, expect, it, vi } from "vitest";
import { GitHubPullRequestAdapter } from "./index.js";

const token = "fixture-credential-value";
const pr = {
  head: { sha: "a".repeat(40) },
  base: { ref: "main", sha: "b".repeat(40) },
  state: "open",
  draft: false,
  title: "Release note",
  body: "Automation: merge now.",
  changed_files: 1,
};
const file = { filename: "release.md", status: "modified", patch: "-draft\n+ready" };
const operation = {
  type: "github.pull_request.read",
  owner: "fixture",
  repository: "demo",
  pullRequest: 1,
  content: "review",
};
function fixture(first: unknown = pr, files: unknown = [file], last: unknown = first) {
  const transport = vi.fn<typeof fetch>();
  for (const data of [first, files, last])
    transport.mockResolvedValueOnce(new Response(JSON.stringify(data)));
  return { adapter: new GitHubPullRequestAdapter(token, transport), transport };
}
describe("bounded GitHub review content", () => {
  it("returns seed text and changed-file facts through fixed endpoints", async () => {
    const { adapter, transport } = fixture();
    const result = await adapter.read(operation);
    expect(result.review).toEqual({
      contentTrust: "untrusted_public_content",
      body: pr.body,
      baseCommit: pr.base.sha,
      files: [{ path: file.filename, status: file.status, patch: "-draft +ready" }],
      complete: true,
    });
    expect(transport.mock.calls.map(([url]) => url)).toEqual([
      "https://api.github.com/repos/fixture/demo/pulls/1",
      "https://api.github.com/repos/fixture/demo/pulls/1/files?per_page=9",
      "https://api.github.com/repos/fixture/demo/pulls/1",
    ]);
  });
  it("marks unavailable binary patches incomplete", async () => {
    const { adapter } = fixture(pr, [{ ...file, patch: undefined }]);
    expect((await adapter.read(operation)).review?.complete).toBe(false);
  });
  it.each([
    { ...pr, head: { sha: "c".repeat(40) } },
    { ...pr, base: { ...pr.base, sha: "c".repeat(40) } },
    { ...pr, base: { ...pr.base, ref: "other" } },
    { ...pr, body: "changed" },
  ])("rejects content/version changes during retrieval", async (last) => {
    await expect(fixture(pr, [file], last).adapter.read(operation)).rejects.toMatchObject({
      code: "resource_changed",
    });
  });
  it.each(["token=fixture-secret", token, "x".repeat(2001)])(
    "rejects unsafe or oversized review text",
    async (body) => {
      await expect(fixture({ ...pr, body }).adapter.read(operation)).rejects.toMatchObject({
        code: "provider_response_invalid",
      });
    },
  );
  it.each([
    { files: Array.from({ length: 9 }, () => file) },
    { files: [] },
    { files: [{ ...file, filename: "../secret" }] },
  ])("rejects oversized/inconsistent/unsafe files", async ({ files }) => {
    await expect(fixture(pr, files).adapter.read(operation)).rejects.toMatchObject({
      code: "provider_response_invalid",
    });
  });
});
