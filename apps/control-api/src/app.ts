import {
  JUDGE_SCENARIOS,
  ManagedDemoJudgeJourneyPublicResultSchema,
  ManagedDemoJudgeJourneyRequestSchema,
  OpaqueIdSchema,
  SessionStatusSchema,
} from "@guardian/contracts";
import Fastify, { LogController } from "fastify";
import type { FastifyReply } from "fastify";
import { JudgePortalError, type JudgePortal } from "./judge-portal.js";

import {
  canonicalizeManagedDemoSourceAddress,
  isManagedDemoLoopbackAddress,
  type ManagedDemoJudgeIngressSecretMaterial,
  type ManagedDemoJudgeJourneyCoordinator,
} from "./judge-ingress.js";

const JUDGE_JOURNEY_PATH = "/v1/judge/journeys";

export interface ManagedDemoJudgeRouteOptions {
  readonly portal?: JudgePortal;
  readonly deploymentId: unknown;
  readonly expectedHost: unknown;
  readonly secrets: ManagedDemoJudgeIngressSecretMaterial;
  readonly coordinator?: ManagedDemoJudgeJourneyCoordinator;
}

function normalizeExpectedHost(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 253 ||
    value !== value.toLowerCase() ||
    !/^[a-z0-9.-]+$/u.test(value) ||
    value.startsWith(".") ||
    value.endsWith(".")
  ) {
    throw new TypeError("managed-demo judge hostname is invalid");
  }
  return value;
}

