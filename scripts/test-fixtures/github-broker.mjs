import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { startBrokerServiceIpcServer } from "../../apps/broker-service/dist/index.js";
import { InMemoryCredentialStore } from "../../packages/credential-store/dist/index.js";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const countsPath = join(dirname(process.env.FIXTURE_AUTHORITY_PATH), "fixture-counts.json");
const counts = { read: 0, merge: 0 };
writeFileSync(countsPath, JSON.stringify(counts));
const secret = "ghu_synthetic_w28_fixture_0123456789";
const store = new InMemoryCredentialStore();
await store.write({ schemaVersion: 1, provider: "github", slot: "default" }, Buffer.from(secret));
await store.write(
  { schemaVersion: 1, provider: "github", slot: "metadata" },
  Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      accessExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + 7200_000).toISOString(),
    }),
  ),
);
let calls = 0;
const server = await startBrokerServiceIpcServer({
  config,
  credentialStore: store,
  ...(process.env.FIXTURE_FIXED_CLOCK === "1" ? { now: () => config.broker.startsAt } : {}),
  fetch: async (url, init) => {
    calls++;
    assert.ok(calls <= 2);
    assert.equal(init.headers.authorization, `Bearer ${secret}`);
    const endpoint = "https://api.github.com/repos/loothore907/guardian-agent-demo/pulls/3";
    if (init.method === "GET") {
      counts.read++;
      writeFileSync(countsPath, JSON.stringify(counts));
      assert.equal(String(url), endpoint);
      return Response.json({
        head: {
          sha: (process.env.FIXTURE_HEAD_CHANGED === "1" ? "b" : "a").repeat(40),
          private: secret,
        },
        base: { ref: "main" },
        state: "open",
        draft: false,
        title: "test: exercise exact Guardian approval path",
        body: secret,
      });
    }
    assert.equal(init.method, "PUT");
    counts.merge++;
    writeFileSync(countsPath, JSON.stringify(counts));
    assert.equal(String(url), `${endpoint}/merge`);
    assert.deepEqual(JSON.parse(init.body), { sha: "a".repeat(40), merge_method: "squash" });
    return Response.json({ merged: true, sha: "c".repeat(40), message: secret });
  },
});
process.stdout.write("guardian broker service ready\n");
process.once("SIGTERM", () => {
  void server.close().then(() => process.exit(0));
});
