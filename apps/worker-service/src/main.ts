import { WorkerServiceProcessConfigSchema } from "@guardian/contracts";
import { createPlatformCredentialStore } from "@guardian/credential-store";

import {
  NebiusNativeWorkerProvider,
  createFakeWorkerProvider,
  startWorkerService,
} from "./index.js";

const MAXIMUM_BOOTSTRAP_BYTES = 64 * 1_024;

async function readBootstrapFrame(): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunkValue of process.stdin) {
    const chunk = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue as Uint8Array);
    totalBytes += chunk.byteLength;
    if (totalBytes > MAXIMUM_BOOTSTRAP_BYTES) {
      for (const buffered of chunks) buffered.fill(0);
      chunk.fill(0);
      throw new TypeError("worker service bootstrap is oversized");
    }
    chunks.push(chunk);
  }
  const frame = Buffer.concat(chunks, totalBytes);
  try {
    const newline = frame.indexOf(0x0a);
    if (newline < 1 || newline !== frame.byteLength - 1) {
      throw new TypeError("worker service bootstrap requires exactly one frame");
    }
    const line = frame.subarray(0, frame[newline - 1] === 0x0d ? newline - 1 : newline);
    return JSON.parse(line.toString("utf8")) as unknown;
  } catch {
    throw new TypeError("worker service configuration is invalid");
  } finally {
    frame.fill(0);
    for (const chunk of chunks) chunk.fill(0);
  }
}

async function main(): Promise<void> {
  const providerMode = process.env.GUARDIAN_WORKER_PROVIDER;
  if (providerMode !== "fake" && providerMode !== "nebius") {
    throw new TypeError("worker provider selection is invalid");
  }
  const bootstrap = WorkerServiceProcessConfigSchema.parse(await readBootstrapFrame());
  const provider =
    providerMode === "fake"
      ? createFakeWorkerProvider()
      : new NebiusNativeWorkerProvider({ credentialStore: createPlatformCredentialStore() });
  const service = await startWorkerService(bootstrap, provider);
  process.stdout.write("guardian worker service ready\n");

  const close = () => {
    void service.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch(() => {
  process.stderr.write("guardian worker service failed to start\n");
  process.exitCode = 1;
});
