import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { makePacket, validatePacket, objective, sha256 } from "./t1-execution-packet.mjs";
import {
  fixtureDefinitions,
  executionCase,
  scopeForCase,
  fixtureForCase,
} from "./t1-execution-packet.mjs";
import { replayExposure } from "./research-exposure-replay.mjs";
import { startReferenceAuthoritySupervisor } from "../apps/reference-supervisor/dist/index.js";
import { judgeRuntimeScope } from "../apps/reference-supervisor/dist/judge-runtime-scope.js";
import { projectNebiusWorkerResponse } from "../apps/worker-service/dist/nebius.js";

// No confirmation/launch. The placeholder SHA is solely a synthetic URL-contract
// test when publication has not happened; it never enters an approved packet.
globalThis.fetch = () => {
  throw new Error("network is prohibited in offline preflight");
};
const root = resolve(process.argv[2]);
const original = validatePacket(JSON.parse(await readFile(resolve(root, "packet.json"), "utf8")));
const packet =
  original.fixtureCommit === null
    ? makePacket({ ...original, fixtureCommit: "0".repeat(40) })
    : original;
const workspace = resolve("tmp/issue19-live-denial-recovery-20260909/workspace-source");
const results = [];
const cases = [];
if ([5, 6].includes(packet.schemaVersion)) {
  const readiness = packet.schemaVersion === 6 ? 7 : 3;
  for (let ordinal = 1; ordinal <= readiness; ordinal++)
    cases.push({ ...executionCase(packet, ordinal, cases), continuePhase: true });
} else {
  for (const [index, f] of packet.fixtures.entries())
    for (const kind of ["control", "injection"])
      cases.push({
        family: f.id,
        sourceUrl: f[`${kind}Url`],
        fixture: f[`${kind}File`],
        fixtureSha256: f[`${kind}Sha256`],
        injection: kind === "injection",
        definition: fixtureDefinitions(packet)[index].fixture,
      });
}
for (const testCase of cases) {
  const kind = testCase.injection ? "injection" : "control";
  const sourceUrl = testCase.sourceUrl,
    content = await readFile(resolve(root, testCase.fixture), "utf8");
  assert.equal(sha256(content), testCase.fixtureSha256);
  const scope = scopeForCase(packet, testCase);
  const objective = scope.objective;
  const stages = await replayExposure(
    content,
    sourceUrl,
    testCase.definition ?? fixtureForCase(packet, testCase),
    scope,
  );
  assert(stages.worker?.facts && stages.worker.sha256 === stages.sanitized.sha256);
  assert.equal(stages.worker.instruction, kind === "injection");
  const expected = judgeRuntimeScope(scope);
  const envelope = (outcome) => ({
    id: "offline",
    model: packet.workerModel,
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(outcome) } }],
  });
  for (const url of [sourceUrl, packet.outsideUrl])
    projectNebiusWorkerResponse(
      envelope({
        kind: "tool_request",
        request: { name: "guardian.research", arguments: { sourceUrl: url } },
      }),
      packet.workerModel,
    );
  projectNebiusWorkerResponse(
    envelope({
      kind: "final_response",
      response: `October 1. Upgrade to version 2.4. Source: ${new URL(sourceUrl).hostname}${new URL(sourceUrl).pathname}`,
    }),
    packet.workerModel,
  );
  const directory = resolve(root, `draft-${randomUUID()}`);
  await mkdir(directory);
  let supervisor;
  try {
    const now = new Date().toISOString();
    supervisor = await startReferenceAuthoritySupervisor(
      {
        sessionId: randomUUID(),
        callerId: randomUUID(),
        authorityStorePath: resolve(directory, "authority.sqlite"),
        projectRoot: workspace,
        workspaceRoots: [resolve(directory, "workspaces")],
        issuedAt: now,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
      { workerMode: "nebius_native", riskProcess: "fake", judgeScope: scope },
    );
    const preview = supervisor.bootstrap.createDraft({ schemaVersion: 1, objective });
    assert.deepEqual(preview.permissions, expected.permissions);
    assert.deepEqual(preview.workerTools, ["guardian.research"]);
  } finally {
    await supervisor?.close();
  }
  results.push({
    family: testCase.family,
    kind,
    fixtureSha256: testCase.fixtureSha256,
    projection: "passed",
    productionDraft: "passed",
  });
}
console.log(
  JSON.stringify(
    {
      sourceHead: original.sourceHead,
      publicationIdentityResolved: original.fixtureCommit !== null,
      syntheticUrlIdentity: original.fixtureCommit === null,
      credentialReads: 0,
      providerCalls: 0,
      confirmations: 0,
      results,
    },
    null,
    2,
  ),
);
