import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createGuardianMcpServer } from "./server.js";

serveStdio(createGuardianMcpServer, {
  legacy: "reject",
  onerror(error) {
    console.error("guardian MCP transport error", error.message);
  },
});
