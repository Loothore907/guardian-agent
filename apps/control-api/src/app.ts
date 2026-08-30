import { SessionStatusSchema } from "@guardian/contracts";
import Fastify from "fastify";

export function buildControlApi({ logger = true }: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: logger
      ? {
          redact: {
            paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
            censor: "[REDACTED]",
          },
        }
      : false,
  });

  app.get("/health", () =>
    SessionStatusSchema.parse({ status: "foundation", assurance: "unknown" }),
  );

  return app;
}
