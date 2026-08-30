import { describe, expect, it } from "vitest";

import { canonicalJson } from "./index.js";

describe("canonicalJson", () => {
  it("is independent of object insertion order", () => {
    expect(canonicalJson({ repository: "guardian-agent", pullRequest: 17 })).toBe(
      canonicalJson({ pullRequest: 17, repository: "guardian-agent" }),
    );
  });

  it("changes when a material field changes", () => {
    expect(canonicalJson({ pullRequest: 17 })).not.toBe(canonicalJson({ pullRequest: 18 }));
  });
});
