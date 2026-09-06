import { afterEach, expect, it, vi } from "vitest";
import { JudgePortal } from "./judge-portal.js";

const scope = {
  objective: "Summarize the update",
  researchUrls: ["https://example.com/update"],
  githubTarget: null,
  durationSeconds: 300 as const,
};
const source = "a".repeat(64);
const input = { schemaVersion: 1, mode: "piloted", scope };
const portals: JudgePortal[] = [];
afterEach(async () => {
  await Promise.all(portals.splice(0).map((p) => p.close()));
});
function setup(options: { now?: () => number; result?: unknown; changeScope?: boolean } = {}) {
  const run = vi.fn(() =>
    Promise.resolve(
      options.result ?? {
        schemaVersion: 1,
        state: "completed",
        assurance: "observed",
        evidence: [],
      },
    ),
  );
  const close = vi.fn(() => Promise.resolve());
  const prepare = vi.fn(() =>
    Promise.resolve({
      scope: options.changeScope ? { ...scope, objective: "Changed objective" } : scope,
      bindingDigest: "b".repeat(64),
      confirmAndRun: run,
      close,
    }),
  );
  const portal = new JudgePortal({
    backend: { prepare },
    scenarios: {},
    ...(options.now ? { now: options.now } : {}),
  });
  portals.push(portal);
  return { portal, prepare, run, close };
}
it("cancels an active pending worker and rejects cleanup failures", async () => {
  const { portal, run, close } = setup();
  run.mockImplementation(() => new Promise(() => undefined));
  const preview = await portal.draft(input, source);
  const abort = new AbortController();
  const running = portal.confirm(
    { schemaVersion: 1, previewId: preview.previewId, previewDigest: preview.previewDigest },
    source,
    abort.signal,
  );
  abort.abort();
  await expect(running).rejects.toThrow("unavailable");
  expect(close).toHaveBeenCalled();

  const other = setup();
  other.close.mockRejectedValue(new Error("private-fixture-marker"));
  const next = await other.portal.draft(input, source);
  await expect(
    other.portal.confirm(
      { schemaVersion: 1, previewId: next.previewId, previewDigest: next.previewDigest },
      source,
      new AbortController().signal,
    ),
  ).rejects.toThrow(/^unavailable$/u);
});
it("rejects backwards time before the preview issuance", async () => {
  let now = Date.now();
  const { portal, run } = setup({ now: () => now });
  const preview = await portal.draft(input, source);
  now--;
  await expect(
    portal.confirm(
      { schemaVersion: 1, previewId: preview.previewId, previewDigest: preview.previewDigest },
      source,
      new AbortController().signal,
    ),
  ).rejects.toThrow("preview_unavailable");
  expect(run).not.toHaveBeenCalled();
});
it("requires exact confirmation before execution and consumes it once", async () => {
  const { portal, run, close } = setup();
  const preview = await portal.draft(input, source);
  expect(run).not.toHaveBeenCalled();
  const confirmation = {
    schemaVersion: 1,
    previewId: preview.previewId,
    previewDigest: preview.previewDigest,
  };
  const results = await Promise.allSettled([
    portal.confirm(confirmation, source, new AbortController().signal),
    portal.confirm(confirmation, source, new AbortController().signal),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(run).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalledTimes(1);
});
it("rejects extra authority fields before preparing a backend", async () => {
  const { portal, prepare } = setup();
  await expect(portal.draft({ ...input, authorization: "invented" }, source)).rejects.toThrow(
    "invalid_request",
  );
  await expect(
    portal.draft({ ...input, scope: { ...scope, durationSeconds: 301 } }, source),
  ).rejects.toThrow("invalid_request");
  expect(prepare).not.toHaveBeenCalled();
});
it("binds confirmation to source and digest and rejects expired previews", async () => {
  let now = Date.now();
  const { portal, run } = setup({ now: () => now });
  const preview = await portal.draft(input, source);
  const confirmation = {
    schemaVersion: 1,
    previewId: preview.previewId,
    previewDigest: preview.previewDigest,
  };
  await expect(
    portal.confirm(confirmation, "c".repeat(64), new AbortController().signal),
  ).rejects.toThrow("preview_unavailable");
  await expect(
    portal.confirm(
      { ...confirmation, previewDigest: "d".repeat(64) },
      source,
      new AbortController().signal,
    ),
  ).rejects.toThrow("preview_unavailable");
  now += 30_000;
  await expect(portal.confirm(confirmation, source, new AbortController().signal)).rejects.toThrow(
    "preview_unavailable",
  );
  expect(run).not.toHaveBeenCalled();
});
it("rejects backend scope substitution and unconfigured scenarios", async () => {
  const { portal, prepare, close } = setup({ changeScope: true });
  await expect(
    portal.draft({ schemaVersion: 1, mode: "seeded", scenarioId: "read_to_write" }, source),
  ).rejects.toThrow("unavailable");
  expect(prepare).not.toHaveBeenCalled();
  await expect(portal.draft(input, source)).rejects.toThrow("unavailable");
  expect(close).toHaveBeenCalled();
});
it("returns defensive previews and rejects raw output or unsupported assurance", async () => {
  const { portal } = setup({
    result: {
      schemaVersion: 1,
      state: "completed",
      assurance: "enforced",
      evidence: [],
      raw: "private",
    },
  });
  const preview = await portal.draft(input, source);
  preview.scope.objective = "Tampered";
  await expect(
    portal.confirm(
      { schemaVersion: 1, previewId: preview.previewId, previewDigest: preview.previewDigest },
      source,
      new AbortController().signal,
    ),
  ).rejects.toThrow("unavailable");
});
it("rejects cancelled previews and closes pending sessions on shutdown", async () => {
  const { portal, run, close } = setup();
  const preview = await portal.draft(input, source);
  const abort = new AbortController();
  abort.abort();
  await expect(
    portal.confirm(
      { schemaVersion: 1, previewId: preview.previewId, previewDigest: preview.previewDigest },
      source,
      abort.signal,
    ),
  ).rejects.toThrow();
  expect(run).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
  await portal.draft(input, source);
  await portal.close();
  expect(close).toHaveBeenCalledTimes(2);
});
