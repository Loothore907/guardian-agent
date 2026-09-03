import {
  ControlledContentProviderResponseSchema,
  CredentialReferenceSchema,
  ResearchProviderResponseSchema,
  ResearchServiceProcessConfigSchema,
  type ControlledContentProviderResponse,
  type ControlledContentRequest,
  type ControlledContentScope,
  type ControlledContentJourneyResult,
  type ResearchProviderResponse,
  type ResearchRequest,
  type ResearchScope,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";
import {
  ControlledContentJourneyLedger,
  ResearchJourneyLedger,
  ResearchJourneySequencer,
  ResearchRequestDeniedError,
  SessionControlledContentGateway,
  SessionResearchGateway,
  LocalResearchIpcServer,
  guardControlledContentRequest,
  guardResearchRequest,
  type ControlledContentProvider,
  type ResearchBudgetSnapshot,
  type ResearchJourneyResult,
  type ResearchProvider,
} from "@guardian/research";
import type { AuthorityControlClient } from "@guardian/authority-client";

const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";
const TAVILY_EXTRACT_ENDPOINT = "https://api.tavily.com/extract";
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
  readonly endpoint: typeof TAVILY_SEARCH_ENDPOINT | typeof TAVILY_EXTRACT_ENDPOINT;
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

export function projectTavilyExtractResponse(value: unknown): ControlledContentProviderResponse {
  const response = objectValue(value);
  if (!Array.isArray(response.results) || !Array.isArray(response.failed_results)) {
    throw new TavilyProviderError("malformed");
  }
  if (response.failed_results.length !== 0 || response.results.length !== 1) {
    throw new TavilyProviderError("unavailable");
  }
  const result = objectValue(response.results[0]);
  if (typeof result.raw_content === "string" && result.raw_content.length > 100_000) {
    throw new TavilyProviderError("oversized");
  }
  try {
    return ControlledContentProviderResponseSchema.parse({
      requestId: response.request_id,
      url: result.url,
      content: result.raw_content,
    });
  } catch (error) {
    if (error instanceof TavilyProviderError) throw error;
    throw new TavilyProviderError("malformed");
  }
}

export class TavilyExtractProvider implements ControlledContentProvider<ControlledContentProviderResponse> {
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

  async extract(request: ControlledContentRequest): Promise<ControlledContentProviderResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#transport({
        endpoint: TAVILY_EXTRACT_ENDPOINT,
        authorization: this.#authorization,
        body: JSON.stringify({
          urls: request.url,
          extract_depth: "basic",
          include_images: false,
          include_favicon: false,
          format: "text",
          timeout: 10,
          include_usage: false,
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
      return projectTavilyExtractResponse(parsed);
    } catch (error) {
      if (error instanceof TavilyProviderError) throw error;
      if (controller.signal.aborted) throw new TavilyProviderError("timeout");
      throw new TavilyProviderError("unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class CredentialStoreTavilyProvider
  implements
    ResearchProvider<ResearchProviderResponse>,
    ControlledContentProvider<ControlledContentProviderResponse>
{
  readonly #store: CredentialStore;
  readonly #transport: TavilyTransport | undefined;
  readonly #timeoutMs: number | undefined;

  constructor(options: {
    readonly credentialStore: CredentialStore;
    readonly transport?: TavilyTransport;
    readonly timeoutMs?: number;
  }) {
    this.#store = options.credentialStore;
    this.#transport = options.transport;
    this.#timeoutMs = options.timeoutMs;
  }

  search(request: ResearchRequest): Promise<ResearchProviderResponse> {
    return this.#store.use(
      CredentialReferenceSchema.parse({ schemaVersion: 1, provider: "tavily", slot: "default" }),
      async (credential) => {
        let apiKey: string;
        try {
          apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
        } catch {
          throw new TavilyProviderError("unavailable");
        }
        return await new TavilySearchProvider({
          apiKey,
          ...(this.#transport === undefined ? {} : { transport: this.#transport }),
          ...(this.#timeoutMs === undefined ? {} : { timeoutMs: this.#timeoutMs }),
        }).search(request);
      },
    );
  }

  extract(request: ControlledContentRequest): Promise<ControlledContentProviderResponse> {
    return this.#store.use(
      CredentialReferenceSchema.parse({ schemaVersion: 1, provider: "tavily", slot: "default" }),
      async (credential) => {
        let apiKey: string;
        try {
          apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
        } catch {
          throw new TavilyProviderError("unavailable");
        }
        return await new TavilyExtractProvider({
          apiKey,
          ...(this.#transport === undefined ? {} : { transport: this.#transport }),
          ...(this.#timeoutMs === undefined ? {} : { timeoutMs: this.#timeoutMs }),
        }).extract(request);
      },
    );
  }
}

export class CredentialHoldingControlledContentService {
  readonly #gateway: SessionControlledContentGateway;
  readonly #provider: TavilyExtractProvider;

  constructor(options: {
    readonly sessionId: unknown;
    readonly scope: ControlledContentScope;
    readonly apiKey: string;
    readonly transport?: TavilyTransport;
    readonly timeoutMs?: number;
    readonly sequencer?: ResearchJourneySequencer;
  }) {
    this.#gateway = new SessionControlledContentGateway(
      options.sessionId,
      options.scope,
      options.sequencer,
    );
    this.#provider = new TavilyExtractProvider(options);
  }

  get budget() {
    return this.#gateway.budget;
  }

  extract(request: unknown, retrievedAt: unknown): Promise<ControlledContentJourneyResult> {
    return this.#gateway.extract(request, this.#provider, retrievedAt);
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
    readonly sequencer?: ResearchJourneySequencer;
  }) {
    this.#gateway = new SessionResearchGateway(options.sessionId, options.scope, options.sequencer);
    this.#provider = new TavilySearchProvider(options);
  }

  get budget(): ResearchBudgetSnapshot {
    return this.#gateway.budget;
  }

  search(request: unknown, retrievedAt: unknown): Promise<ResearchJourneyResult> {
    return this.#gateway.search(request, this.#provider, retrievedAt);
  }
}

export class DurableCredentialHoldingResearchService {
  readonly #sessionId: string;
  readonly #scope: ResearchScope;
  readonly #authority: AuthorityControlClient;
  readonly #provider: ResearchProvider<ResearchProviderResponse>;
  readonly #ledger: ResearchJourneyLedger;

  constructor(
    options: {
      readonly sessionId: string;
      readonly scope: ResearchScope;
      readonly authority: AuthorityControlClient;
      readonly sequencer?: ResearchJourneySequencer;
    } & (
      | {
          readonly apiKey: string;
          readonly transport?: TavilyTransport;
          readonly timeoutMs?: number;
          readonly provider?: never;
        }
      | {
          readonly provider: ResearchProvider<ResearchProviderResponse>;
          readonly apiKey?: never;
          readonly transport?: never;
          readonly timeoutMs?: never;
        }
    ),
  ) {
    this.#sessionId = options.sessionId;
    this.#scope = options.scope;
    this.#authority = options.authority;
    this.#provider =
      options.provider ??
      new TavilySearchProvider({
        apiKey: options.apiKey,
        ...(options.transport === undefined ? {} : { transport: options.transport }),
        ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      });
    this.#ledger = new ResearchJourneyLedger(options.sessionId, options.sequencer);
  }

  async search(requestValue: unknown, retrievedAt: unknown) {
    const request = guardResearchRequest(requestValue, this.#scope);
    const reservation = await this.#authority.reserveResearch(this.#sessionId, request.maxResults);
    if (reservation === null) throw new ResearchRequestDeniedError("budget_exhausted");
    let result: ResearchJourneyResult;
    try {
      const response = await this.#provider.search(request);
      result = this.#ledger.record(request, response, retrievedAt);
    } catch (error) {
      await this.#authority.settleResearchResults(reservation.reservationId, this.#sessionId, 0);
      throw error;
    }
    const budget = await this.#authority.settleResearchResults(
      reservation.reservationId,
      this.#sessionId,
      result.evidence.length,
    );
    return {
      result,
      budget: {
        sessionId: this.#sessionId,
        remainingRequests: budget.remainingResearchRequests,
        remainingResults: budget.remainingResearchResults,
      },
    };
  }
}

export class DurableControlledContentService {
  readonly #sessionId: string;
  readonly #scope: ControlledContentScope;
  readonly #authority: AuthorityControlClient;
  readonly #provider: ControlledContentProvider<ControlledContentProviderResponse>;
  readonly #ledger: ControlledContentJourneyLedger;

  constructor(options: {
    readonly sessionId: string;
    readonly scope: ControlledContentScope;
    readonly authority: AuthorityControlClient;
    readonly provider: ControlledContentProvider<ControlledContentProviderResponse>;
    readonly sequencer?: ResearchJourneySequencer;
  }) {
    this.#sessionId = options.sessionId;
    this.#scope = options.scope;
    this.#authority = options.authority;
    this.#provider = options.provider;
    this.#ledger = new ControlledContentJourneyLedger(options.sessionId, options.sequencer);
  }

  async extract(requestValue: unknown, retrievedAt: unknown) {
    const request = guardControlledContentRequest(requestValue, this.#scope);
    const reservation = await this.#authority.reserveResearch(this.#sessionId, 1);
    if (reservation === null) throw new ResearchRequestDeniedError("budget_exhausted");
    let result: ControlledContentJourneyResult;
    try {
      const response = await this.#provider.extract(request);
      result = this.#ledger.record(request, response, this.#scope, retrievedAt);
    } catch (error) {
      await this.#authority.settleResearchResults(reservation.reservationId, this.#sessionId, 0);
      throw error;
    }
    const budget = await this.#authority.settleResearchResults(
      reservation.reservationId,
      this.#sessionId,
      1,
    );
    return {
      result,
      budget: {
        sessionId: this.#sessionId,
        remainingRequests: budget.remainingResearchRequests,
        remainingResults: budget.remainingResearchResults,
      },
    };
  }
}

export function createResearchServiceFromEnvironment(options: {
  readonly sessionId: unknown;
  readonly scope: ResearchScope;
  readonly environment: Readonly<Record<string, string | undefined>>;
  readonly transport?: TavilyTransport;
  readonly timeoutMs?: number;
  readonly sequencer?: ResearchJourneySequencer;
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
  readonly authority?: AuthorityControlClient;
}): Promise<LocalResearchIpcServer> {
  const config = ResearchServiceProcessConfigSchema.parse(options.config);
  const sequencer = new ResearchJourneySequencer();
  if (options.authority !== undefined) {
    const apiKey = options.environment.TAVILY_API_KEY;
    if (apiKey === undefined) throw new TavilyProviderError("unavailable");
    const service = new DurableCredentialHoldingResearchService({
      sessionId: config.sessionId,
      scope: config.scope,
      authority: options.authority,
      apiKey,
      sequencer,
      ...(options.transport === undefined ? {} : { transport: options.transport }),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
    const controlledService =
      config.controlledContent === undefined
        ? undefined
        : new DurableControlledContentService({
            sessionId: config.sessionId,
            scope: config.controlledContent,
            authority: options.authority,
            sequencer,
            provider: new TavilyExtractProvider({
              apiKey,
              ...(options.transport === undefined ? {} : { transport: options.transport }),
              ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
            }),
          });
    const server = new LocalResearchIpcServer(
      config,
      (request, requestedAt) => service.search(request, requestedAt),
      {
        ...(options.now === undefined ? {} : { now: options.now }),
        ...(controlledService === undefined
          ? {}
          : {
              controlledContentHandler: (request, requestedAt) =>
                controlledService.extract(request, requestedAt),
            }),
      },
    );
    await server.listen();
    return server;
  }
  const service = createResearchServiceFromEnvironment({
    sessionId: config.sessionId,
    scope: config.scope,
    environment: options.environment,
    sequencer,
    ...(options.transport === undefined ? {} : { transport: options.transport }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  const apiKey = options.environment.TAVILY_API_KEY;
  const controlledService =
    config.controlledContent === undefined || apiKey === undefined
      ? undefined
      : new CredentialHoldingControlledContentService({
          sessionId: config.sessionId,
          scope: config.controlledContent,
          apiKey,
          sequencer,
          ...(options.transport === undefined ? {} : { transport: options.transport }),
          ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
        });
  const server = new LocalResearchIpcServer(
    config,
    async (request, requestedAt) => ({
      result: await service.search(request, requestedAt),
      budget: service.budget,
    }),
    {
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(controlledService === undefined
        ? {}
        : {
            controlledContentHandler: async (request, requestedAt) => ({
              result: await controlledService.extract(request, requestedAt),
              budget: {
                sessionId: config.sessionId,
                remainingRequests: controlledService.budget.remainingRequests,
                remainingResults: service.budget.remainingResults,
              },
            }),
          }),
    },
  );
  await server.listen();
  return server;
}

export async function startCredentialStoreResearchIpcServer(options: {
  readonly config: unknown;
  readonly credentialStore: CredentialStore;
  readonly authority: AuthorityControlClient;
  readonly transport?: TavilyTransport;
  readonly timeoutMs?: number;
  readonly now?: () => string;
}): Promise<LocalResearchIpcServer> {
  const config = ResearchServiceProcessConfigSchema.parse(options.config);
  const sequencer = new ResearchJourneySequencer();
  const provider = new CredentialStoreTavilyProvider({
    credentialStore: options.credentialStore,
    ...(options.transport === undefined ? {} : { transport: options.transport }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  const service = new DurableCredentialHoldingResearchService({
    sessionId: config.sessionId,
    scope: config.scope,
    authority: options.authority,
    provider,
    sequencer,
  });
  const controlledService =
    config.controlledContent === undefined
      ? undefined
      : new DurableControlledContentService({
          sessionId: config.sessionId,
          scope: config.controlledContent,
          authority: options.authority,
          provider,
          sequencer,
        });
  const server = new LocalResearchIpcServer(
    config,
    (request, requestedAt) => service.search(request, requestedAt),
    {
      ...(options.now === undefined ? {} : { now: options.now }),
      ...(controlledService === undefined
        ? {}
        : {
            controlledContentHandler: (request, requestedAt) =>
              controlledService.extract(request, requestedAt),
          }),
    },
  );
  await server.listen();
  return server;
}

export const researchServiceBoundary = {
  credential: "TAVILY_API_KEY",
  endpoint: TAVILY_SEARCH_ENDPOINT,
  controlledContentEndpoint: TAVILY_EXTRACT_ENDPOINT,
  operation: "guardian.research",
} as const;
