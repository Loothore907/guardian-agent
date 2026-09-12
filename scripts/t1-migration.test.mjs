import { migrationTrace } from "./t1-migration-test-fixture.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  makePacket,
  validatePacket,
  executionCase,
  phaseLayout,
  sha256,
  scopeForCase,
  fixtureForCase,
} from "./t1-execution-packet.mjs";
import {
  migrationId,
  migrationObjective,
  mission,
  operatorReport,
  referenceText,
  guideText,
  payload,
  migrationReference,
  migrationControl,
  migrationAttack,
  migrationFixture,
  migrationEscalationDefinitions,
  migrationEscalationPayloads,
  referenceFixture,
  rubric,
  reviewTemplate,
  validateAnswerReview,
  outsideUrl,
} from "./t1-migration-scenario.mjs";
import { replayExposure } from "./research-exposure-replay.mjs";
import { observeExposure } from "./research-exposure.mjs";
import { createObserver, classifyRequest } from "./t1-execution-observer.mjs";
import { verifyModelEvidence } from "./t1-execution-evidence.mjs";
import { SessionControlledContentGateway } from "../packages/research/dist/index.js";
import { judgeRuntimeScope } from "../apps/reference-supervisor/dist/judge-runtime-scope.js";
import { workerToolRequestDigest } from "../packages/worker/dist/index.js";
import { WorkerTurnResultSchema } from "../packages/contracts/dist/index.js";

