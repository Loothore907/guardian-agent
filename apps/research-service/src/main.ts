import { ResearchServiceProcessConfigSchema } from "@guardian/contracts";

import { startCredentialHoldingResearchIpcServer } from "./index.js";

async function main(): Promise<void> {
  const serializedConfig = process.env.GUARDIAN_RESEARCH_SERVICE_CONFIG;
  if (serializedConfig === undefined) {
    throw new TypeError("research service configuration is unavailable");
  }
  let configValue: unknown;
  try {
    configValue = JSON.parse(serializedConfig) as unknown;
  } catch {
    throw new TypeError("research service configuration is invalid");
  }
  const config = ResearchServiceProcessConfigSchema.parse(configValue);
  const server = await startCredentialHoldingResearchIpcServer({
    config,
    environment: process.env,
  });
  process.stdout.write("guardian research service ready\n");

  const close = () => {
    void server.close().finally(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch(() => {
  process.stderr.write("guardian research service failed to start\n");
  process.exitCode = 1;
});
