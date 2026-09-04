import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, lstatSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { DatabaseSync, type StatementResultingChanges } from "node:sqlite";

import {
  ManagedDemoAdmissionRequestSchema,
  ManagedDemoAdmissionResultSchema,
  ManagedDemoBudgetPolicySchema,
  ManagedDemoBudgetSnapshotSchema,
  ManagedDemoDeploymentIdentitySchema,
  ManagedDemoOperatorPolicyUpdateSchema,
  ManagedDemoOperatorPriceUpdateSchema,
  ManagedDemoPriceSnapshotSchema,
  ManagedDemoSettlementRequestSchema,
  ManagedDemoSettlementResultSchema,
  TimestampSchema,
  type ManagedDemoAdmissionRequest,
  type ManagedDemoAdmissionResult,
  type ManagedDemoBudgetPolicy,
  type ManagedDemoBudgetSnapshot,
  type ManagedDemoDeploymentIdentity,
  type ManagedDemoModelCeiling,
  type ManagedDemoModelRole,
  type ManagedDemoOperatorPolicyUpdate,
  type ManagedDemoOperatorPriceUpdate,
  type ManagedDemoPriceSnapshot,
  type ManagedDemoSettlementRequest,
  type ManagedDemoSettlementResult,
  type ManagedDemoUsage,
} from "@guardian/contracts";

const LEDGER_SCHEMA_VERSION = 1;
const SQLITE_FILE_SUFFIXES = ["", "-wal", "-shm", "-journal"] as const;

type ReservationRow = Readonly<{
  reservationId: unknown;
  journeyId: unknown;
  sourceFingerprint: unknown;
  admittedAt: unknown;
  expiresAt: unknown;
  state: unknown;
  preauthorizedMicroUsd: unknown;
  chargedMicroUsd: unknown;
  outcome: unknown;
  settlementJson: unknown;
  priceSnapshotJson: unknown;
}>;

function changes(result: StatementResultingChanges): number {
  return Number(result.changes);
}

function assertLedgerPath(value: unknown): string {
  if (typeof value !== "string" || !isAbsolute(value) || extname(value) !== ".sqlite") {
    throw new TypeError("managed-demo budget ledger path must be an absolute .sqlite file");
  }
  const databasePath = resolve(value);
  const parentStat = lstatSync(dirname(databasePath));
  if (!parentStat.isDirectory()) {
    throw new TypeError("managed-demo budget ledger parent must be a directory");
  }
  if (process.platform !== "win32") {
    const owner = process.getuid?.();
    if (owner === undefined || parentStat.uid !== owner || (parentStat.mode & 0o077) !== 0) {
      throw new TypeError("managed-demo budget ledger parent permissions are too broad");
    }
    for (const suffix of SQLITE_FILE_SUFFIXES) {
      const filePath = `${databasePath}${suffix}`;
      if (!existsSync(filePath)) continue;
      const fileStat = lstatSync(filePath);
      if (!fileStat.isFile() || fileStat.uid !== owner || (fileStat.mode & 0o077) !== 0) {
        throw new TypeError("managed-demo budget ledger file permissions are too broad");
      }
    }
  }
  return databasePath;
}

function parseStoredJson<T>(
  value: unknown,
  parser: { parse(value: unknown): T },
  label: string,
): T {
  if (typeof value !== "string") throw new TypeError(`stored ${label} is invalid`);
  return parser.parse(JSON.parse(value) as unknown);
}

function utcDay(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function addSeconds(timestamp: string, seconds: number): string {
  return new Date(Date.parse(timestamp) + seconds * 1_000).toISOString();
}

function sumInteger(rows: readonly Record<string, unknown>[], key: string): number {
  return rows.reduce((total, row) => {
    const value = Number(row[key]);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError("managed-demo budget ledger contains an invalid counter");
    }
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw new TypeError("managed-demo budget ledger counter overflowed");
    }
    return next;
  }, 0);
}

function tokenCost(tokens: number, rate: number): number {
  const numerator = BigInt(tokens) * BigInt(rate);
  const cost = (numerator + 999_999n) / 1_000_000n;
  if (cost > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("managed-demo token cost overflowed");
  }
  return Number(cost);
}

