import { describe, expect, it, vi } from "vitest";

import { DEFAULT_NEBIUS_WORKER_SELECTION } from "@guardian/contracts";
import { InMemoryCredentialStore } from "@guardian/credential-store";
import { createWorkerToolResult, createWorkerTurnEnvelope } from "@guardian/worker";

import {
  NativeWorkerProviderError,
  NebiusNativeWorkerProvider,
  nativeWorkerBoundary,
  projectNebiusWorkerResponse,
} from "./nebius.js";

function turn(worker = DEFAULT_NEBIUS_WORKER_SELECTION, overrides: Record<string, unknown> = {}) {
  return createWorkerTurnEnvelope({
    schemaVersion: 1,
    turnId: "11111111-1111-4111-8111-111111111111",
    sessionId: "22222222-2222-4222-8222-222222222222",
    callerId: "33333333-3333-4333-8333-333333333333",
    missionId: "44444444-4444-4444-8444-444444444444",
    missionVersion: 1,
    profileId: "55555555-5555-4555-8555-555555555555",
    profileVersion: 1,
    policyVersion: 1,
    modelPolicyId:
      worker.kind === "nebius_native" ? worker.modelPolicyId : "competition-2026-09-01",
    modelPolicyVersion: worker.kind === "nebius_native" ? worker.modelPolicyVersion : 1,
    worker,
    turnNumber: 1,
    startsAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:01:00.000Z",
    objective: "Inspect the confirmed project and report the next bounded step.",
    constraints: ["Do not execute a pending tool request."],
    allowedTools: ["guardian.session_status", "guardian.local_command"],
    remainingBudget: {
      remainingDurationSeconds: 60,
      remainingToolCalls: 2,
      remainingResearchRequests: 0,
      remainingResearchResults: 0,
      remainingLocalCommands: 1,
      remainingPrivilegedActions: 0,
    },
    ...overrides,
  });
}

