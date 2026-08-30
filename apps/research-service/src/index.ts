import {
  ResearchProviderResponseSchema,
  ResearchServiceProcessConfigSchema,
  type ResearchProviderResponse,
  type ResearchRequest,
  type ResearchScope,
} from "@guardian/contracts";
import {
  SessionResearchGateway,
  LocalResearchIpcServer,
  type ResearchBudgetSnapshot,
  type ResearchJourneyResult,
  type ResearchProvider,
} from "@guardian/research";

const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_PROVIDER_RESPONSE_BYTES = 256 * 1_024;

export type TavilyProviderFailureReason = "malformed" | "oversized" | "timeout" | "unavailable";

export class TavilyProviderError extends Error {
  readonly reason: TavilyProviderFailureReason;

  constructor(reason: TavilyProviderFailureReason) {
    super(`Tavily provider failed: ${reason}`);
    this.name = "TavilyProviderError";
    this.reason = reason;
  }
}

export interface TavilyTransportRequest {
  readonly endpoint: typeof TAVILY_SEARCH_ENDPOINT;
  readonly authorization: string;
  readonly body: string;
  readonly signal: AbortSignal;
}

export interface TavilyTransportResponse {
  readonly status: number;
  readonly body: string;
}

export type TavilyTransport = (request: TavilyTransportRequest) => Promise<TavilyTransportResponse>;

function responseByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

async function readBoundedBody(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new TavilyProviderError("oversized");
  }
  if (response.body === null) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalLength += value.byteLength;
    if (totalLength > MAX_PROVIDER_RESPONSE_BYTES) {
      await reader.cancel();
      throw new TavilyProviderError("oversized");
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
}

export function createFetchTavilyTransport(
  fetchImplementation: typeof fetch = globalThis.fetch,
): TavilyTransport {
  return async ({ endpoint, authorization, body, signal }) => {
    const response = await fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization,
        "content-type": "application/json",
      },
      body,
      redirect: "error",
      signal,
    });
    return {
      status: response.status,
      body: response.ok ? await readBoundedBody(response) : "",
    };
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TavilyProviderError("malformed");
  }
  return value as Record<string, unknown>;
}

export function projectTavilySearchResponse(value: unknown): ResearchProviderResponse {
  const response = objectValue(value);
  if (!Array.isArray(response.results)) {
    throw new TavilyProviderError("malformed");
  }
  try {
    return ResearchProviderResponseSchema.parse({
      requestId: response.request_id,
      results: response.results.map((rawResult) => {
        const result = objectValue(rawResult);
        return { url: result.url, title: result.title, content: result.content };
      }),
    });
  } catch (error) {
    if (error instanceof TavilyProviderError) throw error;
    throw new TavilyProviderError("malformed");
  }
}

export class TavilySearchProvider implements ResearchProvider<ResearchProviderResponse> {
  readonly #authorization: string;
  readonly #transport: TavilyTransport;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly apiKey: string;
    readonly transport?: TavilyTransport;
    readonly timeoutMs?: number;
  }) {
    if (options.apiKey.length < 1 || options.apiKey.length > 512) {
      throw new TavilyProviderError("unavailable");
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new TypeError("Tavily timeout must be an integer between 100 and 60000 milliseconds");
    }
    this.#authorization = `Bearer ${options.apiKey}`;
    this.#transport = options.transport ?? createFetchTavilyTransport();
    this.#timeoutMs = timeoutMs;
  }

  async search(request: ResearchRequest): Promise<ResearchProviderResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#transport({
        endpoint: TAVILY_SEARCH_ENDPOINT,
        authorization: this.#authorization,
        body: JSON.stringify({
          query: request.query,
          max_results: request.maxResults,
          include_domains: request.allowedDomains,
          topic: "general",
          search_depth: "basic",
          auto_parameters: false,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
        }),
        signal: controller.signal,
      });
      if (response.status !== 200) throw new TavilyProviderError("unavailable");
      if (responseByteLength(response.body) > MAX_PROVIDER_RESPONSE_BYTES) {
        throw new TavilyProviderError("oversized");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.body) as unknown;
      } catch {
        throw new TavilyProviderError("malformed");
      }
      return projectTavilySearchResponse(parsed);
    } catch (error) {
      if (error instanceof TavilyProviderError) throw error;
      if (controller.signal.aborted) throw new TavilyProviderError("timeout");
      throw new TavilyProviderError("unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class CredentialHoldingResearchService {
  readonly #gateway: SessionResearchGateway;
  readonly #provider: TavilySearchProvider;

  constructor(options: {
    readonly sessionId: unknown;
    readonly scope: ResearchScope;
    readonly apiKey: string;
    readonly transport?: TavilyTransport;
    readonly timeoutMs?: number;
  }) {
    this.#gateway = new SessionResearchGateway(options.sessionId, options.scope);
    this.#provider = new TavilySearchProvider(options);
  }

  get budget(): ResearchBudgetSnapshot {
    return this.#gateway.budget;
  }

  search(request: unknown, retrievedAt: unknown): Promise<ResearchJourneyResult> {
    return this.#gateway.search(request, this.#provider, retrievedAt);
  }
}

export function createResearchServiceFromEnvironment(options: {
  readonly sessionId: unknown;
  readonly scope: ResearchScope;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly transport?: TavilyTransport;
  readonly timeoutMs?: number;
}): CredentialHoldingResearchService {
  const apiKey = options.environment.TAVILY_API_KEY;
  if (apiKey === undefined) throw new TavilyProviderError("unavailable");
  return new CredentialHoldingResearchService({ ...options, apiKey });
}

export async function startCredentialHoldingResearchIpcServer(options: {
  readonly config: unknown;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly transport?: TavilyTransport;
  readonly timeoutMs?: number;
  readonly now?: () => string;
}): Promise<LocalResearchIpcServer> {
  const config = ResearchServiceProcessConfigSchema.parse(options.config);
  const service = createResearchServiceFromEnvironment({
    sessionId: config.sessionId,
    scope: config.scope,
    environment: options.environment,
    ...(options.transport === undefined ? {} : { transport: options.transport }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  const server = new LocalResearchIpcServer(
    config,
    async (request, requestedAt) => ({
      result: await service.search(request, requestedAt),
      budget: service.budget,
    }),
    { ...(options.now === undefined ? {} : { now: options.now }) },
  );
  await server.listen();
  return server;
}

export const researchServiceBoundary = {
  credential: "TAVILY_API_KEY",
  endpoint: TAVILY_SEARCH_ENDPOINT,
  operation: "guardian.research",
} as const;
