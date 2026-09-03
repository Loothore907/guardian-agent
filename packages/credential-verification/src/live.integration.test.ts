import { describe, expect, it } from "vitest";

import type { CredentialProvider } from "@guardian/contracts";

import { FixedOriginCredentialVerifier } from "./index.js";

const PROVIDERS = [
  { provider: "nebius", environmentName: "NEBIUS_API_KEY" },
  { provider: "tavily", environmentName: "TAVILY_API_KEY" },
  { provider: "github", environmentName: "GUARDIAN_DEV_GITHUB_TOKEN" },
] as const satisfies readonly {
  readonly provider: CredentialProvider;
  readonly environmentName: string;
}[];

describe("protected live credential verification", () => {
  for (const { provider, environmentName } of PROVIDERS) {
    const secret = process.env[environmentName];
    const enabled = process.env.GUARDIAN_TEST_LIVE_CREDENTIALS === "1" && secret !== undefined;
    it.runIf(enabled)(`verifies the configured ${provider} credential`, async () => {
      if (secret === undefined) throw new TypeError("protected credential is unavailable");
      const verifier = new FixedOriginCredentialVerifier({ provider });
      const result = await verifier.verify(
        { schemaVersion: 1, provider, slot: "live-development" },
        Buffer.from(secret),
      );
      expect(result).toMatchObject({ schemaVersion: 1, provider });
      expect(JSON.stringify(result)).not.toContain(secret);
    });
  }
});
