import {
  CredentialReferenceSchema,
  DEFAULT_GUARDIAN_MODEL_POLICY,
  GuardianModelPolicySchema,
  InteractionMissionContextSchema,
  InteractionOutcomeSchema,
  MissionDraftReviewEnvelopeSchema,
  MissionDraftReviewOutcomeSchema,
  ProviderRequestIdSchema,
  type GuardianModelPolicy,
  type InteractionMissionContext,
  type MissionDraftReviewEnvelope,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";

const NEBIUS_CHAT_COMPLETIONS_ENDPOINT = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const MAXIMUM_PROVIDER_RESPONSE_BYTES = 128 * 1_024;
const DEFAULT_PROVIDER_TIMEOUT_MS = 20_000;

export class MissionDialogueProviderError extends Error {
  constructor() {
    super("interaction provider is unavailable");
    this.name = "MissionDialogueProviderError";
  }
}

export { MissionDialogueProviderError as QwenInteractionProviderError };

async function boundedProviderJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType === null || !contentType.toLowerCase().startsWith("application/json")) {
    throw new MissionDialogueProviderError();
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isInteger(length) || length < 0 || length > MAXIMUM_PROVIDER_RESPONSE_BYTES) {
      throw new MissionDialogueProviderError();
    }
  }
  if (response.body === null) throw new MissionDialogueProviderError();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let bytes: Uint8Array | undefined;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAXIMUM_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel();
        throw new MissionDialogueProviderError();
      }
      chunks.push(value);
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new MissionDialogueProviderError();
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    bytes?.fill(0);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new MissionDialogueProviderError();
  }
  return value as Record<string, unknown>;
}

export function projectQwenResponse(value: unknown): {
  readonly requestId: unknown;
  readonly outcome: unknown;
} {
  const response = record(value);
  if (!Array.isArray(response.choices) || response.choices.length !== 1) {
    throw new MissionDialogueProviderError();
  }
  const choice = record(response.choices[0]);
  const message = record(choice.message);
  if (choice.finish_reason !== "stop" || typeof message.content !== "string") {
    throw new MissionDialogueProviderError();
  }
  let outcome: unknown;
  try {
    outcome = JSON.parse(message.content) as unknown;
  } catch {
    throw new MissionDialogueProviderError();
  }
  try {
    return {
      requestId: ProviderRequestIdSchema.parse(response.id),
      outcome: InteractionOutcomeSchema.parse(outcome),
    };
  } catch {
    throw new MissionDialogueProviderError();
  }
}

export function projectMissionDraftReviewResponse(value: unknown): {
  readonly requestId: unknown;
  readonly outcome: unknown;
} {
  const response = record(value);
  if (!Array.isArray(response.choices) || response.choices.length !== 1) {
    throw new MissionDialogueProviderError();
  }
  const choice = record(response.choices[0]);
  const message = record(choice.message);
  if (choice.finish_reason !== "stop" || typeof message.content !== "string") {
    throw new MissionDialogueProviderError();
  }
  try {
    return {
      requestId: ProviderRequestIdSchema.parse(response.id),
      outcome: MissionDraftReviewOutcomeSchema.parse(JSON.parse(message.content) as unknown),
    };
  } catch {
    throw new MissionDialogueProviderError();
  }
}

export class NebiusMissionDialogueProvider {
  readonly #store: CredentialStore;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #modelPolicy: GuardianModelPolicy;

  constructor(options: {
    readonly credentialStore: CredentialStore;
    readonly fetch?: typeof fetch;
    readonly timeoutMs?: number;
    readonly modelPolicy?: GuardianModelPolicy;
  }) {
    this.#store = options.credentialStore;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
    this.#modelPolicy = GuardianModelPolicySchema.parse(
      options.modelPolicy ?? DEFAULT_GUARDIAN_MODEL_POLICY,
    );
    if (!Number.isInteger(this.#timeoutMs) || this.#timeoutMs < 100 || this.#timeoutMs > 60_000) {
      throw new TypeError("interaction provider timeout is invalid");
    }
  }

