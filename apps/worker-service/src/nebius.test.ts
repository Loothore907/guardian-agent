import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_NEBIUS_WORKER_SELECTION,
  WorkerProviderDiagnosticSchema,
  WorkerProjectionRejectionSchema,
  WorkerTurnIpcResponseSchema,
  type WorkerProjectionRejection,
} from "@guardian/contracts";
import { InMemoryCredentialStore } from "@guardian/credential-store";
import {
  createWorkerToolResult,
  createWorkerTurnEnvelope,
  createWorkerIpcCredentials,
  LocalWorkerIpcClient,
} from "@guardian/worker";
import { startWorkerService } from "./index.js";

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
            usage: { prompt_tokens: 500, completion_tokens: 100, total_tokens: 600 },
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
    const onUsage = vi.fn();
    const provider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: fetchMock,
      onUsage,
      now: () => "2026-11-01T12:00:30.000Z",
    });
    const exactTurn = turn();
    await expect(provider.runTurn(exactTurn)).resolves.toMatchObject({
      requestId: "nebius_worker_1",
      outcome: { kind: "tool_request" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] ?? [];
    expect(endpoint).toBe(nativeWorkerBoundary.endpoint);
    expect(nativeWorkerBoundary.timeoutMs).toBe(45_000);
    expect(init?.redirect).toBe("error");
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${secret}`);
    expect(typeof init?.body).toBe("string");
    if (typeof init?.body !== "string") throw new TypeError("provider body was not text");
    const body = init.body;
    expect(body).not.toContain(secret);
    expect(body).not.toContain(exactTurn.sessionId);
    expect(body).not.toContain(exactTurn.callerId);
    expect(body).not.toContain(exactTurn.turnDigest);
    const request = JSON.parse(body) as {
      readonly model: string;
      readonly messages: readonly { readonly content: string }[];
      readonly response_format: unknown;
    };
    expect(request).toMatchObject({
      model: nativeWorkerBoundary.model,
      response_format: { type: "json_object" },
    });
    expect(request.messages[0]?.content).toContain('"kind":{"const":"final_response"}');
    expect(request.messages[0]?.content).toContain('"name":{"const":"guardian.local_command"}');
    expect(request.messages[0]?.content).toContain('"name":{"const":"guardian.session_status"}');
    expect(request.messages[0]?.content).not.toContain("guardian.research");
    expect(request.messages[0]?.content).not.toContain("github.pull_request");
    expect(onUsage).toHaveBeenCalledWith({
      schemaVersion: 1,
      provider: "nebius_token_factory",
      providerRequestId: "nebius_worker_1",
      role: "native_worker",
      modelId: nativeWorkerBoundary.model,
      promptTokens: 500,
      completionTokens: 100,
      totalTokens: 600,
      observedAt: "2026-11-01T12:00:30.000Z",
    });
  });

  it("fails the turn when durable usage recording fails", async () => {
    const credentialStore = new InMemoryCredentialStore();
    await credentialStore.write(
      nativeWorkerBoundary.credential,
      new TextEncoder().encode("worker-provider-metering-fixture"),
    );
    const provider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "nebius_worker_metering_failure",
              model: nativeWorkerBoundary.model,
              usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    content: JSON.stringify({ kind: "final_response", summary: "Complete." }),
                  },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        ),
      onUsage: async () => await Promise.reject(new Error("budget service unavailable")),
    });

    await expect(provider.runTurn(turn())).rejects.toBeInstanceOf(NativeWorkerProviderError);
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

  it.each([false, true])(
    "guides a cited final response after denial (final-only: %s)",
    async (finalOnly) => {
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
        name: finalOnly ? "guardian.research" : "guardian.session_status",
        denial: {
          code: "request_denied",
          disposition: "continue",
          policyId: "reference-worker-violations-2026-09-02",
          policyVersion: 1,
          cause: "url_not_allowed",
          stage: "research_request_policy",
        },
      });
      const nextDenialInput = { ...denial, sourceTurnNumber: 2 };
      Reflect.deleteProperty(nextDenialInput, "resultDigest");
      const nextDenial = createWorkerToolResult(nextDenialInput);
      const finalTurn = turn(DEFAULT_NEBIUS_WORKER_SELECTION, {
        turnId: "77777777-7777-4777-8777-777777777777",
        turnNumber: 3,
        continuation: { kind: "bounded_v1", maxTurns: 3, deadline: firstTurn.expiresAt },
        startsAt: "2026-09-01T00:00:20.000Z",
        allowedTools: finalOnly ? [] : ["guardian.research"],
        remainingBudget: denial.remainingBudget,
        previousToolResult: nextDenial,
        toolHistory: [denial],
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
                    content: JSON.stringify({
                      kind: "final_response",
                      response:
                        "Version 3.0 releases October 1. Upgrade to version 2.4. Source: source.example/release",
                    }),
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
      const request = JSON.parse(init.body) as {
        readonly messages: readonly { readonly content: string }[];
      };
      const systemGuidance = request.messages[0]?.content ?? "";
      if (finalOnly) {
        expect(systemGuidance).toContain("do not request another tool");
        expect(systemGuidance).not.toContain('"kind":{"const":"tool_request"}');
      } else {
        expect(systemGuidance).toContain("Guardian denied the previous tool request");
        expect(systemGuidance).toContain("Do not retry the denied action");
        expect(systemGuidance).toContain('"name":{"const":"guardian.research"}');
      }
      expect(systemGuidance).toContain(
        "In final_response.response, cite sources only as plain domain/path text",
      );
      expect(systemGuidance).toContain(
        "Do not include HTTP(S) schemes, Markdown links or headers in the final answer",
      );
      expect(systemGuidance).toContain("Do not repeat a denied destination in the final answer");
      expect(systemGuidance).toContain('"kind":{"const":"final_response"}');
      expect(systemGuidance).not.toContain("A tool request is pending only");
      expect(init.body).toContain("request_denied");
      expect(init.body).toContain("continue");
      expect(init.body).toContain("url_not_allowed");
      expect(init.body).toContain("research_request_policy");
      expect(init.body).not.toContain("filesystem_not_allowed");
      expect(init.body).not.toContain("reference-worker-violations");
    },
  );

  it("fails closed on provider timeout and oversized provider frames", async () => {
    const credentialStore = new InMemoryCredentialStore();
    await credentialStore.write(
      nativeWorkerBoundary.credential,
      new TextEncoder().encode("worker-provider-timeout-fixture"),
    );
    const diagnostics: unknown[] = [];
    const timeoutProvider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: vi.fn<typeof fetch>(() => Promise.reject(new DOMException("timeout", "TimeoutError"))),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    await expect(timeoutProvider.runTurn(turn())).rejects.toMatchObject({
      name: "NativeWorkerProviderError",
      reason: "provider_unavailable",
      providerDiagnostic: { kind: "transport_failure" },
    });
    expect(diagnostics).toEqual([{ kind: "transport_failure" }]);

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
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    await expect(oversizedProvider.runTurn(turn())).rejects.toBeInstanceOf(
      NativeWorkerProviderError,
    );
    expect(diagnostics).toEqual([
      { kind: "transport_failure" },
      { kind: "response_envelope_invalid" },
    ]);
  });

  it("reports only allowlisted HTTP failure metadata", async () => {
    const credentialStore = new InMemoryCredentialStore();
    const secret = "worker-provider-http-secret-fixture";
    await credentialStore.write(nativeWorkerBoundary.credential, new TextEncoder().encode(secret));
    const diagnostics: unknown[] = [];
    const provider = new NebiusNativeWorkerProvider({
      credentialStore,
      fetch: vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(`provider detail containing ${secret}`, {
            status: 400,
            headers: { "content-type": "text/plain", "x-secret": secret },
          }),
        ),
      ),
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    await expect(provider.runTurn(turn())).rejects.toMatchObject({
      name: "NativeWorkerProviderError",
      reason: "provider_unavailable",
      providerDiagnostic: { kind: "http_error", status: 400 },
    });
    expect(diagnostics).toEqual([{ kind: "http_error", status: 400 }]);
    expect(JSON.stringify(diagnostics)).not.toContain(secret);
  });

  it("carries only closed projection reasons through provider and real worker IPC", async () => {
    const answer =
      "Version 3.0 releases October 1. Upgrade to version 2.4. Source: fixtures.agentic-guardian.com/v1/release/injection";
    const outcome = { kind: "final_response", response: answer };
    const base = {
      id: "offline_projection",
      model: nativeWorkerBoundary.model,
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify(outcome) } }],
    };
    const choice = (content: unknown, finish_reason = "stop") => ({
      ...base,
      choices: [{ finish_reason, message: { content } }],
    });
    const cases: readonly [WorkerProjectionRejection, unknown][] = [
      ["response_shape_invalid", null],
      ["model_mismatch", { ...base, model: "private-provider-value" }],
      ["choices_invalid", { ...base, choices: [] }],
      ["choice_shape_invalid", { ...base, choices: [null] }],
      ["message_shape_invalid", { ...base, choices: [{ message: null }] }],
      ["completion_length", choice(JSON.stringify(outcome), "length")],
      ["completion_not_stop", choice(JSON.stringify(outcome), "private-provider-value")],
      ["content_not_string", choice(null)],
      ["request_id_invalid", { ...base, id: null }],
      ["content_json_invalid", choice("private-provider-value")],
      [
        "outcome_schema_invalid",
        choice(JSON.stringify({ ...outcome, "private-provider-value": true })),
      ],
      [
        "outcome_schema_invalid",
        choice(JSON.stringify({ kind: "final_response", summary: answer })),
      ],
      [
        "outcome_credential_like",
        choice(JSON.stringify({ ...outcome, response: "token=private-provider-value" })),
      ],
      [
        "outcome_transport_disallowed",
        choice(
          JSON.stringify({ ...outcome, response: "https://private-provider-value.example/path" }),
        ),
      ],
    ];
    expect(new Set(cases.map(([rejection]) => rejection))).toEqual(
      new Set(WorkerProjectionRejectionSchema.options),
    );
    expect(projectNebiusWorkerResponse(base, nativeWorkerBoundary.model).outcome).toEqual(outcome);
    // A typed research URL is still accepted; the final-response URL rule has not widened.
    const research = {
      kind: "tool_request",
      request: {
        name: "guardian.research",
        arguments: { sourceUrl: "https://fixture.example.org/update" },
      },
    };
    expect(
      projectNebiusWorkerResponse(choice(JSON.stringify(research)), nativeWorkerBoundary.model)
        .outcome,
    ).toEqual(research);
    const credentialStore = new InMemoryCredentialStore();
    await credentialStore.write(
      nativeWorkerBoundary.credential,
      new TextEncoder().encode("private-provider-value"),
    );
    for (const [rejection, response] of cases) {
      const diagnostics: unknown[] = [];
      const provider = new NebiusNativeWorkerProvider({
        credentialStore,
        fetch: vi.fn<typeof fetch>(() =>
          Promise.resolve(
            new Response(JSON.stringify(response), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          ),
        ),
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      });
      const exactTurn = turn();
      const credentials = createWorkerIpcCredentials();
      const server = await startWorkerService(
        { schemaVersion: 1, serviceKind: "worker_turn", ...credentials, turn: exactTurn },
        provider,
        {
          now: () => "2026-09-01T00:00:10.000Z",
        },
      );
      try {
        const client = new LocalWorkerIpcClient({
          ...credentials,
          sessionId: exactTurn.sessionId,
          turnId: exactTurn.turnId,
          turnNumber: exactTurn.turnNumber,
          turnDigest: exactTurn.turnDigest,
        });
        const diagnostic = { kind: "worker_output_invalid", rejection };
        await expect(client.run("2026-09-01T00:00:10.000Z")).rejects.toMatchObject({
          reason: "provider_unavailable",
          providerDiagnostic: diagnostic,
        });
        expect(diagnostics).toEqual([diagnostic]);
        expect(JSON.stringify(diagnostics)).not.toContain("private-provider-value");
      } finally {
        await server.close();
      }
    }
  });

  it("rejects unknown, misplaced and content-bearing projection diagnostics", () => {
    expect(
      WorkerProviderDiagnosticSchema.safeParse({ kind: "worker_output_invalid" }).success,
    ).toBe(true);
    const diagnostic = { kind: "worker_output_invalid", rejection: "completion_length" };
    for (const value of [
      { ...diagnostic, rejection: "private-provider-value" },
      { ...diagnostic, detail: "private-provider-value" },
      { ...diagnostic, path: ["private-provider-value"] },
      { ...diagnostic, status: 200 },
      { ...diagnostic, kind: "transport_failure" },
    ])
      expect(WorkerProviderDiagnosticSchema.safeParse(value).success).toBe(false);
    expect(
      WorkerTurnIpcResponseSchema.safeParse({
        schemaVersion: 1,
        ok: false,
        error: "provider_malformed",
        providerDiagnostic: diagnostic,
      }).success,
    ).toBe(false);
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
