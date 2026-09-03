import assert from "node:assert/strict";

import { DEFAULT_NEBIUS_WORKER_SELECTION } from "../packages/contracts/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";

const ENDPOINT = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const MAXIMUM_RESPONSE_BYTES = 128 * 1_024;

async function boundedJson(response) {
  assert.equal(response.body === null, false, "provider response body is missing");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let bytes;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      assert.ok(total <= MAXIMUM_RESPONSE_BYTES, "provider response is oversized");
      chunks.push(value);
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally {
    for (const chunk of chunks) chunk.fill(0);
    bytes?.fill(0);
  }
}

function projectAcceptedResponse(value, expectedModel, expectsJson) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "response_envelope_invalid";
  }
  if (
    value.model !== expectedModel ||
    !Array.isArray(value.choices) ||
    value.choices.length !== 1
  ) {
    return "response_envelope_invalid";
  }
  const choice = value.choices[0];
  const content = choice?.message?.content;
  if (choice?.finish_reason !== "stop" || typeof content !== "string") {
    return "response_envelope_invalid";
  }
  if (!expectsJson) return "accepted_text";
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? "accepted_json_object"
      : "generated_json_invalid";
  } catch {
    return "generated_json_invalid";
  }
}

const variants = [
  {
    name: "text",
    expectsJson: false,
    instruction: "Return only the word ready.",
    responseFormat: { type: "text" },
  },
  {
    name: "json_object",
    expectsJson: true,
    instruction:
      'Return exactly one JSON object with kind set to "final_response" and response set to "ready".',
    responseFormat: { type: "json_object" },
  },
  {
    name: "simple_json_schema",
    expectsJson: true,
    instruction: "Return the requested strict final-response object.",
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "guardian_worker_probe",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "response"],
          properties: {
            kind: { const: "final_response" },
            response: { type: "string", minLength: 1, maxLength: 100 },
          },
        },
      },
    },
  },
];

assert.equal(process.platform, "win32", "capability probe requires Windows Credential Manager");
const store = new WindowsCredentialStore();
const results = await store.use(
  { schemaVersion: 1, provider: "nebius", slot: "default" },
  async (credential) => {
    const apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
    const observed = [];
    for (const variant of variants) {
      let response;
      try {
        response = await fetch(ENDPOINT, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
          headers: {
            accept: "application/json",
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: DEFAULT_NEBIUS_WORKER_SELECTION.modelId,
            temperature: 0,
            max_tokens: 128,
            messages: [
              {
                role: "system",
                content:
                  "You are a bounded compatibility probe. Follow the output instruction exactly.",
              },
              { role: "user", content: variant.instruction },
            ],
            response_format: variant.responseFormat,
          }),
        });
      } catch {
        observed.push({ variant: variant.name, outcome: "transport_failure" });
        continue;
      }
      if (!response.ok) {
        observed.push({ variant: variant.name, outcome: "http_error", status: response.status });
        await response.body?.cancel();
        continue;
      }
      let providerJson;
      try {
        providerJson = await boundedJson(response);
      } catch {
        observed.push({ variant: variant.name, outcome: "response_envelope_invalid" });
        continue;
      }
      observed.push({
        variant: variant.name,
        outcome: projectAcceptedResponse(
          providerJson,
          DEFAULT_NEBIUS_WORKER_SELECTION.modelId,
          variant.expectsJson,
        ),
      });
    }
    return observed;
  },
);

console.log(
  JSON.stringify({
    provider: "nebius",
    role: "native_worker_capability_probe",
    modelPolicyVersion: DEFAULT_NEBIUS_WORKER_SELECTION.modelPolicyVersion,
    results,
  }),
);
