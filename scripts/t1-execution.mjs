import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { pathToFileURL } from "node:url";
import { aggregateRuns } from "./t1-intervention.mjs";
import { migrationReference, reviewTemplate } from "./t1-migration-scenario.mjs";
import {
  makePacket,
  validatePacket,
  grantTemplate,
  validateGrant,
  executionCase,
  selectFamily,
  sha256,
  fixtureDefinitions,
  phaseLayout,
} from "./t1-execution-packet.mjs";

const workspaceRelative = "tmp/issue19-live-denial-recovery-20260909/workspace-source";
const runnerFiles = [
  "t1-execution.mjs",
  "t1-execution-packet.mjs",
  "t1-evaluation-shared.mjs",
  "t1-workflow-scenario.mjs",
  "t1-migration-scenario.mjs",
  "t1-execution-live.mjs",
  "t1-execution-evidence.mjs",
  "t1-execution-observer.mjs",
  "t1-intervention.mjs",
  "t1-receipt.mjs",
  "t1-attack-matrix.mjs",
  "research-exposure.mjs",
  "research-exposure-replay.mjs",
];
const git = (cwd, ...args) =>
  execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const json = (value) => JSON.stringify(value, null, 2) + "\n";
async function boundedRead(file) {
  const stat = await lstat(file);
  assert(
    stat.isFile() && !stat.isSymbolicLink() && stat.size <= 1000000,
    "invalid packet artifact",
  );
  return readFile(file);
}
const load = async (file) => JSON.parse(await boundedRead(file));
export async function runtimeManifest(projectRoot) {
  const files = {};
  async function walk(directory) {
    for (const entry of (await readdir(directory)).sort()) {
      const path = join(directory, entry),
        stat = await lstat(path);
      assert(!stat.isSymbolicLink(), "runtime symlink is unsupported");
      if (stat.isDirectory()) await walk(path);
      else if (stat.isFile())
        files[relative(projectRoot, path).replaceAll("\\", "/")] = sha256(await readFile(path));
    }
  }
  for (const parent of ["apps", "packages"])
    for (const name of (await readdir(resolve(projectRoot, parent))).sort()) {
      const dist = resolve(projectRoot, parent, name, "dist");
      const stat = await lstat(dist).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (stat !== null) {
        assert(stat.isDirectory() && !stat.isSymbolicLink());
        await walk(dist);
      }
    }
  assert(Object.keys(files).length > 0, "build the reviewed source before freezing");
  for (const name of runnerFiles)
    files[`scripts/${name}`] = sha256(await boundedRead(resolve(projectRoot, "scripts", name)));
  return files;
}
export async function preparePacket(root, projectRoot, fixtureCommit = null, schemaVersion = 3) {
  assert.equal(git(projectRoot, "status", "--porcelain"), "", "prepare from a clean candidate");
  const workspace = resolve(projectRoot, workspaceRelative);
  assert.equal(git(workspace, "remote"), "", "workspace has remotes");
  assert.equal(git(workspace, "status", "--porcelain"), "", "workspace is dirty");
  const packet = makePacket({
    sourceHead: git(projectRoot, "rev-parse", "HEAD"),
    workspaceCommit: git(workspace, "rev-parse", "HEAD"),
    fixtureCommit,
    schemaVersion,
  });
  const runtime = await runtimeManifest(projectRoot);
  await mkdir(root); // Preserve every previous prepared/frozen packet.
  await writeFile(resolve(root, "packet.json"), json(packet), { flag: "wx" });
  await writeFile(resolve(root, "runtime.json"), json(runtime), { flag: "wx" });
  const definitions = fixtureDefinitions(packet);
  for (const f of definitions)
    for (const kind of ["control", "injection"])
      await writeFile(resolve(root, `${f.id}-${kind}.html`), f[kind], { flag: "wx" });
  const publication =
    schemaVersion === 5
      ? resolve(root, "publication", "migration")
      : schemaVersion === 4
        ? resolve(root, "publication", "release")
        : resolve(root, "publication", "fixtures", "t1-matrix-v1");
  await mkdir(publication, { recursive: true });
  if (schemaVersion === 5) {
    await writeFile(resolve(root, packet.reference.file), migrationReference, { flag: "wx" });
    for (const [number, content] of [
      [11, migrationReference],
      [24, definitions[0].control],
      [25, definitions[0].injection],
    ])
      await writeFile(resolve(publication, `reference-${number}.html`), content, { flag: "wx" });
  } else if (schemaVersion === 4) {
    await writeFile(
      resolve(root, "publication", definitions[0].sourcePaths.control.slice(1)),
      definitions[0].control,
      { flag: "wx" },
    );
    for (const f of definitions)
      await writeFile(resolve(root, "publication", f.sourcePaths.injection.slice(1)), f.injection, {
        flag: "wx",
      });
  } else {
    for (const f of definitions.slice(1))
      await writeFile(resolve(publication, `${f.id}.html`), f.injection, { flag: "wx" });
  }
  await writeFile(
    resolve(root, "grant-template.json"),
    json(grantTemplate(sha256(json(packet)), sha256(json(runtime)), sha256(resolve(root)), packet)),
    { flag: "wx" },
  );
  return {
    sourceHead: packet.sourceHead,
    fixtures: schemaVersion === 5 ? 3 : definitions.length * 2,
    publicationFiles: schemaVersion === 5 ? 3 : 5,
    credentialReads: 0,
    providerCalls: 0,
    liveReady: false,
    remaining:
      fixtureCommit === null
        ? ["publication identity", "explicit live grant"]
        : ["explicit live grant"],
  };
}
export async function gateExecution(
  root,
  projectRoot,
  ordinal,
  now = new Date().toISOString(),
  reviewing = false,
) {
  const packetBytes = await boundedRead(resolve(root, "packet.json"));
  const packet = validatePacket(JSON.parse(packetBytes), true);
  const packetDigest = sha256(packetBytes);
  const runtimeBytes = await boundedRead(resolve(root, "runtime.json"));
  const runtimeDigest = sha256(runtimeBytes);
  const grantBytes = await boundedRead(resolve(root, "approved-grant.json"));
  const grant = JSON.parse(grantBytes),
    grantDigest = sha256(grantBytes);
  assert.equal(git(projectRoot, "status", "--porcelain"), "", "tracked source changed");
  assert.equal(git(projectRoot, "rev-parse", "HEAD"), packet.sourceHead);
  assert.equal(git(projectRoot, "rev-parse", "origin/main"), packet.sourceHead);
  assert.deepEqual(
    await runtimeManifest(projectRoot),
    JSON.parse(runtimeBytes),
    "built runtime or runner changed",
  );
  const workspace = resolve(projectRoot, workspaceRelative);
  assert.equal(git(workspace, "rev-parse", "HEAD"), packet.workspaceCommit);
  assert.equal(git(workspace, "status", "--porcelain"), "");
  assert.equal(git(workspace, "remote"), "");
  for (const f of packet.fixtures)
    for (const kind of ["control", "injection"])
      assert.equal(sha256(await boundedRead(resolve(root, f[`${kind}File`]))), f[`${kind}Sha256`]);
  if (packet.schemaVersion === 5)
    assert.equal(
      sha256(await boundedRead(resolve(root, packet.reference.file))),
      packet.reference.sha256,
    );
  const existing = (await readdir(root)).filter((name) => /^case-/u.test(name)).sort();
  assert.equal(
    existing.length,
    ordinal - (reviewing ? 0 : 1),
    "case already used or predecessor missing",
  );
  if (reviewing) assert(packet.schemaVersion === 5 && ordinal >= 4 && ordinal <= 5);
  const receipts = [];
  for (let n = 1; n < ordinal; n++) {
    const path = resolve(root, `case-${String(n).padStart(2, "0")}`);
    const record = await load(resolve(path, "verified.json"));
    const expectedCase = executionCase(packet, n, receipts);
    for (const [key, value] of Object.entries(expectedCase))
      assert.deepEqual(record[key], value, "predecessor configuration changed");
    assert.equal(record.packetSha256, packetDigest);
    assert.equal(record.grantSha256, grantDigest);
    assert.equal(record.sourceHead, packet.sourceHead);
    assert(
      Number.isFinite(Date.parse(record.completedAt)) &&
        Date.parse(now) >= Date.parse(record.completedAt),
      "clock moved behind predecessor",
    );
    assert.equal(record.receiptSha256, sha256(await boundedRead(resolve(path, "receipt.json"))));
    if (packet.schemaVersion === 5 && record.phase !== "readiness")
      assert.equal(
        record.reviewSha256,
        sha256(await boundedRead(resolve(path, "answer-review.json"))),
        "predecessor review changed",
      );
    assert.equal(record.predecessorSha256, n === 1 ? null : sha256(json(receipts.at(-1))));
    receipts.push(record);
  }
  const testCase = executionCase(packet, ordinal, receipts);
  const { discoveryEnd, evaluationStart } = phaseLayout(packet);
  if (ordinal > evaluationStart)
    assert.deepEqual(
      await load(resolve(root, "evaluation-selection.json")),
      {
        family: packet.fixtures[selectFamily(receipts.slice(0, discoveryEnd), packet)].id,
        discoverySha256: sha256(json(receipts.slice(0, discoveryEnd))),
        packetSha256: packetDigest,
      },
      "frozen selection changed",
    );
  const startedAt = receipts[0]?.batchStartedAt ?? now;
  validateGrant(grant, {
    packet,
    packetDigest,
    runtimeDigest,
    rootDigest: sha256(resolve(root)),
    now,
    startedAt,
  });
  const reserve = receipts.reduce((sum, r) => sum + r.estimatedUsd, testCase.estimatedUsd);
  assert(reserve <= packet.limits.estimatedUsd + 1e-9);
  const phaseReserve = receipts
    .filter((r) => r.phase === testCase.phase)
    .reduce((sum, r) => sum + r.estimatedUsd, testCase.estimatedUsd);
  assert(phaseReserve <= packet.limits[`${testCase.phase}Usd`] + 1e-9);
  return {
    packet,
    grant,
    packetDigest,
    runtimeDigest,
    grantDigest,
    workspace,
    testCase,
    startedAt,
    receipts,
  };
}
export async function runCase(root, projectRoot, ordinal) {
  const gate = await gateExecution(root, projectRoot, ordinal);
  const { packet, grant, testCase, receipts } = gate;
  const directory = resolve(root, `case-${String(ordinal).padStart(2, "0")}`);
  await mkdir(directory); // This slot remains consumed even after a crash/failure.
  const common = {
    ...testCase,
    packetSha256: gate.packetDigest,
    grantSha256: gate.grantDigest,
    sourceHead: packet.sourceHead,
    batchStartedAt: gate.startedAt,
    predecessorSha256: receipts.length === 0 ? null : sha256(json(receipts.at(-1))),
  };
  if (ordinal === phaseLayout(packet).evaluationStart)
    await writeFile(
      resolve(root, "evaluation-selection.json"),
      json({
        family: packet.fixtures[selectFamily(receipts, packet)].id,
        discoverySha256: sha256(json(receipts)),
        packetSha256: gate.packetDigest,
      }),
      { flag: "wx" },
    );
  let receipt = { ...common, startedAt: new Date().toISOString() },
    verified;
  try {
    assert.equal(sha256(await boundedRead(resolve(root, "approved-grant.json"))), gate.grantDigest);
    validateGrant(grant, {
      packet,
      packetDigest: gate.packetDigest,
      runtimeDigest: gate.runtimeDigest,
      rootDigest: sha256(resolve(root)),
      now: new Date().toISOString(),
      startedAt: gate.startedAt,
    });
    const live = await import("./t1-execution-live.mjs");
    if (testCase.phase === "readiness") {
      receipt = {
        ...receipt,
        ...(await live.runReadiness(testCase, packet)),
        completedAt: new Date().toISOString(),
      };
      verified = { continuePhase: receipt.continuePhase, exposure: receipt.exposure };
    } else {
      receipt = {
        ...receipt,
        ...(await live.runModel(packet, testCase, {
          root: directory,
          projectRoot,
          workspace: gate.workspace,
          expiresAt: grant.expiresAt,
        })),
      };
    }
  } catch {
    receipt.failure ??= "case_failed_closed";
    receipt.continuePhase = false;
  }
  receipt.completedAt ??= new Date().toISOString();
  await writeFile(resolve(directory, "receipt.json"), json(receipt), { flag: "wx" });
  if (testCase.phase !== "readiness") {
    try {
      const { verifyStoredModel } = await import("./t1-execution-evidence.mjs");
      verified = await verifyStoredModel(directory, receipt, testCase, projectRoot);
    } catch {
      verified = { continuePhase: false, failure: "independent_verification_unavailable" };
    }
  }
  const record = {
    ...common,
    ...verified,
    completedAt: receipt.completedAt,
    continuePhase: verified?.continuePhase === true && receipt.failure === undefined,
    receiptSha256: sha256(json(receipt)),
  };
  if (
    packet.schemaVersion === 5 &&
    testCase.phase !== "readiness" &&
    receipt.failure === undefined &&
    receipt.finalResponse?.sha256
  ) {
    await writeFile(
      resolve(directory, "answer-review-template.json"),
      json(reviewTemplate(receipt, testCase.sourceUrls)),
      { flag: "wx" },
    );
    const pending = { ...record, continuePhase: false, pendingReview: true };
    await writeFile(resolve(directory, "pending-review.json"), json(pending), { flag: "wx" });
    return pending;
  }
  await writeFile(resolve(directory, "verified.json"), json(record), { flag: "wx" });
  return record;
}
export async function finalizeReview(root, projectRoot, ordinal) {
  const directory = resolve(root, `case-${String(ordinal).padStart(2, "0")}`);
  const receiptBytes = await boundedRead(resolve(directory, "receipt.json"));
  const receipt = JSON.parse(receiptBytes);
  const gate = await gateExecution(root, projectRoot, ordinal, receipt.startedAt, true);
  const pending = await load(resolve(directory, "pending-review.json"));
  const common = {
    ...gate.testCase,
    packetSha256: gate.packetDigest,
    grantSha256: gate.grantDigest,
    sourceHead: gate.packet.sourceHead,
    batchStartedAt: gate.startedAt,
    predecessorSha256: sha256(json(gate.receipts.at(-1))),
  };
  for (const [key, value] of Object.entries(common)) {
    assert.deepEqual(receipt[key], value, "receipt configuration changed");
    assert.deepEqual(pending[key], value, "pending configuration changed");
  }
  assert.equal(pending.pendingReview, true);
  assert.equal(pending.receiptSha256, sha256(receiptBytes));
  const reviewBytes = await boundedRead(resolve(directory, "answer-review.json"));
  const { verifyStoredModel } = await import("./t1-execution-evidence.mjs");
  const verified = await verifyStoredModel(directory, receipt, gate.testCase, projectRoot);
  assert.equal(
    sha256(await boundedRead(resolve(directory, "answer-review.json"))),
    sha256(reviewBytes),
  );
  const record = {
    ...common,
    ...verified,
    completedAt: receipt.completedAt,
    continuePhase: verified.continuePhase === true && receipt.failure === undefined,
    receiptSha256: sha256(receiptBytes),
    reviewSha256: sha256(reviewBytes),
  };
  await writeFile(resolve(directory, "verified.json"), json(record), { flag: "wx" });
  return record;
}
export async function summarizePacket(root) {
  const packetBytes = await boundedRead(resolve(root, "packet.json"));
  const packet = validatePacket(JSON.parse(packetBytes));
  const packetDigest = sha256(packetBytes);
  const records = new Map();
  const used = new Set(
    (await readdir(root)).filter((n) => /^case-\d{2}$/u.test(n)).map((n) => Number(n.slice(5))),
  );
  for (const n of used) {
    const file = resolve(root, `case-${String(n).padStart(2, "0")}`, "verified.json");
    const record = await load(file).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (record !== null) records.set(n, record);
  }
  const { readiness, discoveryEnd, evaluationStart, total } = phaseLayout(packet);
  const completeDiscovery = Array.from({ length: discoveryEnd }, (_, i) => records.get(i + 1));
  const selected = completeDiscovery.every((r) => r?.continuePhase)
    ? selectFamily(completeDiscovery, packet)
    : null;
  const runs = [];
  for (let n = readiness + 1; n <= total; n++) {
    if (records.get(n)?.evidence) {
      runs.push(records.get(n).evidence);
      continue;
    }
    const phase = n <= discoveryEnd ? "discovery" : "evaluation";
    const family =
      n <= discoveryEnd
        ? packet.fixtures[Math.floor((n - readiness - 1) / 2)].id
        : n >= total - 1
          ? packet.fixtures.at(-1).id
          : selected === null
            ? "unselected"
            : packet.fixtures[selected].id;
    runs.push({
      schemaVersion: 2,
      id: String(n),
      configuration: `${packetDigest}:${phase}:${family}`,
      flow: "natural",
      attempted: used.has(n),
      injection: n % 2 === 1,
      valid: false,
      exposed: false,
      usefulAnswer: false,
      durablyCompleted: false,
      neutralAuthority: false,
      sameSession: false,
      classifiedFeedback: false,
      noRetry: false,
      budgetVerified: false,
      auditVerified: false,
      effectsVerified: false,
      cleanupVerified: false,
      proposals: [],
      failures: used.has(n) ? ["missing_evidence"] : [],
    });
  }
  return {
    schemaVersion: packet.schemaVersion,
    ...(packet.schemaVersion === 5
      ? { pendingReview: [...used].filter((n) => n >= 4 && !records.has(n)) }
      : {}),
    readiness: {
      attempted: [...used].filter((n) => n <= readiness).length,
      verified: [...records.values()].filter((r) => r.phase === "readiness" && r.continuePhase)
        .length,
      planned: readiness,
    },
    selectedFamily: selected === null ? null : packet.fixtures[selected].id,
    modelResults: aggregateRuns(runs),
    evaluationQuotaMet:
      [1, 3, 5].every(
        (offset) => records.get(evaluationStart + offset)?.result?.complete === true,
      ) &&
      [0, 2, 4].every((offset) => records.get(evaluationStart + offset)?.continuePhase === true),
    billedUsd: null,
  };
}
export async function main(args = process.argv.slice(2)) {
  const [command, directory, value] = args;
  assert(
    directory &&
      args.length <= 3 &&
      ["prepare", "prepare-workflow", "prepare-migration", "run", "review", "summary"].includes(
        command,
      ),
    "usage: prepare|prepare-workflow|prepare-migration DIRECTORY [FIXTURE_COMMIT] | run|review DIRECTORY ORDINAL | summary DIRECTORY",
  );
  const root = resolve(directory),
    projectRoot = process.cwd();
  const result =
    command === "prepare" || command === "prepare-workflow" || command === "prepare-migration"
      ? await preparePacket(
          root,
          projectRoot,
          value ?? null,
          command === "prepare-migration" ? 5 : command === "prepare-workflow" ? 4 : 3,
        )
      : command === "summary"
        ? await summarizePacket(root)
        : command === "review"
          ? await finalizeReview(root, projectRoot, Number(value))
          : await runCase(root, projectRoot, Number(value));
  console.log(json(result));
  if (["run", "review"].includes(command) && !result.continuePhase && !result.pendingReview)
    process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(() => {
    console.error("T1 packet operation failed closed; inspect the bounded local artifacts.");
    process.exitCode = 1;
  });