function singleHeader(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function trustedManagedDemoClientAddress(
  remoteAddress: unknown,
  headers: Readonly<Record<string, unknown>>,
  expectedHostValue: unknown,
): string | null {
  const expectedHost = normalizeExpectedHost(expectedHostValue);
  if (
    !isManagedDemoLoopbackAddress(remoteAddress) ||
    singleHeader(headers.host)?.toLowerCase() !== expectedHost ||
    singleHeader(headers["x-forwarded-proto"])?.toLowerCase() !== "https" ||
    headers.forwarded !== undefined ||
    headers["x-real-ip"] !== undefined
  ) {
    return null;
  }
  const forwardedFor = singleHeader(headers["x-forwarded-for"]);
  if (forwardedFor === null || forwardedFor.includes(",")) return null;
  try {
    return canonicalizeManagedDemoSourceAddress(forwardedFor);
  } catch {
    return null;
  }
}

function bearerCredential(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^Bearer ([A-Za-z0-9._~-]{32,256})$/u.exec(value);
  return match?.[1] ?? null;
}

function statusForResult(
  result: ReturnType<typeof ManagedDemoJudgeJourneyPublicResultSchema.parse>,
) {
  if (result.state === "completed") return 200;
  if (result.state === "denied") return 429;
  if (result.code === "unauthorized") return 401;
  if (result.code === "invalid_request") return 400;
  return 503;
}

async function sendJudgeResult(
  reply: FastifyReply,
  result: ReturnType<typeof ManagedDemoJudgeJourneyPublicResultSchema.parse>,
) {
  return await reply
    .header("cache-control", "no-store")
    .status(statusForResult(result))
    .send(result);
}

export function buildControlApi({
  logger = true,
  logStream,
  judge,
}: {
  logger?: boolean;
  logStream?: NodeJS.WritableStream;
  judge?: ManagedDemoJudgeRouteOptions;
} = {}) {
  const app = Fastify({
    bodyLimit: 16 * 1_024,
    logController: new LogController({ disableRequestLogging: true }),
    logger: logger
      ? {
          redact: {
            paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
            censor: "[REDACTED]",
          },
          ...(logStream === undefined ? {} : { stream: logStream }),
        }
      : false,
  });

  app.get("/health", () =>
    SessionStatusSchema.parse({ status: "foundation", assurance: "unknown" }),
  );
  app.setNotFoundHandler((_request, reply) => reply.status(404).send({ code: "not_found" }));

  app.get("/v1/judge/catalog", (_request, reply) =>
    reply.header("cache-control", "no-store").send(
      judge?.portal?.catalog() ?? {
        schemaVersion: 1,
        pilotedAvailable: false,
        scenarios: JUDGE_SCENARIOS.map((s) => ({ ...s, available: false })),
      },
    ),
  );

  if (judge !== undefined) {
    const deploymentId = OpaqueIdSchema.parse(judge.deploymentId);
    const expectedHost = normalizeExpectedHost(judge.expectedHost);
    app.addHook("onClose", async () => {
      let failed = false;
      try {
        await judge.portal?.close();
      } catch {
        failed = true;
      }
      try {
        judge.secrets.close();
      } catch {
        failed = true;
      }
      if (failed) throw new Error("control API failed to close");
    });
    app.setErrorHandler((error, request, reply) => {
      if (request.url.startsWith("/v1/judge/")) {
        const result = ManagedDemoJudgeJourneyPublicResultSchema.parse({
          schemaVersion: 1,
          state: "stopped",
          code: "invalid_request",
        });
        void sendJudgeResult(reply, result);
        return;
      }
      request.log.error({ error }, "control API request failed");
      void reply.status(500).send({ error: "service_unavailable" });
    });
    if (judge.portal !== undefined) {
      const portal = judge.portal;
      for (const action of ["draft", "confirm"] as const) {
        app.post(`/v1/judge/${action}`, async (request, reply) => {
          reply.header("cache-control", "no-store");
          if (request.url !== `/v1/judge/${action}`)
            return reply.status(400).send({ code: "invalid_request" });
          const sourceAddress = trustedManagedDemoClientAddress(
            request.raw.socket.remoteAddress,
            request.headers,
            expectedHost,
          );
          const credential = bearerCredential(request.headers.authorization);
          if (
            sourceAddress === null ||
            credential === null ||
            !judge.secrets.verifyBearerCredential(credential)
          )
            return reply.status(401).send({ code: "unauthorized" });
          const abort = new AbortController();
          const disconnect = () => {
            if (!reply.raw.writableFinished) abort.abort();
          };
          reply.raw.once("close", disconnect);
          try {
            const source = judge.secrets.deriveSourceFingerprint(deploymentId, sourceAddress);
            return await (action === "draft"
              ? portal.draft(request.body, source)
              : portal.confirm(request.body, source, abort.signal));
          } catch (error) {
            const code = error instanceof JudgePortalError ? error.code : "unavailable";
            return reply
              .status(
                code === "invalid_request"
                  ? 400
                  : code === "preview_unavailable"
                    ? 409
                    : code === "capacity_unavailable"
                      ? 429
                      : 503,
              )
              .send({ code });
          } finally {
            reply.raw.removeListener("close", disconnect);
          }
        });
      }
    }
    const coordinator = judge.coordinator;
    if (coordinator !== undefined)
      app.post(JUDGE_JOURNEY_PATH, async (request, reply) => {
        const sourceAddress = trustedManagedDemoClientAddress(
          request.raw.socket.remoteAddress,
          request.headers,
          expectedHost,
        );
        const credential = bearerCredential(request.headers.authorization);
        if (
          sourceAddress === null ||
          credential === null ||
          !judge.secrets.verifyBearerCredential(credential)
        ) {
          const result = ManagedDemoJudgeJourneyPublicResultSchema.parse({
            schemaVersion: 1,
            state: "stopped",
            code: "unauthorized",
          });
          return await sendJudgeResult(reply, result);
        }

        const parsed = ManagedDemoJudgeJourneyRequestSchema.safeParse(request.body);
        if (!parsed.success) {
          const result = ManagedDemoJudgeJourneyPublicResultSchema.parse({
            schemaVersion: 1,
            state: "stopped",
            code: "invalid_request",
          });
          return await sendJudgeResult(reply, result);
        }

        const abort = new AbortController();
        request.raw.once("aborted", () => abort.abort());
        let result: ReturnType<typeof ManagedDemoJudgeJourneyPublicResultSchema.parse>;
        try {
          const sourceFingerprint = judge.secrets.deriveSourceFingerprint(
            deploymentId,
            sourceAddress,
          );
          result = ManagedDemoJudgeJourneyPublicResultSchema.parse(
            await coordinator.run(parsed.data.objective, sourceFingerprint, abort.signal),
          );
        } catch {
          result = ManagedDemoJudgeJourneyPublicResultSchema.parse({
            schemaVersion: 1,
            state: "stopped",
            code: "service_unavailable",
          });
        }
        return await sendJudgeResult(reply, result);
      });
  }

  return app;
}
