import { writeFile } from "node:fs/promises";

let serialized = "";
for await (const chunk of process.stdin) serialized += chunk.toString("utf8");
const bootstrap = JSON.parse(serialized);
const secret = String(bootstrap.secret);
await writeFile(
  String(bootstrap.outputPath),
  JSON.stringify({
    argumentsContainSecret: process.argv.some((value) => value.includes(secret)),
    environmentContainsSecret: Object.values(process.env).some((value) => value?.includes(secret)),
    environmentNames: Object.keys(process.env).sort(),
  }),
  "utf8",
);
serialized = "";
process.stdout.write("guardian test service ready\n");

const close = () => process.exit(0);
process.once("SIGINT", close);
process.once("SIGTERM", close);
