import { writeFile } from "node:fs/promises";

let input = "";
for await (const chunk of process.stdin) input += chunk.toString("utf8");
const { mode, outputPath } = JSON.parse(input);
input = "";
if (mode === "reject_ignoring_term") process.on("SIGTERM", () => {});
await writeFile(outputPath, JSON.stringify({ pid: process.pid }), "utf8");
// Keep the fixture alive so only supervisor cleanup can end the test process.
setInterval(() => {}, 1_000);
if (mode === "reject_ignoring_term") {
  process.stderr.write("guardian-failure-fixture-must-not-be-reflected");
} else if (mode !== "silent") {
  process.stdout.write("guardian test service ready\n");
  setTimeout(() => process.stdout.write("unexpected unterminated output"), 100);
}
