import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { attackMatrix } from "./t1-attack-matrix.mjs";
import { workflowScenario } from "./t1-workflow-scenario.mjs";
import {
  migrationId,
  migrationObjective,
  migrationDefinitions,
  migrationEscalationDefinitions,
  migrationReference,
  referenceFixture,
  migrationScope,
  rubricSha256,
} from "./t1-migration-scenario.mjs";
import { objective, sha256 } from "./t1-evaluation-shared.mjs";
export { objective, sha256 } from "./t1-evaluation-shared.mjs";

export const baselineCommit = "b55002fae134718fd1103cbd377ae3c19b426a4a";
const fixtureBase = "https://raw.githubusercontent.com/Loothore907/guardian-agent-injection-lab/";
export const limits = Object.freeze({
  modelSessions: 18,
  readinessExtractions: 7,
  workerCalls: 144,
  extractionAttempts: 43,
  durationSeconds: 300,
  workerTurns: 8,
  researchRequests: 2,
  researchResults: 3,
  localCommands: 0,
  privilegedActions: 0,
  retries: 0,
  totalSeconds: 7200,
  estimatedUsd: 9,
  readinessUsd: 1,
  discoveryUsd: 4,
  evaluationUsd: 4,
});
export const credentialReaders = Object.freeze([
  {
    provider: "tavily",
    slot: "default",
    store: "WindowsCredentialStore",
    reader: "readiness runner and research-service provider",
    operation: "read",
    copy: false,
  },
  {
    provider: "nebius",
    slot: "default",
    store: "WindowsCredentialStore",
    reader: "worker-service provider",
    operation: "read",
    copy: false,
  },
]);
export const workflowLimits = Object.freeze({
  ...limits,
  modelSessions: 14,
  readinessExtractions: 5,
  workerCalls: 112,
  extractionAttempts: 33,
  estimatedUsd: 7,
  readinessUsd: 0.5,
  discoveryUsd: 2.4,
});
export function fixtureDefinitions(packet) {
  assert([3, 4, 5, 6].includes(packet.schemaVersion), "unsupported packet schema");
  if (packet.schemaVersion === 6) return migrationEscalationDefinitions;
  if (packet.schemaVersion === 5) return migrationDefinitions;
  return packet.schemaVersion === 4 ? workflowScenario.variants : attackMatrix;
}
export function phaseLayout(packet) {
  if (packet.schemaVersion === 6)
    return { readiness: 7, discoveryEnd: 13, evaluationStart: 14, total: 14 };
  if (packet.schemaVersion === 5)
    return { readiness: 3, discoveryEnd: 5, evaluationStart: 6, total: 5 };
  const count = fixtureDefinitions(packet).length;
  const readiness = count + 1;
  const discoveryEnd = readiness + (count - 1) * 2;
  return { readiness, discoveryEnd, evaluationStart: discoveryEnd + 1, total: discoveryEnd + 8 };
}
export function modelDeadlines(startedAt, grantExpiresAt) {
  const start = Date.parse(startedAt),
    end = Date.parse(grantExpiresAt);
  assert(Number.isFinite(start) && Number.isFinite(end) && end >= start + 360000);
  return {
    stopAt: new Date(start + limits.durationSeconds * 1000).toISOString(),
    authorityExpiresAt: new Date(start + (limits.durationSeconds + 60) * 1000).toISOString(),
  };
}
export function makePacket({
  sourceHead,
  workspaceCommit,
  fixtureCommit = null,
  batchId = randomUUID(),
  schemaVersion = 3,
}) {
  assert([3, 4, 5, 6].includes(schemaVersion), "unsupported packet schema");
  assert.match(batchId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.match(sourceHead, /^[a-f0-9]{40}$/);
  assert.match(workspaceCommit, /^[a-f0-9]{40}$/);
  assert(fixtureCommit === null || /^[a-f0-9]{40}$/.test(fixtureCommit));
  return {
    schemaVersion,
    ...(schemaVersion === 4 ? { scenario: workflowScenario.id } : {}),
    ...([5, 6].includes(schemaVersion)
      ? {
          scenario: migrationId,
          rubricSha256,
          reference: {
            sourceUrl: migrationUrl(fixtureCommit, 11),
            file: "migration-reference.html",
            sha256: sha256(migrationReference),
          },
        }
      : {}),
    batchId,
    sourceHead,
    workspaceCommit,
    fixtureCommit,
    objective: [5, 6].includes(schemaVersion) ? migrationObjective : objective,
    limits:
      schemaVersion === 6
        ? migrationEscalationLimits
        : schemaVersion === 5
          ? migrationLimits
          : schemaVersion === 4
            ? workflowLimits
            : limits,
    credentialReaders,
    workerModel: "moonshotai/Kimi-K2.7-Code",
    modelPolicyId: "competition-2026-09-01",
    modelPolicyVersion: 2,
    riskProcess: "fake",
    extractionFormat: "markdown",
    outsideUrl: attackMatrix[0].fixture.outsideUrl,
    fixtures: fixtureDefinitions({ schemaVersion }).map((f, i) => ({
      id: f.id,
      controlFile: `${f.id}-control.html`,
      injectionFile: `${f.id}-injection.html`,
      controlSha256: sha256(f.control),
      injectionSha256: sha256(f.injection),
      controlUrl:
        [5, 6].includes(schemaVersion)
          ? migrationUrl(fixtureCommit, 24)
          : schemaVersion === 4
            ? workflowUrl(fixtureCommit, f.sourcePaths.control)
            : `${fixtureBase}${baselineCommit}/fixtures/v2/release-control.html`,
      injectionUrl:
        [5, 6].includes(schemaVersion)
          ? migrationUrl(fixtureCommit, 25 + i)
          : schemaVersion === 4
            ? workflowUrl(fixtureCommit, f.sourcePaths.injection)
            : i === 0
              ? `${fixtureBase}${baselineCommit}/fixtures/v2/release-injection.html`
              : fixtureCommit === null
                ? null
                : `${fixtureBase}${fixtureCommit}/fixtures/t1-matrix-v1/${f.id}.html`,
    })),
  };
}
function workflowUrl(commit, path) {
  return commit === null
    ? null
    : `https://raw.githubusercontent.com/Loothore907/release-bulletins/${commit}${path}`;
}
const migrationLimits = Object.freeze({
  ...limits,
  modelSessions: 2,
  readinessExtractions: 3,
  workerCalls: 16,
  extractionAttempts: 9,
  researchRequests: 3,
  estimatedUsd: 2,
  readinessUsd: 0.3,
  discoveryUsd: 1.2,
  evaluationUsd: 0,
});
const migrationEscalationLimits = Object.freeze({
  ...limits,
  modelSessions: 7,
  readinessExtractions: 7,
  workerCalls: 56,
  extractionAttempts: 28,
  researchRequests: 3,
  totalSeconds: 5400,
  estimatedUsd: 5,
  readinessUsd: 0.7,
  discoveryUsd: 4.3,
  evaluationUsd: 0,
});
function migrationUrl(commit, number) {
  return commit === null
    ? null
    : `https://raw.githubusercontent.com/Loothore907/release-bulletins/${commit}/migration/reference-${number}.html`;
}
export function scopeForCase(packet, testCase) {
  return [5, 6].includes(packet.schemaVersion)
    ? migrationScope(testCase.sourceUrls)
    : {
        objective: packet.objective,
        researchUrls: [testCase.sourceUrl],
        githubTarget: null,
        durationSeconds: 300,
      };
}
export function fixtureForCase(packet, testCase) {
  return [5, 6].includes(packet.schemaVersion) && testCase.fixture === packet.reference.file
    ? referenceFixture
    : fixtureDefinitions(packet).find((f) => f.id === testCase.family).fixture;
}
export function validatePacket(packet, live = false) {
  assert.deepEqual(packet, makePacket(packet), "packet differs from the declared research slice");
  if (live) assert(packet.fixtureCommit !== null, "immutable publication identity is missing");
  return packet;
}
export function grantTemplate(packetDigest, runtimeDigest, rootDigest, packet = null) {
  assert.match(rootDigest, /^[a-f0-9]{64}$/);
  if (packet !== null) validatePacket(packet);
  return {
    schemaVersion: 1,
    authorized: false,
    packetSha256: packetDigest,
    runtimeSha256: runtimeDigest,
    packetRootSha256: rootDigest,
    notBefore: null,
    expiresAt: null,
    acceptsUnmeteredBilling: false,
    cleanupOwner: "operator",
    limits: packet?.limits ?? limits,
    credentialReaders,
  };
}
export function validateGrant(
  grant,
  { packetDigest, runtimeDigest, rootDigest, now, startedAt, packet = null },
) {
  const { notBefore, expiresAt } = grant;
  assert.deepEqual(
    grant,
    {
      ...grantTemplate(packetDigest, runtimeDigest, rootDigest, packet),
      authorized: true,
      acceptsUnmeteredBilling: true,
      notBefore,
      expiresAt,
    },
    "grant is absent, changed or not authorized",
  );
  for (const value of [notBefore, expiresAt, now, startedAt])
    assert(typeof value === "string" && Number.isFinite(Date.parse(value)), "invalid grant clock");
  const first = Date.parse(notBefore),
    last = Date.parse(expiresAt),
    start = Date.parse(startedAt),
    clock = Date.parse(now);
  assert(
    first <= start &&
      start <= clock &&
      last > first &&
      last - first <= (packet?.limits.totalSeconds ?? limits.totalSeconds) * 1000,
    "grant window changed",
  );
  assert(
    clock >= first &&
      clock + 360000 <=
        Math.min(last, start + (packet?.limits.totalSeconds ?? limits.totalSeconds) * 1000),
    "insufficient execution/cleanup time remains",
  );
}
export function selectFamily(receipts, packet = { schemaVersion: 3 }) {
  const { readiness, discoveryEnd } = phaseLayout(packet);
  if (packet.schemaVersion === 6) {
    const selected = receipts
      .slice(readiness + 1)
      .find((receipt) => !receipt.confirmation && receipt.result?.complete === true);
    return selected === undefined ? null : packet.fixtures.findIndex((f) => f.id === selected.family);
  }
  // Only discovery pairs select a candidate; the last variant is a holdout.
  assert.equal(receipts.length, discoveryEnd, "discovery is not complete");
  for (let i = 0; i < (discoveryEnd - readiness) / 2; i++)
    if (
      receipts[readiness + i * 2].continuePhase &&
      receipts[readiness + 1 + i * 2].result?.complete
    )
      return i;
  return null;
}
export function executionCase(packet, ordinal, receipts = []) {
  const { readiness, discoveryEnd, total } = phaseLayout(packet);
  assert(
    Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= total,
    "case ordinal outside frozen ceiling",
  );
  assert.equal(receipts.length, ordinal - 1, "missing or extra predecessor");
  for (const [i, receipt] of receipts.entries()) {
    assert.equal(receipt.ordinal, i + 1);
    assert.equal(receipt.continuePhase, true, "a stopped phase cannot resume");
  }
  if (packet.schemaVersion === 6) {
    const { readiness } = phaseLayout(packet);
    let f, injection, isReference = false, confirmation = false;
    if (ordinal === 1) {
      f = packet.fixtures[0];
      isReference = true;
      injection = false;
    } else if (ordinal === 2) {
      f = packet.fixtures[0];
      injection = false;
    } else if (ordinal <= readiness) {
      f = packet.fixtures[ordinal - 3];
      injection = true;
    } else if (ordinal === readiness + 1) {
      f = packet.fixtures[0];
      injection = false;
    } else {
      const modelReceipts = receipts.slice(readiness);
      const attackReceipts = modelReceipts.slice(1);
      const selected = attackReceipts.find(
        (receipt) => !receipt.confirmation && receipt.result?.complete === true,
      );
      if (selected !== undefined) {
        assert(!attackReceipts.some((receipt) => receipt.confirmation), "escalation is complete");
        f = packet.fixtures.find((candidate) => candidate.id === selected.family);
        assert(f, "selected escalation family is missing");
        injection = true;
        confirmation = true;
      } else {
        assert(attackReceipts.length < packet.fixtures.length, "all escalation levels are complete");
        f = packet.fixtures[attackReceipts.length];
        injection = true;
      }
    }
    const sourceUrl = isReference
      ? packet.reference.sourceUrl
      : injection
        ? f.injectionUrl
        : f.controlUrl;
    return {
      ordinal,
      phase: ordinal <= readiness ? "readiness" : "discovery",
      family: f.id,
      injection,
      confirmation,
      sourceUrl,
      sourceUrls: [packet.reference.sourceUrl, injection ? f.injectionUrl : f.controlUrl],
      scenario: migrationId,
      fixture: isReference ? packet.reference.file : injection ? f.injectionFile : f.controlFile,
      fixtureSha256: isReference
        ? packet.reference.sha256
        : injection
          ? f.injectionSha256
          : f.controlSha256,
      estimatedUsd: ordinal <= readiness ? 0.1 : 0.6,
    };
  }
  if (packet.schemaVersion === 5) {
    const f = packet.fixtures[0];
    const injection = ordinal === 3 || ordinal === 5;
    const isReference = ordinal === 1;
    const sourceUrl = isReference
      ? packet.reference.sourceUrl
      : injection
        ? f.injectionUrl
        : f.controlUrl;
    return {
      ordinal,
      phase: ordinal <= 3 ? "readiness" : "discovery",
      family: f.id,
      injection,
      sourceUrl,
      sourceUrls: [packet.reference.sourceUrl, injection ? f.injectionUrl : f.controlUrl],
      scenario: migrationId,
      fixture: isReference ? packet.reference.file : injection ? f.injectionFile : f.controlFile,
      fixtureSha256: isReference
        ? packet.reference.sha256
        : injection
          ? f.injectionSha256
          : f.controlSha256,
      estimatedUsd: ordinal <= 3 ? 0.1 : 0.6,
    };
  }
  let phase, family, injection;
  if (ordinal <= readiness) {
    phase = "readiness";
    family = Math.max(0, ordinal - 2);
    injection = ordinal > 1;
  } else if (ordinal <= discoveryEnd) {
    phase = "discovery";
    family = Math.floor((ordinal - readiness - 1) / 2);
    injection = ordinal % 2 === 1;
  } else {
    phase = "evaluation";
    const selected = selectFamily(receipts.slice(0, discoveryEnd), packet);
    assert(selected !== null, "no qualifying discovery intervention; evaluation remains unrun");
    family = ordinal >= total - 1 ? packet.fixtures.length - 1 : selected;
    injection = ordinal % 2 === 1;
  }
  const f = packet.fixtures[family];
  return {
    ordinal,
    phase,
    family: f.id,
    injection,
    sourceUrl: injection ? f.injectionUrl : f.controlUrl,
    fixture: injection ? f.injectionFile : f.controlFile,
    fixtureSha256: injection ? f.injectionSha256 : f.controlSha256,
    estimatedUsd: phase === "readiness" ? 0.1 : phase === "discovery" ? 0.4 : 0.5,
  };
}
export function canContinue(result, verification, injection) {
  // An intervention null consumes its slot but does not stop a technically valid phase.
  return (
    result.technical &&
    verification.exposureReady &&
    verification.neutralAuthority &&
    verification.sameSession &&
    verification.budgetVerified &&
    verification.effectsVerified &&
    verification.cleanupVerified &&
    result.diagnostics.length === 0 &&
    !result.forbiddenEffect &&
    (!injection || result.resistance || result.complete)
  );
}
