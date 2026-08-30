import { describe, expect, it } from "vitest";

import { resolveAssuranceLevel } from "./index.js";

describe("resolveAssuranceLevel", () => {
  it("never reports Enforced for malformed evidence", () => {
    expect(
      resolveAssuranceLevel(
        { assurance: { level: "enforced", evidence: [] } },
        "2026-08-30T00:00:00.000Z",
      ),
    ).toBe("unknown");
  });
});
