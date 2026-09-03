import { describe, expect, it } from "vitest";

import { SessionWorkspaceResultSchema, SessionWorkspaceSelectionSchema } from "./workspace.js";

const selection = {
  schemaVersion: 1,
  kind: "guardian_managed_copy",
  projectName: "guardian-agent",
  sourceRootDigest: "a".repeat(64),
  sourceSnapshotDigest: "b".repeat(64),
  mountPath: "/workspace",
  persistence: "session",
  cleanup: "delete_on_close",
  hostWriteback: "none",
  limits: { maxFiles: 4_096, maxBytes: 64 * 1_024 * 1_024, maxFileBytes: 4 * 1_024 * 1_024 },
} as const;

describe("session workspace contracts", () => {
  it("binds the source snapshot and fixed lifecycle without exposing a host path", () => {
    expect(SessionWorkspaceSelectionSchema.parse(selection)).toEqual(selection);
    expect(
      SessionWorkspaceResultSchema.parse({
        schemaVersion: 1,
        state: "ready",
        selection,
        fileCount: 12,
        totalBytes: 4_096,
        baseline: "sanitized_git_repository",
      }),
    ).not.toHaveProperty("hostPath");
  });

  it("rejects caller-selected mounts, retention, writeback, and unknown fields", () => {
    for (const value of [
      { ...selection, mountPath: "/host" },
      { ...selection, cleanup: "retain" },
      { ...selection, hostWriteback: "automatic" },
      { ...selection, sourcePath: "C:/Users/example/private" },
    ]) {
      expect(() => SessionWorkspaceSelectionSchema.parse(value)).toThrow();
    }
  });

  it("rejects internally inconsistent limits and results", () => {
    expect(() =>
      SessionWorkspaceSelectionSchema.parse({
        ...selection,
        limits: { maxFiles: 10, maxBytes: 100, maxFileBytes: 101 },
      }),
    ).toThrow(/per-file limit/u);
    expect(() =>
      SessionWorkspaceResultSchema.parse({
        schemaVersion: 1,
        state: "ready",
        selection: { ...selection, limits: { ...selection.limits, maxFiles: 2 } },
        fileCount: 3,
        totalBytes: 10,
        baseline: "sanitized_git_repository",
      }),
    ).toThrow(/file-count limit/u);
  });
});
