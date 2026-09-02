import { describe, expect, it } from "vitest";

import {
  DevelopmentSessionConfirmationSchema,
  SessionDraftInputSchema,
  SessionDraftPreviewSchema,
  SessionIntegrationAssessmentSchema,
} from "./index.js";

const ID = "11111111-1111-4111-8111-111111111111";

function permissions() {
  return {
    tools: ["guardian.session_status", "guardian.local_command"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: { mode: "none", destinations: [] },
    sideEffects: ["write_workspace"],
    time: { maxDurationSeconds: 300 },
    volume: {
      maxToolCalls: 20,
      maxResearchRequests: 0,
      maxResearchResults: 0,
      maxLocalCommands: 10,
      maxPrivilegedActions: 0,
    },
  } as const;
}

function workspace() {
  return {
    schemaVersion: 1,
    kind: "guardian_managed_copy",
    projectName: "guardian",
    sourceRootDigest: "b".repeat(64),
    sourceSnapshotDigest: "c".repeat(64),
    mountPath: "/workspace",
    persistence: "session",
    cleanup: "delete_on_close",
    hostWriteback: "none",
    limits: { maxFiles: 100, maxBytes: 1_000_000, maxFileBytes: 100_000 },
  } as const;
}

describe("terminal session bootstrap contracts", () => {
  it("accepts only objective text from an untrusted draft client", () => {
    expect(
      SessionDraftInputSchema.parse({ schemaVersion: 1, objective: "Review the pull request." }),
    ).toEqual({ schemaVersion: 1, objective: "Review the pull request." });
    expect(() =>
      SessionDraftInputSchema.parse({
        schemaVersion: 1,
        objective: "Review the pull request.",
        authoredBy: { kind: "human", principalId: ID },
      }),
    ).toThrow();
    expect(() =>
      SessionDraftInputSchema.parse({
        schemaVersion: 1,
        objective: "Review the PR with api_key=do-not-ingest-this-value",
      }),
    ).toThrow("secret-like material");
    expect(() =>
      SessionDraftInputSchema.parse({
        schemaVersion: 1,
        objective: "Review the pull request.",
        permissions: permissions(),
      }),
    ).toThrow();
  });

  it("requires a strict digest-bound lower-assurance confirmation", () => {
    const confirmation = {
      schemaVersion: 1,
      draftId: ID,
      previewDigest: "a".repeat(64),
      confirmedBy: { kind: "human", principalId: ID },
      confirmedAt: "2026-08-31T10:00:00.000Z",
      assurance: "development_confirmation",
    } as const;
    expect(DevelopmentSessionConfirmationSchema.parse(confirmation)).toEqual(confirmation);
    expect(() =>
      DevelopmentSessionConfirmationSchema.parse({
        ...confirmation,
        assurance: "webauthn",
      }),
    ).toThrow();
  });

  it("prevents tool-only integrations from claiming Enforced", () => {
    expect(() =>
      SessionIntegrationAssessmentSchema.parse({
        mode: "tool_only_unrestricted",
        maximumAssurance: "enforced",
      }),
    ).toThrow("cannot be Enforced");
    expect(
      SessionIntegrationAssessmentSchema.parse({
        mode: "tool_only_unrestricted",
        maximumAssurance: "observed",
      }),
    ).toEqual({ mode: "tool_only_unrestricted", maximumAssurance: "observed" });
  });

  it("rejects caller-added preview authority fields", () => {
    const preview = {
      schemaVersion: 1,
      draftId: ID,
      previewDigest: "a".repeat(64),
      state: "awaiting_confirmation",
      createdAt: "2026-08-31T10:00:00.000Z",
      expiresAt: "2026-08-31T10:05:00.000Z",
      objective: "Review the pull request.",
      constraints: ["Do not perform external service operations."],
      permissions: permissions(),
      integration: {
        mode: "guardian_launched_reference",
        maximumAssurance: "enforced",
      },
      worker: { schemaVersion: 1, kind: "deterministic_reference" },
      workspace: workspace(),
    } as const;
    expect(SessionDraftPreviewSchema.parse(preview)).toEqual(preview);
    expect(() =>
      SessionDraftPreviewSchema.parse({ ...preview, authorityCapability: "not-allowed" }),
    ).toThrow();
  });
});
