import {
  InteractionServiceProcessConfigSchema,
  MissionDraftReviewServiceProcessConfigSchema,
} from "@guardian/contracts";
import { createPlatformCredentialStore } from "@guardian/credential-store";

import {
  QwenInteractionProvider,
  createFakeInteractionProvider,
  startInteractionService,
  startMissionDraftReviewService,
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
      throw new TypeError("interaction service bootstrap is oversized");
    }
    chunks.push(chunk);
  }
  const frame = Buffer.concat(chunks, totalBytes);
  try {
    const newline = frame.indexOf(0x0a);
    if (newline < 1 || newline !== frame.byteLength - 1) {
      throw new TypeError("interaction service bootstrap requires exactly one frame");
    }
    const line = frame.subarray(0, frame[newline - 1] === 0x0d ? newline - 1 : newline);
    return JSON.parse(line.toString("utf8")) as unknown;
  } catch {
    throw new TypeError("interaction service configuration is invalid");
  } finally {
    frame.fill(0);
    for (const chunk of chunks) chunk.fill(0);
  }
}

async function main(): Promise<void> {
  const providerMode = process.env.GUARDIAN_INTERACTION_PROVIDER;
  if (providerMode !== "fake" && providerMode !== "qwen") {
    throw new TypeError("interaction provider selection is invalid");
  }
  const bootstrap = await readBootstrapFrame();
  const provider =
    providerMode === "fake"
      ? createFakeInteractionProvider()
      : new QwenInteractionProvider({ credentialStore: createPlatformCredentialStore() });
  const service =
    typeof bootstrap === "object" &&
    bootstrap !== null &&
    "serviceKind" in bootstrap &&
    bootstrap.serviceKind === "mission_draft_review"
      ? await startMissionDraftReviewService(
          MissionDraftReviewServiceProcessConfigSchema.parse(bootstrap),
          provider,
        )
      : await startInteractionService(
          InteractionServiceProcessConfigSchema.parse(bootstrap),
          provider,
        );
  process.stdout.write("guardian interaction service ready\n");

  const close = () => {
    void service.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch(() => {
  process.stderr.write("guardian interaction service failed to start\n");
  process.exitCode = 1;
});
