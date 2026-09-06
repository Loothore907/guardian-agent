import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import {
  ManagedDemoJudgeJourneyPublicResultSchema,
  ManagedDemoJudgeJourneyRequestSchema,
  ManagedDemoSettlementResultSchema,
  ManagedDemoJourneyUsageReportersSchema,
  OpaqueIdSchema,
  Sha256DigestSchema,
  TimestampSchema,
  type ManagedDemoJudgeJourneyPublicResult,
  type ManagedDemoJourneyUsageReporters,
} from "@guardian/contracts";

const AUTHENTICATION_DIGEST_BYTES = 32;
const MINIMUM_FINGERPRINT_KEY_BYTES = 32;
const MAXIMUM_FINGERPRINT_KEY_BYTES = 64;
const BEARER_CREDENTIAL_PATTERN = /^[A-Za-z0-9._~-]{32,256}$/u;
const SOURCE_FINGERPRINT_CONTEXT = "guardian-managed-demo-source-v1";

export interface ManagedDemoJudgeIngressSecretMaterial {
  verifyBearerCredential(value: unknown): boolean;
  deriveSourceFingerprint(deploymentId: unknown, sourceAddress: unknown): string;
  close(): void;
}

function copyBytes(
  value: unknown,
  expected: { readonly min: number; readonly max: number },
): Buffer {
  if (
    !(value instanceof Uint8Array) ||
    value.byteLength < expected.min ||
    value.byteLength > expected.max
  ) {
    throw new TypeError("managed-demo judge ingress secret material is invalid");
  }
  return Buffer.from(value);
}

function canonicalIpv6(value: string): string {
  const hostname = new URL(`http://[${value}]/`).hostname;
  const canonical = hostname.slice(1, -1).toLowerCase();
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/u.exec(canonical);
  if (mapped !== null) {
    const high = Number.parseInt(mapped[1] ?? "", 16);
    const low = Number.parseInt(mapped[2] ?? "", 16);
    return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
  }
  return canonical;
}

export function canonicalizeManagedDemoSourceAddress(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    value.includes("%") ||
    value.includes(",") ||
    value.includes("[") ||
    value.includes("]")
  ) {
    throw new TypeError("managed-demo source address is invalid");
  }
  const version = isIP(value);
  if (version === 4) {
    return value
      .split(".")
      .map((component) => String(Number.parseInt(component, 10)))
      .join(".");
  }
  if (version === 6) return canonicalIpv6(value);
  throw new TypeError("managed-demo source address is invalid");
}

export function isManagedDemoLoopbackAddress(value: unknown): boolean {
  try {
    const address = canonicalizeManagedDemoSourceAddress(value);
    return address === "127.0.0.1" || address === "::1";
  } catch {
    return false;
  }
}

export class InMemoryManagedDemoJudgeIngressSecrets implements ManagedDemoJudgeIngressSecretMaterial {
  readonly #expectedCredentialDigest: Buffer;
  readonly #sourceFingerprintKey: Buffer;
  #closed = false;

