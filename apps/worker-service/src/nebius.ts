import {
  CredentialReferenceSchema,
  DEFAULT_GUARDIAN_MODEL_POLICY,
  GuardianModelPolicySchema,
  ProviderRequestIdSchema,
  WorkerOutcomeSchema,
  WorkerTurnEnvelopeSchema,
  type GuardianModelPolicy,
  type WorkerTurnEnvelope,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";

const NEBIUS_CHAT_COMPLETIONS_ENDPOINT = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const MAXIMUM_PROVIDER_RESPONSE_BYTES = 128 * 1_024;
const DEFAULT_PROVIDER_TIMEOUT_MS = 20_000;

export class NativeWorkerProviderError extends Error {
  constructor() {
    super("native worker provider is unavailable");
    this.name = "NativeWorkerProviderError";
  }
}

export type NativeWorkerProviderDiagnostic =
  | { readonly kind: "transport_failure" }
  | { readonly kind: "http_error"; readonly status: number }
  | { readonly kind: "response_envelope_invalid" }
  | { readonly kind: "worker_output_invalid" }
  | { readonly kind: "credential_or_internal_failure" };

async function boundedProviderJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (contentType === null || !contentType.toLowerCase().startsWith("application/json")) {
    throw new NativeWorkerProviderError();
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isInteger(length) || length < 0 || length > MAXIMUM_PROVIDER_RESPONSE_BYTES) {
      throw new NativeWorkerProviderError();
    }
  }
  if (response.body === null) throw new NativeWorkerProviderError();
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
        throw new NativeWorkerProviderError();
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
    throw new NativeWorkerProviderError();
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    bytes?.fill(0);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new NativeWorkerProviderError();
  }
  return value as Record<string, unknown>;
}

export function projectNebiusWorkerResponse(
  value: unknown,
  expectedModelId: string,
): { readonly requestId: string; readonly outcome: ReturnType<typeof WorkerOutcomeSchema.parse> } {
  const response = record(value);
  if (response.model !== expectedModelId || !Array.isArray(response.choices)) {
    throw new NativeWorkerProviderError();
  }
  if (response.choices.length !== 1) throw new NativeWorkerProviderError();
  const choice = record(response.choices[0]);
  const message = record(choice.message);
  if (choice.finish_reason !== "stop" || typeof message.content !== "string") {
    throw new NativeWorkerProviderError();
  }
  try {
    return {
      requestId: ProviderRequestIdSchema.parse(response.id),
      outcome: WorkerOutcomeSchema.parse(JSON.parse(message.content) as unknown),
    };
  } catch {
    throw new NativeWorkerProviderError();
  }
}

function providerProjection(turn: WorkerTurnEnvelope) {
  const previousToolResult =
    turn.previousToolResult === undefined
      ? undefined
      : turn.previousToolResult.outcome === "denied"
        ? {
            name: turn.previousToolResult.name,
            outcome: turn.previousToolResult.outcome,
            denial: {
              code: turn.previousToolResult.denial.code,
              disposition: turn.previousToolResult.denial.disposition,
            },
          }
        : turn.previousToolResult.name === "guardian.session_status"
          ? {
              name: turn.previousToolResult.name,
              outcome: turn.previousToolResult.outcome,
              output: {
                state: turn.previousToolResult.output.state,
                assurance: turn.previousToolResult.output.assurance,
                expiresAt: turn.previousToolResult.output.expiresAt,
                tools: turn.previousToolResult.output.tools,
              },
            }
          : {
              name: turn.previousToolResult.name,
              outcome: turn.previousToolResult.outcome,
              output: turn.previousToolResult.output,
            };
  return {
    turnNumber: turn.turnNumber,
    objective: turn.objective,
    constraints: turn.constraints,
    allowedTools: turn.allowedTools,
    remainingBudget: turn.remainingBudget,
    ...(previousToolResult === undefined ? {} : { previousToolResult }),
  };
}

