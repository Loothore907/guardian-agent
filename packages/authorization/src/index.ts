import type { SessionId } from "@guardian/contracts";

export interface ApprovalBinding {
  readonly sessionId: SessionId;
  readonly requestDigest: string;
  readonly nonce: string;
  readonly expiresAt: string;
  readonly policyVersion: string;
}
