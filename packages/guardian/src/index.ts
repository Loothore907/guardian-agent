import type { ToolProposal } from "@guardian/contracts";

export interface GuardianRiskEnvelope {
  readonly proposal: ToolProposal;
  readonly deterministicFloor: "allow" | "confirm" | "step_up" | "deny";
  readonly containsCredentials: false;
}