const TOOL_REQUEST_SCHEMA = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["name", "arguments"],
      properties: {
        name: { const: "guardian.session_status" },
        arguments: { type: "object", additionalProperties: false, properties: {} },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["name", "arguments"],
      properties: {
        name: { const: "guardian.research" },
        arguments: {
          type: "object",
          additionalProperties: false,
          required: ["query", "maxResults", "allowedDomains"],
          properties: {
            query: { type: "string", minLength: 1, maxLength: 120 },
            maxResults: { type: "integer", minimum: 1, maximum: 3 },
            allowedDomains: {
              type: "array",
              minItems: 1,
              maxItems: 10,
              uniqueItems: true,
              items: { type: "string", format: "hostname" },
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["name", "arguments"],
      properties: {
        name: { const: "guardian.local_command" },
        arguments: {
          type: "object",
          additionalProperties: false,
          required: ["executable", "arguments", "workingDirectory", "timeoutSeconds"],
          properties: {
            executable: { enum: ["git", "node", "pnpm", "rg"] },
            arguments: {
              type: "array",
              maxItems: 32,
              items: { type: "string", minLength: 1, maxLength: 256 },
            },
            workingDirectory: { type: "string", minLength: 1, maxLength: 260 },
            timeoutSeconds: { type: "integer", minimum: 1, maximum: 300 },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["name", "arguments"],
      properties: {
        name: { const: "github.pull_request.read" },
        arguments: {
          type: "object",
          additionalProperties: false,
          required: ["owner", "repository", "pullRequest"],
          properties: {
            owner: { type: "string", pattern: "^[a-z0-9_.-]+$", maxLength: 100 },
            repository: { type: "string", pattern: "^[a-z0-9_.-]+$", maxLength: 100 },
            pullRequest: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["name", "arguments"],
      properties: {
        name: { const: "github.pull_request.merge" },
        arguments: {
          type: "object",
          additionalProperties: false,
          required: ["owner", "repository", "pullRequest", "expectedHeadCommit", "method"],
          properties: {
            owner: { type: "string", pattern: "^[a-z0-9_.-]+$", maxLength: 100 },
            repository: { type: "string", pattern: "^[a-z0-9_.-]+$", maxLength: 100 },
            pullRequest: { type: "integer", minimum: 1 },
            expectedHeadCommit: { type: "string", pattern: "^[a-f0-9]{40}$" },
            method: { const: "squash" },
          },
        },
      },
    },
  ],
} as const;

function workerOutcomeGuidance(allowedTools: WorkerTurnEnvelope["allowedTools"]): string {
  const permittedRequests = TOOL_REQUEST_SCHEMA.oneOf.filter((request) =>
    allowedTools.includes(request.properties.name.const),
  );
  const outcomes: unknown[] = [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "response"],
      properties: {
        kind: { const: "final_response" },
        response: { type: "string", minLength: 1, maxLength: 8_000 },
      },
    },
  ];
  if (permittedRequests.length > 0) {
    outcomes.push({
      type: "object",
      additionalProperties: false,
      required: ["kind", "request"],
      properties: {
        kind: { const: "tool_request" },
        request: { oneOf: permittedRequests },
      },
    });
  }
  return JSON.stringify({ oneOf: outcomes });
}

export class NebiusNativeWorkerProvider {
  readonly selectionKind = "nebius_native" as const;
  readonly #store: CredentialStore;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #modelPolicy: GuardianModelPolicy;
  readonly #diagnostic: (diagnostic: NativeWorkerProviderDiagnostic) => void;

  constructor(options: {
    readonly credentialStore: CredentialStore;
    readonly fetch?: typeof fetch;
    readonly timeoutMs?: number;
    readonly modelPolicy?: GuardianModelPolicy;
    readonly onDiagnostic?: (diagnostic: NativeWorkerProviderDiagnostic) => void;
  }) {
    this.#store = options.credentialStore;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
    this.#modelPolicy = GuardianModelPolicySchema.parse(
      options.modelPolicy ?? DEFAULT_GUARDIAN_MODEL_POLICY,
    );
    this.#diagnostic = options.onDiagnostic ?? (() => undefined);
    if (!Number.isInteger(this.#timeoutMs) || this.#timeoutMs < 100 || this.#timeoutMs > 60_000) {
      throw new TypeError("native worker provider timeout is invalid");
    }
  }

  async runTurn(turnValue: WorkerTurnEnvelope) {
    const turn = WorkerTurnEnvelopeSchema.parse(turnValue);
    const outcomeGuidance = workerOutcomeGuidance(turn.allowedTools);
    const selection = turn.worker;
    if (
      selection.kind !== "nebius_native" ||
      selection.provider !== "nebius_token_factory" ||
      selection.role !== "native_worker" ||
      selection.modelPolicyId !== this.#modelPolicy.policyId ||
      selection.modelPolicyVersion !== this.#modelPolicy.version ||
      selection.modelId !== this.#modelPolicy.nativeWorker.modelId ||
      turn.modelPolicyId !== this.#modelPolicy.policyId ||
      turn.modelPolicyVersion !== this.#modelPolicy.version
    ) {
      throw new NativeWorkerProviderError();
    }
    let diagnosed = false;
    const report = (diagnostic: NativeWorkerProviderDiagnostic) => {
      diagnosed = true;
      try {
        this.#diagnostic(diagnostic);
      } catch {
        // Sanitized diagnostics must never change provider behavior.
      }
    };
    try {
      return await this.#store.use(
        CredentialReferenceSchema.parse({ schemaVersion: 1, provider: "nebius", slot: "default" }),
        async (credential) => {
          const apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
          let response: Response;
          try {
            response = await this.#fetch(NEBIUS_CHAT_COMPLETIONS_ENDPOINT, {
              method: "POST",
              redirect: "error",
              signal: AbortSignal.timeout(this.#timeoutMs),
              headers: {
                accept: "application/json",
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: selection.modelId,
                temperature: 0,
                max_tokens: 2_048,
                messages: [
                  {
                    role: "system",
                    content:
                      turn.previousToolResult === undefined
                        ? `You are Guardian's bounded native worker. Use only the supplied credential-free mission projection. Return exactly one JSON object matching this schema: ${outcomeGuidance}. A tool request is pending only: you cannot execute it or claim approval. Never emit session bindings, proposal IDs, approval state, assurance, credentials, URLs, headers, or shell text outside the typed schema.`
                        : `You are Guardian's bounded native worker. Guardian has returned the single sanitized tool result permitted for this task. Return exactly one final-response JSON object and do not request another tool. The complete output schema is: ${outcomeGuidance}. Never emit session bindings, proposal IDs, approval state, credentials, URLs, headers, or shell text.`,
                  },
                  { role: "user", content: JSON.stringify(providerProjection(turn)) },
                ],
                response_format: {
                  type: "json_object",
                },
              }),
            });
          } catch {
            report({ kind: "transport_failure" });
            throw new NativeWorkerProviderError();
          }
          if (!response.ok) {
            report({ kind: "http_error", status: response.status });
            throw new NativeWorkerProviderError();
          }
          let providerJson: unknown;
          try {
            providerJson = await boundedProviderJson(response);
          } catch {
            report({ kind: "response_envelope_invalid" });
            throw new NativeWorkerProviderError();
          }
          let result: ReturnType<typeof projectNebiusWorkerResponse>;
          try {
            result = projectNebiusWorkerResponse(providerJson, selection.modelId);
          } catch {
            report({ kind: "worker_output_invalid" });
            throw new NativeWorkerProviderError();
          }
          return { requestId: result.requestId, outcome: result.outcome };
        },
      );
    } catch {
      if (!diagnosed) report({ kind: "credential_or_internal_failure" });
      throw new NativeWorkerProviderError();
    }
  }
}

export const nativeWorkerBoundary = {
  endpoint: NEBIUS_CHAT_COMPLETIONS_ENDPOINT,
  modelPolicyId: DEFAULT_GUARDIAN_MODEL_POLICY.policyId,
  modelPolicyVersion: DEFAULT_GUARDIAN_MODEL_POLICY.version,
  model: DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker.modelId,
  credential: { schemaVersion: 1, provider: "nebius", slot: "default" },
} as const;
