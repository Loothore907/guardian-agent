import { createHash, randomUUID } from "node:crypto";

import { canonicalDigest } from "@guardian/canonical";
import {
  OpaqueIdSchema,
  PublicHttpUrlSchema,
  ResearchEvidenceSchema,
  ResearchProvenanceEventSchema,
  ResearchProviderResponseSchema,
  ResearchRequestSchema,
  ResearchScopeSchema,
  TimestampSchema,
  type ResearchEvidence,
  type ResearchProvenanceEvent,
  type ResearchProviderResponse,
  type ResearchRequest,
  type ResearchScope,
} from "@guardian/contracts";

export function parseResearchRequest(value: unknown): ResearchRequest {
  return ResearchRequestSchema.parse(value);
}

export function parseResearchProvenanceEvent(value: unknown): ResearchProvenanceEvent {
  return ResearchProvenanceEventSchema.parse(value);
}

export type ResearchDenialReason =
  "budget_exhausted" | "domain_not_allowed" | "query_not_relevant" | "unsafe_outbound_content";

export class ResearchRequestDeniedError extends Error {
  readonly reason: ResearchDenialReason;

  constructor(reason: ResearchDenialReason) {
    super(`research request denied: ${reason}`);
    this.name = "ResearchRequestDeniedError";
    this.reason = reason;
  }
}

const SECRET_PATTERNS = [
  /\b(?:api[_-]?key|authorization|bearer|password|secret|token)\b\s*[:=]\s*\S+/iu,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/u,
  /\bAKIA[A-Z0-9]{16}\b/u,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/u,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/u,
] as const;
const PRIVATE_PATTERNS = [
  /(?:^|\s)(?:[A-Za-z]:\\Users\\|\/(?:home|root)\/|\.env(?:\.|\s|$))/iu,
  /\b(?:127\.0\.0\.1|10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3})\.\d{1,3})\b/u,
] as const;

function tokenEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const character of value) {
    counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  return [...counts.values()].reduce((entropy, count) => {
    const probability = count / value.length;
    return entropy - probability * Math.log2(probability);
  }, 0);
}

function containsEncodedOrHighEntropyToken(query: string): boolean {
  return query.split(/\s+/u).some((token) => {
    const candidate = token.replace(/^["'([{<]+|["')\]}>.,;:!?]+$/gu, "");
    if (/^(?:[A-Fa-f0-9]{32,}|[A-Za-z0-9+/]{32,}={0,2})$/u.test(candidate)) {
      return true;
    }
    return candidate.length >= 24 && tokenEntropy(candidate) >= 4.25;
  });
}

export function guardResearchRequest(value: unknown, scopeValue: unknown): ResearchRequest {
  const request = ResearchRequestSchema.parse(value);
  const scope: ResearchScope = ResearchScopeSchema.parse(scopeValue);
  if (
    scope.remainingRequests < 1 ||
    scope.remainingResults < request.maxResults ||
    request.maxResults > scope.maxResultsPerRequest
  ) {
    throw new ResearchRequestDeniedError("budget_exhausted");
  }
  const allowedDomains = new Set(scope.allowedDomains.map((domain) => domain.toLowerCase()));
  if (!request.allowedDomains.every((domain) => allowedDomains.has(domain.toLowerCase()))) {
    throw new ResearchRequestDeniedError("domain_not_allowed");
  }
  if (
    SECRET_PATTERNS.some((pattern) => pattern.test(request.query)) ||
    PRIVATE_PATTERNS.some((pattern) => pattern.test(request.query)) ||
    containsEncodedOrHighEntropyToken(request.query)
  ) {
    throw new ResearchRequestDeniedError("unsafe_outbound_content");
  }
  const normalizedQuery = request.query.toLowerCase();
  if (!scope.requiredTerms.some((term) => normalizedQuery.includes(term.toLowerCase()))) {
    throw new ResearchRequestDeniedError("query_not_relevant");
  }
  return ResearchRequestSchema.parse({
    ...request,
    allowedDomains: request.allowedDomains.map((domain) => domain.toLowerCase()).sort(),
  });
}

export interface ResearchProvider<T> {
  search(request: ResearchRequest): Promise<T>;
}

export async function invokeBoundedResearch<T>(
  value: unknown,
  scope: unknown,
  provider: ResearchProvider<T>,
): Promise<T> {
  const request = guardResearchRequest(value, scope);
  return provider.search(request);
}

export interface ResearchJourneyResult {
  readonly evidence: readonly ResearchEvidence[];
  readonly provenance: readonly ResearchProvenanceEvent[];
}

function sanitizeProviderText(value: string, limit: number): string {
  const visible = Array.from(value)
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint === 9 || codePoint === 10 || codePoint === 13 ? " " : character;
    })
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint === undefined ||
        (codePoint > 31 &&
          !(codePoint >= 0x7f && codePoint <= 0x9f) &&
          !(codePoint >= 0x200b && codePoint <= 0x200f) &&
          !(codePoint >= 0x202a && codePoint <= 0x202e) &&
          codePoint !== 0x2060 &&
          !(codePoint >= 0x2066 && codePoint <= 0x2069) &&
          codePoint !== 0xfeff)
      );
    })
    .join("")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(
      /\b(api[_-]?key|authorization|bearer|password|secret|token)\b\s*[:=]\s*\S+/giu,
      "$1=[redacted]",
    )
    .replace(/-----BEGIN ((?:[A-Z0-9]+ )*PRIVATE KEY)-----.*?-----END \1-----/gu, "[redacted]")
    .replace(/\bgh[pousr]_[A-Za-z0-9]{20,}\b/gu, "[redacted]")
    .replace(/\bAKIA[A-Z0-9]{16}\b/gu, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/gu, "[redacted]")
    .replace(/(?:[A-Za-z]:\\Users\\|\/(?:home|root)\/)\S*/giu, "[redacted]");
  const bounded = Array.from(visible).slice(0, limit).join("").trim();
  if (bounded.length === 0) {
    throw new TypeError("provider text is empty after sanitization");
  }
  return bounded;
}

function canonicalSourceUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new TypeError("provider source URL must use HTTP or HTTPS");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new TypeError("provider source URL cannot contain user information");
  }
  return PublicHttpUrlSchema.parse(parsed.toString());
}

export class ResearchJourneyLedger {
  readonly #sessionId: string;
  #nextSequence = 1;

  constructor(sessionId: unknown) {
    this.#sessionId = OpaqueIdSchema.parse(sessionId);
  }

  record(
    requestValue: unknown,
    responseValue: unknown,
    retrievedAtValue: unknown,
  ): ResearchJourneyResult {
    const request = ResearchRequestSchema.parse(requestValue);
    const response: ResearchProviderResponse = ResearchProviderResponseSchema.parse(responseValue);
    const retrievedAt = TimestampSchema.parse(retrievedAtValue);
    if (response.results.length > request.maxResults) {
      throw new TypeError("provider returned more results than requested");
    }
    const allowedDomains = new Set(request.allowedDomains.map((domain) => domain.toLowerCase()));
    const queryDigest = canonicalDigest("research_query", 1, request);
    const evidence: ResearchEvidence[] = [];
    const provenance: ResearchProvenanceEvent[] = [];
    const sourceUrls = new Set<string>();

    for (const [index, result] of response.results.entries()) {
      const sourceUrl = canonicalSourceUrl(result.url);
      if (sourceUrls.has(sourceUrl)) {
        throw new TypeError("provider returned a duplicate source URL");
      }
      sourceUrls.add(sourceUrl);
      const hostname = new URL(sourceUrl).hostname.toLowerCase();
      if (!allowedDomains.has(hostname)) {
        throw new TypeError("provider returned a source outside the approved domains");
      }
      const sourceContentDigest = createHash("sha256")
        .update("guardian.public_research_content.v1\0", "utf8")
        .update(sourceUrl, "utf8")
        .update("\0", "utf8")
        .update(result.content, "utf8")
        .digest("hex");
      evidence.push(
        ResearchEvidenceSchema.parse({
          schemaVersion: 1,
          title: sanitizeProviderText(result.title, 200),
          excerpt: sanitizeProviderText(result.content, 1_000),
          sourceUrl,
          sourceContentDigest,
          contentTrust: "untrusted_public_content",
          retrievedAt,
        }),
      );
      provenance.push(
        ResearchProvenanceEventSchema.parse({
          schemaVersion: 1,
          eventId: randomUUID(),
          sessionId: this.#sessionId,
          sequence: this.#nextSequence + index,
          operation: "guardian.research",
          queryDigest,
          destination: { kind: "public_domain", hostname },
          sourceUrl,
          sourceContentDigest,
          contentTrust: "untrusted_public_content",
          retrievedAt,
          providerRequestId: response.requestId,
        }),
      );
    }
    this.#nextSequence += provenance.length;
    return { evidence, provenance };
  }
}
