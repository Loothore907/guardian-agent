import { buildControlApi } from "./app.js";

const app = buildControlApi();

try {
  await app.listen({ host: "127.0.0.1", port: 4317 });
} catch (error) {
  app.log.error({ error }, "control API failed to start");
  process.exitCode = 1;
}
