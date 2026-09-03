import assert from "node:assert/strict";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { SQLiteAuthoritySpike } from "./authority-store.mjs";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  approval: "22222222-2222-4222-8222-222222222222",
  nonce: "33333333-3333-4333-8333-333333333333",
  crashSession: "44444444-4444-4444-8444-444444444444",
};
const NOW = "2026-08-30T22:30:00.000Z";
const workerPath = fileURLToPath(new URL("./worker.mjs", import.meta.url));

async function harness() {
  const directory = await mkdtemp(join(tmpdir(), "guardian-sqlite-authority-"));
  if (process.platform !== "win32") await chmod(directory, 0o700);
  return {
    directory,
    databasePath: join(directory, "authority.sqlite"),
    async cleanup() {
      await rm(directory, { recursive: true, force: true });
    },
  };
}

function runWorker(...arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath, ...arguments_], {
      env: {},
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function createSession(store, overrides = {}) {
  store.createSession({
    sessionId: IDS.session,
    createdAt: NOW,
    remainingRequests: 1,
    remainingResults: 2,
    ...overrides,
  });
}

test("transactions roll back and session identifiers cannot be reused", async () => {
  const testHarness = await harness();
  try {
    const store = new SQLiteAuthoritySpike(testHarness.databasePath);
    store.initialize();
    createSession(store);
    assert.throws(() => createSession(store), /UNIQUE constraint failed/u);
    assert.deepEqual(store.researchBudget(IDS.session), {
      remainingRequests: 1,
      remainingResults: 2,
    });
    store.close();
  } finally {
    await testHarness.cleanup();
  }
});

test("restart recovery interrupts active sessions without resetting their identity", async () => {
  const testHarness = await harness();
  try {
    const original = new SQLiteAuthoritySpike(testHarness.databasePath);
    original.initialize();
    createSession(original);
    original.close();

    const restarted = new SQLiteAuthoritySpike(testHarness.databasePath);
    assert.equal(restarted.interruptActiveSessions("2026-08-30T22:31:00.000Z"), 1);
    assert.equal(restarted.sessionStatus(IDS.session), "interrupted");
    assert.throws(() => createSession(restarted), /UNIQUE constraint failed/u);
    restarted.close();
  } finally {
    await testHarness.cleanup();
  }
});

test("an uncommitted child-process write is absent after crash recovery", async () => {
  const testHarness = await harness();
  try {
    const store = new SQLiteAuthoritySpike(testHarness.databasePath);
    store.initialize();
    store.close();

    const crashed = await runWorker(
      "crash-write",
      testHarness.databasePath,
      IDS.crashSession,
      NOW,
    );
    assert.equal(crashed.code, 23);
    assert.equal(crashed.stdout, "");
    assert.equal(crashed.stderr, "");

    const recovered = new SQLiteAuthoritySpike(testHarness.databasePath);
    assert.equal(recovered.sessionStatus(IDS.crashSession), null);
    recovered.close();
  } finally {
    await testHarness.cleanup();
  }
});

test("concurrent processes consume a one-time nonce exactly once", async () => {
  const testHarness = await harness();
  try {
    const store = new SQLiteAuthoritySpike(testHarness.databasePath);
    store.initialize();
    createSession(store);
    store.issueApproval({ approvalId: IDS.approval, sessionId: IDS.session, nonce: IDS.nonce });
    store.close();

    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        runWorker("consume-nonce", testHarness.databasePath, IDS.nonce, NOW),
      ),
    );
    assert.equal(attempts.filter((attempt) => attempt.stdout === "consumed").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.stdout === "denied").length, 7);
    assert.ok(attempts.every((attempt) => attempt.code === 0 && attempt.stderr === ""));
  } finally {
    await testHarness.cleanup();
  }
});

test("concurrent processes cannot overcommit a research budget", async () => {
  const testHarness = await harness();
  try {
    const store = new SQLiteAuthoritySpike(testHarness.databasePath);
    store.initialize();
    createSession(store);
    store.close();

    const attempts = await Promise.all(
      Array.from({ length: 6 }, () =>
        runWorker("reserve-research", testHarness.databasePath, IDS.session, NOW, "1"),
      ),
    );
    assert.equal(attempts.filter((attempt) => attempt.stdout === "reserved").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.stdout === "denied").length, 5);
    assert.ok(attempts.every((attempt) => attempt.code === 0 && attempt.stderr === ""));

    const reopened = new SQLiteAuthoritySpike(testHarness.databasePath);
    assert.deepEqual(reopened.researchBudget(IDS.session), {
      remainingRequests: 0,
      remainingResults: 1,
    });
    reopened.close();
  } finally {
    await testHarness.cleanup();
  }
});

test("committed authority consumption survives a lost response", async () => {
  const testHarness = await harness();
  try {
    const store = new SQLiteAuthoritySpike(testHarness.databasePath);
    store.initialize();
    createSession(store);
    store.issueApproval({ approvalId: IDS.approval, sessionId: IDS.session, nonce: IDS.nonce });
    store.close();

    const nonceCrash = await runWorker(
      "consume-nonce-crash",
      testHarness.databasePath,
      IDS.nonce,
      NOW,
    );
    assert.equal(nonceCrash.code, 24);
    const budgetCrash = await runWorker(
      "reserve-research-crash",
      testHarness.databasePath,
      IDS.session,
      NOW,
      "1",
    );
    assert.equal(budgetCrash.code, 25);

    const recovered = new SQLiteAuthoritySpike(testHarness.databasePath);
    assert.equal(recovered.consumeNonce(IDS.nonce, NOW), false);
    assert.deepEqual(recovered.researchBudget(IDS.session), {
      remainingRequests: 0,
      remainingResults: 1,
    });
    recovered.close();
  } finally {
    await testHarness.cleanup();
  }
});

test("workspace placement and read-only database access fail closed", async () => {
  const testHarness = await harness();
  try {
    assert.throws(
      () =>
        new SQLiteAuthoritySpike(testHarness.databasePath, {
          workspaceRoots: [testHarness.directory],
        }),
      /outside disposable session workspaces/u,
    );

    const writable = new SQLiteAuthoritySpike(testHarness.databasePath);
    writable.initialize();
    createSession(writable);
    writable.close();

    const readOnly = new SQLiteAuthoritySpike(testHarness.databasePath, { readOnly: true });
    assert.throws(
      () => readOnly.interruptActiveSessions("2026-08-30T22:31:00.000Z"),
      /readonly database/u,
    );
    assert.equal(readOnly.sessionStatus(IDS.session), "active");
    readOnly.close();
  } finally {
    await testHarness.cleanup();
  }
});

test(
  "POSIX state-directory permissions reject group or world access",
  { skip: process.platform === "win32" },
  async () => {
    const testHarness = await harness();
    try {
      await chmod(testHarness.directory, 0o755);
      assert.throws(
        () => new SQLiteAuthoritySpike(testHarness.databasePath),
        /parent permissions are too broad/u,
      );
    } finally {
      await chmod(testHarness.directory, 0o700);
      await testHarness.cleanup();
    }
  },
);
