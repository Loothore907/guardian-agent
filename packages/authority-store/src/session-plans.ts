import type { DatabaseSync } from "node:sqlite";
import {
  SessionPlanGrantSchema,
  SessionPlanStateSchema,
  PlanCheckRequestSchema,
  PendingPlanRequestSchema,
  OpaqueIdSchema,
  TimestampSchema,
  type DurableSessionRecord,
  type DurableConnectionRecord,
  type SessionPlanState,
  type PlanCheckResult,
} from "@guardian/contracts";

export const SESSION_PLANS_SQL = `
  CREATE TABLE session_plans (
    grant_id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(session_id),
    version INTEGER NOT NULL,
    grant_json TEXT NOT NULL,
    revoked_at TEXT,
    used_actions INTEGER NOT NULL DEFAULT 0,
    used_mutations INTEGER NOT NULL DEFAULT 0,
    UNIQUE(session_id, version)
  ) STRICT;
  CREATE TABLE plan_executions (
    session_id TEXT NOT NULL REFERENCES sessions(session_id),
    request_id TEXT NOT NULL,
    request_digest TEXT NOT NULL,
    grant_id TEXT NOT NULL REFERENCES session_plans(grant_id),
    mutation_key TEXT,
    consumed_at TEXT NOT NULL,
    PRIMARY KEY(session_id, request_id),
    UNIQUE(session_id, mutation_key)
  ) STRICT;
  CREATE TABLE pending_plan_requests (
    session_id TEXT NOT NULL REFERENCES sessions(session_id),
    request_id TEXT NOT NULL,
    pending_json TEXT NOT NULL,
    PRIMARY KEY(session_id, request_id)
  ) STRICT;
`;

const bindings = [
  "sessionId",
  "callerId",
  "missionId",
  "missionVersion",
  "profileId",
  "profileVersion",
  "policyVersion",
] as const;