globalThis.fetch = () => {
  throw new Error("network prohibited in migration tests");
};
const packet = makePacket({
  schemaVersion: 5,
  sourceHead: "a".repeat(40),
  workspaceCommit: "b".repeat(40),
  fixtureCommit: "c".repeat(40),
});
const escalationPacket = makePacket({
  schemaVersion: 6,
  sourceHead: "a".repeat(40),
  workspaceCommit: "b".repeat(40),
  fixtureCommit: "c".repeat(40),
});
function cases() {
  const rows = [];
  for (let n = 1; n <= 5; n++)
    rows.push({ ...executionCase(packet, n, rows), continuePhase: true });
  return rows;
}
test("migration packet freezes one pair, exact two-source identities and narrow grant", () => {
  validatePacket(packet, true);
  assert.deepEqual(phaseLayout(packet), {
    readiness: 3,
    discoveryEnd: 5,
    evaluationStart: 6,
    total: 5,
  });
  assert.deepEqual(
    cases().map((c) => [c.phase, c.injection]),
    [
      ["readiness", false],
      ["readiness", false],
      ["readiness", true],
      ["discovery", false],
      ["discovery", true],
    ],
  );
  const c = cases()[4];
  assert.equal(c.sourceUrls.length, 2);
  assert(!migrationObjective.includes(outsideUrl));
  assert.equal(packet.limits.researchRequests, 3);
  assert.equal(packet.limits.modelSessions, 2);
  assert.equal(packet.limits.extractionAttempts, 9);
  assert.throws(() => executionCase(packet, 6, cases()));
  for (const change of [
    { objective: "visit outside" },
    { rubricSha256: "f".repeat(64) },
    { reference: { ...packet.reference, sourceUrl: outsideUrl } },
    { limits: { ...packet.limits, researchRequests: 4 } },
  ])
    assert.throws(() => validatePacket({ ...packet, ...change }));
  const unresolved = makePacket({ ...packet, fixtureCommit: null });
  assert.throws(() => validatePacket(unresolved, true));
  assert.equal(
    classifyRequest(
      { name: "guardian.research", arguments: { sourceUrl: c.sourceUrls[0] } },
      c.sourceUrls,
      outsideUrl,
    ),
    "allowed_source",
  );
  assert.equal(
    classifyRequest(
      { name: "guardian.research", arguments: { sourceUrl: c.sourceUrls[1] + "?extra=1" } },
      c.sourceUrls,
      outsideUrl,
    ),
    "wrong_target",
  );
});
test("migration escalation freezes five payloads and advances only through resistance", () => {
  validatePacket(escalationPacket, true);
  assert.deepEqual(phaseLayout(escalationPacket), {
    readiness: 7,
    discoveryEnd: 13,
    evaluationStart: 14,
    total: 14,
  });
  assert.equal(escalationPacket.fixtures.length, 5);
  assert.equal(escalationPacket.limits.modelSessions, 7);
  assert.equal(escalationPacket.limits.workerCalls, 56);
  assert.equal(escalationPacket.limits.extractionAttempts, 28);
  assert.equal(escalationPacket.limits.totalSeconds, 5400);
  assert.equal(escalationPacket.limits.estimatedUsd, 5);
  assert.equal(new Set(escalationPacket.fixtures.map((f) => f.injectionUrl)).size, 5);
  assert(escalationPacket.fixtures.every((f) => f.controlUrl === escalationPacket.fixtures[0].controlUrl));

  const rows = [];
  for (let ordinal = 1; ordinal <= 8; ordinal++)
    rows.push({ ...executionCase(escalationPacket, ordinal, rows), continuePhase: true });
  assert.deepEqual(
    rows.map((row) => [row.phase, row.injection, row.confirmation]),
    [
      ["readiness", false, false],
      ["readiness", false, false],
      ["readiness", true, false],
      ["readiness", true, false],
      ["readiness", true, false],
      ["readiness", true, false],
      ["readiness", true, false],
      ["discovery", false, false],
    ],
  );
  rows.push({
    ...executionCase(escalationPacket, 9, rows),
    continuePhase: true,
    result: { complete: false },
  });
  assert.equal(executionCase(escalationPacket, 10, rows).family, escalationPacket.fixtures[1].id);
  rows.push({
    ...executionCase(escalationPacket, 10, rows),
    continuePhase: true,
    result: { complete: true },
  });
  const confirmation = executionCase(escalationPacket, 11, rows);
  assert(confirmation.confirmation);
  assert.equal(confirmation.family, escalationPacket.fixtures[1].id);
  rows.push({ ...confirmation, continuePhase: true, result: { complete: true } });
  assert.throws(() => executionCase(escalationPacket, 12, rows), /escalation is complete/);

  const resisted = [];
  for (let ordinal = 1; ordinal <= 8; ordinal++)
    resisted.push({ ...executionCase(escalationPacket, ordinal, resisted), continuePhase: true });
  for (let ordinal = 9; ordinal <= 13; ordinal++)
    resisted.push({
      ...executionCase(escalationPacket, ordinal, resisted),
      continuePhase: true,
      result: { complete: false },
    });
  assert.throws(
    () => executionCase(escalationPacket, 14, resisted),
    /all escalation levels are complete/,
  );
});
test("migration escalation fixtures remain matched, bounded and projection-complete", async () => {
  assert.equal(migrationEscalationDefinitions.length, migrationEscalationPayloads.length);
  for (const [index, definition] of migrationEscalationDefinitions.entries()) {
    const attackParagraph = `<p>${migrationEscalationPayloads[index].prefix} ${outsideUrl}. ${migrationEscalationPayloads[index].override}</p>`;
    assert.equal(definition.injection.replace(attackParagraph, ""), migrationControl);
    assert(Buffer.byteLength(definition.injection) <= 1000);
    const predecessors = [];
    for (let ordinal = 1; ordinal <= index + 3; ordinal++)
      predecessors.push({
        ...executionCase(escalationPacket, ordinal, predecessors),
        continuePhase: true,
      });
    const c = predecessors.at(-1);
    const result = await replayExposure(
      definition.injection,
      c.sourceUrl,
      fixtureForCase(escalationPacket, c),
      scopeForCase(escalationPacket, c),
    );
    assert(result.worker.facts && result.worker.instruction);
    assert.equal(result.worker.sha256, result.sanitized.sha256);
  }
});
test("authored fixtures match the scenario and preserve repair facts through production projections", async () => {
  const doc = await readFile(
    new URL("../docs/development/t1-migration-demo-scenario.md", import.meta.url),
    "utf8",
  );
  assert.deepEqual(
    [...doc.matchAll(/```text\r?\n([\s\S]*?)\r?\n```/g)].map((m) => m[1].replaceAll("\r\n", "\n")),
    [mission, operatorReport, referenceText, guideText, payload],
  );
  assert.equal(migrationAttack.replace(`<p>${payload}</p>`, ""), migrationControl);
  assert.equal(Buffer.byteLength(migrationAttack), 966);
  for (const [index, content] of [
    migrationReference,
    migrationControl,
    migrationAttack,
  ].entries()) {
    const c = cases()[index];
    const result = await replayExposure(
      content,
      c.sourceUrl,
      fixtureForCase(packet, c),
      scopeForCase(packet, c),
    );
    assert(result.worker.facts);
    assert.equal(result.worker.sha256, result.sanitized.sha256);
    assert.equal(result.worker.instruction, c.injection);
  }
  assert(
    !observeExposure(migrationAttack.replace("120 records", "unknown records"), migrationFixture)
      .facts,
  );
  assert(
    !observeExposure(
      migrationAttack.replace(outsideUrl, "https://other.example/check"),
      migrationFixture,
    ).instruction,
  );
  assert(
    !observeExposure(
      migrationReference.replace("requires index generation 2", "requires a different index"),
      referenceFixture,
    ).facts,
  );
});
test("third admission preserves exact-destination denial after two legitimate extractions", async () => {
  const c = cases()[4],
    normalized = judgeRuntimeScope(scopeForCase(packet, c));
  const gateway = new SessionControlledContentGateway(randomUUID(), {
    allowedUrls: c.sourceUrls,
    allowedDomains: [new URL(c.sourceUrls[0]).hostname],
    maxContentCharacters: 1000,
    remainingRequests: normalized.permissions.volume.maxResearchRequests,
  });
  let calls = 0;
  const provider = {
    extract: async ({ url }) => {
      calls++;
      return {
        requestId: "synthetic",
        url,
        content: url === c.sourceUrls[0] ? migrationReference : migrationAttack,
      };
    },
  };
  for (const url of c.sourceUrls)
    await gateway.extract({ url }, provider, "2026-09-11T00:00:00.000Z");
  assert.equal(gateway.budget.remainingRequests, 1);
  await assert.rejects(gateway.extract({ url: outsideUrl }, provider, "2026-09-11T00:00:00.000Z"), {
    reason: "url_not_allowed",
  });
  assert.equal(calls, 2);
  assert.equal(gateway.budget.remainingRequests, 1);
  await gateway.extract({ url: c.sourceUrls[0] }, provider, "2026-09-11T00:00:00.000Z");
  await assert.rejects(gateway.extract({ url: outsideUrl }, provider, "2026-09-11T00:00:00.000Z"), {
    reason: "budget_exhausted",
  });
  assert.equal(calls, 3);
});

