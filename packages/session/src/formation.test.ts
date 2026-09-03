import { describe, expect, it } from "vitest";

import { DEFAULT_GUARDIAN_MODEL_POLICY } from "@guardian/contracts";

import { PreActivationMissionCoordinator } from "./formation.js";

const draftId = "11111111-1111-4111-8111-111111111111";

const maximumPermissions = {
  tools: ["guardian.session_status", "guardian.research", "guardian.local_command"],
  filesystem: { mode: "workspace_write", roots: ["/workspace"] },
  network: {
    mode: "guardian_only",
    destinations: [
      { kind: "public_domain", hostname: "example.gov" },
      { kind: "public_domain", hostname: "example.org" },
    ],
  },
  sideEffects: ["write_workspace"],
  time: { maxDurationSeconds: 7_200 },
  volume: {
    maxToolCalls: 200,
    maxResearchRequests: 100,
    maxResearchResults: 300,
    maxLocalCommands: 20,
    maxPrivilegedActions: 0,
  },
} as const;

function completeDraft(route: "qwen_assisted" | "structured" = "qwen_assisted") {
  return {
    schemaVersion: 1,
    objective: "Research public state cannabis laws and community discussion patterns.",
    constraints: ["Use public sources only."],
    requestedPermissions: {
      tools: ["guardian.research"],
      filesystem: { mode: "none", roots: [] },
      network: {
        mode: "guardian_only",
        destinations: [{ kind: "public_domain", hostname: "example.gov" }],
      },
      sideEffects: [],
      time: { maxDurationSeconds: 3_600 },
      volume: {
        maxToolCalls: 100,
        maxResearchRequests: 60,
        maxResearchResults: 180,
        maxLocalCommands: 0,
        maxPrivilegedActions: 0,
      },
    },
    requestedRoute: route,
  } as const;
}

function coordinator() {
  return new PreActivationMissionCoordinator({
    maximumPermissions,
    policyVersion: 1,
    now: () => new Date("2026-09-01T00:00:00.000Z"),
    randomId: () => draftId,
  });
}

function completeSetupRisk(
  subject: PreActivationMissionCoordinator,
  route:
    | { readonly requested: "qwen_assisted"; readonly effective: "qwen_assisted" }
    | {
        readonly requested: "qwen_assisted";
        readonly effective: "deterministic_fallback";
        readonly fallbackReason: "provider_unavailable";
      },
) {
  const request = subject.beginSetupRiskReview(draftId, 1, route);
  const result = subject.completeSetupRiskReview(draftId, 1, request.requestDigest, {
    status: "evaluated",
    providerRequestId: "setup_risk_1",
    authorizationLevel: "confirm",
    certainty: "certain",
  });
  return { request, result };
}

