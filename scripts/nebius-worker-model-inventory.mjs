import assert from "node:assert/strict";

import { DEFAULT_NEBIUS_WORKER_SELECTION } from "../packages/contracts/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";

const MODELS_ENDPOINT = "https://api.tokenfactory.nebius.com/v1/models";
const MAXIMUM_RESPONSE_BYTES = 2 * 1_024 * 1_024;

const credentialStore = new WindowsCredentialStore();
const result = await credentialStore.use(
  { schemaVersion: 1, provider: "nebius", slot: "default" },
  async (credential) => {
    const apiKey = new TextDecoder("utf-8", { fatal: true }).decode(credential);
    const response = await fetch(MODELS_ENDPOINT, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
      headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    });
    assert.equal(response.ok, true, `Nebius model inventory returned HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    try {
      assert.ok(bytes.byteLength <= MAXIMUM_RESPONSE_BYTES, "Nebius model inventory is oversized");
      const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      assert.equal(body?.object, "list");
      assert.ok(Array.isArray(body?.data));
      const modelIds = body.data
        .map((model) => model?.id)
        .filter((modelId) => typeof modelId === "string");
      const pinnedModel = DEFAULT_NEBIUS_WORKER_SELECTION.modelId;
      return {
        pinnedModel,
        pinnedAvailable: modelIds.includes(pinnedModel),
        coderCandidates: modelIds
          .filter((modelId) => /qwen.*coder/iu.test(modelId))
          .sort()
          .slice(0, 20),
        workerCandidates: modelIds
          .filter((modelId) => /(qwen|glm|devstral|deepseek|kimi|codestral|llama)/iu.test(modelId))
          .sort()
          .slice(0, 30),
      };
    } finally {
      bytes.fill(0);
    }
  },
);

console.log(JSON.stringify(result));
