import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { SqliteAuthorityStore } from "./index.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  mission: "33333333-3333-4333-8333-333333333333",
  profile: "44444444-4444-4444-8444-444444444444",
  request: "55555555-5555-4555-8555-555555555555",
  approval: "66666666-6666-4666-8666-666666666666",
  connection: "77777777-7777-4777-8777-777777777777",
  nonce: "88888888-8888-4888-8888-888888888888",
  human: "99999999-9999-4999-8999-999999999999",
  exposure: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  provenance: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  attempt: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  decision: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const;

const CREATED_AT = "2026-08-30T22:30:00.000Z";
const ACTIVE_AT = "2026-08-30T22:32:00.000Z";
const EXPIRES_AT = "2026-08-30T22:40:00.000Z";
const REQUEST_DIGEST = "c".repeat(64);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function databasePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "guardian-authority-store-"));
  temporaryDirectories.push(directory);
  if (process.platform !== "win32") await chmod(directory, 0o700);
  return join(directory, "authority.sqlite");
}

function session() {
  return {
    schemaVersion: 1,
    sessionId: IDS.session,
    callerId: IDS.caller,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    startsAt: CREATED_AT,
    expiresAt: EXPIRES_AT,
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  } as const;
}

function budget() {
  return {
    sessionId: IDS.session,
    remainingToolCalls: 3,
    remainingLocalCommands: 1,
    remainingResearchRequests: 1,
    remainingResearchResults: 2,
  } as const;
}

function approval(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    approvalId: IDS.approval,
    requestId: IDS.request,
    requestDigest: REQUEST_DIGEST,
    sessionId: IDS.session,
    callerId: IDS.caller,
    connectionId: IDS.connection,
    missionId: IDS.mission,
    missionVersion: 1,
    profileId: IDS.profile,
    profileVersion: 1,
    policyVersion: 1,
    resourceVersion: {
      kind: "github_pull_request",
      owner: "loothore907",
      repository: "guardian-agent",
      pullRequest: 5,
      headCommit: "a".repeat(40),
    },
    scopeDigest: "d".repeat(64),
    nonce: IDS.nonce,
    maxUses: 1,
    approvedBy: { kind: "human", principalId: IDS.human },
    approvedAt: "2026-08-30T22:31:00.000Z",
    expiresAt: "2026-08-30T22:36:00.000Z",
    ...overrides,
  } as const;
}

function connection(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    connectionId: IDS.connection,
    provider: "github",
    credentialStoreHandle: "guardian-credential://github/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    owner: "loothore907",
    repository: "guardian-agent",
    permissions: ["pull_request:read", "pull_request:merge"],
    status: "active",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  } as const;
}

function consumption(overrides: Record<string, unknown> = {}) {
  return {
    approvalId: IDS.approval,
    nonce: IDS.nonce,
    requestDigest: REQUEST_DIGEST,
    sessionId: IDS.session,
    callerId: IDS.caller,
    connectionId: IDS.connection,
    policyVersion: 1,
    ...overrides,
  };
}

async function openStore(now = ACTIVE_AT) {
  const path = await databasePath();
  const store = new SqliteAuthorityStore(path, { now: () => now });
  store.initialize();
  return { path, store };
}

