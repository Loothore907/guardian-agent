import {
  ResearchProvenanceEventSchema,
  ResearchRequestSchema,
  ResearchScopeSchema,
  type ResearchProvenanceEvent,
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
