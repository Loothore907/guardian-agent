import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteAuthorityStore } from "@guardian/authority-store";
import type { AuthorityClient } from "@guardian/authority-client";
import { digestCanonicalRequest, digestGitHubConnectionScope } from "@guardian/authorization";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GitHubBroker, type GuardianRiskEnvelope } from "./index.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  mission: "33333333-3333-4333-8333-333333333333",
  profile: "44444444-4444-4444-8444-444444444444",
  request: "55555555-5555-4555-8555-555555555555",
  proposal: "66666666-6666-4666-8666-666666666666",
  approval: "77777777-7777-4777-8777-777777777777",
  connection: "88888888-8888-4888-8888-888888888888",
  nonce: "99999999-9999-4999-8999-999999999999",
  human: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const;
const START = "2026-08-30T22:30:00.000Z";
const NOW = "2026-08-30T22:32:00.000Z";
const EXPIRY = "2026-08-30T22:40:00.000Z";
const HEAD = "b".repeat(40);
const MERGE = "c".repeat(40);
const TOKEN = "github-demo-token-value";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function connection() {
  return {
    schemaVersion: 1,
    connectionId: IDS.connection,
    provider: "github",
    credentialStoreHandle: "guardian-credential://github/dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    owner: "loothore907",
    repository: "guardian-agent",
    permissions: ["pull_request:read", "pull_request:merge"],
    status: "active",
    createdAt: START,
    updatedAt: START,
  } as const;
}

function canonicalRequest(kind: "read" | "merge" = "merge") {
  const operation = kind === "read" ? "github.pull_request.read" : "github.pull_request.merge";
  const common = {
    schemaVersion: 1,
    proposalId: IDS.proposal,
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    proposedAt: NOW,
  } as const;
  const resourceVersion = {
    kind: "github_pull_request",
    owner: "loothore907",
    repository: "guardian-agent",
    pullRequest: 13,
    headCommit: HEAD,
  } as const;
  const proposal =
    kind === "read"
      ? {
          ...common,
          operation,
          arguments: { owner: "loothore907", repository: "guardian-agent", pullRequest: 13 },
          resourceVersion,
        }
      : {
          ...common,
          operation,
          arguments: {
            owner: "loothore907",
            repository: "guardian-agent",
            pullRequest: 13,
            expectedHeadCommit: HEAD,
            method: "squash",
          },
          resourceVersion,
        };
  return {
    schemaVersion: 1,
    requestId: IDS.request,
    sessionId: IDS.session,
    callerId: IDS.caller,
    connectionId: IDS.connection,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    proposal,
    resourceVersion,
  } as const;
}

async function fixture(now = NOW) {
  const directory = await mkdtemp(join(tmpdir(), "guardian-broker-"));
  temporaryDirectories.push(directory);
  const store = new SqliteAuthorityStore(join(directory, "authority.sqlite"), { now: () => now });
  store.initialize();
  store.createConnection(connection());
  store.createSession(
    {
      schemaVersion: 1,
      sessionId: IDS.session,
      callerId: IDS.caller,
      missionId: IDS.mission,
      missionVersion: 1,
      profileId: IDS.profile,
      profileVersion: 1,
      policyVersion: 1,
      startsAt: START,
      expiresAt: EXPIRY,
      status: "active",
      createdAt: START,
      updatedAt: START,
    },
    {
      sessionId: IDS.session,
      remainingToolCalls: 4,
      remainingLocalCommands: 0,
      remainingResearchRequests: 0,
      remainingResearchResults: 0,
    },
    [IDS.connection],
  );
  const request = canonicalRequest();
  const approval = {
    schemaVersion: 1,
    approvalId: IDS.approval,
    requestId: IDS.request,
    requestDigest: digestCanonicalRequest(request),
    sessionId: IDS.session,
    callerId: IDS.caller,
    connectionId: IDS.connection,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    resourceVersion: request.resourceVersion,
    scopeDigest: digestGitHubConnectionScope(connection()),
    nonce: IDS.nonce,
    maxUses: 1,
    approvedBy: { kind: "human", principalId: IDS.human },
    approvedAt: "2026-08-30T22:31:00.000Z",
    expiresAt: "2026-08-30T22:36:00.000Z",
  } as const;
  store.storeApproval(approval);
  return { store, request, approval };
}

