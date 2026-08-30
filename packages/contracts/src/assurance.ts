import { z } from "zod";

import {
  addDuplicateIssue,
  ContractVersionSchema,
  type DeepReadonly,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  VersionNumberSchema,
} from "./common.js";

export const AssuranceLevelSchema = z.enum(["enforced", "observed", "unknown"]);
export type AssuranceLevel = z.infer<typeof AssuranceLevelSchema>;

export const AssuranceEvidenceKindSchema = z.enum([
  "tool_catalog",
  "filesystem",
  "credential",
  "network",
]);
export type AssuranceEvidenceKind = z.infer<typeof AssuranceEvidenceKindSchema>;

export const AssuranceEvidenceReferenceSchema = z.strictObject({
  schemaVersion: ContractVersionSchema,
  evidenceId: OpaqueIdSchema,
  kind: AssuranceEvidenceKindSchema,
  profileId: OpaqueIdSchema,
  profileVersion: VersionNumberSchema,
  status: z.literal("verified"),
  capturedAt: TimestampSchema,
  validUntil: TimestampSchema,
  artifactDigest: Sha256DigestSchema,
});
export type AssuranceEvidenceReference = DeepReadonly<
  z.infer<typeof AssuranceEvidenceReferenceSchema>
>;

const REQUIRED_ENFORCED_EVIDENCE: readonly AssuranceEvidenceKind[] = [
  "tool_catalog",
  "filesystem",
  "credential",
  "network",
];

export const AssuranceStateSchema = z
  .strictObject({
    level: AssuranceLevelSchema,
    evidence: z.array(AssuranceEvidenceReferenceSchema).max(8),
  })
  .superRefine((state, context) => {
    addDuplicateIssue(
      state.evidence.map((item) => item.evidenceId),
      context,
      ["evidence"],
    );
    addDuplicateIssue(
      state.evidence.map((item) => item.kind),
      context,
      ["evidence"],
    );

    if (state.level !== "enforced") {
      if (state.level === "observed" && state.evidence.length === 0) {
        context.addIssue({
          code: "custom",
          message: "Observed assurance requires supporting evidence",
          path: ["evidence"],
        });
      }
      return;
    }

    const presentKinds = new Set(state.evidence.map((item) => item.kind));
    for (const requiredKind of REQUIRED_ENFORCED_EVIDENCE) {
      if (!presentKinds.has(requiredKind)) {
        context.addIssue({
          code: "custom",
          message: `Enforced assurance requires ${requiredKind} evidence`,
          path: ["evidence"],
        });
      }
    }
  });
export type AssuranceState = DeepReadonly<z.infer<typeof AssuranceStateSchema>>;