describe("Nebius native worker provider", () => {
  it("uses the fixed endpoint and model while keeping credentials and trusted IDs out of context", async () => {
    const credentialStore = new InMemoryCredentialStore();
    const secret = "worker-provider-secret-fixture";
    await credentialStore.write(nativeWorkerBoundary.credential, new TextEncoder().encode(secret));
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "nebius_worker_1",
            model: nativeWorkerBoundary.model,
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    kind: "tool_request",
                    request: {
                      name: "guardian.local_command",
                      arguments: {
                        executable: "rg",
                        arguments: ["TODO"],
                        workingDirectory: "/workspace",
                        timeoutSeconds: 10,
                      },
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const provider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: fetchMock,
    });
    const exactTurn = turn();
    await expect(provider.runTurn(exactTurn)).resolves.toMatchObject({
      requestId: "nebius_worker_1",
      outcome: { kind: "tool_request" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] ?? [];
    expect(endpoint).toBe(nativeWorkerBoundary.endpoint);
    expect(init?.redirect).toBe("error");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${secret}`);
    expect(typeof init?.body).toBe("string");
    if (typeof init?.body !== "string") throw new TypeError("provider body was not text");
    const body = init.body;
    expect(body).not.toContain(secret);
    expect(body).not.toContain(exactTurn.sessionId);
    expect(body).not.toContain(exactTurn.callerId);
    expect(body).not.toContain(exactTurn.turnDigest);
    expect(JSON.parse(body)).toMatchObject({ model: nativeWorkerBoundary.model });
  });

  it("rejects mismatched policy or model before credential use and provider invocation", async () => {
    const credentialStore = new InMemoryCredentialStore();
    const useSpy = vi.spyOn(credentialStore, "use");
    const fetchMock = vi.fn();
    const provider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: fetchMock,
    });
    if (DEFAULT_NEBIUS_WORKER_SELECTION.kind !== "nebius_native") {
      throw new TypeError("test worker selection is invalid");
    }
    const mismatched = turn({
      ...DEFAULT_NEBIUS_WORKER_SELECTION,
      modelId: "Qwen/untrusted-model",
    });
    await expect(provider.runTurn(mismatched)).rejects.toBeInstanceOf(NativeWorkerProviderError);
    expect(useSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("projects only the public denial code and disposition into the final turn", async () => {
    const credentialStore = new InMemoryCredentialStore();
    await credentialStore.write(
      nativeWorkerBoundary.credential,
      new TextEncoder().encode("worker-provider-denial-fixture"),
    );
    const firstTurn = turn();
    const denial = createWorkerToolResult({
      schemaVersion: 1,
      executionId: "66666666-6666-4666-8666-666666666666",
      executionDigest: "a".repeat(64),
      sessionId: firstTurn.sessionId,
      callerId: firstTurn.callerId,
      missionId: firstTurn.missionId,
      missionVersion: firstTurn.missionVersion,
      profileId: firstTurn.profileId,
      profileVersion: firstTurn.profileVersion,
      policyVersion: firstTurn.policyVersion,
      sourceTurnId: firstTurn.turnId,
      sourceTurnNumber: firstTurn.turnNumber,
      sourceTurnDigest: firstTurn.turnDigest,
      requestDigest: "b".repeat(64),
      completedAt: "2026-09-01T00:00:20.000Z",
      remainingBudget: {
        remainingDurationSeconds: 40,
        remainingToolCalls: 2,
        remainingResearchRequests: 0,
        remainingResearchResults: 0,
        remainingLocalCommands: 1,
        remainingPrivilegedActions: 0,
      },
      outcome: "denied",
      name: "guardian.session_status",
      denial: {
        code: "request_denied",
        disposition: "continue",
        policyId: "reference-worker-violations-2026-09-02",
        policyVersion: 1,
      },
    });
    const finalTurn = turn(DEFAULT_NEBIUS_WORKER_SELECTION, {
      turnId: "77777777-7777-4777-8777-777777777777",
      turnNumber: 2,
      startsAt: "2026-09-01T00:00:20.000Z",
      allowedTools: [],
      remainingBudget: denial.remainingBudget,
      previousToolResult: denial,
    });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "nebius_worker_denial_2",
            model: nativeWorkerBoundary.model,
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({ kind: "final_response", response: "Finished." }),
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const provider = new NebiusNativeWorkerProvider({ credentialStore, fetch: fetchMock });
    await expect(provider.runTurn(finalTurn)).resolves.toMatchObject({
      outcome: { kind: "final_response" },
    });
    const init = fetchMock.mock.calls[0]?.[1];
    if (typeof init?.body !== "string") throw new TypeError("provider body was not text");
    expect(init.body).toContain("request_denied");
    expect(init.body).toContain("continue");
    expect(init.body).not.toContain("filesystem_not_allowed");
    expect(init.body).not.toContain("reference-worker-violations");
  });

  it("fails closed on provider timeout and oversized provider frames", async () => {
    const credentialStore = new InMemoryCredentialStore();
    await credentialStore.write(
      nativeWorkerBoundary.credential,
      new TextEncoder().encode("worker-provider-timeout-fixture"),
    );
    const timeoutProvider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: vi.fn<typeof fetch>(() => Promise.reject(new DOMException("timeout", "TimeoutError"))),
    });
    await expect(timeoutProvider.runTurn(turn())).rejects.toBeInstanceOf(NativeWorkerProviderError);

    const oversizedProvider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response("{}", {
            status: 200,
            headers: {
              "content-type": "application/json",
              "content-length": String(129 * 1_024),
            },
          }),
        ),
      ),
    });
    await expect(oversizedProvider.runTurn(turn())).rejects.toBeInstanceOf(
      NativeWorkerProviderError,
    );
  });

  it("fails closed on malformed, extra-field, credential-like, or model-mismatched output", () => {
    const base = {
      id: "nebius_worker_1",
      model: nativeWorkerBoundary.model,
      choices: [
        {
          finish_reason: "stop",
          message: { content: JSON.stringify({ kind: "final_response", response: "Done." }) },
        },
      ],
    };
    expect(projectNebiusWorkerResponse(base, nativeWorkerBoundary.model)).toMatchObject({
      outcome: { kind: "final_response" },
    });
    for (const response of [
      { ...base, model: "Qwen/mismatched" },
      {
        ...base,
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                kind: "final_response",
                response: "Done.",
                sessionId: "22222222-2222-4222-8222-222222222222",
              }),
            },
          },
        ],
      },
      {
        ...base,
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                kind: "final_response",
                response: "token=credential-like-provider-output",
              }),
            },
          },
        ],
      },
      { ...base, choices: [{ finish_reason: "tool_calls", message: { content: "{}" } }] },
    ]) {
      expect(() => projectNebiusWorkerResponse(response, nativeWorkerBoundary.model)).toThrow(
        NativeWorkerProviderError,
      );
    }
  });
});
