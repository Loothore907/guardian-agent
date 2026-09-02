import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createMissionSetupRiskIpcCredentials,
  LocalMissionSetupRiskIpcClient,
} from "@guardian/guardian";
import {
  createInteractionIpcCredentials,
  createMissionDraftReviewIpcCredentials,
  LocalInteractionIpcClient,
  LocalMissionDraftReviewIpcClient,
} from "@guardian/interaction";
import { afterEach, describe, expect, it } from "vitest";

import { startSupervisedServiceProcess } from "./supervised-process.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("supervised service processes", () => {
  it("sends bootstrap authority only over stdin with a minimal environment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "guardian-supervised-process-"));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, "inspection.json");
    const secret = "guardian-capability-fixture-not-for-argv-or-env";
    const child = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../test-fixtures/supervised-child.mjs", import.meta.url)),
      bootstrap: { outputPath, secret },
      readyLine: "guardian test service ready",
      environment: { GUARDIAN_TEST_MARKER: "fixed" },
    });
    try {
      expect(child.processId).not.toBe(process.pid);
      const inspection = JSON.parse(await readFile(outputPath, "utf8")) as {
        readonly argumentsContainSecret: boolean;
        readonly environmentContainsSecret: boolean;
        readonly environmentNames: readonly string[];
      };
      expect(inspection).toMatchObject({
        argumentsContainSecret: false,
        environmentContainsSecret: false,
      });
      expect(inspection.environmentNames).toContain("GUARDIAN_TEST_MARKER");
      const allowedEnvironmentNames = new Set([
        "GUARDIAN_TEST_MARKER",
        ...(process.platform === "win32"
          ? [
              "HOMEDRIVE",
              "HOMEPATH",
              "LOGONSERVER",
              "PATH",
              "SYSTEMDRIVE",
              "SYSTEMROOT",
              "TEMP",
              "USERDOMAIN",
              "USERNAME",
              "USERPROFILE",
              "WINDIR",
            ]
          : []),
      ]);
      expect(inspection.environmentNames.every((name) => allowedEnvironmentNames.has(name))).toBe(
        true,
      );
    } finally {
      await child.close();
    }
  });

  it("runs one fake interaction turn in a short-lived child process", async () => {
    const now = new Date().toISOString();
    const credentials = createInteractionIpcCredentials();
    const config = {
      schemaVersion: 1,
      sessionId: randomUUID(),
      callerId: randomUUID(),
      missionId: randomUUID(),
      missionVersion: 1,
      profileId: randomUUID(),
      profileVersion: 1,
      policyVersion: 1,
      startsAt: now,
      expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
      context: {
        objective: "Inspect the approved process boundary.",
        constraints: ["Do not perform external operations."],
        allowedTools: ["guardian.session_status"],
      },
      ...credentials,
    } as const;
    const child = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../interaction-service/dist/main.js", import.meta.url)),
      bootstrap: config,
      readyLine: "guardian interaction service ready",
      environment: { GUARDIAN_INTERACTION_PROVIDER: "fake" },
    });
    const client = new LocalInteractionIpcClient(config);
    try {
      await expect(client.runFirstTurn(new Date().toISOString())).resolves.toMatchObject({
        providerRequestId: "fake_interaction_1",
        outcome: { kind: "mission_brief" },
      });
    } finally {
      await child.close();
    }
    await expect(client.runFirstTurn(new Date().toISOString())).rejects.toMatchObject({
      reason: "provider_unavailable",
    });
  });

  it("runs one pre-activation review in a credential-isolated child", async () => {
    const now = new Date().toISOString();
    const credentials = createMissionDraftReviewIpcCredentials();
    const envelope = {
      schemaVersion: 1,
      draftId: randomUUID(),
      revision: 1,
      reviewTurn: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: 1,
      expiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(),
      objective: "Inspect the approved process boundary.",
      constraints: [],
      requestedPermissions: {
        tools: [],
        filesystem: { mode: "none", roots: [] },
        network: { mode: "none", destinations: [] },
        sideEffects: [],
        time: { maxDurationSeconds: 60 },
        volume: {
          maxToolCalls: 1,
          maxResearchRequests: 0,
          maxResearchResults: 0,
          maxLocalCommands: 0,
          maxPrivilegedActions: 0,
        },
      },
      mechanicallyMissingFields: [],
    } as const;
    const child = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../interaction-service/dist/main.js", import.meta.url)),
      bootstrap: {
        schemaVersion: 1,
        serviceKind: "mission_draft_review",
        ...credentials,
        startsAt: now,
        expiresAt: envelope.expiresAt,
        envelope,
      },
      readyLine: "guardian interaction service ready",
      environment: { GUARDIAN_INTERACTION_PROVIDER: "fake" },
    });
    try {
      await expect(
        new LocalMissionDraftReviewIpcClient({
          ...credentials,
          draftId: envelope.draftId,
          revision: 1,
          reviewTurn: 1,
        }).review(now),
      ).resolves.toMatchObject({ outcome: { status: "ready" } });
    } finally {
      await child.close();
    }
  });

  it("runs one setup-risk review in a credential-isolated child", async () => {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.parse(now) + 5 * 60_000).toISOString();
    const credentials = createMissionSetupRiskIpcCredentials();
    const envelope = {
      schemaVersion: 1,
      draftId: randomUUID(),
      revision: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: 1,
      requestDigest: "a".repeat(64),
      expiresAt,
      route: { requested: "qwen_assisted", effective: "qwen_assisted" },
      deterministicFloor: "confirm",
      objective: "Inspect the approved process boundary.",
      constraints: [],
      permissions: {
        tools: [],
        filesystem: { mode: "none", roots: [] },
        network: { mode: "none", destinations: [] },
        sideEffects: [],
        time: { maxDurationSeconds: 60 },
        volume: {
          maxToolCalls: 1,
          maxResearchRequests: 0,
          maxResearchResults: 0,
          maxLocalCommands: 0,
          maxPrivilegedActions: 0,
        },
      },
      riskSignals: ["clean_scope"],
      containsCredentials: false,
    } as const;
    const child = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../../guardian-service/dist/main.js", import.meta.url)),
      bootstrap: {
        schemaVersion: 1,
        serviceKind: "mission_setup_risk",
        ...credentials,
        startsAt: now,
        expiresAt,
        envelope,
      },
      readyLine: "guardian risk service ready",
      environment: { GUARDIAN_RISK_PROVIDER: "fake" },
    });
    try {
      await expect(
        new LocalMissionSetupRiskIpcClient({
          ...credentials,
          draftId: envelope.draftId,
          revision: 1,
          requestDigest: envelope.requestDigest,
        }).evaluate(now),
      ).resolves.toMatchObject({ status: "evaluated", authorizationLevel: "confirm" });
    } finally {
      await child.close();
    }
  });

  it("fails closed on invalid, oversized, and rejected bootstrap input", async () => {
    const missingEntrypoint = join(tmpdir(), "guardian-entrypoint-must-not-run.mjs");
    await expect(
      startSupervisedServiceProcess({
        entrypoint: missingEntrypoint,
        bootstrap: undefined,
        readyLine: "unused",
      }),
    ).rejects.toThrow("bootstrap is invalid");
    await expect(
      startSupervisedServiceProcess({
        entrypoint: missingEntrypoint,
        bootstrap: { value: "x".repeat(64 * 1_024) },
        readyLine: "unused",
      }),
    ).rejects.toThrow("bootstrap is oversized");

    const secret = "guardian-rejected-bootstrap-secret-fixture";
    try {
      await startSupervisedServiceProcess({
        entrypoint: fileURLToPath(
          new URL("../../interaction-service/dist/main.js", import.meta.url),
        ),
        bootstrap: { secret },
        readyLine: "guardian interaction service ready",
        environment: { GUARDIAN_INTERACTION_PROVIDER: "fake" },
      });
      throw new TypeError("expected rejected bootstrap");
    } catch (error) {
      expect(String(error)).toBe("TypeError: supervised service failed to start");
      expect(String(error)).not.toContain(secret);
    }
  });
});