  constructor(options: {
    readonly expectedCredentialDigest: unknown;
    readonly sourceFingerprintKey: unknown;
  }) {
    this.#expectedCredentialDigest = copyBytes(options.expectedCredentialDigest, {
      min: AUTHENTICATION_DIGEST_BYTES,
      max: AUTHENTICATION_DIGEST_BYTES,
    });
    this.#sourceFingerprintKey = copyBytes(options.sourceFingerprintKey, {
      min: MINIMUM_FINGERPRINT_KEY_BYTES,
      max: MAXIMUM_FINGERPRINT_KEY_BYTES,
    });
  }

  verifyBearerCredential(value: unknown): boolean {
    if (this.#closed || typeof value !== "string" || !BEARER_CREDENTIAL_PATTERN.test(value)) {
      return false;
    }
    const input = Buffer.from(value, "utf8");
    try {
      const actual = createHash("sha256").update(input).digest();
      try {
        return timingSafeEqual(actual, this.#expectedCredentialDigest);
      } finally {
        actual.fill(0);
      }
    } finally {
      input.fill(0);
    }
  }

  deriveSourceFingerprint(deploymentIdValue: unknown, sourceAddressValue: unknown): string {
    if (this.#closed) throw new TypeError("managed-demo judge ingress secrets are unavailable");
    const deploymentId = OpaqueIdSchema.parse(deploymentIdValue);
    const sourceAddress = canonicalizeManagedDemoSourceAddress(sourceAddressValue);
    return Sha256DigestSchema.parse(
      createHmac("sha256", this.#sourceFingerprintKey)
        .update(SOURCE_FINGERPRINT_CONTEXT, "utf8")
        .update("\0", "utf8")
        .update(deploymentId, "utf8")
        .update("\0", "utf8")
        .update(sourceAddress, "utf8")
        .digest("hex"),
    );
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#expectedCredentialDigest.fill(0);
    this.#sourceFingerprintKey.fill(0);
  }
}

export interface ManagedDemoJudgeBudgetJourney {
  readonly reporters: ManagedDemoJourneyUsageReporters;
  settle(outcome: "completed" | "failed", settledAt: unknown): Promise<unknown>;
}

export type ManagedDemoJudgeBudgetBeginResult =
  | { readonly state: "denied" }
  | { readonly state: "admitted"; readonly journey: ManagedDemoJudgeBudgetJourney };

export interface ManagedDemoJudgeBudgetController {
  begin(journeyId: unknown, sourceFingerprint: unknown): Promise<ManagedDemoJudgeBudgetBeginResult>;
}

export interface ManagedDemoJudgeJourneyExecutor {
  run(input: {
    readonly journeyId: string;
    readonly objective: string;
    readonly reporters: ManagedDemoJourneyUsageReporters;
    readonly signal: AbortSignal;
  }): Promise<unknown>;
}

export interface ManagedDemoJudgeJourneyCoordinator {
  run(
    objective: string,
    sourceFingerprint: string,
    signal?: AbortSignal,
  ): Promise<ManagedDemoJudgeJourneyPublicResult>;
}

function publicResult(
  value: ManagedDemoJudgeJourneyPublicResult,
): ManagedDemoJudgeJourneyPublicResult {
  return ManagedDemoJudgeJourneyPublicResultSchema.parse(value);
}

function completedExecution(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    (value as { readonly state?: unknown }).state === "completed"
  );
}

export class DefaultManagedDemoJudgeJourneyCoordinator implements ManagedDemoJudgeJourneyCoordinator {
  readonly #budget: ManagedDemoJudgeBudgetController;
  readonly #executor: ManagedDemoJudgeJourneyExecutor;
  readonly #now: () => string;
  readonly #createJourneyId: () => string;

  constructor(options: {
    readonly budget: ManagedDemoJudgeBudgetController;
    readonly executor: ManagedDemoJudgeJourneyExecutor;
    readonly now?: () => string;
    readonly createJourneyId?: () => string;
  }) {
    this.#budget = options.budget;
    this.#executor = options.executor;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#createJourneyId = options.createJourneyId ?? (() => randomUUID());
  }

  async run(
    objective: string,
    sourceFingerprint: string,
    signal: AbortSignal = new AbortController().signal,
  ): Promise<ManagedDemoJudgeJourneyPublicResult> {
    const request = ManagedDemoJudgeJourneyRequestSchema.safeParse({
      schemaVersion: 1,
      objective,
    });
    if (!request.success) {
      return publicResult({ schemaVersion: 1, state: "stopped", code: "invalid_request" });
    }
    let begun: ManagedDemoJudgeBudgetBeginResult;
    const journeyId = OpaqueIdSchema.parse(this.#createJourneyId());
    try {
      begun = await this.#budget.begin(journeyId, Sha256DigestSchema.parse(sourceFingerprint));
    } catch {
      return publicResult({ schemaVersion: 1, state: "stopped", code: "service_unavailable" });
    }
    if (begun.state === "denied") {
      return publicResult({ schemaVersion: 1, state: "denied", code: "capacity_unavailable" });
    }

    let outcome: "completed" | "failed" = "failed";
    let result: ManagedDemoJudgeJourneyPublicResult = {
      schemaVersion: 1,
      state: "stopped",
      code: "journey_failed",
    };
    try {
      if (!signal.aborted) {
        const reporters = ManagedDemoJourneyUsageReportersSchema.parse(begun.journey.reporters);
        const execution = await this.#executor.run({
          journeyId,
          objective: request.data.objective,
          reporters,
          signal,
        });
        if (completedExecution(execution) && !signal.aborted) {
          outcome = "completed";
          result = { schemaVersion: 1, state: "completed" };
        }
      }
    } catch {
      result = { schemaVersion: 1, state: "stopped", code: "journey_failed" };
    }

    try {
      const settlement = ManagedDemoSettlementResultSchema.parse(
        await begun.journey.settle(outcome, TimestampSchema.parse(this.#now())),
      );
      const expectedReservationId = begun.journey.reporters.interaction.reservationId;
      if (
        settlement.journeyId !== journeyId ||
        settlement.reservationId !== expectedReservationId ||
        (outcome === "completed" && settlement.status !== "settled")
      ) {
        throw new TypeError("managed-demo judge settlement binding is invalid");
      }
    } catch {
      return publicResult({ schemaVersion: 1, state: "stopped", code: "service_unavailable" });
    }
    return publicResult(result);
  }
}
