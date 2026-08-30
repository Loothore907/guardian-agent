import { canonicalDigest } from "@guardian/canonical";
import {
  CanonicalRequestSchema,
  ExactApprovalSchema,
  TimestampSchema,
  type CanonicalRequest,
  type ExactApproval,
} from "@guardian/contracts";

export type ApprovalBinding = ExactApproval;

export function digestCanonicalRequest(value: unknown): string {
  const request = CanonicalRequestSchema.parse(value);
  return canonicalDigest("canonical_request", request.schemaVersion, request);
}

export type ApprovalValidationResult =
  | { readonly ok: true; readonly request: CanonicalRequest; readonly approval: ExactApproval }
  | {
      readonly ok: false;
      readonly reason: "malformed" | "request_mismatch" | "not_active" | "expired";
    };

export function validateExactApproval(
  approvalValue: unknown,
  requestValue: unknown,
  expectedScopeDigest: string,
  evaluatedAt: string,
): ApprovalValidationResult {
  const approval = ExactApprovalSchema.safeParse(approvalValue);
  const request = CanonicalRequestSchema.safeParse(requestValue);
  const timestamp = TimestampSchema.safeParse(evaluatedAt);
  if (!approval.success || !request.success || !timestamp.success) {
    return { ok: false, reason: "malformed" };
  }
  const expectedDigest = digestCanonicalRequest(request.data);
  const resourceMatches =
    JSON.stringify(approval.data.resourceVersion) === JSON.stringify(request.data.resourceVersion);
  if (
    approval.data.requestId !== request.data.requestId ||
    approval.data.requestDigest !== expectedDigest ||
    approval.data.sessionId !== request.data.sessionId ||
    approval.data.callerId !== request.data.callerId ||
    approval.data.connectionId !== request.data.connectionId ||
    approval.data.missionId !== request.data.missionId ||
    approval.data.missionVersion !== request.data.missionVersion ||
    approval.data.profileId !== request.data.profileId ||
    approval.data.profileVersion !== request.data.profileVersion ||
    approval.data.policyVersion !== request.data.policyVersion ||
    approval.data.scopeDigest !== expectedScopeDigest ||
    !resourceMatches
  ) {
    return { ok: false, reason: "request_mismatch" };
  }
  if (Date.parse(timestamp.data) >= Date.parse(approval.data.expiresAt)) {
    return { ok: false, reason: "expired" };
  }
  if (Date.parse(timestamp.data) < Date.parse(approval.data.approvedAt)) {
    return { ok: false, reason: "not_active" };
  }
  return { ok: true, request: request.data, approval: approval.data };
}
