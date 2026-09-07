import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import test from "node:test";

const entrypoint = fileURLToPath(
  new URL("../apps/judge-host-service/dist/main.js", import.meta.url),
);

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

function getJson(port, path) {
  return new Promise((resolve, reject) => {
    const outgoing = request({ host: "127.0.0.1", port, path, method: "GET" }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.once("end", () => {
        try {
          resolve({
            statusCode: response.statusCode,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    let output = "";
    let bytes = 0;
    const timer = setTimeout(() => reject(new Error("protected host startup timed out")), 10_000);
    timer.unref();
    const fail = () => {
      clearTimeout(timer);
      reject(new Error("protected host failed before readiness"));
    };
    child.once("error", fail);
    child.once("exit", fail);
    child.stderr.on("data", (chunk) => {
      bytes += chunk.byteLength;
      chunk.fill(0);
      if (bytes > 4_096) fail();
    });
    child.stdout.on("data", (chunk) => {
      bytes += chunk.byteLength;
      output += chunk.toString("utf8");
      chunk.fill(0);
      if (bytes > 4_096) {
        fail();
        return;
      }
      if (output === "guardian protected judge host ready\n") {
        clearTimeout(timer);
        child.removeListener("error", fail);
        child.removeListener("exit", fail);
        resolve();
      }
    });
  });
}

test("production judge-host child stays inert and shuts down cleanly", async () => {
  const port = await unusedPort();
  const child = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: {},
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  const bootstrap = Buffer.from(
    `${JSON.stringify({
      schemaVersion: 1,
      executionMode: "disabled",
      listen: { host: "127.0.0.1", port },
    })}\n`,
    "utf8",
  );
  try {
    const ready = waitForReady(child);
    child.stdin.end(bootstrap);
    await ready;
    assert.deepEqual(await getJson(port, "/health"), {
      statusCode: 200,
      body: { status: "foundation", assurance: "unknown" },
    });
    const catalog = await getJson(port, "/v1/judge/catalog");
    assert.equal(catalog.statusCode, 200);
    assert.equal(catalog.body.pilotedAvailable, false);
  } finally {
    bootstrap.fill(0);
    child.kill("SIGTERM");
  }
  const result = await exited;
  assert.ok(result.code === 0 || result.signal === "SIGTERM");
  await assert.rejects(getJson(port, "/health"));
});
