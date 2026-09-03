import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { CredentialStoreResearchServiceProcessConfigSchema } from "@guardian/contracts";
import { LocalResearchIpcClient, createResearchIpcCredentials } from "@guardian/research";
import { describe, expect, it } from "vitest";

const sessionId = "11111111-1111-4111-8111-111111111111";
const callerId = "22222222-2222-4222-8222-222222222222";
const missionId = "33333333-3333-4333-8333-333333333333";
const profileId = "44444444-4444-4444-8444-444444444444";

function processConfig() {
  const now = Date.now();
  const startsAt = new Date(now - 5_000).toISOString();
  const expiresAt = new Date(now + 60_000).toISOString();
  return CredentialStoreResearchServiceProcessConfigSchema.parse({
    schemaVersion: 1,
    serviceKind: "tavily_research",
    research: {
      schemaVersion: 1,
      ...createResearchIpcCredentials(),
      sessionId,
      callerId,
      missionId,
      missionVersion: 1,
      profileId,
      profileVersion: 1,
      policyVersion: 1,
      startsAt,
      expiresAt,
      scope: {
        allowedDomains: ["docs.github.com"],
        maxResultsPerRequest: 3,
        remainingRequests: 2,
        remainingResults: 4,
        requiredTerms: ["pull request"],
      },
    },
    authority: {
      schemaVersion: 1,
      endpoint: createAuthorityIpcEndpoint(),
      binding: {
        schemaVersion: 1,
        capability: randomUUID(),
        callerRole: "research_service",
        callerId,
        sessionId,
        allowedOperations: ["research.reserve", "research.settle", "context.append_exposures"],
        issuedAt: new Date(now - 10_000).toISOString(),
        expiresAt: new Date(now + 65_000).toISOString(),
      },
    },
  });
}

function waitForReady(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new TypeError("research child startup timed out")),
      5_000,
    );
    timeout.unref();
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout === "guardian research service ready\n") {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(
        new TypeError(stderr.length === 0 ? "research child exited" : "research child failed"),
      );
    });
  });
}

async function closeChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  await exited;
}

describe("credential-store research service process", () => {
  it("starts from strict stdin without a Tavily environment credential", async () => {
    const config = processConfig();
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("../dist/main.js", import.meta.url))],
      { cwd: process.cwd(), env: {}, stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );
    child.stdin.end(`${JSON.stringify(config)}\n`);
    try {
      await waitForReady(child);
      const client = new LocalResearchIpcClient(config.research);
      await expect(
        client.search(
          {
            query: "GitHub pull request documentation",
            maxResults: 1,
            allowedDomains: ["docs.github.com"],
          },
          new Date().toISOString(),
        ),
      ).rejects.toMatchObject({ reason: "service_unavailable" });
    } finally {
      await closeChild(child);
    }
  });

  it("rejects role, operation, binding, and lifetime substitutions", () => {
    const config = processConfig();
    for (const mutation of [
      {
        ...config,
        authority: {
          ...config.authority,
          binding: { ...config.authority.binding, callerRole: "broker_service" },
        },
      },
      {
        ...config,
        authority: {
          ...config.authority,
          binding: {
            ...config.authority.binding,
            allowedOperations: [...config.authority.binding.allowedOperations, "session.get"],
          },
        },
      },
      {
        ...config,
        research: {
          ...config.research,
          callerId: "99999999-9999-4999-8999-999999999999",
        },
      },
      {
        ...config,
        research: {
          ...config.research,
          expiresAt: new Date(Date.parse(config.authority.binding.expiresAt) + 1_000).toISOString(),
        },
      },
    ]) {
      expect(() => CredentialStoreResearchServiceProcessConfigSchema.parse(mutation)).toThrow();
    }
  });

  it("rejects environment and arbitrary provider transport fields", () => {
    expect(() =>
      CredentialStoreResearchServiceProcessConfigSchema.parse({
        ...processConfig(),
        environment: { TAVILY_API_KEY: "not-allowed" },
      }),
    ).toThrow();
  });
});
