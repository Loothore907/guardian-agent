import type { GitHubOperation } from "@guardian/adapter-github";
import type { ApprovalBinding } from "@guardian/authorization";

export interface BrokerExecutionRequest {
  readonly operation: GitHubOperation;
  readonly approval: ApprovalBinding;
}
