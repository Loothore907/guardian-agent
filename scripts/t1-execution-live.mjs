// Imported only after the packet, grant, predecessor, runtime and clock gates pass.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startReferenceAuthoritySupervisor } from "../apps/reference-supervisor/dist/index.js";
import { judgeRuntimeScope } from "../apps/reference-supervisor/dist/judge-runtime-scope.js";
import { DEFAULT_GUARDIAN_MODEL_POLICY } from "../packages/contracts/dist/index.js";
import {
  CredentialStoreTavilyProvider,
  createFetchTavilyTransport,
} from "../apps/research-service/dist/index.js";
import { WindowsCredentialStore } from "../packages/credential-store/dist/index.js";
import { fixtureForCase, scopeForCase } from "./t1-execution-packet.mjs";
import { replayExposure } from "./research-exposure-replay.mjs";
import { createObserver, answerReceipt } from "./t1-execution-observer.mjs";
import { sha256, modelDeadlines } from "./t1-execution-packet.mjs";
import { serviceProcesses } from "./t1-execution-evidence.mjs";

export async function runReadiness(testCase, packet) {
  const response = await fetch(testCase.sourceUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200);
  // A bounded origin read; no arbitrary bodies retained in evidence.
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    assert(bytes <= 10000);
    chunks.push(chunk);
  }
  assert.equal(sha256(Buffer.concat(chunks)), testCase.fixtureSha256);
  let attempts = 0;
  const transport = createFetchTavilyTransport();
  const provider = new CredentialStoreTavilyProvider({
    credentialStore: new WindowsCredentialStore(),
    timeoutMs: 30000,
    transport: async (request) => {
      assert.equal(++attempts, 1);
      const body = JSON.parse(request.body);
      assert.equal(body.urls, testCase.sourceUrl);
      assert.equal(body.format, "markdown");
      assert.equal(body.extract_depth, "basic");
      return transport(request);
    },
  });
  const extracted = await provider.extract({ url: testCase.sourceUrl });
  const fixture = fixtureForCase(packet, testCase);
  const exposure = await replayExposure(
    extracted.content,
    testCase.sourceUrl,
    fixture,
    scopeForCase(packet, testCase),
  );
  const e = exposure.worker;
  const ready =
    e !== null &&
    e.facts &&
    e.sha256 === exposure.sanitized.sha256 &&
    (testCase.injection
      ? e.instruction && e.destination && e.override
      : !e.instruction && !e.destination && !e.override);
  return { continuePhase: Boolean(ready), exposure, extractionAttempts: attempts, modelCalls: 0 };
}

export async function runModel(packet, testCase, { root, projectRoot, workspace, expiresAt }) {
  assert.equal(DEFAULT_GUARDIAN_MODEL_POLICY.policyId, packet.modelPolicyId);
  assert.equal(DEFAULT_GUARDIAN_MODEL_POLICY.version, packet.modelPolicyVersion);
  assert.equal(DEFAULT_GUARDIAN_MODEL_POLICY.nativeWorker.modelId, packet.workerModel);
  assert.deepEqual(serviceProcesses(projectRoot), [], "another evaluation service is active");
  const sessionId = randomUUID(),
    callerId = randomUUID();
  const scope = scopeForCase(packet, testCase);
  const objective = packet.objective;
  const normalized = judgeRuntimeScope(scope);
  const observer = createObserver(
    testCase,
    fixtureForCase(packet, testCase),
    sessionId,
    callerId,
    normalized.constraints,
    objective,
  );
  const receipt = {
    sessionId,
    callerId,
    startedAt: new Date().toISOString(),
    observations: observer.observations,
    previewVerified: false,
    closeSucceeded: false,
  };
  let supervisor, timer, answer;
  try {
    const deadlines = modelDeadlines(receipt.startedAt, expiresAt);
    supervisor = await startReferenceAuthoritySupervisor(
      {
        sessionId,
        callerId,
        authorityStorePath: resolve(root, "authority.sqlite"),
        projectRoot: workspace,
        workspaceRoots: [resolve(root, "workspaces")],
        issuedAt: receipt.startedAt,
        expiresAt: deadlines.authorityExpiresAt,
      },
      {
        workerMode: "nebius_native",
        riskProcess: "fake",
        judgeScope: scope,
        observeWorker: observer.observe,
      },
    );
    timer = setTimeout(
      () => {
        receipt.failure = "session_deadline";
        void supervisor.close().catch(() => {
          receipt.failure = "cleanup_failed";
        });
      },
      Math.max(0, Date.parse(deadlines.stopAt) - Date.now()),
    );
    assert(Date.now() < Date.parse(deadlines.stopAt), "setup exhausted model deadline");
    const preview = supervisor.bootstrap.createDraft({ schemaVersion: 1, objective });
    assert.deepEqual(preview.workerTools, ["guardian.research"]);
    assert.deepEqual(preview.permissions, normalized.permissions);
    receipt.previewVerified = true;
    const launched = await supervisor.bootstrap.confirmAndLaunch({
      schemaVersion: 1,
      draftId: preview.draftId,
      previewDigest: preview.previewDigest,
      confirmedBy: { kind: "human", principalId: randomUUID() },
      confirmedAt: new Date().toISOString(),
      assurance: "development_confirmation",
    });
    if (
      launched.workerTurn?.state === "completed" &&
      launched.workerTurn.result.outcome.kind === "final_response"
    )
      answer = launched.workerTurn.result.outcome.response;
  } catch {
    receipt.failure ??= "model_case_failed";
  } finally {
    clearTimeout(timer);
    try {
      if (supervisor !== undefined) {
        await supervisor.close();
        receipt.closeSucceeded = true;
      }
    } catch {
      receipt.failure ??= "cleanup_failed";
    }
  }
  receipt.completedAt = new Date().toISOString();
  receipt.finalResponse = answerReceipt(answer);
  if (answer !== undefined) await writeFile(resolve(root, "answer.txt"), answer, { flag: "wx" });
  return receipt;
}
