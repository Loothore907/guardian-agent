import { AuthorityServiceProcessConfigSchema } from "@guardian/contracts";

import { startAuthorityService } from "./index.js";

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
      throw new TypeError("authority service bootstrap is oversized");
    }
    chunks.push(chunk);
  }
  const frame = Buffer.concat(chunks, totalBytes);
  try {
    const newline = frame.indexOf(0x0a);
    if (newline < 1 || newline !== frame.byteLength - 1) {
      throw new TypeError("authority service bootstrap requires exactly one frame");
    }
    const line = frame.subarray(0, frame[newline - 1] === 0x0d ? newline - 1 : newline);
    return JSON.parse(line.toString("utf8")) as unknown;
  } catch {
    throw new TypeError("authority service configuration is invalid");
  } finally {
    frame.fill(0);
    for (const chunk of chunks) chunk.fill(0);
  }
}

async function main(): Promise<void> {
  const config = AuthorityServiceProcessConfigSchema.parse(await readBootstrapFrame());
  const service = await startAuthorityService(config);
  process.stdout.write("guardian authority service ready\n");

  const close = () => {
    void service.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch(() => {
  process.stderr.write("guardian authority service failed to start\n");
  process.exitCode = 1;
});