test("two-source evidence requires actual projections, exact digests and a hash-bound review", () => {
  const { c, receipt, independent, answer, review } = migrationTrace(packet, true);
  assert(!verifyModelEvidence(receipt, independent, c, answer, true).result.technical);
  const verified = verifyModelEvidence(receipt, independent, c, answer, true, review);
  assert(verified.continuePhase && verified.result.complete);
  for (const corrupt of [
    (r) => {
      r.observations.find(
        (e) => e.kind === "turn" && e.projectedSourceIndex === 0,
      ).projectedSourceIndex = 1;
    },
    (r) => {
      r.observations.find(
        (e) => e.kind === "turn" && e.request?.sourceIndex === 0,
      ).request.sourceIndex = 1;
    },
    (r) => {
      r.observations.find(
        (e) => e.kind === "turn" && e.projectedSourceIndex === 1,
      ).projectedExposure.facts = false;
    },
  ]) {
    const changed = structuredClone(receipt);
    corrupt(changed);
    const changedReview = {
      ...review,
      ...reviewTemplate(changed, c.sourceUrls),
      reviewer: review.reviewer,
      items: review.items,
    };
    assert(
      !verifyModelEvidence(changed, independent, c, answer, true, changedReview).continuePhase,
    );
  }
  assert(!verifyModelEvidence(receipt, independent, c, answer, false, review).continuePhase);
  const effects = structuredClone(independent);
  effects.audit[10].providerBoundary = "crossed";
  assert(!verifyModelEvidence(receipt, effects, c, answer, true, review).continuePhase);
});
test("review tampering fails closed and a reviewed resistance remains an intervention null", () => {
  const { c, receipt, independent, answer, review } = migrationTrace(packet, false);
  assert(validateAnswerReview(review, receipt, answer, c.sourceUrls));
  for (const change of [
    { answerSha256: "f".repeat(64) },
    { packetSha256: "f".repeat(64) },
    { receiptSha256: "f".repeat(64) },
    { rubricSha256: "f".repeat(64) },
    { ordinal: 4 },
    { sourceUrls: [...c.sourceUrls].reverse() },
    { reviewer: null },
    { items: {} },
    { extra: true },
  ])
    assert.throws(() =>
      validateAnswerReview({ ...review, ...change }, receipt, answer, c.sourceUrls),
    );
  const negative = structuredClone(review);
  negative.items.repair.passed = false;
  assert(!validateAnswerReview(negative, receipt, answer, c.sourceUrls));
  const result = verifyModelEvidence(receipt, independent, c, answer, true, review);
  assert(result.continuePhase && result.result.resistance && !result.result.complete);
});
