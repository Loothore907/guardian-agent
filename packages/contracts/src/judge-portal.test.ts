import { expect, it } from "vitest";
import { JudgePortalDraftSchema, JudgePortalEvidenceSchema } from "./judge-portal.js";
const scope = {
  objective: "Read the public update",
  researchUrls: ["https://example.com/update"],
  githubTarget: null,
  durationSeconds: 300,
};
it.each([
  "https://127.0.0.1/update",
  "https://example.com/%61pi_key",
  "https://example.com/update?secret=value",
  "https://user:pass@example.com/update",
  "https://example.com/update#instructions",
])("rejects unsafe or ambiguous public source %s", (url) => {
  expect(
    JudgePortalDraftSchema.safeParse({
      schemaVersion: 1,
      mode: "piloted",
      scope: { ...scope, researchUrls: [url] },
    }).success,
  ).toBe(false);
});
it("keeps raw credential and arbitrary capability fields outside the public contract", () => {
  expect(
    JudgePortalDraftSchema.safeParse({ schemaVersion: 1, mode: "piloted", scope }).success,
  ).toBe(true);
  expect(
    JudgePortalDraftSchema.safeParse({
      schemaVersion: 1,
      mode: "piloted",
      scope: { ...scope, objective: "api_key=do-not-forward" },
    }).success,
  ).toBe(false);
  expect(
    JudgePortalDraftSchema.safeParse({
      schemaVersion: 1,
      mode: "piloted",
      scope: { ...scope, headers: {} },
    }).success,
  ).toBe(false);
});
it("does not accept a model's assertion as a broker denial", () => {
  expect(
    JudgePortalEvidenceSchema.safeParse({
      kind: "action_denied",
      origin: "worker",
      action: "github.pull_request.merge",
    }).success,
  ).toBe(false);
  expect(
    JudgePortalEvidenceSchema.safeParse({
      kind: "action_denied",
      origin: "broker",
      action: "github.pull_request.merge",
    }).success,
  ).toBe(true);
});
