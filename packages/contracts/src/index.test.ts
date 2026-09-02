import { describe, expect, it } from "vitest";

import { ToolProposalSchema } from "./index.js";

describe("ToolProposalSchema", () => {
  it("accepts the one scaffolded capability", () => {
    expect(
      ToolProposalSchema.parse({
        tool: "guardian.research",
        arguments: { query: "pull request review guidance", maxResults: 2 },
      }),
    ).toEqual({
      tool: "guardian.research",
      arguments: { query: "pull request review guidance", maxResults: 2 },
    });
  });

  it("accepts a minimized exact GitHub merge proposal", () => {
    expect(
      ToolProposalSchema.parse({
        tool: "github.pull_request.merge",
        arguments: {
          owner: "loothore907",
          repository: "guardian-agent-demo",
          pullRequest: 2,
          expectedHeadCommit: "a".repeat(40),
          method: "squash",
        },
      }),
    ).toMatchObject({ tool: "github.pull_request.merge" });
  });

  it("rejects unknown authority instead of stripping it", () => {
    expect(() =>
      ToolProposalSchema.parse({
        tool: "guardian.research",
        arguments: { query: "pull request review guidance", maxResults: 2 },
        approval: true,
      }),
    ).toThrow();
  });
});
