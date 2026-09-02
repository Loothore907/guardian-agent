import { LocalAuthorityIpcClient } from "@guardian/authority-client";
import {
  AuthorityClientProcessConfigSchema,
  ResearchServiceProcessConfigSchema,
} from "@guardian/contracts";

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
  const serializedAuthority = process.env.GUARDIAN_AUTHORITY_CLIENT_CONFIG;
  let authority: LocalAuthorityIpcClient | undefined;
  if (serializedAuthority !== undefined) {
    let authorityValue: unknown;
    try {
      authorityValue = JSON.parse(serializedAuthority) as unknown;
    } catch {
      throw new TypeError("research authority configuration is invalid");
    }
    const authorityConfig = AuthorityClientProcessConfigSchema.parse(authorityValue);
    if (
      authorityConfig.binding.callerRole !== "research_service" ||
      authorityConfig.binding.sessionId !== config.sessionId ||
      authorityConfig.binding.callerId !== config.callerId
    ) {
      throw new TypeError("research authority capability binding is invalid");
    }
    authority = new LocalAuthorityIpcClient(authorityConfig);
  }
  const server = await startCredentialHoldingResearchIpcServer({
    config,
    environment: process.env,
    ...(authority === undefined ? {} : { authority }),
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