  async runFirstTurn(contextValue: InteractionMissionContext) {
    const context = InteractionMissionContextSchema.parse(contextValue);
    try {
      return await this.#store.use(
        CredentialReferenceSchema.parse({ schemaVersion: 1, provider: "nebius", slot: "default" }),
        async (credential) => {
          const apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
          const response = await this.#fetch(NEBIUS_CHAT_COMPLETIONS_ENDPOINT, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(this.#timeoutMs),
            headers: {
              accept: "application/json",
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: this.#modelPolicy.missionDialogue.modelId,
              temperature: 0,
              max_tokens: 1_024,
              messages: [
                {
                  role: "system",
                  content:
                    "You are Guardian's bounded mission-brief assistant, not the worker agent. Explain the confirmed objective, restrictions, and available Guardian capabilities for the human and host agent. Do not solve the task, inspect a repository, propose a tool call, or claim authority. Return exactly one JSON object matching the supplied schema.",
                },
                { role: "user", content: JSON.stringify(context) },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "guardian_interaction_outcome",
                  strict: true,
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["kind", "summary"],
                    properties: {
                      kind: { const: "mission_brief" },
                      summary: { type: "string", minLength: 1, maxLength: 2_000 },
                    },
                  },
                },
              },
            }),
          });
          if (!response.ok) throw new MissionDialogueProviderError();
          return projectQwenResponse(await boundedProviderJson(response));
        },
      );
    } catch {
      throw new MissionDialogueProviderError();
    }
  }

  async reviewDraft(envelopeValue: MissionDraftReviewEnvelope) {
    const envelope = MissionDraftReviewEnvelopeSchema.parse(envelopeValue);
    if (
      envelope.modelPolicyId !== this.#modelPolicy.policyId ||
      envelope.modelPolicyVersion !== this.#modelPolicy.version
    ) {
      throw new MissionDialogueProviderError();
    }
    try {
      return await this.#store.use(
        CredentialReferenceSchema.parse({ schemaVersion: 1, provider: "nebius", slot: "default" }),
        async (credential) => {
          const apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
          const response = await this.#fetch(NEBIUS_CHAT_COMPLETIONS_ENDPOINT, {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(this.#timeoutMs),
            headers: {
              accept: "application/json",
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: this.#modelPolicy.missionDialogue.modelId,
              temperature: 0,
              max_tokens: 1_024,
              messages: [
                {
                  role: "system",
                  content:
                    "You are Guardian's bounded pre-activation mission reviewer, not the worker agent and not an authority compiler. Review only the supplied credential-free draft. Return ready only when the objective and every requested boundary are coherent. Otherwise return bounded reason codes and targeted questions. Never fill a permission, choose a tool or destination, widen authority, solve the mission, or claim approval. Return exactly one JSON object matching the supplied schema.",
                },
                { role: "user", content: JSON.stringify(envelope) },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "guardian_mission_draft_review",
                  strict: true,
                  schema: {
                    oneOf: [
                      {
                        type: "object",
                        additionalProperties: false,
                        required: ["schemaVersion", "status", "reasonCodes"],
                        properties: {
                          schemaVersion: { const: 1 },
                          status: { const: "ready" },
                          reasonCodes: {
                            type: "array",
                            prefixItems: [{ const: "no_issue" }],
                            minItems: 1,
                            maxItems: 1,
                          },
                        },
                      },
                      {
                        type: "object",
                        additionalProperties: false,
                        required: [
                          "schemaVersion",
                          "status",
                          "missingFields",
                          "reasonCodes",
                          "questions",
                        ],
                        properties: {
                          schemaVersion: { const: 1 },
                          status: { const: "needs_clarification" },
                          missingFields: {
                            type: "array",
                            uniqueItems: true,
                            maxItems: 7,
                            items: {
                              enum: [
                                "constraints",
                                "tools",
                                "filesystem",
                                "network",
                                "side_effects",
                                "time",
                                "volume",
                              ],
                            },
                          },
                          reasonCodes: {
                            type: "array",
                            uniqueItems: true,
                            minItems: 1,
                            maxItems: 8,
                            items: {
                              enum: [
                                "ambiguous_objective",
                                "destination_ambiguity",
                                "data_handling_ambiguity",
                                "side_effect_ambiguity",
                                "budget_ambiguity",
                                "authentication_ambiguity",
                                "unsupported_request",
                              ],
                            },
                          },
                          questions: {
                            type: "array",
                            minItems: 1,
                            maxItems: 8,
                            items: {
                              type: "object",
                              additionalProperties: false,
                              required: ["field", "question"],
                              properties: {
                                field: {
                                  enum: [
                                    "constraints",
                                    "tools",
                                    "filesystem",
                                    "network",
                                    "side_effects",
                                    "time",
                                    "volume",
                                  ],
                                },
                                question: { type: "string", minLength: 1, maxLength: 500 },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            }),
          });
          if (!response.ok) throw new MissionDialogueProviderError();
          return projectMissionDraftReviewResponse(await boundedProviderJson(response));
        },
      );
    } catch {
      throw new MissionDialogueProviderError();
    }
  }
}

export { NebiusMissionDialogueProvider as QwenInteractionProvider };

export const missionDialogueBoundary = {
  endpoint: NEBIUS_CHAT_COMPLETIONS_ENDPOINT,
  modelPolicyId: DEFAULT_GUARDIAN_MODEL_POLICY.policyId,
  modelPolicyVersion: DEFAULT_GUARDIAN_MODEL_POLICY.version,
  model: DEFAULT_GUARDIAN_MODEL_POLICY.missionDialogue.modelId,
  credential: { schemaVersion: 1, provider: "nebius", slot: "default" },
} as const;

/** @deprecated Use missionDialogueBoundary; this alias preserves the C6 evidence API. */
export const qwenInteractionBoundary = missionDialogueBoundary;
