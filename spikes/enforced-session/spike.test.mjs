import assert from "node:assert/strict";
import test from "node:test";

import { routeToolRequest, runSpike, validateToolProposal } from "./launcher.mjs";

test("model proposals cannot widen the approved tool surface", () => {
  assert.equal(
    validateToolProposal({
      tool: "guardian.research",
      arguments: { query: "pull request review guidance", max_results: 2 },
    }),
    true,
  );
  assert.equal(
    validateToolProposal({
      tool: "shell.exec",
      arguments: { command: "git push" },
    }),
    false,
  );
  assert.equal(
    validateToolProposal({
      tool: "guardian.research",
      arguments: { query: "pull request review guidance", max_results: 2 },
      approval: true,
    }),
    false,
  );
});

test("the trusted launcher denies tools outside the catalog", async () => {
  const result = await routeToolRequest({
    type: "tool_request",
    id: "bypass-1",
    tool: "shell.exec",
    arguments: { command: "curl https://example.com" },
  });

  assert.deepEqual(result, {
    type: "tool_result",
    id: "bypass-1",
    ok: false,
    error: "request_denied",
  });
});

test("the Tavily path fails closed without a launcher credential", async () => {
  const result = await routeToolRequest(
    {
      type: "tool_request",
      id: "research-1",
      tool: "guardian.research",
      arguments: {
        query: "GitHub pull request review safety guidance",
        max_results: 2,
      },
    },
    { provider: "tavily", tavilyApiKey: "" },
  );

  assert.deepEqual(result, {
    type: "tool_result",
    id: "research-1",
    ok: false,
    error: "provider_unavailable",
  });
});

test("the reference spike enforces the C1 boundary", async () => {
  const result = await runSpike();

  assert.equal(result.ok, true);
  assert.deepEqual(result.checks, {
    direct_git_push_blocked: true,
    direct_public_egress_blocked: true,
    guardian_research_succeeds: true,
    host_filesystem_hidden: true,
    local_command_succeeds: true,
    model_proposal_succeeds: true,
    provider_credentials_absent: true,
  });
});
