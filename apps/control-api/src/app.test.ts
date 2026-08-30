import { afterEach, describe, expect, it } from "vitest";

import { buildControlApi } from "./app.js";

const openApps: ReturnType<typeof buildControlApi>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe("control API", () => {
  it("returns an honest pre-enforcement health state", async () => {
    const app = buildControlApi({ logger: false });
    openApps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "foundation", assurance: "unknown" });
  });
});
