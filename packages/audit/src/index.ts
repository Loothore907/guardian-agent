import { AuditEventSchema, type AuditEvent } from "@guardian/contracts";

export type { AuditEvent } from "@guardian/contracts";

export function parseAuditEvent(value: unknown): AuditEvent {
  return AuditEventSchema.parse(value);
}
