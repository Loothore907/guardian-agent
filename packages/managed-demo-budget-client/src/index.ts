import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createConnection, type Socket } from "node:net";

import {
  ManagedDemoAdmissionRequestSchema,
  ManagedDemoBudgetCapabilityBindingSchema,
  ManagedDemoBudgetIpcFailureReasonSchema,
  ManagedDemoBudgetIpcRequestSchema,
  ManagedDemoBudgetIpcResponseSchema,
  ManagedDemoOperatorPolicyUpdateSchema,
  ManagedDemoOperatorPriceUpdateSchema,
  ManagedDemoUsageObservationSchema,
  OpaqueIdSchema,
  TimestampSchema,
  type ManagedDemoAdmissionResult,
  type ManagedDemoBudgetCapabilityBinding,
  type ManagedDemoBudgetIpcFailureReason,
  type ManagedDemoBudgetIpcOperation,
  type ManagedDemoBudgetSnapshot,
  type ManagedDemoSettlementResult,
} from "@guardian/contracts";

const MAX_IPC_RESPONSE_BYTES = 64 * 1_024;
const DEFAULT_IPC_TIMEOUT_MS = 15_000;
const ENDPOINT_PATTERN = /^guardian-demo-budget-[0-9a-f-]{36}$/u;

export function assertLocalManagedDemoBudgetEndpoint(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 260) {
    throw new TypeError("managed-demo budget IPC endpoint is invalid");
  }
  if (process.platform === "win32") {
    const prefix = "\\\\.\\pipe\\";
    if (!value.startsWith(prefix) || !ENDPOINT_PATTERN.test(value.slice(prefix.length))) {
      throw new TypeError("managed-demo budget IPC endpoint must be a Guardian named pipe");
    }
    return value;
  }
  if (
    resolve(dirname(value)) !== resolve(tmpdir()) ||
    !ENDPOINT_PATTERN.test(basename(value).replace(/\.sock$/u, "")) ||
    !value.endsWith(".sock")
  ) {
    throw new TypeError(
      "managed-demo budget IPC endpoint must be a Guardian temporary Unix socket",
    );
  }
  return value;
}

export function createManagedDemoBudgetIpcEndpoint(): string {
  const id = randomUUID();
  return process.platform === "win32"
    ? `\\\\.\\pipe\\guardian-demo-budget-${id}`
    : join(tmpdir(), `guardian-demo-budget-${id}.sock`);
}

function readJsonLine(socket: Socket, maximumBytes: number): Promise<string> {
  return new Promise((resolveLine, rejectLine) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      rejectLine(error);
    };
    socket.on("data", (chunk: Buffer) => {
      if (settled) return;
      bytes += chunk.byteLength;
      if (bytes > maximumBytes) {
        rejectOnce(new TypeError("managed-demo budget IPC frame is oversized"));
        return;
      }
      chunks.push(chunk);
      const buffer = Buffer.concat(chunks, bytes);
      const newline = buffer.indexOf(0x0a);
      if (newline < 0) return;
      if (
        buffer
          .subarray(newline + 1)
          .toString("utf8")
          .trim().length !== 0
      ) {
        rejectOnce(new TypeError("managed-demo budget IPC accepts exactly one frame"));
        return;
      }
      settled = true;
      resolveLine(buffer.subarray(0, newline).toString("utf8"));
    });
    socket.once("end", () =>
      rejectOnce(new TypeError("managed-demo budget IPC frame is incomplete")),
    );
    socket.once("close", () =>
      rejectOnce(new TypeError("managed-demo budget IPC connection closed")),
    );
    socket.once("error", rejectOnce);
  });
}

export class ManagedDemoBudgetIpcError extends Error {
  readonly reason: ManagedDemoBudgetIpcFailureReason;

  constructor(reason: ManagedDemoBudgetIpcFailureReason) {
    super(`managed-demo budget service failed: ${reason}`);
    this.name = "ManagedDemoBudgetIpcError";
    this.reason = reason;
  }
}

export class LocalManagedDemoBudgetIpcClient {
  readonly #endpoint: string;
  readonly #binding: ManagedDemoBudgetCapabilityBinding;
  readonly #timeoutMs: number;

