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