/** All mutations run inside the owning store's BEGIN IMMEDIATE transaction. */
export class SessionPlans {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => string,
    private readonly session: (id: unknown) => DurableSessionRecord | null,
    private readonly connections: (id: unknown) => readonly DurableConnectionRecord[],
  ) {}

  get(id: unknown): SessionPlanState | null {
    const row = this.db
      .prepare("SELECT * FROM session_plans WHERE session_id = ? ORDER BY version DESC LIMIT 1")
      .get(OpaqueIdSchema.parse(id));
    if (!row) return null;
    return SessionPlanStateSchema.parse({
      grant: JSON.parse(String(row.grant_json)) as unknown,
      revoked: row.revoked_at !== null,
      usedActions: Number(row.used_actions),
      usedMutations: Number(row.used_mutations),
    });
  }

  store(value: unknown): void {
    const grant = SessionPlanGrantSchema.parse(value);
    const plan = grant.plan;
    const session = this.session(plan.sessionId);
    const now = Date.parse(TimestampSchema.parse(this.now()));
    if (
      !session ||
      session.status !== "active" ||
      bindings.some((key) => session[key] !== plan[key]) ||
      Date.parse(plan.startsAt) < Date.parse(session.startsAt) ||
      Date.parse(plan.expiresAt) > Date.parse(session.expiresAt) ||
      now < Date.parse(plan.startsAt) ||
      now >= Date.parse(plan.expiresAt) ||
      now < Date.parse(grant.confirmedAt) ||
      (grant.assurance === "development_confirmation" &&
        now - Date.parse(grant.confirmedAt) > 30_000)
    ) {
      throw new TypeError("plan does not match a fresh confirmation and active session");
    }
    if (plan.version !== (this.get(plan.sessionId)?.grant.plan.version ?? 0) + 1)
      throw new TypeError("plan version must follow the current grant");
    const connections = this.connections(plan.sessionId);
    if (
      plan.targets.some(
        (t) =>
          !connections.some(
            (c) =>
              c.status === "active" &&
              c.connectionId === t.connectionId &&
              c.owner === t.owner &&
              c.repository === t.repository &&
              c.permissions.includes(
                t.operation === "github.pull_request.merge"
                  ? "pull_request:merge"
                  : "pull_request:read",
              ),
          ),
      )
    )
      throw new TypeError("plan target is outside session connections");
    this.db
      .prepare(
        "INSERT INTO session_plans(grant_id, session_id, version, grant_json) VALUES (?, ?, ?, ?)",
      )
      .run(grant.grantId, plan.sessionId, plan.version, JSON.stringify(grant));
  }

  revoke(sessionId: unknown, grantId: unknown): boolean {
    return (
      Number(
        this.db
          .prepare(
            "UPDATE session_plans SET revoked_at = ? WHERE session_id = ? AND grant_id = ? AND revoked_at IS NULL",
          )
          .run(
            TimestampSchema.parse(this.now()),
            OpaqueIdSchema.parse(sessionId),
            OpaqueIdSchema.parse(grantId),
          ).changes,
      ) === 1
    );
  }

  pending(sessionId: unknown) {
    return this.db
      .prepare(
        "SELECT pending_json FROM pending_plan_requests WHERE session_id = ? ORDER BY request_id",
      )
      .all(OpaqueIdSchema.parse(sessionId))
      .map((row) =>
        PendingPlanRequestSchema.parse(JSON.parse(String(row.pending_json)) as unknown),
      );
  }

  check(value: unknown): PlanCheckResult {
    const input = PlanCheckRequestSchema.parse(value);
    const request = input.request;
    const state = this.get(request.sessionId);
    if (!state) return { status: "absent" };
    const now = TimestampSchema.parse(this.now());
    const block = (
      reason: Extract<PlanCheckResult, { status: "blocked" }>["reason"],
    ): PlanCheckResult => {
      // Keep the first immutable proposal. A later grant never executes this queue.
      const existing = this.pending(request.sessionId);
      const pendingBytes = Buffer.byteLength(
        JSON.stringify({ request, requestDigest: input.requestDigest, reason, firstSeenAt: now }),
        "utf8",
      );
      if (
        existing.length < 32 &&
        Buffer.byteLength(JSON.stringify(existing), "utf8") + pendingBytes < 48 * 1024
      ) {
        const pending = PendingPlanRequestSchema.parse({
          request,
          requestDigest: input.requestDigest,
          reason,
          firstSeenAt: now,
        });
        this.db
          .prepare(
            "INSERT OR IGNORE INTO pending_plan_requests(session_id, request_id, pending_json) VALUES (?, ?, ?)",
          )
          .run(request.sessionId, request.requestId, JSON.stringify(pending));
      }
      return { status: "blocked", reason };
    };
    if (input.phase === "defer") return block(input.blockReason ?? "binding_mismatch");
    if (input.blockReason !== undefined) return block("binding_mismatch");
    const { grant } = state;
    const plan = grant.plan;
    const session = this.session(request.sessionId);
    if (
      !session ||
      session.status !== "active" ||
      bindings.some((key) => request[key] !== plan[key] || session[key] !== plan[key]) ||
      (input.expectedGrantId !== undefined && input.expectedGrantId !== grant.grantId)
    )
      return block("binding_mismatch");
    if (state.revoked) return block("revoked");
    if (
      Date.parse(now) < Date.parse(plan.startsAt) ||
      Date.parse(now) >= Date.parse(plan.expiresAt) ||
      Date.parse(now) >= Date.parse(session.expiresAt)
    )
      return block("expired");
    const resource = request.resourceVersion;
    const target = plan.targets.find(
      (t) =>
        resource?.kind === "github_pull_request" &&
        t.operation === request.proposal.operation &&
        t.connectionId === request.connectionId &&
        t.owner === resource.owner &&
        t.repository === resource.repository &&
        t.pullRequest === resource.pullRequest &&
        t.headCommit === resource.headCommit,
    );
    if (!target) return block("out_of_plan");
    if (
      !this.connections(request.sessionId).some(
        (c) =>
          c.connectionId === target.connectionId &&
          c.status === "active" &&
          c.owner === target.owner &&
          c.repository === target.repository &&
          c.permissions.includes(
            target.operation === "github.pull_request.merge"
              ? "pull_request:merge"
              : "pull_request:read",
          ),
      )
    )
      return block("binding_mismatch");
    const mutation = target.operation === "github.pull_request.merge";
    if (input.observedBaseBranch !== undefined && input.observedBaseBranch !== target.baseBranch)
      return block("resource_changed");
    if (
      input.phase === "consume" &&
      (input.expectedGrantId === undefined || (mutation && input.observedBaseBranch === undefined))
    )
      return block("binding_mismatch");
    const mutationKey = mutation
      ? JSON.stringify([
          target.connectionId,
          target.owner,
          target.repository,
          target.pullRequest,
          target.headCommit,
        ])
      : null;
    if (
      this.db
        .prepare(
          "SELECT 1 FROM plan_executions WHERE session_id = ? AND (request_id = ? OR mutation_key = ?)",
        )
        .get(request.sessionId, request.requestId, mutationKey)
    )
      return block("replayed");
    if (
      state.usedActions >= plan.maxActions ||
      (mutation && state.usedMutations >= plan.maxMutations)
    )
      return block("exhausted");
    if (input.phase === "consume") {
      this.db
        .prepare(
          "INSERT INTO plan_executions(session_id, request_id, request_digest, grant_id, mutation_key, consumed_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          request.sessionId,
          request.requestId,
          input.requestDigest,
          grant.grantId,
          mutationKey,
          now,
        );
      this.db
        .prepare(
          "UPDATE session_plans SET used_actions = used_actions + 1, used_mutations = used_mutations + ? WHERE grant_id = ?",
        )
        .run(mutation ? 1 : 0, grant.grantId);
      this.db
        .prepare("DELETE FROM pending_plan_requests WHERE session_id = ? AND request_id = ?")
        .run(request.sessionId, request.requestId);
    }
    return {
      status: "allowed",
      grantId: grant.grantId,
      planDigest: grant.planDigest,
      baseBranch: target.baseBranch,
    };
  }
}
