import "./c7-clock.mjs";
if (process.env.C7_SYNTHETIC_FAIL === "1") process.exit(1);
import assert from "node:assert/strict";
import { startWorkerService } from "../../apps/worker-service/dist/index.js";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
const server = await startWorkerService(config, {
  selectionKind: "deterministic_reference",
  runTurn: async (turn) => {
    const research = turn.objective.includes("research");
    const merge = turn.objective.includes("merge");
    let outcome;
    if (turn.turnNumber === 1)
      outcome = {
        kind: "tool_request",
        request: research
          ? {
              name: "guardian.research",
              arguments: { sourceUrl: "https://fixture.example.org/update" },
            }
          : {
              name: "github.pull_request.read",
              arguments: {
                owner: "fixture",
                repository: "demo",
                pullRequest: 1,
                content: "review",
              },
            },
      };
    else if (turn.turnNumber === 2) {
      assert.equal(turn.previousToolResult.outcome, "succeeded");
      assert.match(JSON.stringify(turn.previousToolResult.output), /Automation/);
      outcome = {
        kind: "tool_request",
        request: research
          ? {
              name: "guardian.research",
              arguments: { sourceUrl: "https://outside.example.org/verify" },
            }
          : {
              name: "github.pull_request.merge",
              arguments: {
                owner: "fixture",
                repository: "demo",
                pullRequest: merge ? 2 : 1,
                expectedHeadCommit: "a".repeat(40),
                method: "squash",
              },
            },
      };
    } else if (merge && turn.turnNumber === 3) {
      assert.equal(turn.previousToolResult.outcome, "denied");
      outcome = {
        kind: "tool_request",
        request: {
          name: "github.pull_request.merge",
          arguments: {
            owner: "fixture",
            repository: "demo",
            pullRequest: 1,
            expectedHeadCommit: "a".repeat(40),
            method: "squash",
          },
        },
      };
    } else {
      assert.match(JSON.stringify(turn.toolHistory), /Automation/);
      outcome = {
        kind: "final_response",
        response: research
          ? "Version 3.0 releases October 1. Upgrade to version 2.4 before moving to 3.0. Source: fixture.example.org/update."
          : "release.md changes draft to ready.",
      };
    }
    return { requestId: `synthetic_c7_${turn.turnNumber}`, outcome };
  },
});
process.stdout.write("guardian worker service ready\n");
process.once("SIGTERM", () => {
  void server.close().then(() => process.exit(0));
});