function usageCost(usage: readonly ManagedDemoUsage[], prices: ManagedDemoPriceSnapshot): number {
  let total = 0;
  for (const item of usage) {
    let itemCost: number;
    if (item.provider === "tavily") {
      itemCost = item.credits * prices.tavilyMicroUsdPerCredit;
    } else {
      const price = prices.models.find((candidate) => candidate.role === item.role);
      if (price === undefined || price.modelId !== item.modelId) {
        throw new TypeError("managed-demo usage model is not present in the price snapshot");
      }
      itemCost =
        tokenCost(item.promptTokens, price.inputMicroUsdPerMillionTokens) +
        tokenCost(item.completionTokens, price.outputMicroUsdPerMillionTokens);
    }
    total += itemCost;
    if (!Number.isSafeInteger(total)) throw new TypeError("managed-demo usage cost overflowed");
  }
  return total;
}

function modelCeiling(
  policy: ManagedDemoBudgetPolicy,
  role: ManagedDemoModelRole,
): ManagedDemoModelCeiling {
  const ceiling = policy.models.find((candidate) => candidate.role === role);
  if (ceiling === undefined) throw new TypeError("managed-demo usage role has no ceiling");
  return ceiling;
}

function validateUsage(
  request: ManagedDemoSettlementRequest,
  admittedAt: string,
  policy: ManagedDemoBudgetPolicy,
): void {
  const calls = new Map<string, number>();
  const tavilyOperations = new Map<string, number>();
  let tavilyCredits = 0;
  for (const usage of request.usage) {
    if (
      Date.parse(usage.recordedAt) < Date.parse(admittedAt) ||
      Date.parse(usage.recordedAt) > Date.parse(request.settledAt)
    ) {
      throw new TypeError("managed-demo usage is outside its reservation lifetime");
    }
    if (usage.provider === "tavily") {
      tavilyCredits += usage.credits;
      tavilyOperations.set(usage.operation, (tavilyOperations.get(usage.operation) ?? 0) + 1);
      continue;
    }
    const ceiling = modelCeiling(policy, usage.role);
    if (
      usage.modelId !== ceiling.modelId ||
      usage.promptTokens > ceiling.maxPromptTokensPerCall ||
      usage.completionTokens > ceiling.maxCompletionTokensPerCall
    ) {
      throw new TypeError("managed-demo usage exceeds its fixed model ceiling");
    }
    calls.set(usage.role, (calls.get(usage.role) ?? 0) + 1);
  }
  for (const [role, count] of calls) {
    const ceiling = modelCeiling(policy, role as ManagedDemoModelRole);
    if (count > ceiling.maxCallsPerJourney) {
      throw new TypeError("managed-demo usage exceeds its fixed call ceiling");
    }
  }
  if (
    (tavilyOperations.get("basic_search") ?? 0) > policy.research.maxBasicSearchesPerJourney ||
    (tavilyOperations.get("basic_extract") ?? 0) > policy.research.maxBasicExtractsPerJourney ||
    tavilyCredits > policy.research.maxTavilyCreditsPerJourney
  ) {
    throw new TypeError("managed-demo usage exceeds its fixed research ceiling");
  }
}

export class SqliteManagedDemoBudgetLedger {
  readonly #database: DatabaseSync;
  readonly #databasePath: string;
  #deployment: ManagedDemoDeploymentIdentity;
  #policy: ManagedDemoBudgetPolicy;
  #prices: ManagedDemoPriceSnapshot;
  readonly #now: () => string;
  readonly #randomId: () => string;

