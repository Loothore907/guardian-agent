import { LocalGuardianActionRiskIpcServer } from "../../packages/guardian/dist/index.js";
import { createFakeMissionSetupRiskProvider } from "../../apps/guardian-service/dist/index.js";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const server = new LocalGuardianActionRiskIpcServer(
  config,
  createFakeMissionSetupRiskProvider().evaluate,
  { now: () => config.startsAt },
);
await server.listen();
process.stdout.write("guardian risk service ready\n");
process.once("SIGTERM", () => {
  void server.close().then(() => process.exit(0));
});
