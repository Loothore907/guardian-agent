import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  applyGuardianRecommendation,
  stricterAuthorization,
  type AuthorizationLevel,
} from "./index.js";

describe("stricterAuthorization", () => {
  it("does not let contextual output lower the deterministic floor", () => {
    expect(stricterAuthorization("deny", "allow")).toBe("deny");
    expect(stricterAuthorization("step_up", "confirm")).toBe("step_up");
  });

  it("allows contextual output to increase scrutiny", () => {
    expect(stricterAuthorization("allow", "step_up")).toBe("step_up");
  });

  it("fails closed on malformed or uncertain Guardian output", () => {
    expect(applyGuardianRecommendation("allow", { recommendation: "allow" })).toBe("deny");
    expect(
      applyGuardianRecommendation("allow", {
        schemaVersion: 1,
        recommendation: "allow",
        certainty: "uncertain",
        reasonCodes: ["ambiguous_evidence"],
      }),
    ).toBe("step_up");
  });

  it("property: Guardian output never lowers the deterministic floor", () => {
    const levels: readonly AuthorizationLevel[] = ["allow", "confirm", "step_up", "deny"];
    const rank: Readonly<Record<AuthorizationLevel, number>> = {
      allow: 0,
      confirm: 1,
      step_up: 2,
      deny: 3,
    };

    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        fc.constantFrom(...levels),
        (floor, recommendation) => {
          expect(rank[stricterAuthorization(floor, recommendation)]).toBeGreaterThanOrEqual(
            rank[floor],
          );
        },
      ),
    );
  });
});
