import { chmodSync, existsSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function assertUuid(value, field) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a UUID`);
  }
  return value;
}

function assertTimestamp(value, field) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${field} must be an ISO timestamp`);
  }
  return value;
}

function assertBudget(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new TypeError(`${field} must be a bounded non-negative integer`);
  }
  return value;
}

function isWithin(candidate, root) {
  const pathFromRoot = relative(resolve(root), candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

export function assertAuthorityDatabasePath(value, workspaceRoots = []) {
  if (typeof value !== "string" || !isAbsolute(value) || extname(value) !== ".sqlite") {
    throw new TypeError("authority database path must be an absolute .sqlite file");
  }
  const databasePath = resolve(value);
  if (workspaceRoots.some((root) => isWithin(databasePath, root))) {
    throw new TypeError("authority database must remain outside disposable session workspaces");
  }
  const parent = dirname(databasePath);
  const parentStat = statSync(parent);
  if (!parentStat.isDirectory()) {
    throw new TypeError("authority database parent must be a directory");
  }
  if (process.platform !== "win32" && (parentStat.mode & 0o077) !== 0) {
    throw new TypeError("authority database parent permissions are too broad");
  }
  if (process.platform !== "win32" && existsSync(databasePath)) {
    const databaseStat = statSync(databasePath);
    if ((databaseStat.mode & 0o077) !== 0) {
      throw new TypeError("authority database permissions are too broad");
    }
  }
  return databasePath;
}

export class SQLiteAuthoritySpike {
  #database;

  constructor(databasePathValue, options = {}) {
    const databasePath = assertAuthorityDatabasePath(
      databasePathValue,
      options.workspaceRoots ?? [],
    );
    this.#database = new DatabaseSync(databasePath, {
      allowExtension: false,
      defensive: true,
      enableDoubleQuotedStringLiterals: false,
      enableForeignKeyConstraints: true,
      readOnly: options.readOnly ?? false,
      timeout: 5_000,
    });
    this.#database.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  }

  initialize() {
    this.#database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'interrupted', 'revoked', 'expired')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS research_budgets (
        session_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions(session_id),
        remaining_requests INTEGER NOT NULL CHECK (remaining_requests >= 0),
        remaining_results INTEGER NOT NULL CHECK (remaining_results >= 0)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS approvals (
        approval_id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES sessions(session_id),
        nonce TEXT UNIQUE NOT NULL,
        consumed_at TEXT
      ) STRICT;
    `);
    if (process.platform !== "win32") {
      const location = this.#database.location();
      if (location !== null) chmodSync(location, 0o600);
    }
  }

  close() {
    if (this.#database.isOpen) this.#database.close();
  }

  #immediate(operation) {
    this.#database.exec("BEGIN IMMEDIATE;");
    try {
      const result = operation();
      this.#database.exec("COMMIT;");
      return result;
    } catch (error) {
      if (this.#database.isTransaction) this.#database.exec("ROLLBACK;");
      throw error;
    }
  }

  createSession({ sessionId, createdAt, remainingRequests, remainingResults }) {
    const boundedSessionId = assertUuid(sessionId, "sessionId");
    const boundedCreatedAt = assertTimestamp(createdAt, "createdAt");
    const boundedRequests = assertBudget(remainingRequests, "remainingRequests");
    const boundedResults = assertBudget(remainingResults, "remainingResults");
    this.#immediate(() => {
      this.#database
        .prepare(
          "INSERT INTO sessions(session_id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
        )
        .run(boundedSessionId, boundedCreatedAt, boundedCreatedAt);
      this.#database
        .prepare(
          "INSERT INTO research_budgets(session_id, remaining_requests, remaining_results) VALUES (?, ?, ?)",
        )
        .run(boundedSessionId, boundedRequests, boundedResults);
    });
  }

  interruptActiveSessions(interruptedAt) {
    const boundedTime = assertTimestamp(interruptedAt, "interruptedAt");
    const result = this.#immediate(() =>
      this.#database
        .prepare(
          "UPDATE sessions SET status = 'interrupted', updated_at = ? WHERE status = 'active'",
        )
        .run(boundedTime),
    );
    return Number(result.changes);
  }

  sessionStatus(sessionId) {
    const row = this.#database
      .prepare("SELECT status FROM sessions WHERE session_id = ?")
      .get(assertUuid(sessionId, "sessionId"));
    return typeof row?.status === "string" ? row.status : null;
  }

  issueApproval({ approvalId, sessionId, nonce }) {
    this.#database
      .prepare(
        "INSERT INTO approvals(approval_id, session_id, nonce, consumed_at) VALUES (?, ?, ?, NULL)",
      )
      .run(
        assertUuid(approvalId, "approvalId"),
        assertUuid(sessionId, "sessionId"),
        assertUuid(nonce, "nonce"),
      );
  }

  consumeNonce(nonce, consumedAt) {
    const boundedNonce = assertUuid(nonce, "nonce");
    const boundedTime = assertTimestamp(consumedAt, "consumedAt");
    const result = this.#immediate(() =>
      this.#database
        .prepare("UPDATE approvals SET consumed_at = ? WHERE nonce = ? AND consumed_at IS NULL")
        .run(boundedTime, boundedNonce),
    );
    return Number(result.changes) === 1;
  }

  reserveResearch(sessionId, requestedResults) {
    const boundedSessionId = assertUuid(sessionId, "sessionId");
    const boundedResults = assertBudget(requestedResults, "requestedResults");
    if (boundedResults < 1) throw new TypeError("requestedResults must be positive");
    const result = this.#immediate(() =>
      this.#database
        .prepare(`
          UPDATE research_budgets
          SET remaining_requests = remaining_requests - 1,
              remaining_results = remaining_results - ?
          WHERE session_id = ?
            AND remaining_requests >= 1
            AND remaining_results >= ?
        `)
        .run(boundedResults, boundedSessionId, boundedResults),
    );
    return Number(result.changes) === 1;
  }

  researchBudget(sessionId) {
    const row = this.#database
      .prepare(
        "SELECT remaining_requests AS remainingRequests, remaining_results AS remainingResults FROM research_budgets WHERE session_id = ?",
      )
      .get(assertUuid(sessionId, "sessionId"));
    if (row === undefined) return null;
    return {
      remainingRequests: Number(row.remainingRequests),
      remainingResults: Number(row.remainingResults),
    };
  }
}
