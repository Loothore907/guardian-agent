import { InMemoryCredentialStore } from "@guardian/credential-store";
import { DEFAULT_GUARDIAN_MODEL_POLICY } from "@guardian/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  QwenInteractionProvider,
  QwenInteractionProviderError,
  qwenInteractionBoundary,
} from "./nebius.js";

const CONTEXT = {
  objective: "Review the approved pull request.",
  constraints: ["Do not expand authority."],
  allowedTools: ["guardian.session_status"],
} as const;
const CREDENTIAL = "nebius-secret-fixture-value";

async function enrolledStore(): Promise<InMemoryCredentialStore> {
  const store = new InMemoryCredentialStore();
  const bytes = Uint8Array.from(Buffer.from(CREDENTIAL, "utf8"));
  try {
    await store.write(qwenInteractionBoundary.credential, bytes);
  } finally {
    bytes.fill(0);
  }
  return store;
}

function response(value: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("Qwen interaction provider", () => {
  it("uses the pinned model and projects only the typed mission context", async () => {
    const store = await enrolledStore();
    const fetchImplementation = vi.fn<typeof fetch>((url, init) => {
      expect(url).toBe("https://api.tokenfactory.nebius.com/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${CREDENTIAL}`);
      const bodyText = init?.body;
      if (typeof bodyText !== "string") throw new TypeError("expected string request body");
      expect(bodyText).not.toContain(CREDENTIAL);
      const body = JSON.parse(bodyText) as {
        readonly model: string;
        readonly messages: readonly { readonly role: string; readonly content: string }[];
        readonly response_format: { readonly type: string };
      };
      expect(body.model).toBe("Qwen/Qwen3-235B-A22B-Instruct-2507");
      expect(body.response_format.type).toBe("json_schema");
      expect(JSON.parse(body.messages[1]?.content ?? "null")).toEqual(CONTEXT);
      return Promise.resolve(
        response({
          id: "qwen_request_1",
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({ kind: "mission_brief", summary: "Mission reviewed." }),
              },
            },
          ],
        }),
      );
    });
    const provider = new QwenInteractionProvider({
      credentialStore: store,
      fetch: fetchImplementation,
    });

    await expect(provider.runFirstTurn(CONTEXT)).resolves.toEqual({
      requestId: "qwen_request_1",
      outcome: { kind: "mission_brief", summary: "Mission reviewed." },
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("fails closed without invoking the provider when the scoped credential is missing", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const provider = new QwenInteractionProvider({
      credentialStore: new InMemoryCredentialStore(),
      fetch: fetchImplementation,
    });

    await expect(provider.runFirstTurn(CONTEXT)).rejects.toBeInstanceOf(
      QwenInteractionProviderError,
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("reviews only the strict draft envelope under the selected model policy", async () => {
    const store = await enrolledStore();
    const envelope = {
      schemaVersion: 1,
      draftId: "11111111-1111-4111-8111-111111111111",
      revision: 1,
      reviewTurn: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: DEFAULT_GUARDIAN_MODEL_POLICY.version,
      expiresAt: "2026-09-01T00:05:00.000Z",
      objective: "Research public state cannabis laws.",
      constraints: ["Use public sources only."],
      requestedPermissions: {
        tools: ["guardian.research"],
        filesystem: { mode: "none", roots: [] },
        network: { mode: "none", destinations: [] },
        sideEffects: [],
        time: { maxDurationSeconds: 600 },
        volume: {
          maxToolCalls: 10,
          maxResearchRequests: 5,
          maxResearchResults: 15,
          maxLocalCommands: 0,
          maxPrivilegedActions: 0,
        },
      },
      mechanicallyMissingFields: [],
    } as const;
    const fetchImplementation = vi.fn<typeof fetch>((_url, init) => {
      const bodyText = init?.body;
      if (typeof bodyText !== "string") throw new TypeError("expected string request body");
      expect(bodyText).not.toContain(CREDENTIAL);
      const body = JSON.parse(bodyText) as {
        readonly model: string;
        readonly messages: readonly { readonly content: string }[];
        readonly response_format: {
          readonly json_schema: { readonly name: string; readonly strict: boolean };
        };
      };
      expect(body.model).toBe(qwenInteractionBoundary.model);
      expect(JSON.parse(body.messages[1]?.content ?? "null")).toEqual(envelope);
      expect(body.response_format.json_schema).toMatchObject({
        name: "guardian_mission_draft_review",
        strict: true,
      });
      return Promise.resolve(
        response({
          id: "qwen_review_1",
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  schemaVersion: 1,
                  status: "ready",
                  reasonCodes: ["no_issue"],
                }),
              },
            },
          ],
        }),
      );
    });
    const provider = new QwenInteractionProvider({
      credentialStore: store,
      fetch: fetchImplementation,
    });

    await expect(provider.reviewDraft(envelope)).resolves.toEqual({
      requestId: "qwen_review_1",
      outcome: { schemaVersion: 1, status: "ready", reasonCodes: ["no_issue"] },
    });
  });

  it("rejects a draft envelope bound to a different model policy", async () => {
    const provider = new QwenInteractionProvider({ credentialStore: await enrolledStore() });
    await expect(
      provider.reviewDraft({
        schemaVersion: 1,
        draftId: "11111111-1111-4111-8111-111111111111",
        revision: 1,
        reviewTurn: 1,
        modelPolicyId: "different-policy",
        modelPolicyVersion: 1,
        expiresAt: "2026-09-01T00:05:00.000Z",
        objective: "Research public law.",
        constraints: [],
        requestedPermissions: {
          tools: [],
          filesystem: { mode: "none", roots: [] },
          network: { mode: "none", destinations: [] },
          sideEffects: [],
          time: { maxDurationSeconds: 60 },
          volume: {
            maxToolCalls: 1,
            maxResearchRequests: 0,
            maxResearchResults: 0,
            maxLocalCommands: 0,
            maxPrivilegedActions: 0,
          },
        },
        mechanicallyMissingFields: [],
      }),
    ).rejects.toBeInstanceOf(QwenInteractionProviderError);
  });

  it("rejects malformed, polluted, and oversized provider results", async () => {
    const store = await enrolledStore();
    const values = [
      response({
        id: "qwen_request_1",
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                kind: "mission_brief",
                summary: "Done.",
                credential: CREDENTIAL,
              }),
            },
          },
        ],
      }),
      response(
        {
          id: "qwen_request_2",
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify({ kind: "mission_brief", summary: "Done." }) },
            },
          ],
        },
        { "content-length": String(128 * 1_024 + 1) },
      ),
    ];
    const provider = new QwenInteractionProvider({
      credentialStore: store,
      fetch: vi.fn<typeof fetch>(() => Promise.resolve(values.shift()!)),
    });

    await expect(provider.runFirstTurn(CONTEXT)).rejects.toBeInstanceOf(
      QwenInteractionProviderError,
    );
    await expect(provider.runFirstTurn(CONTEXT)).rejects.toBeInstanceOf(
      QwenInteractionProviderError,
    );
  });
});
