import { chmodSync, existsSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { DatabaseSync, type StatementResultingChanges } from "node:sqlite";

import {
  ApprovalConsumptionRequestSchema,
  AuditEventSchema,
  AuthorityAttemptRecordSchema,
  AuthorityDecisionRecordSchema,
  DurableConnectionRecordSchema,
  DurableSessionBudgetSchema,
  DurableSessionRecordSchema,
  EvidenceExposureRecordSchema,
  ExactApprovalSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  type ApprovalConsumptionRequest,
  type AuditEvent,
  type AuthorityAttemptRecord,
  type AuthorityDecisionRecord,
  type DurableConnectionRecord,
  type DurableSessionBudget,
  type DurableSessionRecord,
  type EvidenceExposureRecord,
  type ExactApproval,
} from "@guardian/contracts";

const AUTHORITY_SCHEMA_VERSION = 3;

function isWithin(candidate: string, root: string): boolean {
  const pathFromRoot = relative(resolve(root), candidate);
  return pathFromRoot === "" || (!pathFromRoot.startsWith("..") && !isAbsolute(pathFromRoot));
}

export function assertAuthorityStorePath(value: unknown, workspaceRoots: readonly string[] = []) {
  if (typeof value !== "string" || !isAbsolute(value) || extname(value) !== ".sqlite") {
    throw new TypeError("authority store path must be an absolute .sqlite file");
  }
  const databasePath = resolve(value);
  if (workspaceRoots.some((root) => isWithin(databasePath, root))) {
    throw new TypeError("authority store must remain outside disposable session workspaces");
  }
  const parentStat = statSync(dirname(databasePath));
  if (!parentStat.isDirectory()) throw new TypeError("authority store parent must be a directory");
  if (process.platform !== "win32" && (parentStat.mode & 0o077) !== 0) {
    throw new TypeError("authority store parent permissions are too broad");
  }
  if (
    process.platform !== "win32" &&
    existsSync(databasePath) &&
    (statSync(databasePath).mode & 0o077) !== 0
  ) {
    throw new TypeError("authority store permissions are too broad");
  }
  return databasePath;
}

export type ApprovalConsumptionResult =
  "consumed" | "replayed" | "not_found" | "request_mismatch" | "not_active" | "expired";

export interface ResearchReservation {
  readonly reservationId: string;
  readonly sessionId: string;
  readonly reservedResults: number;
  readonly budget: DurableSessionBudget;
}

function changes(result: StatementResultingChanges): number {
  return Number(result.changes);
}

export class SqliteAuthorityStore {
  readonly #database: DatabaseSync;
  readonly #databasePath: string;
  readonly #now: () => string;
  readonly #readOnly: boolean;

  constructor(
    databasePathValue: unknown,
    options: {
      readonly workspaceRoots?: readonly string[];
      readonly readOnly?: boolean;
      readonly now?: () => string;
    } = {},
  ) {
    this.#databasePath = assertAuthorityStorePath(databasePathValue, options.workspaceRoots ?? []);
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#readOnly = options.readOnly ?? false;
    this.#database = new DatabaseSync(this.#databasePath, {
      allowExtension: false,
      defensive: true,
      enableDoubleQuotedStringLiterals: false,
      enableForeignKeyConstraints: true,
      readOnly: this.#readOnly,
      timeout: 5_000,
    });
    this.#database.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  }

  initialize(): void {
    const version = this.#schemaVersion();
    if (this.#readOnly) {
      if (version !== AUTHORITY_SCHEMA_VERSION) {
        throw new TypeError("authority store schema version is unsupported");
      }
      return;
    }
    if (version !== 0 && version !== 1 && version !== 2 && version !== AUTHORITY_SCHEMA_VERSION) {
      throw new TypeError("authority store schema version is unsupported");
    }
    this.#database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    if (version === 0) {
      this.#immediate(() => {
        this.#database.exec(`
          CREATE TABLE sessions (
            session_id TEXT PRIMARY KEY NOT NULL,
            caller_id TEXT NOT NULL,
            mission_id TEXT NOT NULL,
            mission_version INTEGER NOT NULL,
            profile_id TEXT NOT NULL,
            profile_version INTEGER NOT NULL,
            policy_version INTEGER NOT NULL,
            starts_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('active', 'interrupted', 'revoked', 'expired')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          ) STRICT;
          CREATE TABLE session_budgets (
            session_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions(session_id),
            remaining_tool_calls INTEGER NOT NULL CHECK (remaining_tool_calls >= 0),
            remaining_local_commands INTEGER NOT NULL CHECK (remaining_local_commands >= 0),
            remaining_research_requests INTEGER NOT NULL CHECK (remaining_research_requests >= 0),
            remaining_research_results INTEGER NOT NULL CHECK (remaining_research_results >= 0)
          ) STRICT;
          CREATE TABLE approvals (
            approval_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            caller_id TEXT NOT NULL,
            connection_id TEXT NOT NULL,
            policy_version INTEGER NOT NULL,
            request_digest TEXT NOT NULL,
            nonce TEXT UNIQUE NOT NULL,
            approved_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            consumed_at TEXT,
            approval_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE research_reservations (
            reservation_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            reserved_results INTEGER NOT NULL CHECK (reserved_results > 0),
            accepted_results INTEGER CHECK (
              accepted_results IS NULL OR
              (accepted_results >= 0 AND accepted_results <= reserved_results)
            ),
            reserved_at TEXT NOT NULL,
            settled_at TEXT
          ) STRICT;
          CREATE TABLE worker_tool_executions (
            execution_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            execution_digest TEXT NOT NULL,
            tool TEXT NOT NULL CHECK (tool IN ('guardian.session_status', 'guardian.local_command')),
            consumed_at TEXT NOT NULL,
            UNIQUE(session_id, execution_digest)
          ) STRICT;
          CREATE TABLE audit_events (
            event_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            sequence INTEGER NOT NULL CHECK (sequence > 0),
            occurred_at TEXT NOT NULL,
            event_json TEXT NOT NULL,
            UNIQUE(session_id, sequence)
          ) STRICT;
          CREATE TABLE connections (
            connection_id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL CHECK (provider = 'github'),
            status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
            owner TEXT NOT NULL,
            repository TEXT NOT NULL,
            connection_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE session_connections (
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            connection_id TEXT NOT NULL REFERENCES connections(connection_id),
            PRIMARY KEY(session_id, connection_id)
          ) STRICT;
          CREATE TABLE evidence_exposures (
            exposure_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            retrieved_at TEXT NOT NULL,
            exposure_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE authority_attempts (
            attempt_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            attempted_at TEXT NOT NULL,
            attempt_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE attempt_exposures (
            attempt_id TEXT NOT NULL REFERENCES authority_attempts(attempt_id),
            exposure_id TEXT NOT NULL REFERENCES evidence_exposures(exposure_id),
            PRIMARY KEY(attempt_id, exposure_id)
          ) STRICT;
          CREATE TABLE authority_decisions (
            decision_id TEXT PRIMARY KEY NOT NULL,
            attempt_id TEXT NOT NULL UNIQUE REFERENCES authority_attempts(attempt_id),
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            decided_at TEXT NOT NULL,
            decision_json TEXT NOT NULL
          ) STRICT;
          PRAGMA user_version = 3;
        `);
      });
    }
    if (version === 1) {
      this.#immediate(() => {
        this.#database.exec(`
          CREATE TABLE connections (
            connection_id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL CHECK (provider = 'github'),
            status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
            owner TEXT NOT NULL,
            repository TEXT NOT NULL,
            connection_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE session_connections (
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            connection_id TEXT NOT NULL REFERENCES connections(connection_id),
            PRIMARY KEY(session_id, connection_id)
          ) STRICT;
          CREATE TABLE evidence_exposures (
            exposure_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            retrieved_at TEXT NOT NULL,
            exposure_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE authority_attempts (
            attempt_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            attempted_at TEXT NOT NULL,
            attempt_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE attempt_exposures (
            attempt_id TEXT NOT NULL REFERENCES authority_attempts(attempt_id),
            exposure_id TEXT NOT NULL REFERENCES evidence_exposures(exposure_id),
            PRIMARY KEY(attempt_id, exposure_id)
          ) STRICT;
          CREATE TABLE authority_decisions (
            decision_id TEXT PRIMARY KEY NOT NULL,
            attempt_id TEXT NOT NULL UNIQUE REFERENCES authority_attempts(attempt_id),
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            decided_at TEXT NOT NULL,
            decision_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE worker_tool_executions (
            execution_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            execution_digest TEXT NOT NULL,
            tool TEXT NOT NULL CHECK (tool IN ('guardian.session_status', 'guardian.local_command')),
            consumed_at TEXT NOT NULL,
            UNIQUE(session_id, execution_digest)
          ) STRICT;
          PRAGMA user_version = 3;
        `);
      });
    }
    if (version === 2) {
      this.#immediate(() => {
        this.#database.exec(`
          CREATE TABLE worker_tool_executions (
            execution_id TEXT PRIMARY KEY NOT NULL,
            session_id TEXT NOT NULL REFERENCES sessions(session_id),
            execution_digest TEXT NOT NULL,
            tool TEXT NOT NULL CHECK (tool IN ('guardian.session_status', 'guardian.local_command')),
            consumed_at TEXT NOT NULL,
            UNIQUE(session_id, execution_digest)
          ) STRICT;
          PRAGMA user_version = 3;
        `);
      });
    }
    if (process.platform !== "win32") chmodSync(this.#databasePath, 0o600);
  }

  close(): void {
    if (this.#database.isOpen) this.#database.close();
  }

  #schemaVersion(): number {
    const row = this.#database.prepare("PRAGMA user_version").get();
    return Number(row?.user_version);
  }

  #immediate<T>(operation: () => T): T {
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

  createSession(
    sessionValue: unknown,
    budgetValue: unknown,
    connectionIdsValue: readonly unknown[] = [],
  ): void {
    const session = DurableSessionRecordSchema.parse(sessionValue);
    const budget = DurableSessionBudgetSchema.parse(budgetValue);
    const connectionIds = connectionIdsValue.map((value) => OpaqueIdSchema.parse(value));
    if (session.status !== "active" || budget.sessionId !== session.sessionId) {
      throw new TypeError("new durable session and budget bindings are invalid");
    }
    if (new Set(connectionIds).size !== connectionIds.length) {
      throw new TypeError("duplicate session connection bindings are not allowed");
    }
    this.#immediate(() => {
      this.#database
        .prepare(
          `
          INSERT INTO sessions(
            session_id, caller_id, mission_id, mission_version, profile_id,
            profile_version, policy_version, starts_at, expires_at, status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          session.sessionId,
          session.callerId,
          session.missionId,
          session.missionVersion,
          session.profileId,
          session.profileVersion,
          session.policyVersion,
          session.startsAt,
          session.expiresAt,
          session.status,
          session.createdAt,
          session.updatedAt,
        );
      this.#database
        .prepare(
          `
          INSERT INTO session_budgets(
            session_id, remaining_tool_calls, remaining_local_commands,
            remaining_research_requests, remaining_research_results
          ) VALUES (?, ?, ?, ?, ?)
        `,
        )
        .run(
          budget.sessionId,
          budget.remainingToolCalls,
          budget.remainingLocalCommands,
          budget.remainingResearchRequests,
          budget.remainingResearchResults,
        );
      const bindConnection = this.#database.prepare(
        "INSERT INTO session_connections(session_id, connection_id) VALUES (?, ?)",
      );
      for (const connectionId of connectionIds) bindConnection.run(session.sessionId, connectionId);
    });
  }

  createConnection(value: unknown): void {
    const connection = DurableConnectionRecordSchema.parse(value);
    if (connection.status !== "active") {
      throw new TypeError("new durable connection must be active");
    }
    this.#database
      .prepare(
        "INSERT INTO connections(connection_id, provider, status, owner, repository, connection_json) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        connection.connectionId,
        connection.provider,
        connection.status,
        connection.owner,
        connection.repository,
        JSON.stringify(connection),
      );
  }

  getConnection(connectionIdValue: unknown): DurableConnectionRecord | null {
    const connectionId = OpaqueIdSchema.parse(connectionIdValue);
    const row = this.#database
      .prepare("SELECT connection_json AS connectionJson FROM connections WHERE connection_id = ?")
      .get(connectionId);
    if (typeof row?.connectionJson !== "string") return null;
    return DurableConnectionRecordSchema.parse(JSON.parse(row.connectionJson) as unknown);
  }

  revokeConnection(connectionIdValue: unknown): boolean {
    const connectionId = OpaqueIdSchema.parse(connectionIdValue);
    const updatedAt = TimestampSchema.parse(this.#now());
    return this.#immediate(() => {
      const connection = this.getConnection(connectionId);
      if (connection === null || connection.status === "revoked") return false;
      const revoked = DurableConnectionRecordSchema.parse({
        ...connection,
        status: "revoked",
        updatedAt,
      });
      return (
        changes(
          this.#database
            .prepare(
              "UPDATE connections SET status = 'revoked', connection_json = ? WHERE connection_id = ? AND status = 'active'",
            )
            .run(JSON.stringify(revoked), connectionId),
        ) === 1
      );
    });
  }

  getSessionConnections(sessionIdValue: unknown): readonly DurableConnectionRecord[] {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    return this.#database
      .prepare(
        "SELECT connections.connection_json AS connectionJson FROM session_connections JOIN connections USING(connection_id) WHERE session_id = ? ORDER BY connection_id",
      )
      .all(sessionId)
      .map((row) => {
        if (typeof row.connectionJson !== "string") {
          throw new TypeError("stored connection is invalid");
        }
        return DurableConnectionRecordSchema.parse(JSON.parse(row.connectionJson) as unknown);
      });
  }

  getSession(sessionIdValue: unknown): DurableSessionRecord | null {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const row = this.#database
      .prepare(
        `
        SELECT session_id AS sessionId, caller_id AS callerId, mission_id AS missionId,
          mission_version AS missionVersion, profile_id AS profileId,
          profile_version AS profileVersion, policy_version AS policyVersion,
          starts_at AS startsAt, expires_at AS expiresAt, status,
          created_at AS createdAt, updated_at AS updatedAt
        FROM sessions WHERE session_id = ?
      `,
      )
      .get(sessionId);
    return row === undefined
      ? null
      : DurableSessionRecordSchema.parse({ schemaVersion: 1, ...row });
  }

  interruptActiveSessions(): number {
    const interruptedAt = TimestampSchema.parse(this.#now());
    return this.#immediate(() => {
      const futureSession = this.#database
        .prepare(
          "SELECT 1 AS present FROM sessions WHERE status = 'active' AND created_at > ? LIMIT 1",
        )
        .get(interruptedAt);
      if (futureSession !== undefined) {
        throw new TypeError("authority store clock precedes an active session");
      }
      return changes(
        this.#database
          .prepare(
            "UPDATE sessions SET status = 'interrupted', updated_at = ? WHERE status = 'active'",
          )
          .run(interruptedAt),
      );
    });
  }

  getBudget(sessionIdValue: unknown): DurableSessionBudget | null {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const row = this.#database
      .prepare(
        `
        SELECT session_id AS sessionId, remaining_tool_calls AS remainingToolCalls,
          remaining_local_commands AS remainingLocalCommands,
          remaining_research_requests AS remainingResearchRequests,
          remaining_research_results AS remainingResearchResults
        FROM session_budgets WHERE session_id = ?
      `,
      )
      .get(sessionId);
    return row === undefined ? null : DurableSessionBudgetSchema.parse(row);
  }

  consumeToolCall(sessionIdValue: unknown): DurableSessionBudget | null {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const consumedAt = TimestampSchema.parse(this.#now());
    return this.#immediate(() => {
      const result = this.#database
        .prepare(
          `
          UPDATE session_budgets
          SET remaining_tool_calls = remaining_tool_calls - 1
          WHERE session_id = ?
            AND remaining_tool_calls >= 1
            AND EXISTS (
              SELECT 1 FROM sessions
              WHERE sessions.session_id = session_budgets.session_id
                AND sessions.status = 'active'
                AND sessions.starts_at <= ?
                AND sessions.expires_at > ?
            )
        `,
        )
        .run(sessionId, consumedAt, consumedAt);
      if (changes(result) !== 1) return null;
      const budget = this.getBudget(sessionId);
      if (budget === null) throw new TypeError("tool budget disappeared after consumption");
      return budget;
    });
  }

  consumeWorkerToolCall(
    sessionIdValue: unknown,
    executionIdValue: unknown,
    executionDigestValue: unknown,
  ): DurableSessionBudget | null {
    return this.#consumeWorkerExecution(
      sessionIdValue,
      executionIdValue,
      executionDigestValue,
      "guardian.session_status",
      false,
    );
  }

  consumeLocalCommand(
    sessionIdValue: unknown,
    executionIdValue: unknown,
    executionDigestValue: unknown,
  ): DurableSessionBudget | null {
    return this.#consumeWorkerExecution(
      sessionIdValue,
      executionIdValue,
      executionDigestValue,
      "guardian.local_command",
      true,
    );
  }

  #consumeWorkerExecution(
    sessionIdValue: unknown,
    executionIdValue: unknown,
    executionDigestValue: unknown,
    tool: "guardian.session_status" | "guardian.local_command",
    consumeLocalCommand: boolean,
  ): DurableSessionBudget | null {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const executionId = OpaqueIdSchema.parse(executionIdValue);
    const executionDigest = Sha256DigestSchema.parse(executionDigestValue);
    const consumedAt = TimestampSchema.parse(this.#now());
    return this.#immediate(() => {
      const prior = this.#database
        .prepare(
          `SELECT 1 AS present FROM worker_tool_executions
           WHERE execution_id = ? OR (session_id = ? AND execution_digest = ?) LIMIT 1`,
        )
        .get(executionId, sessionId, executionDigest);
      if (prior !== undefined) return null;
      const result = this.#database
        .prepare(
          `
          UPDATE session_budgets
          SET remaining_tool_calls = remaining_tool_calls - 1,
              remaining_local_commands = remaining_local_commands - ?
          WHERE session_id = ?
            AND remaining_tool_calls >= 1
            AND remaining_local_commands >= ?
            AND EXISTS (
              SELECT 1 FROM sessions
              WHERE sessions.session_id = session_budgets.session_id
                AND sessions.status = 'active'
                AND sessions.starts_at <= ?
                AND sessions.expires_at > ?
            )
        `,
        )
        .run(
          consumeLocalCommand ? 1 : 0,
          sessionId,
          consumeLocalCommand ? 1 : 0,
          consumedAt,
          consumedAt,
        );
      if (changes(result) !== 1) return null;
      this.#database
        .prepare(
          `INSERT INTO worker_tool_executions(
             execution_id, session_id, execution_digest, tool, consumed_at
           ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(executionId, sessionId, executionDigest, tool, consumedAt);
      const budget = this.getBudget(sessionId);
      if (budget === null) throw new TypeError("worker-tool budget disappeared after consumption");
      return budget;
    });
  }

  reserveResearch(
    sessionIdValue: unknown,
    requestedResultsValue: unknown,
  ): ResearchReservation | null {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const reservedAt = TimestampSchema.parse(this.#now());
    const requestedResults = Number(requestedResultsValue);
    if (!Number.isInteger(requestedResults) || requestedResults < 1 || requestedResults > 3) {
      throw new TypeError("requested research results must be an integer from 1 to 3");
    }
    return this.#immediate(() => {
      const reservationId = randomUUID();
      const result = this.#database
        .prepare(
          `
          UPDATE session_budgets
          SET remaining_tool_calls = remaining_tool_calls - 1,
              remaining_research_requests = remaining_research_requests - 1,
              remaining_research_results = remaining_research_results - ?
          WHERE session_id = ?
            AND remaining_tool_calls >= 1
            AND remaining_research_requests >= 1
            AND remaining_research_results >= ?
            AND EXISTS (
              SELECT 1 FROM sessions
              WHERE sessions.session_id = session_budgets.session_id
                AND sessions.status = 'active'
                AND sessions.starts_at <= ?
                AND sessions.expires_at > ?
            )
        `,
        )
        .run(requestedResults, sessionId, requestedResults, reservedAt, reservedAt);
      if (changes(result) !== 1) return null;
      this.#database
        .prepare(
          "INSERT INTO research_reservations(reservation_id, session_id, reserved_results, accepted_results, reserved_at, settled_at) VALUES (?, ?, ?, NULL, ?, NULL)",
        )
        .run(reservationId, sessionId, requestedResults, reservedAt);
      const budget = this.getBudget(sessionId);
      if (budget === null) throw new TypeError("reserved research budget disappeared");
      return { reservationId, sessionId, reservedResults: requestedResults, budget };
    });
  }

  settleResearchResults(
    reservationIdValue: unknown,
    sessionIdValue: unknown,
    acceptedResultsValue: unknown,
  ): DurableSessionBudget {
    const reservationId = OpaqueIdSchema.parse(reservationIdValue);
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const acceptedResults = Number(acceptedResultsValue);
    const settledAt = TimestampSchema.parse(this.#now());
    if (!Number.isInteger(acceptedResults) || acceptedResults < 0 || acceptedResults > 3) {
      throw new TypeError("accepted research result count is invalid");
    }
    return this.#immediate(() => {
      const reservation = this.#database
        .prepare(
          "SELECT reserved_results AS reservedResults, settled_at AS settledAt FROM research_reservations WHERE reservation_id = ? AND session_id = ?",
        )
        .get(reservationId, sessionId);
      if (
        reservation === undefined ||
        typeof reservation.settledAt === "string" ||
        acceptedResults > Number(reservation.reservedResults)
      ) {
        throw new TypeError("research reservation is unavailable or already settled");
      }
      const reservedResults = Number(reservation.reservedResults);
      const result = this.#database
        .prepare(
          "UPDATE session_budgets SET remaining_research_results = remaining_research_results + ? WHERE session_id = ?",
        )
        .run(reservedResults - acceptedResults, sessionId);
      if (changes(result) !== 1) throw new TypeError("research session is unavailable");
      const settlement = this.#database
        .prepare(
          "UPDATE research_reservations SET accepted_results = ?, settled_at = ? WHERE reservation_id = ? AND settled_at IS NULL",
        )
        .run(acceptedResults, settledAt, reservationId);
      if (changes(settlement) !== 1)
        throw new TypeError("research reservation was already settled");
      const budget = this.getBudget(sessionId);
      if (budget === null) throw new TypeError("research budget disappeared after settlement");
      return budget;
    });
  }

  storeApproval(value: unknown): void {
    const approval = ExactApprovalSchema.parse(value);
    this.#immediate(() => {
      const session = this.getSession(approval.sessionId);
      if (
        session === null ||
        session.status !== "active" ||
        session.callerId !== approval.callerId ||
        session.missionId !== approval.missionId ||
        session.missionVersion !== approval.missionVersion ||
        session.profileId !== approval.profileId ||
        session.profileVersion !== approval.profileVersion ||
        session.policyVersion !== approval.policyVersion
      ) {
        throw new TypeError("approval does not match an active durable session");
      }
      const connection = this.#database
        .prepare(
          "SELECT 1 AS present FROM session_connections JOIN connections USING(connection_id) WHERE session_id = ? AND connection_id = ? AND status = 'active'",
        )
        .get(approval.sessionId, approval.connectionId);
      if (connection === undefined) {
        throw new TypeError("approval connection is not active and session-bound");
      }
      this.#database
        .prepare(
          `
        INSERT INTO approvals(
          approval_id, session_id, caller_id, connection_id, policy_version,
          request_digest, nonce, approved_at, expires_at, consumed_at, approval_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
        `,
        )
        .run(
          approval.approvalId,
          approval.sessionId,
          approval.callerId,
          approval.connectionId,
          approval.policyVersion,
          approval.requestDigest,
          approval.nonce,
          approval.approvedAt,
          approval.expiresAt,
          JSON.stringify(approval),
        );
    });
  }

  getApproval(approvalIdValue: unknown): ExactApproval | null {
    const approvalId = OpaqueIdSchema.parse(approvalIdValue);
    const row = this.#database
      .prepare("SELECT approval_json AS approvalJson FROM approvals WHERE approval_id = ?")
      .get(approvalId);
    if (typeof row?.approvalJson !== "string") return null;
    return ExactApprovalSchema.parse(JSON.parse(row.approvalJson) as unknown);
  }

  getApprovalState(approvalIdValue: unknown): "available" | "consumed" | null {
    const approvalId = OpaqueIdSchema.parse(approvalIdValue);
    const row = this.#database
      .prepare("SELECT consumed_at AS consumedAt FROM approvals WHERE approval_id = ?")
      .get(approvalId);
    if (row === undefined) return null;
    return typeof row.consumedAt === "string" ? "consumed" : "available";
  }

  consumeApproval(value: unknown): ApprovalConsumptionResult {
    const request: ApprovalConsumptionRequest = ApprovalConsumptionRequestSchema.parse(value);
    const consumedAt = TimestampSchema.parse(this.#now());
    return this.#immediate(() => {
      const row = this.#database
        .prepare(
          `
          SELECT approvals.caller_id AS callerId,
            approvals.connection_id AS connectionId,
            approvals.policy_version AS policyVersion,
            approvals.request_digest AS requestDigest,
            approvals.nonce AS nonce,
            approvals.approved_at AS approvedAt,
            approvals.expires_at AS expiresAt,
            approvals.consumed_at AS consumedAt,
            session_connections.connection_id AS boundConnectionId,
            connections.status AS connectionStatus,
            sessions.status AS sessionStatus, sessions.starts_at AS sessionStartsAt,
            sessions.expires_at AS sessionExpiresAt
          FROM approvals JOIN sessions USING(session_id)
          LEFT JOIN session_connections
            ON session_connections.session_id = approvals.session_id
            AND session_connections.connection_id = approvals.connection_id
          LEFT JOIN connections ON connections.connection_id = approvals.connection_id
          WHERE approvals.approval_id = ? AND approvals.session_id = ?
        `,
        )
        .get(request.approvalId, request.sessionId);
      if (row === undefined) return "not_found";
      if (
        row.callerId !== request.callerId ||
        row.connectionId !== request.connectionId ||
        row.policyVersion !== request.policyVersion ||
        row.requestDigest !== request.requestDigest ||
        row.nonce !== request.nonce ||
        row.boundConnectionId !== request.connectionId ||
        row.connectionStatus !== "active"
      ) {
        return "request_mismatch";
      }
      if (typeof row.consumedAt === "string") return "replayed";
      if (
        row.sessionStatus !== "active" ||
        Date.parse(consumedAt) < Date.parse(String(row.approvedAt)) ||
        Date.parse(consumedAt) < Date.parse(String(row.sessionStartsAt))
      ) {
        return "not_active";
      }
      if (
        Date.parse(consumedAt) >= Date.parse(String(row.expiresAt)) ||
        Date.parse(consumedAt) >= Date.parse(String(row.sessionExpiresAt))
      ) {
        return "expired";
      }
      const result = this.#database
        .prepare(
          "UPDATE approvals SET consumed_at = ? WHERE approval_id = ? AND consumed_at IS NULL",
        )
        .run(consumedAt, request.approvalId);
      return changes(result) === 1 ? "consumed" : "replayed";
    });
  }

  appendAuditEvent(value: unknown): void {
    const event: AuditEvent = AuditEventSchema.parse(value);
    this.#immediate(() => {
      const row = this.#database
        .prepare(
          "SELECT COALESCE(MAX(sequence), 0) + 1 AS nextSequence FROM audit_events WHERE session_id = ?",
        )
        .get(event.sessionId);
      if (Number(row?.nextSequence) !== event.sequence) {
        throw new TypeError("audit event sequence is not the next session sequence");
      }
      this.#database
        .prepare(
          "INSERT INTO audit_events(event_id, session_id, sequence, occurred_at, event_json) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          event.eventId,
          event.sessionId,
          event.sequence,
          event.occurredAt,
          JSON.stringify(event),
        );
    });
  }

  listAuditEvents(sessionIdValue: unknown): readonly AuditEvent[] {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    return this.#database
      .prepare(
        "SELECT event_json AS eventJson FROM audit_events WHERE session_id = ? ORDER BY sequence",
      )
      .all(sessionId)
      .map((row) => {
        if (typeof row.eventJson !== "string") throw new TypeError("stored audit event is invalid");
        return AuditEventSchema.parse(JSON.parse(row.eventJson) as unknown);
      });
  }

  appendEvidenceExposure(value: unknown): void {
    const exposure = EvidenceExposureRecordSchema.parse(value);
    this.#immediate(() => {
      const session = this.getSession(exposure.sessionId);
      if (
        session === null ||
        Date.parse(exposure.retrievedAt) < Date.parse(session.startsAt) ||
        Date.parse(exposure.retrievedAt) >= Date.parse(session.expiresAt)
      ) {
        throw new TypeError("evidence exposure is outside the durable session lifetime");
      }
      this.#database
        .prepare(
          "INSERT INTO evidence_exposures(exposure_id, session_id, retrieved_at, exposure_json) VALUES (?, ?, ?, ?)",
        )
        .run(
          exposure.exposureId,
          exposure.sessionId,
          exposure.retrievedAt,
          JSON.stringify(exposure),
        );
    });
  }

  appendAuthorityAttempt(value: unknown): void {
    const attempt = AuthorityAttemptRecordSchema.parse(value);
    this.#immediate(() => {
      const session = this.getSession(attempt.sessionId);
      if (
        session === null ||
        session.callerId !== attempt.callerId ||
        Date.parse(attempt.attemptedAt) < Date.parse(session.startsAt) ||
        Date.parse(attempt.attemptedAt) >= Date.parse(session.expiresAt)
      ) {
        throw new TypeError("authority attempt does not match the durable session");
      }
      const insertExposure = this.#database.prepare(
        "INSERT INTO attempt_exposures(attempt_id, exposure_id) VALUES (?, ?)",
      );
      for (const exposureId of attempt.evidenceExposureIds) {
        const exposure = this.#database
          .prepare(
            "SELECT retrieved_at AS retrievedAt FROM evidence_exposures WHERE exposure_id = ? AND session_id = ?",
          )
          .get(exposureId, attempt.sessionId);
        if (
          exposure === undefined ||
          Date.parse(String(exposure.retrievedAt)) > Date.parse(attempt.attemptedAt)
        ) {
          throw new TypeError("attempt evidence was not available before the attempt");
        }
      }
      this.#database
        .prepare(
          "INSERT INTO authority_attempts(attempt_id, session_id, attempted_at, attempt_json) VALUES (?, ?, ?, ?)",
        )
        .run(attempt.attemptId, attempt.sessionId, attempt.attemptedAt, JSON.stringify(attempt));
      for (const exposureId of attempt.evidenceExposureIds) {
        insertExposure.run(attempt.attemptId, exposureId);
      }
    });
  }

  appendAuthorityDecision(value: unknown): void {
    const decision = AuthorityDecisionRecordSchema.parse(value);
    this.#immediate(() => {
      const attempt = this.#database
        .prepare(
          "SELECT attempted_at AS attemptedAt FROM authority_attempts WHERE attempt_id = ? AND session_id = ?",
        )
        .get(decision.attemptId, decision.sessionId);
      if (
        attempt === undefined ||
        Date.parse(decision.decidedAt) < Date.parse(String(attempt.attemptedAt))
      ) {
        throw new TypeError("authority decision does not follow its bound attempt");
      }
      this.#database
        .prepare(
          "INSERT INTO authority_decisions(decision_id, attempt_id, session_id, decided_at, decision_json) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          decision.decisionId,
          decision.attemptId,
          decision.sessionId,
          decision.decidedAt,
          JSON.stringify(decision),
        );
    });
  }

  getAuthorityContext(sessionIdValue: unknown): {
    readonly exposures: readonly EvidenceExposureRecord[];
    readonly attempts: readonly AuthorityAttemptRecord[];
    readonly decisions: readonly AuthorityDecisionRecord[];
  } {
    const sessionId = OpaqueIdSchema.parse(sessionIdValue);
    const parseRows = <T>(sql: string, column: string, schema: { parse(value: unknown): T }) =>
      this.#database
        .prepare(sql)
        .all(sessionId)
        .map((row) => {
          const value = row[column];
          if (typeof value !== "string") throw new TypeError("stored authority context is invalid");
          return schema.parse(JSON.parse(value) as unknown);
        });
    return {
      exposures: parseRows(
        "SELECT exposure_json AS contextJson FROM evidence_exposures WHERE session_id = ? ORDER BY retrieved_at, exposure_id",
        "contextJson",
        EvidenceExposureRecordSchema,
      ),
      attempts: parseRows(
        "SELECT attempt_json AS contextJson FROM authority_attempts WHERE session_id = ? ORDER BY attempted_at, attempt_id",
        "contextJson",
        AuthorityAttemptRecordSchema,
      ),
      decisions: parseRows(
        "SELECT decision_json AS contextJson FROM authority_decisions WHERE session_id = ? ORDER BY decided_at, decision_id",
        "contextJson",
        AuthorityDecisionRecordSchema,
      ),
    };
  }
}