function authorityClient(store: SqliteAuthorityStore): AuthorityClient {
  return {
    getSession: (sessionId) => Promise.resolve(store.getSession(sessionId)),
    getSessionConnections: (sessionId) => Promise.resolve(store.getSessionConnections(sessionId)),
    getApproval: (sessionId, approvalId) => {
      const approval = store.getApproval(approvalId);
      return Promise.resolve(approval?.sessionId === sessionId ? approval : null);
    },
    getApprovalState: (sessionId, approvalId) => {
      const approval = store.getApproval(approvalId);
      return Promise.resolve(
        approval?.sessionId === sessionId ? store.getApprovalState(approvalId) : null,
      );
    },
    consumeToolCall: (sessionId) => Promise.resolve(store.consumeToolCall(sessionId)),
    consumeApproval: (value) => Promise.resolve(store.consumeApproval(value)),
    appendAuthorityAttempt: (value) => {
      store.appendAuthorityAttempt(value);
      return Promise.resolve();
    },
    appendAuthorityDecision: (value) => {
      store.appendAuthorityDecision(value);
      return Promise.resolve();
    },
  };
}

function githubFetch(head = HEAD, mergeStatus = 200) {
  return vi.fn<typeof fetch>().mockImplementation((_url, init) => {
    if (init?.method === "GET") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            head: { sha: head },
            base: { ref: "main" },
            state: "open",
            draft: false,
            title: "C6 broker",
            body: TOKEN,
          }),
        ),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ merged: mergeStatus === 200, sha: MERGE, message: TOKEN }), {
        status: mergeStatus,
      }),
    );
  });
}

async function useCredential<T>(
  _handle: string,
  operation: (credential: Uint8Array) => Promise<T>,
): Promise<T> {
  const bytes = Uint8Array.from(Buffer.from(TOKEN, "utf8"));
  try {
    return await operation(bytes);
  } finally {
    bytes.fill(0);
  }
}

const credentials = { use: useCredential };
const preservingGuardian = {
  evaluate: (envelope: GuardianRiskEnvelope) =>
    Promise.resolve({
      status: "evaluated" as const,
      providerRequestId: "guardian_test_1",
      recommendation: {
        schemaVersion: 1 as const,
        recommendation: "allow" as const,
        certainty: "certain" as const,
        reasonCodes: ["clean_context" as const],
      },
      authorizationLevel: envelope.deterministicFloor,
    }),
};

