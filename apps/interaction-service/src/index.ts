import {
  InteractionMissionContextSchema,
  InteractionOutcomeSchema,
  MissionDraftReviewEnvelopeSchema,
  MissionDraftReviewOutcomeSchema,
  ProviderRequestIdSchema,
  type InteractionMissionContext,
  type MissionDraftReviewEnvelope,
} from "@guardian/contracts";
import {
  LocalInteractionIpcServer,
  LocalMissionDraftReviewIpcServer,
  type InteractionProviderResult,
} from "@guardian/interaction";

export {
  MissionDialogueProviderError,
  NebiusMissionDialogueProvider,
  QwenInteractionProvider,
  missionDialogueBoundary,
  qwenInteractionBoundary,
} from "./nebius.js";

export interface InteractionProvider {
  readonly runFirstTurn: (
    context: InteractionMissionContext,
  ) => Promise<{ readonly requestId: unknown; readonly outcome: unknown }>;
}

export interface MissionDraftReviewer {
  readonly reviewDraft: (
    envelope: MissionDraftReviewEnvelope,
  ) => Promise<{ readonly requestId: unknown; readonly outcome: unknown }>;
}

function sanitizeProviderSummary(value: string): string {
  return value
    .replace(
      /\b(api[_-]?key|authorization|bearer|password|secret|token)\b\s*[:=]\s*\S+/giu,
      "$1=[redacted]",
    )
    .replace(/-----BEGIN ((?:[A-Z0-9]+ )*PRIVATE KEY)-----.*?-----END \1-----/gu, "[redacted]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/gu, "[redacted]")
    .replace(/\bAKIA[A-Z0-9]{16}\b/gu, "[redacted]");
}

export function createFakeInteractionProvider(): InteractionProvider & MissionDraftReviewer {
  return {
    runFirstTurn: () =>
      Promise.resolve({
        requestId: "fake_interaction_1",
        outcome: {
          kind: "mission_brief",
          summary:
            "Guardian received the confirmed mission. The external host agent performs the work; Guardian mediates only the approved capabilities and authority boundaries.",
        },
      }),
    reviewDraft: (envelopeValue) => {
      const envelope = MissionDraftReviewEnvelopeSchema.parse(envelopeValue);
      if (envelope.mechanicallyMissingFields.length === 0) {
        return Promise.resolve({
          requestId: `fake_review_${envelope.reviewTurn}`,
          outcome: { schemaVersion: 1, status: "ready", reasonCodes: ["no_issue"] },
        });
      }
      return Promise.resolve({
        requestId: `fake_review_${envelope.reviewTurn}`,
        outcome: {
          schemaVersion: 1,
          status: "needs_clarification",
          missingFields: envelope.mechanicallyMissingFields,
          reasonCodes: ["unsupported_request"],
          questions: envelope.mechanicallyMissingFields.map((field) => ({
            field,
            question: `Provide the supported ${field.replaceAll("_", " ")} boundary.`,
          })),
        },
      });
    },
  };
}

export async function startMissionDraftReviewService(
  config: unknown,
  provider: MissionDraftReviewer,
  options: { readonly now?: () => string } = {},
): Promise<LocalMissionDraftReviewIpcServer> {
  const server = new LocalMissionDraftReviewIpcServer(
    config,
    async (envelopeValue) => {
      const envelope = MissionDraftReviewEnvelopeSchema.parse(envelopeValue);
      const result = await provider.reviewDraft(envelope);
      try {
        return {
          providerRequestId: ProviderRequestIdSchema.parse(result.requestId),
          outcome: MissionDraftReviewOutcomeSchema.parse(result.outcome),
        };
      } catch {
        throw Object.assign(new TypeError("mission reviewer returned a malformed result"), {
          reason: "provider_malformed" as const,
        });
      }
    },
    options,
  );
  await server.listen();
  return server;
}

export async function startInteractionService(
  config: unknown,
  provider: InteractionProvider,
  options: { readonly now?: () => string } = {},
): Promise<LocalInteractionIpcServer> {
  const server = new LocalInteractionIpcServer(
    config,
    async (contextValue): Promise<InteractionProviderResult> => {
      const context = InteractionMissionContextSchema.parse(contextValue);
      const result = await provider.runFirstTurn(context);
      try {
        const outcome = InteractionOutcomeSchema.parse(result.outcome);
        return {
          providerRequestId: ProviderRequestIdSchema.parse(result.requestId),
          outcome: { ...outcome, summary: sanitizeProviderSummary(outcome.summary) },
        };
      } catch {
        throw Object.assign(new TypeError("interaction provider returned a malformed result"), {
          reason: "provider_malformed" as const,
        });
      }
    },
    options,
  );
  await server.listen();
  return server;
}
