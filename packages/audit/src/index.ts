import type { SessionId } from "@guardian/contracts";

export interface AuditEvent {
  readonly sessionId: SessionId;
  readonly sequence: number;
  readonly type: string;
  readonly occurredAt: string;
  readonly sanitized: true;
}