  constructor(options: {
    readonly endpoint: unknown;
    readonly binding: unknown;
    readonly timeoutMs?: number;
  }) {
    this.#endpoint = assertLocalManagedDemoBudgetEndpoint(options.endpoint);
    this.#binding = ManagedDemoBudgetCapabilityBindingSchema.parse(options.binding);
    const timeoutMs = options.timeoutMs ?? DEFAULT_IPC_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 180_000) {
      throw new TypeError(
        "managed-demo budget IPC timeout must be an integer from 100 to 180000 milliseconds",
      );
    }
    this.#timeoutMs = timeoutMs;
  }

  async #call(operation: ManagedDemoBudgetIpcOperation, fields: Record<string, unknown> = {}) {
    if (!this.#binding.allowedOperations.includes(operation)) {
      throw new ManagedDemoBudgetIpcError("operation_not_allowed");
    }
    const requestId = randomUUID();
    const request = ManagedDemoBudgetIpcRequestSchema.parse({
      schemaVersion: 1,
      requestId,
      capability: this.#binding.capability,
      callerRole: this.#binding.callerRole,
      callerId: this.#binding.callerId,
      deploymentId: this.#binding.deploymentId,
      operation,
      ...fields,
    });
    const socket = createConnection(this.#endpoint);
    socket.setTimeout(this.#timeoutMs, () =>
      socket.destroy(new Error("managed-demo budget IPC timeout")),
    );
    try {
      const responsePromise = readJsonLine(socket, MAX_IPC_RESPONSE_BYTES);
      socket.write(`${JSON.stringify(request)}\n`);
      const response = ManagedDemoBudgetIpcResponseSchema.parse(
        JSON.parse(await responsePromise) as unknown,
      );
      if (response.requestId !== requestId) {
        throw new ManagedDemoBudgetIpcError("budget_unavailable");
      }
      if (!response.ok) throw new ManagedDemoBudgetIpcError(response.error);
      if (response.operation !== operation) {
        throw new ManagedDemoBudgetIpcError("budget_unavailable");
      }
      return response;
    } catch (error) {
      if (error instanceof ManagedDemoBudgetIpcError) throw error;
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    } finally {
      socket.destroy();
    }
  }

  async admit(value: unknown): Promise<ManagedDemoAdmissionResult> {
    const admission = ManagedDemoAdmissionRequestSchema.parse(value);
    const response = await this.#call("admission.request", { admission });
    if (response.operation !== "admission.request") {
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    }
    return response.result;
  }

  async recordUsage(
    reservationIdValue: unknown,
    journeyIdValue: unknown,
    usageValue: unknown,
  ): Promise<void> {
    const reservationId = OpaqueIdSchema.parse(reservationIdValue);
    const journeyId = OpaqueIdSchema.parse(journeyIdValue);
    const usage = ManagedDemoUsageObservationSchema.parse(usageValue);
    const response = await this.#call("usage.record", { reservationId, journeyId, usage });
    if (response.operation !== "usage.record" || response.result !== "recorded") {
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    }
  }

  async settle(
    reservationIdValue: unknown,
    journeyIdValue: unknown,
    outcome: "completed" | "failed",
    settledAtValue: unknown,
  ): Promise<ManagedDemoSettlementResult> {
    const reservationId = OpaqueIdSchema.parse(reservationIdValue);
    const journeyId = OpaqueIdSchema.parse(journeyIdValue);
    const settledAt = TimestampSchema.parse(settledAtValue);
    const response = await this.#call("journey.settle", {
      reservationId,
      journeyId,
      outcome,
      settledAt,
    });
    if (response.operation !== "journey.settle") {
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    }
    return response.result;
  }

  async snapshot(): Promise<ManagedDemoBudgetSnapshot> {
    const response = await this.#call("budget.snapshot");
    if (response.operation !== "budget.snapshot") {
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    }
    return response.result;
  }

  async updatePolicy(value: unknown): Promise<ManagedDemoBudgetSnapshot> {
    const update = ManagedDemoOperatorPolicyUpdateSchema.parse(value);
    const response = await this.#call("policy.update", { update });
    if (response.operation !== "policy.update") {
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    }
    return response.result;
  }

  async updatePrices(value: unknown): Promise<ManagedDemoBudgetSnapshot> {
    const update = ManagedDemoOperatorPriceUpdateSchema.parse(value);
    const response = await this.#call("prices.update", { update });
    if (response.operation !== "prices.update") {
      throw new ManagedDemoBudgetIpcError("budget_unavailable");
    }
    return response.result;
  }
}

export function parseManagedDemoBudgetIpcFailureReason(
  value: unknown,
): ManagedDemoBudgetIpcFailureReason {
  return ManagedDemoBudgetIpcFailureReasonSchema.parse(value);
}
