import assert from "node:assert/strict";
import test from "node:test";

import { runReferenceIsolationProbe } from "../packages/executor/dist/index.js";

test("the production reference executor enforces the C4 isolation boundary", async () => {
  const result = await runReferenceIsolationProbe(new Date().toISOString());
  assert.equal(Object.values(result.checks).every(Boolean), true, JSON.stringify(result));
});