  constructor(
    databasePathValue: unknown,
    config: {
      readonly deployment: unknown;
      readonly policy: unknown;
      readonly prices: unknown;
      readonly now?: () => string;
      readonly randomId?: () => string;
    },
  ) {
    this.#databasePath = assertLedgerPath(databasePathValue);
    this.#deployment = ManagedDemoDeploymentIdentitySchema.parse(config.deployment);
    this.#policy = ManagedDemoBudgetPolicySchema.parse(config.policy);
    this.#prices = ManagedDemoPriceSnapshotSchema.parse(config.prices);
    this.#now = config.now ?? (() => new Date().toISOString());
    this.#randomId = config.randomId ?? randomUUID;
    if (
      this.#deployment.pool !== this.#policy.pool ||
      this.#deployment.policyId !== this.#policy.policyId ||
      this.#deployment.policyVersion !== this.#policy.version ||
      this.#prices.modelPolicyId !== this.#policy.modelPolicyId ||
      this.#prices.modelPolicyVersion !== this.#policy.modelPolicyVersion
    ) {
      throw new TypeError("managed-demo ledger configuration bindings are inconsistent");
    }
    this.#database = new DatabaseSync(this.#databasePath, {
      allowExtension: false,
      defensive: true,
      enableDoubleQuotedStringLiterals: false,
      enableForeignKeyConstraints: true,
      timeout: 5_000,
    });
    this.#database.exec("PRAGMA busy_timeout = 5000;");
  }

  initialize(): void {
    const version = Number(this.#database.prepare("PRAGMA user_version").get()?.user_version);
    if (version !== 0 && version !== LEDGER_SCHEMA_VERSION) {
      throw new TypeError("managed-demo budget ledger schema version is unsupported");
    }
    this.#database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    if (version === 0) {
      this.#immediate(() => {
        this.#database.exec(`
          CREATE TABLE ledger_configuration (
            singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
            deployment_json TEXT NOT NULL,
            policy_json TEXT NOT NULL,
            price_snapshot_json TEXT NOT NULL
          ) STRICT;
          CREATE TABLE journey_reservations (
            reservation_id TEXT PRIMARY KEY NOT NULL,
            journey_id TEXT NOT NULL UNIQUE,
            source_fingerprint TEXT NOT NULL,
            admitted_at TEXT NOT NULL,
            admitted_day TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            state TEXT NOT NULL CHECK (state IN ('reserved', 'settled', 'forfeited')),
            preauthorized_micro_usd INTEGER NOT NULL CHECK (preauthorized_micro_usd > 0),
            charged_micro_usd INTEGER CHECK (charged_micro_usd IS NULL OR charged_micro_usd >= 0),
            outcome TEXT CHECK (outcome IS NULL OR outcome IN ('completed', 'failed')),
            settled_at TEXT,
            settlement_json TEXT,
            price_snapshot_json TEXT NOT NULL
          ) STRICT;
          CREATE INDEX journey_reservations_day
            ON journey_reservations(admitted_day, state);
          CREATE INDEX journey_reservations_source_day
            ON journey_reservations(source_fingerprint, admitted_day, admitted_at);
        `);
        this.#database
          .prepare(
            "INSERT INTO ledger_configuration(singleton, deployment_json, policy_json, price_snapshot_json) VALUES (1, ?, ?, ?)",
          )
          .run(
            JSON.stringify(this.#deployment),
            JSON.stringify(this.#policy),
            JSON.stringify(this.#prices),
          );
        this.#database.exec(`PRAGMA user_version = ${LEDGER_SCHEMA_VERSION};`);
      });
    }
    const stored = this.#database
      .prepare(
        "SELECT deployment_json AS deploymentJson, policy_json AS policyJson, price_snapshot_json AS priceSnapshotJson FROM ledger_configuration WHERE singleton = 1",
      )
      .get();
    const deployment = parseStoredJson(
      stored?.deploymentJson,
      ManagedDemoDeploymentIdentitySchema,
      "managed-demo deployment identity",
    );
    const policy = parseStoredJson(
      stored?.policyJson,
      ManagedDemoBudgetPolicySchema,
      "managed-demo budget policy",
    );
    const prices = parseStoredJson(
      stored?.priceSnapshotJson,
      ManagedDemoPriceSnapshotSchema,
      "managed-demo price snapshot",
    );
    if (
      JSON.stringify(deployment) !== JSON.stringify(this.#deployment) ||
      JSON.stringify(policy) !== JSON.stringify(this.#policy) ||
      JSON.stringify(prices) !== JSON.stringify(this.#prices)
    ) {
      throw new TypeError("managed-demo ledger configuration does not match durable state");
    }
    this.#secureFiles();
  }

  close(): void {
    if (this.#database.isOpen) this.#database.close();
  }

  #secureFiles(): void {
    if (process.platform === "win32") return;
    const owner = process.getuid?.();
    if (owner === undefined) throw new TypeError("managed-demo ledger ownership is unavailable");
    for (const suffix of SQLITE_FILE_SUFFIXES) {
      const filePath = `${this.#databasePath}${suffix}`;
      if (!existsSync(filePath)) continue;
      chmodSync(filePath, 0o600);
      const fileStat = lstatSync(filePath);
      if (!fileStat.isFile() || fileStat.uid !== owner || (fileStat.mode & 0o777) !== 0o600) {
        throw new TypeError("managed-demo budget ledger permissions could not be secured");
      }
    }
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

  #expireInside(now: string): number {
    return changes(
      this.#database
        .prepare(
          `UPDATE journey_reservations
             SET state = 'forfeited', charged_micro_usd = preauthorized_micro_usd,
                 outcome = 'failed', settled_at = ?
           WHERE state = 'reserved' AND expires_at <= ?`,
        )
        .run(now, now),
    );
  }

  #snapshotInside(now: string): ManagedDemoBudgetSnapshot {
    const day = utcDay(now);
    const totals = this.#database
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN state = 'reserved' THEN preauthorized_micro_usd ELSE 0 END), 0) AS reserved,
           COALESCE(SUM(CASE WHEN state != 'reserved' THEN charged_micro_usd ELSE 0 END), 0) AS settled,
           COUNT(*) AS admissions,
           COALESCE(SUM(CASE WHEN state = 'settled' AND outcome = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
           COALESCE(SUM(CASE WHEN state = 'reserved' THEN 1 ELSE 0 END), 0) AS active
         FROM journey_reservations`,
      )
      .all();
    const daily = this.#database
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN state = 'reserved' THEN preauthorized_micro_usd ELSE 0 END), 0) AS reserved,
           COALESCE(SUM(CASE WHEN state != 'reserved' THEN charged_micro_usd ELSE 0 END), 0) AS settled,
           COUNT(*) AS admissions,
           COALESCE(SUM(CASE WHEN state = 'settled' AND outcome = 'completed' THEN 1 ELSE 0 END), 0) AS completed
         FROM journey_reservations WHERE admitted_day = ?`,
      )
      .all(day);
    const total = totals[0];
    const today = daily[0];
    if (total === undefined || today === undefined) {
      throw new TypeError("managed-demo budget ledger counters are unavailable");
    }
    return ManagedDemoBudgetSnapshotSchema.parse({
      schemaVersion: 1,
      policyId: this.#policy.policyId,
      policyVersion: this.#policy.version,
      pool: this.#policy.pool,
      enabled: this.#policy.enabled,
      totalReservedMicroUsd: sumInteger([total], "reserved"),
      totalSettledMicroUsd: sumInteger([total], "settled"),
      dailyReservedMicroUsd: sumInteger([today], "reserved"),
      dailySettledMicroUsd: sumInteger([today], "settled"),
      totalJourneyAdmissions: sumInteger([total], "admissions"),
      dailyJourneyAdmissions: sumInteger([today], "admissions"),
      totalCompletedJourneys: sumInteger([total], "completed"),
      dailyCompletedJourneys: sumInteger([today], "completed"),
      activeJourneys: sumInteger([total], "active"),
      capturedAt: now,
    });
  }

  snapshot(): ManagedDemoBudgetSnapshot {
    const now = TimestampSchema.parse(this.#now());
    return this.#immediate(() => {
      this.#expireInside(now);
      return this.#snapshotInside(now);
    });
  }

  admit(value: unknown): ManagedDemoAdmissionResult {
    const request: ManagedDemoAdmissionRequest = ManagedDemoAdmissionRequestSchema.parse(value);
    const now = TimestampSchema.parse(this.#now());
    if (request.requestedAt !== now) {
      throw new TypeError("managed-demo admission time must match the trusted ledger clock");
    }
    return this.#immediate(() => {
      this.#expireInside(now);
      const snapshot = this.#snapshotInside(now);
      const deny = (reason: Extract<ManagedDemoAdmissionResult, { state: "denied" }>["reason"]) =>
        ManagedDemoAdmissionResultSchema.parse({
          schemaVersion: 1,
          state: "denied",
          reason,
          budget: snapshot,
        });
      if (!this.#policy.enabled) return deny("disabled");
      if (
        Date.parse(now) < Date.parse(this.#policy.availability.opensAt) ||
        Date.parse(now) >= Date.parse(this.#policy.availability.closesAt)
      ) {
        return deny("outside_window");
      }
      if (Date.parse(now) >= Date.parse(this.#prices.evidence.expiresAt)) {
        return deny("stale_price_evidence");
      }
      const replay = this.#database
        .prepare("SELECT 1 AS found FROM journey_reservations WHERE journey_id = ?")
        .get(request.journeyId);
      if (replay !== undefined) return deny("journey_replayed");
      const limits = this.#policy.limits;
      const totalCommitted = snapshot.totalReservedMicroUsd + snapshot.totalSettledMicroUsd;
      const dailyCommitted = snapshot.dailyReservedMicroUsd + snapshot.dailySettledMicroUsd;
      if (totalCommitted + limits.perJourneyPreauthorizationMicroUsd > limits.totalMicroUsd) {
        return deny("total_budget_exhausted");
      }
      if (dailyCommitted + limits.perJourneyPreauthorizationMicroUsd > limits.dailyMicroUsd) {
        return deny("daily_budget_exhausted");
      }
      if (snapshot.totalJourneyAdmissions >= limits.totalJourneyAdmissions) {
        return deny("total_journeys_exhausted");
      }
      if (snapshot.dailyJourneyAdmissions >= limits.dailyJourneyAdmissions) {
        return deny("daily_journeys_exhausted");
      }
      const sourceRows = this.#database
        .prepare(
          "SELECT admitted_at AS admittedAt FROM journey_reservations WHERE source_fingerprint = ? AND admitted_day = ? ORDER BY admitted_at DESC",
        )
        .all(request.sourceFingerprint, utcDay(now));
      if (sourceRows.length >= limits.perSourceDailyJourneyAdmissions) {
        return deny("source_limit_exhausted");
      }
      const lastAdmission = sourceRows[0]?.admittedAt;
      if (
        typeof lastAdmission === "string" &&
        Date.parse(now) < Date.parse(lastAdmission) + limits.cooldownSeconds * 1_000
      ) {
        return deny("cooldown_active");
      }
      if (snapshot.activeJourneys >= limits.maxConcurrentJourneys) {
        return deny("concurrency_exhausted");
      }
      const reservationId = this.#randomId();
      const expiresAt = addSeconds(now, limits.reservationTtlSeconds);
      this.#database
        .prepare(
          `INSERT INTO journey_reservations(
             reservation_id, journey_id, source_fingerprint, admitted_at, admitted_day,
             expires_at, state, preauthorized_micro_usd, price_snapshot_json
           ) VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?, ?)`,
        )
        .run(
          reservationId,
          request.journeyId,
          request.sourceFingerprint,
          now,
          utcDay(now),
          expiresAt,
          limits.perJourneyPreauthorizationMicroUsd,
          JSON.stringify(this.#prices),
        );
      return ManagedDemoAdmissionResultSchema.parse({
        schemaVersion: 1,
        state: "admitted",
        reservationId,
        journeyId: request.journeyId,
        preauthorizedMicroUsd: limits.perJourneyPreauthorizationMicroUsd,
        expiresAt,
        budget: this.#snapshotInside(now),
      });
    });
  }

  settle(value: unknown): ManagedDemoSettlementResult {
    const request = ManagedDemoSettlementRequestSchema.parse(value);
    const now = TimestampSchema.parse(this.#now());
    if (request.settledAt !== now) {
      throw new TypeError("managed-demo settlement time must match the trusted ledger clock");
    }
    return this.#immediate(() => {
      this.#expireInside(now);
      const row = this.#database
        .prepare(
          `SELECT reservation_id AS reservationId, journey_id AS journeyId,
             source_fingerprint AS sourceFingerprint, admitted_at AS admittedAt,
             expires_at AS expiresAt, state, preauthorized_micro_usd AS preauthorizedMicroUsd,
             charged_micro_usd AS chargedMicroUsd, outcome,
             settlement_json AS settlementJson, price_snapshot_json AS priceSnapshotJson
           FROM journey_reservations WHERE reservation_id = ?`,
        )
        .get(request.reservationId) as ReservationRow | undefined;
      if (row === undefined || row.journeyId !== request.journeyId) {
        throw new TypeError("managed-demo settlement does not match a reservation");
      }
      const charged = Number(row.chargedMicroUsd);
      if (row.state !== "reserved") {
        if (!Number.isSafeInteger(charged) || charged < 0) {
          throw new TypeError("managed-demo terminal reservation has an invalid charge");
        }
        if (row.settlementJson !== null && row.settlementJson !== JSON.stringify(request)) {
          throw new TypeError("managed-demo settlement replay does not match the original");
        }
        return ManagedDemoSettlementResultSchema.parse({
          schemaVersion: 1,
          reservationId: request.reservationId,
          journeyId: request.journeyId,
          status: row.state,
          chargedMicroUsd: charged,
          budget: this.#snapshotInside(now),
        });
      }
      const admittedAt = String(row.admittedAt);
      validateUsage(request, admittedAt, this.#policy);
      const prices = parseStoredJson(
        row.priceSnapshotJson,
        ManagedDemoPriceSnapshotSchema,
        "reservation price snapshot",
      );
      const actualCost = usageCost(request.usage, prices);
      const preauthorized = Number(row.preauthorizedMicroUsd);
      if (!Number.isSafeInteger(preauthorized) || actualCost > preauthorized) {
        throw new TypeError("managed-demo usage exceeds its preauthorization");
      }
      const forfeited = request.outcome === "failed" && request.usage.length === 0;
      const chargedMicroUsd = forfeited ? preauthorized : actualCost;
      const status = forfeited ? "forfeited" : "settled";
      const updated = changes(
        this.#database
          .prepare(
            `UPDATE journey_reservations
               SET state = ?, charged_micro_usd = ?, outcome = ?, settled_at = ?, settlement_json = ?
             WHERE reservation_id = ? AND journey_id = ? AND state = 'reserved'`,
          )
          .run(
            status,
            chargedMicroUsd,
            request.outcome,
            now,
            JSON.stringify(request),
            request.reservationId,
            request.journeyId,
          ),
      );
      if (updated !== 1) throw new TypeError("managed-demo reservation changed during settlement");
      return ManagedDemoSettlementResultSchema.parse({
        schemaVersion: 1,
        reservationId: request.reservationId,
        journeyId: request.journeyId,
        status,
        chargedMicroUsd,
        budget: this.#snapshotInside(now),
      });
    });
  }

  expireReservations(): number {
    const now = TimestampSchema.parse(this.#now());
    return this.#immediate(() => this.#expireInside(now));
  }

  updatePolicy(value: unknown): ManagedDemoBudgetSnapshot {
    const update: ManagedDemoOperatorPolicyUpdate =
      ManagedDemoOperatorPolicyUpdateSchema.parse(value);
    const now = TimestampSchema.parse(this.#now());
    if (update.updatedAt !== now) {
      throw new TypeError("managed-demo policy update time must match the trusted ledger clock");
    }
    return this.#immediate(() => {
      this.#expireInside(now);
      if (
        update.deploymentId !== this.#deployment.deploymentId ||
        update.expectedPolicyId !== this.#policy.policyId ||
        update.expectedPolicyVersion !== this.#policy.version ||
        update.replacement.pool !== this.#deployment.pool
      ) {
        throw new TypeError("managed-demo policy update does not match durable deployment state");
      }
      if (
        update.replacement.modelPolicyId !== this.#policy.modelPolicyId ||
        update.replacement.modelPolicyVersion !== this.#policy.modelPolicyVersion ||
        JSON.stringify(update.replacement.models) !== JSON.stringify(this.#policy.models)
      ) {
        throw new TypeError("managed-demo budget update cannot substitute the model policy");
      }
      if (
        this.#deployment.pool === "judge" &&
        this.#policy.enabled &&
        update.replacement.enabled &&
        Date.parse(now) >= Date.parse(this.#policy.availability.opensAt) &&
        Date.parse(now) < Date.parse(this.#policy.availability.closesAt)
      ) {
        const oldLimits = this.#policy.limits;
        const newLimits = update.replacement.limits;
        if (
          Date.parse(update.replacement.availability.opensAt) >
            Date.parse(this.#policy.availability.opensAt) ||
          Date.parse(update.replacement.availability.closesAt) <
            Date.parse(this.#policy.availability.closesAt) ||
          newLimits.totalMicroUsd < oldLimits.totalMicroUsd ||
          newLimits.dailyMicroUsd < oldLimits.dailyMicroUsd ||
          newLimits.perJourneyPreauthorizationMicroUsd <
            oldLimits.perJourneyPreauthorizationMicroUsd ||
          newLimits.totalJourneyAdmissions < oldLimits.totalJourneyAdmissions ||
          newLimits.dailyJourneyAdmissions < oldLimits.dailyJourneyAdmissions ||
          newLimits.perSourceDailyJourneyAdmissions < oldLimits.perSourceDailyJourneyAdmissions ||
          newLimits.maxConcurrentJourneys < oldLimits.maxConcurrentJourneys ||
          newLimits.queueCapacity < oldLimits.queueCapacity ||
          newLimits.queueTimeoutSeconds < oldLimits.queueTimeoutSeconds ||
          newLimits.reservationTtlSeconds < oldLimits.reservationTtlSeconds ||
          newLimits.cooldownSeconds > oldLimits.cooldownSeconds
        ) {
          throw new TypeError("active judge capacity cannot be reduced without disabling the pool");
        }
      }
      const deployment = ManagedDemoDeploymentIdentitySchema.parse({
        ...this.#deployment,
        policyVersion: update.replacement.version,
      });
      this.#database
        .prepare(
          "UPDATE ledger_configuration SET deployment_json = ?, policy_json = ? WHERE singleton = 1",
        )
        .run(JSON.stringify(deployment), JSON.stringify(update.replacement));
      this.#deployment = deployment;
      this.#policy = update.replacement;
      return this.#snapshotInside(now);
    });
  }

  updatePrices(value: unknown): ManagedDemoBudgetSnapshot {
    const update: ManagedDemoOperatorPriceUpdate =
      ManagedDemoOperatorPriceUpdateSchema.parse(value);
    const now = TimestampSchema.parse(this.#now());
    if (update.updatedAt !== now) {
      throw new TypeError("managed-demo price update time must match the trusted ledger clock");
    }
    return this.#immediate(() => {
      if (
        update.deploymentId !== this.#deployment.deploymentId ||
        update.expectedSnapshotId !== this.#prices.snapshotId ||
        update.expectedSnapshotVersion !== this.#prices.version ||
        update.replacement.modelPolicyId !== this.#policy.modelPolicyId ||
        update.replacement.modelPolicyVersion !== this.#policy.modelPolicyVersion
      ) {
        throw new TypeError("managed-demo price update does not match durable deployment state");
      }
      if (
        update.replacement.evidence.capturedAt !== now ||
        Date.parse(update.replacement.evidence.expiresAt) <= Date.parse(now)
      ) {
        throw new TypeError("managed-demo replacement prices require current evidence");
      }
      this.#database
        .prepare("UPDATE ledger_configuration SET price_snapshot_json = ? WHERE singleton = 1")
        .run(JSON.stringify(update.replacement));
      this.#prices = update.replacement;
      return this.#snapshotInside(now);
    });
  }
}
