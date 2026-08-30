import { describe, expect, it } from "vitest";

import { stricterAuthorization } from "./index.js";

describe("stricterAuthorization", () => {
  it("does not let contextual output lower the deterministic floor", () => {
    expect(stricterAuthorization("deny", "allow")).toBe("deny");
    expect(stricterAuthorization("step_up", "confirm")).toBe("step_up");
  });

  it("allows contextual output to increase scrutiny", () => {
    expect(stricterAuthorization("allow", "step_up")).toBe("step_up");
  });
});