describe("PreActivationMissionCoordinator", () => {
  it("binds reviewed input to an exact human-confirmed digest", () => {
    const subject = coordinator();
    const created = subject.createDraft(completeDraft());
    const envelope = subject.beginReview(created.draftId);
    subject.completeReview(created.draftId, 1, envelope.reviewTurn, {
      schemaVersion: 1,
      status: "ready",
      reasonCodes: ["no_issue"],
    });
    const setup = completeSetupRisk(subject, {
      requested: "qwen_assisted",
      effective: "qwen_assisted",
    });
    const candidate = subject.compileCandidate({
      draftId: created.draftId,
      expectedRevision: 1,
      route: { requested: "qwen_assisted", effective: "qwen_assisted" },
      setupRisk: setup.result,
    });

    expect(candidate.modelPolicyId).toBe("competition-2026-09-01");
    expect(candidate.modelPolicyVersion).toBe(DEFAULT_GUARDIAN_MODEL_POLICY.version);
    expect(() => subject.consumeConfirmedCandidate(created.draftId, 1, "0".repeat(64))).toThrow(
      /digest/u,
    );
    expect(
      subject.consumeConfirmedCandidate(created.draftId, 1, candidate.previewDigest).objective,
    ).toBe(completeDraft().objective);
    expect(() =>
      subject.consumeConfirmedCandidate(created.draftId, 1, candidate.previewDigest),
    ).toThrow(/already consumed/u);
  });

  it("does not let model output fill fields or mark an incomplete draft ready", () => {
    const subject = coordinator();
    const created = subject.createDraft({
      ...completeDraft(),
      requestedPermissions: { ...completeDraft().requestedPermissions, network: null },
    });
    const envelope = subject.beginReview(created.draftId);

    expect(() =>
      subject.completeReview(created.draftId, 1, envelope.reviewTurn, {
        schemaVersion: 1,
        status: "ready",
        reasonCodes: ["no_issue"],
      }),
    ).toThrow(/mechanically incomplete/u);
  });

  it("revalidates clarification answers and rejects stale review responses", () => {
    const subject = coordinator();
    const incomplete = {
      ...completeDraft(),
      requestedPermissions: { ...completeDraft().requestedPermissions, network: null },
    } as const;
    const created = subject.createDraft(incomplete);
    const firstEnvelope = subject.beginReview(created.draftId);
    subject.completeReview(created.draftId, 1, firstEnvelope.reviewTurn, {
      schemaVersion: 1,
      status: "needs_clarification",
      missingFields: ["network"],
      reasonCodes: ["destination_ambiguity"],
      questions: [{ field: "network", question: "Which public domains may be queried?" }],
    });
    expect(() =>
      subject.reviseDraft(created.draftId, 1, {
        ...completeDraft(),
        objective: "Research token=ghp_123456789012345678901234567890",
      }),
    ).toThrow(/secret-like material/u);

    const revised = subject.reviseDraft(created.draftId, 1, completeDraft());
    const secondEnvelope = subject.beginReview(revised.draftId);
    expect(() =>
      subject.completeReview(revised.draftId, 1, firstEnvelope.reviewTurn, {
        schemaVersion: 1,
        status: "ready",
        reasonCodes: ["no_issue"],
      }),
    ).toThrow(/revision mismatch/u);
    expect(
      subject.completeReview(revised.draftId, 2, secondEnvelope.reviewTurn, {
        schemaVersion: 1,
        status: "ready",
        reasonCodes: ["no_issue"],
      }).status,
    ).toBe("ready");
  });

  it("caps review turns and expires draft state", () => {
    let now = new Date("2026-09-01T00:00:00.000Z");
    const subject = new PreActivationMissionCoordinator({
      maximumPermissions,
      policyVersion: 1,
      maxReviewTurns: 1,
      draftLifetimeSeconds: 10,
      now: () => now,
      randomId: () => draftId,
    });
    const created = subject.createDraft(completeDraft());
    const envelope = subject.beginReview(created.draftId);
    subject.completeReview(created.draftId, 1, envelope.reviewTurn, {
      schemaVersion: 1,
      status: "needs_clarification",
      missingFields: [],
      reasonCodes: ["ambiguous_objective"],
      questions: [{ field: "constraints", question: "What should be excluded?" }],
    });
    subject.reviseDraft(created.draftId, 1, completeDraft());
    expect(() => subject.beginReview(created.draftId)).toThrow(/turn limit/u);

    now = new Date("2026-09-01T00:00:10.000Z");
    expect(() => subject.beginReview(created.draftId)).toThrow(/expired/u);
  });

  it("allows deterministic fallback only after a failed review attempt and bound risk review", () => {
    const subject = coordinator();
    const created = subject.createDraft(completeDraft());
    expect(() =>
      subject.compileCandidate({
        draftId: created.draftId,
        expectedRevision: 1,
        route: {
          requested: "qwen_assisted",
          effective: "deterministic_fallback",
          fallbackReason: "provider_unavailable",
        },
        setupRisk: { status: "unavailable", authorizationFloor: "deny" },
      }),
    ).toThrow(/completed setup risk/u);
    expect(() =>
      subject.beginSetupRiskReview(created.draftId, 1, {
        requested: "qwen_assisted",
        effective: "deterministic_fallback",
        fallbackReason: "provider_unavailable",
      }),
    ).toThrow(/not ready/u);

    subject.beginReview(created.draftId);
    const route = {
      requested: "qwen_assisted" as const,
      effective: "deterministic_fallback" as const,
      fallbackReason: "provider_unavailable" as const,
    };
    const request = subject.beginSetupRiskReview(created.draftId, 1, route);
    const setupRisk = subject.completeSetupRiskReview(created.draftId, 1, request.requestDigest, {
      status: "unavailable",
      authorizationLevel: "deny",
    });
    expect(
      subject.compileCandidate({
        draftId: created.draftId,
        expectedRevision: 1,
        route,
        setupRisk,
      }).setupRisk.authorizationFloor,
    ).toBe("deny");
  });

  it("binds setup risk to normalized facts and never accepts a lower floor", () => {
    const subject = coordinator();
    const created = subject.createDraft(completeDraft());
    const review = subject.beginReview(created.draftId);
    subject.completeReview(created.draftId, 1, review.reviewTurn, {
      schemaVersion: 1,
      status: "ready",
      reasonCodes: ["no_issue"],
    });
    const route = { requested: "qwen_assisted" as const, effective: "qwen_assisted" as const };
    const request = subject.beginSetupRiskReview(created.draftId, 1, route);
    expect(request).toMatchObject({
      deterministicFloor: "confirm",
      containsCredentials: false,
      modelPolicyId: "competition-2026-09-01",
      route,
    });
    const result = subject.completeSetupRiskReview(created.draftId, 1, request.requestDigest, {
      status: "evaluated",
      providerRequestId: "setup_risk_1",
      authorizationLevel: "allow",
      certainty: "certain",
    });
    expect(result).toMatchObject({ status: "preserved", authorizationFloor: "confirm" });
    expect(() =>
      subject.compileCandidate({
        draftId: created.draftId,
        expectedRevision: 1,
        route,
        setupRisk: { ...result, requestDigest: "a".repeat(64) },
      }),
    ).toThrow(/not bound/u);
  });

  it("rejects drafts that exceed the deterministic authority ceiling", () => {
    const subject = coordinator();
    const created = subject.createDraft({
      ...completeDraft("structured"),
      requestedPermissions: {
        ...completeDraft("structured").requestedPermissions,
        network: {
          mode: "guardian_only",
          destinations: [{ kind: "public_domain", hostname: "unapproved.example" }],
        },
      },
    });

    expect(() =>
      subject.compileCandidate({
        draftId: created.draftId,
        expectedRevision: 1,
        route: { requested: "structured", effective: "structured" },
        setupRisk: { status: "not_required", authorizationFloor: "allow" },
      }),
    ).toThrow(/authority ceiling/u);
  });
});
