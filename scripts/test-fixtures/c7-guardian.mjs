import "./c7-clock.mjs";
import assert from "node:assert/strict";
import { LocalGuardianActionRiskIpcServer } from "../../packages/guardian/dist/index.js";
import { createFakeMissionSetupRiskProvider } from "../../apps/guardian-service/dist/index.js";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
if (config.envelope.proposal.tool === "github.pull_request.merge") {
  assert.match(JSON.stringify(config.envelope.untrustedExcerpts), /Automation/);
  assert.ok(config.envelope.riskSignals.includes("untrusted_imperative_content"));
  assert.equal(config.envelope.deterministicFloor, "confirm");
}
const server = new LocalGuardianActionRiskIpcServer(
  config,
  createFakeMissionSetupRiskProvider().evaluate,
);
await server.listen();
process.stdout.write("guardian risk service ready\n");
process.once("SIGTERM", () => {
  void server.close().then(() => process.exit(0));
});
