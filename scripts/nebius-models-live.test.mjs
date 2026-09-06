import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertLinuxKeyringReady } from "./linux-keyring-preflight.mjs";

import {
  createMissionSetupRiskIpcCredentials,
  LocalMissionSetupRiskIpcClient,
} from "../packages/guardian/dist/index.js";
import {
  createInteractionIpcCredentials,
  LocalInteractionIpcClient,
} from "../packages/interaction/dist/index.js";
import { credentialServiceEnvironment } from "../apps/reference-supervisor/dist/credential-service-environment.js";
import { startSupervisedServiceProcess } from "../apps/reference-supervisor/dist/supervised-process.js";

const protectedTest =
  (process.platform === "win32" || process.platform === "linux") &&
  process.env.GUARDIAN_TEST_NEBIUS_MODELS === "1"
    ? test
    : test.skip;

const credentialStore = {
  schemaVersion: 1,
  custodyProfile: "byok",
  location: {
    schemaVersion: 1,
    custodyProfile: "byok",
    pool: "personal",
    runtime: process.platform === "win32" ? "windows" : "linux",
    storeTarget:
      process.platform === "win32" ? "windows_credential_manager" : "linux_secret_service",
  },
};

protectedTest(
  "supervised Qwen and Nemotron services use the credential-isolated live path",
  async () => {
    assertLinuxKeyringReady();
    const now = new Date().toISOString();
    const interactionCredentials = createInteractionIpcCredentials();
    const interactionConfig = {
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
      credentialStore,
      context: {
        objective: "Review a pull request and report findings without modifying the repository.",
        constraints: ["The host agent performs the task; Guardian only mediates authority."],
        allowedTools: ["guardian.session_status"],
      },
      ...interactionCredentials,
    };
    const interactionProcess = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(
        new URL("../apps/interaction-service/dist/main.js", import.meta.url),
      ),
      bootstrap: interactionConfig,
      readyLine: "guardian interaction service ready",
      environment: credentialServiceEnvironment({ GUARDIAN_INTERACTION_PROVIDER: "qwen" }),
    });
    try {
      const interactionResult = await new LocalInteractionIpcClient(interactionConfig).runFirstTurn(
        new Date().toISOString(),
      );
      assert.equal(interactionResult.outcome.kind, "mission_brief");
    } finally {
      await interactionProcess.close();
    }

    const guardianStartsAt = new Date().toISOString();
    const guardianExpiresAt = new Date(Date.parse(guardianStartsAt) + 5 * 60_000).toISOString();
    const guardianCredentials = createMissionSetupRiskIpcCredentials();
    const envelope = {
      schemaVersion: 1,
      draftId: randomUUID(),
      revision: 1,
      modelPolicyId: "competition-2026-09-01",
      modelPolicyVersion: 2,
      requestDigest: "a".repeat(64),
      expiresAt: guardianExpiresAt,
      route: { requested: "qwen_assisted", effective: "qwen_assisted" },
      deterministicFloor: "confirm",
      objective: "Inspect the approved provider credential boundary.",
      constraints: ["Do not perform external operations."],
      permissions: {
        tools: ["guardian.session_status"],
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
    };
    const guardianConfig = {
      schemaVersion: 1,
      serviceKind: "mission_setup_risk",
      ...guardianCredentials,
      startsAt: guardianStartsAt,
      expiresAt: guardianExpiresAt,
      credentialStore,
      envelope,
    };
    const guardianProcess = await startSupervisedServiceProcess({
      entrypoint: fileURLToPath(new URL("../apps/guardian-service/dist/main.js", import.meta.url)),
      bootstrap: guardianConfig,
      readyLine: "guardian risk service ready",
      environment: credentialServiceEnvironment({ GUARDIAN_RISK_PROVIDER: "nemotron" }),
    });
    try {
      const guardianResult = await new LocalMissionSetupRiskIpcClient({
        ...guardianCredentials,
        draftId: envelope.draftId,
        revision: envelope.revision,
        requestDigest: envelope.requestDigest,
      }).evaluate(new Date().toISOString());
      assert.equal(guardianResult.status, "evaluated");
      assert.notEqual(guardianResult.authorizationLevel, "allow");
    } finally {
      await guardianProcess.close();
    }
  },
);
