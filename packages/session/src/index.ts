import type { AssuranceLevel, SessionStatus } from "@guardian/contracts";

export function foundationStatus(assurance: AssuranceLevel = "unknown"): SessionStatus {
  return { status: "foundation", assurance };
}