describe("GitHub broker", () => {
  it("fails closed on malformed outer envelopes without resolving credentials", async () => {
    const { store } = await fixture();
    const fetchMock = githubFetch();
    const credentialUse = vi.fn();
    const credentialResolver = {
      use<T>(handle: string, operation: (credential: Uint8Array) => Promise<T>) {
        credentialUse(handle);
        return useCredential(handle, operation);
      },
    };
    const broker = new GitHubBroker(authorityClient(store), credentialResolver, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    await expect(broker.execute(null)).resolves.toEqual({ ok: false, code: "malformed" });
    await expect(
      broker.execute({ request: canonicalRequest("read"), arbitraryAuthority: true }),
    ).resolves.toEqual({ ok: false, code: "malformed" });
    expect(credentialUse).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    store.close();
  });

  it("allows a scoped routine read and returns only the sanitized snapshot", async () => {
    const { store } = await fixture();
    const fetchMock = githubFetch();
    const broker = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    const result = await broker.execute({ request: canonicalRequest("read") });
    expect(result).toMatchObject({ ok: true, result: { headCommit: HEAD, state: "open" } });
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(3);
    expect(store.getAuthorityContext(IDS.session).decisions).toEqual([
      expect.objectContaining({
        authorizationFloor: "allow",
        guardianOutcome: "preserved",
        providerBoundary: "crossed",
        controlOutcome: "allowed",
      }),
    ]);
    store.close();
  });

  it("records Guardian escalation and stops before credentials or budget consumption", async () => {
    const { store } = await fixture();
    const credentialUse = vi.fn();
    const guardianEvaluate = vi.fn(() =>
      Promise.resolve({
        status: "evaluated" as const,
        providerRequestId: "guardian_test_step_up",
        recommendation: {
          schemaVersion: 1 as const,
          recommendation: "step_up" as const,
          certainty: "uncertain" as const,
          reasonCodes: ["ambiguous_evidence" as const],
        },
        authorizationLevel: "step_up" as const,
      }),
    );
    const broker = new GitHubBroker(
      authorityClient(store),
      { use: credentialUse },
      { guardian: { evaluate: guardianEvaluate }, now: () => NOW },
    );

    await expect(broker.execute({ request: canonicalRequest("read") })).resolves.toEqual({
      ok: false,
      code: "guardian_step_up",
    });
    expect(credentialUse).not.toHaveBeenCalled();
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(4);
    expect(store.getAuthorityContext(IDS.session).decisions).toEqual([
      expect.objectContaining({
        authorizationFloor: "step_up",
        guardianOutcome: "uncertain",
        providerBoundary: "crossed",
        adapterBoundary: "not_crossed",
        toolConsumption: "not_consumed",
        controlOutcome: "step_up",
      }),
    ]);
    store.close();
  });

  it("denies inconsistent Guardian output before credentials or budget consumption", async () => {
    const { store } = await fixture();
    const credentialUse = vi.fn();
    const broker = new GitHubBroker(
      authorityClient(store),
      { use: credentialUse },
      {
        guardian: {
          evaluate: () =>
            Promise.resolve({
              status: "evaluated",
              providerRequestId: "guardian_inconsistent_1",
              recommendation: {
                schemaVersion: 1,
                recommendation: "deny",
                certainty: "certain",
                reasonCodes: ["authority_expansion"],
              },
              authorizationLevel: "allow",
            } as const),
        },
        now: () => NOW,
      },
    );

    await expect(broker.execute({ request: canonicalRequest("read") })).resolves.toEqual({
      ok: false,
      code: "guardian_unavailable",
    });
    expect(credentialUse).not.toHaveBeenCalled();
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(4);
    expect(store.getAuthorityContext(IDS.session).decisions).toEqual([
      expect.objectContaining({
        authorizationFloor: "deny",
        guardianOutcome: "unavailable",
        providerBoundary: "crossed",
        adapterBoundary: "not_crossed",
        controlOutcome: "failed",
      }),
    ]);
    store.close();
  });

  it("rejects missing, mutated, and expired approval before any provider call or consumption", async () => {
    const { store, request, approval } = await fixture();
    const fetchMock = githubFetch();
    const broker = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    await expect(broker.execute({ request })).resolves.toEqual({
      ok: false,
      code: "approval_mismatch",
    });
    await expect(
      broker.execute({ request, approval: { ...approval, connectionId: IDS.caller } }),
    ).resolves.toEqual({ ok: false, code: "approval_mismatch" });
    const expired = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => "2026-08-30T22:36:00.000Z",
    });
    await expect(expired.execute({ request, approval })).resolves.toEqual({
      ok: false,
      code: "approval_expired",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(4);
    expect(store.getApprovalState(IDS.approval)).toBe("available");
    const context = store.getAuthorityContext(IDS.session);
    expect(context.attempts).toHaveLength(3);
    expect(context.decisions).toHaveLength(3);
    expect(context.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapterBoundary: "not_crossed",
          toolConsumption: "not_consumed",
          approvalConsumption: "not_consumed",
          controlOutcome: "denied",
        }),
      ]),
    );
    expect(JSON.stringify(context)).not.toContain(TOKEN);
    store.close();
  });

  it("revalidates the head, consumes exact authority once, and rejects replay pre-provider", async () => {
    const { store, request, approval } = await fixture();
    const fetchMock = githubFetch();
    const broker = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    const mergeResult = await broker.execute({ request, approval });
    expect(mergeResult).toEqual({
      ok: true,
      result: {
        status: "merged",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
        headCommit: HEAD,
        mergeCommit: MERGE,
      },
    });
    expect(store.getApprovalState(IDS.approval)).toBe("consumed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(broker.execute({ request, approval })).resolves.toEqual({
      ok: false,
      code: "approval_replayed",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const context = store.getAuthorityContext(IDS.session);
    expect(context.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapterBoundary: "crossed",
          toolConsumption: "consumed",
          approvalConsumption: "consumed",
          controlOutcome: "allowed",
        }),
        expect.objectContaining({
          deterministicReasons: ["approval_replayed"],
          adapterBoundary: "not_crossed",
        }),
      ]),
    );
    expect(JSON.stringify({ mergeResult, context })).not.toContain(TOKEN);
    store.close();
  });

  it("rejects cross-session, cross-connection, scope expansion, and post-approval mutation pre-provider", async () => {
    const { store, request, approval } = await fixture();
    const fetchMock = githubFetch();
    const broker = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    const otherSession = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await expect(
      broker.execute({
        request: {
          ...request,
          sessionId: otherSession,
          proposal: { ...request.proposal, sessionId: otherSession },
        },
        approval,
      }),
    ).resolves.toEqual({ ok: false, code: "not_active" });

    await expect(
      broker.execute({
        request: {
          ...request,
          connectionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        },
        approval,
      }),
    ).resolves.toEqual({ ok: false, code: "connection_unavailable" });

    const widenedResource = { ...request.resourceVersion, repository: "other-repository" };
    await expect(
      broker.execute({
        request: {
          ...request,
          proposal: {
            ...request.proposal,
            arguments: { ...request.proposal.arguments, repository: "other-repository" },
            resourceVersion: widenedResource,
          },
          resourceVersion: widenedResource,
        },
        approval,
      }),
    ).resolves.toEqual({ ok: false, code: "scope_mismatch" });

    const mutatedResource = { ...request.resourceVersion, pullRequest: 14 };
    await expect(
      broker.execute({
        request: {
          ...request,
          proposal: {
            ...request.proposal,
            arguments: { ...request.proposal.arguments, pullRequest: 14 },
            resourceVersion: mutatedResource,
          },
          resourceVersion: mutatedResource,
        },
        approval,
      }),
    ).resolves.toEqual({ ok: false, code: "approval_mismatch" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(4);
    expect(store.getApprovalState(IDS.approval)).toBe("available");
    store.close();
  });

  it("does not consume approval when resource revalidation detects a changed head", async () => {
    const { store, request, approval } = await fixture();
    const fetchMock = githubFetch("d".repeat(40));
    const broker = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    await expect(broker.execute({ request, approval })).resolves.toEqual({
      ok: false,
      code: "resource_changed",
    });
    expect(store.getApprovalState(IDS.approval)).toBe("available");
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(3);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(store.getAuthorityContext(IDS.session).decisions.at(-1)).toMatchObject({
      toolConsumption: "consumed",
      approvalConsumption: "not_consumed",
    });
    store.close();
  });

  it("denies exhausted volume before resolving a credential", async () => {
    const { store } = await fixture();
    for (let index = 0; index < 4; index += 1) store.consumeToolCall(IDS.session);
    const credentialUse = vi.fn();
    const credentialResolver = {
      use<T>(handle: string, operation: (credential: Uint8Array) => Promise<T>) {
        credentialUse(handle);
        return useCredential(handle, operation);
      },
    };
    const fetchMock = githubFetch();
    const broker = new GitHubBroker(authorityClient(store), credentialResolver, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    await expect(broker.execute({ request: canonicalRequest("read") })).resolves.toEqual({
      ok: false,
      code: "volume_exhausted",
    });
    expect(credentialUse).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    store.close();
  });

  it("keeps the nonce consumed when the merge outcome fails after the adapter boundary", async () => {
    const { store, request, approval } = await fixture();
    const fetchMock = githubFetch(HEAD, 500);
    const broker = new GitHubBroker(authorityClient(store), credentials, {
      guardian: preservingGuardian,
      fetch: fetchMock,
      now: () => NOW,
    });
    await expect(broker.execute({ request, approval })).resolves.toEqual({
      ok: false,
      code: "provider_failed",
    });
    expect(store.getApprovalState(IDS.approval)).toBe("consumed");
    store.close();
  });
});