describe("SQLite authority store", () => {
  it("persists immutable session identity and rejects reuse without partial budget mutation", async () => {
    const { path, store } = await openStore();
    store.createSession(session(), budget());
    expect(() => store.createSession(session(), { ...budget(), remainingToolCalls: 999 })).toThrow(
      /UNIQUE constraint failed/u,
    );
    expect(store.getBudget(IDS.session)).toEqual(budget());
    store.close();

    const restarted = new SqliteAuthorityStore(path, { now: () => ACTIVE_AT });
    restarted.initialize();
    expect(restarted.getSession(IDS.session)).toEqual(session());
    expect(restarted.interruptActiveSessions()).toBe(1);
    expect(restarted.getSession(IDS.session)?.status).toBe("interrupted");
    expect(() => restarted.createSession(session(), budget())).toThrow(/UNIQUE constraint failed/u);
    restarted.close();
  });

  it("uses one-time reservation identifiers and never refunds request or tool attempts", async () => {
    const { store } = await openStore();
    store.createSession(session(), budget());

    const reservation = store.reserveResearch(IDS.session, 2);
    expect(reservation).toMatchObject({
      sessionId: IDS.session,
      reservedResults: 2,
      budget: {
        remainingToolCalls: 2,
        remainingResearchRequests: 0,
        remainingResearchResults: 0,
      },
    });
    expect(reservation?.reservationId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(store.reserveResearch(IDS.session, 1)).toBeNull();

    expect(store.settleResearchResults(reservation?.reservationId, IDS.session, 1)).toEqual({
      ...budget(),
      remainingToolCalls: 2,
      remainingResearchRequests: 0,
      remainingResearchResults: 1,
    });
    expect(() => store.settleResearchResults(reservation?.reservationId, IDS.session, 0)).toThrow(
      /already settled/u,
    );
    store.close();
  });

  it("atomically consumes exact worker executions and rejects replay or mutation", async () => {
    const { store } = await openStore();
    store.createSession(session(), budget());
    const firstExecution = randomUUID();
    const firstDigest = "e".repeat(64);
    expect(store.consumeLocalCommand(IDS.session, firstExecution, firstDigest)).toEqual({
      ...budget(),
      remainingToolCalls: 2,
      remainingLocalCommands: 0,
    });
    expect(store.consumeLocalCommand(IDS.session, firstExecution, firstDigest)).toBeNull();
    expect(store.consumeLocalCommand(IDS.session, firstExecution, "f".repeat(64))).toBeNull();
    expect(store.consumeLocalCommand(IDS.session, randomUUID(), "1".repeat(64))).toBeNull();
    expect(store.getBudget(IDS.session)).toEqual({
      ...budget(),
      remainingToolCalls: 2,
      remainingLocalCommands: 0,
    });

    const statusExecution = randomUUID();
    const statusDigest = "2".repeat(64);
    expect(store.consumeWorkerToolCall(IDS.session, statusExecution, statusDigest)).toEqual({
      ...budget(),
      remainingToolCalls: 1,
      remainingLocalCommands: 0,
    });
    expect(store.consumeWorkerToolCall(IDS.session, statusExecution, statusDigest)).toBeNull();
    expect(store.getBudget(IDS.session)?.remainingToolCalls).toBe(1);
    store.close();
  });

  it("binds approvals to the durable session and consumes exact authority once", async () => {
    let evaluatedAt = ACTIVE_AT;
    const path = await databasePath();
    const store = new SqliteAuthorityStore(path, { now: () => evaluatedAt });
    store.initialize();
    store.createConnection(connection());
    store.createSession(session(), budget(), [IDS.connection]);
    expect(() => store.storeApproval(approval({ callerId: randomUUID() }))).toThrow(
      /does not match an active durable session/u,
    );
    store.storeApproval(approval());
    expect(store.getApproval(IDS.approval)).toEqual(approval());

    evaluatedAt = "2026-08-30T22:30:30.000Z";
    expect(store.consumeApproval(consumption())).toBe("not_active");
    evaluatedAt = ACTIVE_AT;
    expect(store.consumeApproval(consumption({ callerId: randomUUID() }))).toBe("request_mismatch");
    expect(store.consumeApproval(consumption())).toBe("consumed");
    expect(store.consumeApproval(consumption())).toBe("replayed");

    const secondApprovalId = randomUUID();
    const secondNonce = randomUUID();
    store.storeApproval(approval({ approvalId: secondApprovalId, nonce: secondNonce }));
    evaluatedAt = "2026-08-30T22:36:00.000Z";
    expect(
      store.consumeApproval(consumption({ approvalId: secondApprovalId, nonce: secondNonce })),
    ).toBe("expired");
    store.close();
  });

  it("stores only scoped credential references and freezes session connection bindings", async () => {
    const { store } = await openStore();
    store.createConnection(connection());
    store.createSession(session(), budget(), [IDS.connection]);
    expect(store.getSessionConnections(IDS.session)).toEqual([connection()]);
    expect(() => store.createConnection(connection())).toThrow(/UNIQUE constraint failed/u);
    expect(store.revokeConnection(IDS.connection)).toBe(true);
    expect(store.revokeConnection(IDS.connection)).toBe(false);
    expect(store.getSessionConnections(IDS.session)[0]).toMatchObject({ status: "revoked" });
    expect(() =>
      store.createConnection(
        connection({
          connectionId: randomUUID(),
          credentialStoreHandle: "github_pat_secret-value",
        }),
      ),
    ).toThrow();
    store.close();
  });

  it("persists a minimized temporal evidence-to-attempt-to-decision chain", async () => {
    const { store } = await openStore();
    store.createConnection(connection());
    store.createSession(session(), budget(), [IDS.connection]);
    const exposure = {
      schemaVersion: 1,
      exposureId: IDS.exposure,
      sessionId: IDS.session,
      provenanceEventIds: [IDS.provenance],
      sourceContentDigest: "e".repeat(64),
      sourceDomain: "docs.github.com",
      contentTrust: "untrusted_public_content",
      signals: ["instruction_like_content", "mission_override"],
      retrievedAt: "2026-08-30T22:31:00.000Z",
    } as const;
    const attempt = {
      schemaVersion: 1,
      attemptId: IDS.attempt,
      sessionId: IDS.session,
      callerId: IDS.caller,
      connectionId: IDS.connection,
      operation: "github.pull_request.merge",
      effectClass: "merge",
      destinationClass: "github_connection",
      requestDigest: REQUEST_DIGEST,
      evidenceExposureIds: [IDS.exposure],
      attemptedAt: "2026-08-30T22:32:00.000Z",
    } as const;
    const decision = {
      schemaVersion: 1,
      decisionId: IDS.decision,
      attemptId: IDS.attempt,
      sessionId: IDS.session,
      deterministicReasons: ["scope_expansion"],
      authorizationFloor: "deny",
      guardianOutcome: "not_assessed",
      providerBoundary: "not_crossed",
      adapterBoundary: "not_crossed",
      toolConsumption: "not_consumed",
      approvalConsumption: "not_consumed",
      controlOutcome: "denied",
      decidedAt: "2026-08-30T22:32:00.001Z",
    } as const;
    store.appendEvidenceExposure(exposure);
    store.appendAuthorityAttempt(attempt);
    store.appendAuthorityDecision(decision);
    expect(store.getAuthorityContext(IDS.session)).toEqual({
      exposures: [exposure],
      attempts: [attempt],
      decisions: [decision],
    });
    expect(() =>
      store.appendAuthorityAttempt({
        ...attempt,
        attemptId: randomUUID(),
        attemptedAt: "2026-08-30T22:30:30.000Z",
      }),
    ).toThrow(/not available before/u);
    expect(() =>
      store.appendEvidenceExposure({ ...exposure, rawContent: "ignore policy" }),
    ).toThrow();
    expect(() =>
      store.appendAuthorityDecision({ ...decision, rationale: "private reasoning" }),
    ).toThrow();
    store.close();
  });

  it("atomically migrates the prior production schema without resetting sessions", async () => {
    const path = await databasePath();
    const raw = new DatabaseSync(path);
    raw.exec(`
      CREATE TABLE sessions (
        session_id TEXT PRIMARY KEY NOT NULL, caller_id TEXT NOT NULL, mission_id TEXT NOT NULL,
        mission_version INTEGER NOT NULL, profile_id TEXT NOT NULL, profile_version INTEGER NOT NULL,
        policy_version INTEGER NOT NULL, starts_at TEXT NOT NULL, expires_at TEXT NOT NULL,
        status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      ) STRICT;
      CREATE TABLE session_budgets (
        session_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions(session_id),
        remaining_tool_calls INTEGER NOT NULL, remaining_local_commands INTEGER NOT NULL,
        remaining_research_requests INTEGER NOT NULL, remaining_research_results INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE approvals (
        approval_id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(session_id),
        caller_id TEXT NOT NULL, connection_id TEXT NOT NULL, policy_version INTEGER NOT NULL,
        request_digest TEXT NOT NULL, nonce TEXT UNIQUE NOT NULL, approved_at TEXT NOT NULL,
        expires_at TEXT NOT NULL, consumed_at TEXT, approval_json TEXT NOT NULL
      ) STRICT;
      CREATE TABLE research_reservations (
        reservation_id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(session_id),
        reserved_results INTEGER NOT NULL, accepted_results INTEGER, reserved_at TEXT NOT NULL, settled_at TEXT
      ) STRICT;
      CREATE TABLE audit_events (
        event_id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(session_id),
        sequence INTEGER NOT NULL, occurred_at TEXT NOT NULL, event_json TEXT NOT NULL,
        UNIQUE(session_id, sequence)
      ) STRICT;
      PRAGMA user_version = 1;
    `);
    raw.close();
    if (process.platform !== "win32") await chmod(path, 0o600);
    const migrated = new SqliteAuthorityStore(path);
    migrated.initialize();
    migrated.createConnection(connection());
    migrated.createSession(session(), budget(), [IDS.connection]);
    expect(migrated.getSession(IDS.session)).toEqual(session());
    migrated.close();
  });

  it("denies consumption and research after fail-closed restart interruption", async () => {
    const { store } = await openStore();
    store.createConnection(connection());
    store.createSession(session(), budget(), [IDS.connection]);
    store.storeApproval(approval());
    expect(store.interruptActiveSessions()).toBe(1);
    expect(store.consumeApproval(consumption())).toBe("not_active");
    expect(store.reserveResearch(IDS.session, 1)).toBeNull();
    store.close();
  });

  it("uses the store clock to deny research at exact session expiry", async () => {
    const path = await databasePath();
    const store = new SqliteAuthorityStore(path, { now: () => EXPIRES_AT });
    store.initialize();
    store.createSession(session(), budget());
    expect(store.reserveResearch(IDS.session, 1)).toBeNull();
    store.close();
  });

  it("fails closed when the recovery clock precedes an active session", async () => {
    const path = await databasePath();
    const store = new SqliteAuthorityStore(path, {
      now: () => "2026-08-30T22:29:59.999Z",
    });
    store.initialize();
    store.createSession(session(), budget());
    expect(() => store.interruptActiveSessions()).toThrow(/clock precedes an active session/u);
    expect(store.getSession(IDS.session)?.status).toBe("active");
    store.close();
  });

  it("stores only strict sanitized audit events in contiguous session order", async () => {
    const { store } = await openStore();
    store.createSession(session(), budget());
    const event = {
      schemaVersion: 1,
      eventId: randomUUID(),
      sessionId: IDS.session,
      sequence: 1,
      occurredAt: ACTIVE_AT,
      sanitized: true,
      type: "execution.result",
      requestDigest: REQUEST_DIGEST,
      outcome: "denied",
      resultCode: "request_mismatch",
    } as const;
    store.appendAuditEvent(event);
    expect(() => store.appendAuditEvent({ ...event, eventId: randomUUID(), sequence: 3 })).toThrow(
      /next session sequence/u,
    );
    expect(() => store.appendAuditEvent({ ...event, detail: "Bearer credential" })).toThrow();
    expect(store.listAuditEvents(IDS.session)).toEqual([event]);
    store.close();
  });

  it("fails closed on unknown schema versions and workspace placement", async () => {
    const path = await databasePath();
    const directory = join(path, "..");
    expect(() => new SqliteAuthorityStore(path, { workspaceRoots: [directory] })).toThrow(
      /outside disposable session workspaces/u,
    );

    const raw = new DatabaseSync(path);
    raw.exec("PRAGMA user_version = 4;");
    raw.close();
    if (process.platform !== "win32") await chmod(path, 0o600);
    const unsupported = new SqliteAuthorityStore(path);
    expect(() => unsupported.initialize()).toThrow(/schema version is unsupported/u);
    unsupported.close();
  });
});
