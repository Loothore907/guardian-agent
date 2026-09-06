import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createConnection, createServer } from "node:net";

if (process.argv[2] === "relay") {
  const child = spawn(process.execPath, [process.argv[1], "listener"], {
    env: {},
    stdio: ["pipe", "pipe", "ignore"],
  });
  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);
  child.once("error", () => process.exit(2));
  child.once("exit", (code) => process.exit(code ?? 2));
  process.once("SIGTERM", () => child.kill());
} else {
  let input = "";
  for await (const chunk of process.stdin) input += chunk.toString("utf8");
  const { endpoint, capability, outputPath } = JSON.parse(input);
  input = "";
  if (process.argv[2] === "listener") {
    const { chmodSync } = await import("node:fs");
    const server = createServer((socket) => {
      let bytes = 0;
      socket.on("error", () => {});
      socket.on("data", (chunk) => {
        bytes += chunk.byteLength;
      });
      socket.once("close", () => {
        void writeFile(outputPath, JSON.stringify({ bytes }), "utf8");
      });
    });
    server.listen(endpoint, () => {
      chmodSync(endpoint, 0o600);
      process.stdout.write("ready\n");
    });
    process.once("SIGTERM", () => server.close(() => process.exit(0)));
  } else {
    const socket = createConnection(endpoint);
    let bytes = 0;
    socket.setTimeout(2_000, () => socket.destroy());
    socket.on("data", (chunk) => {
      bytes += chunk.byteLength;
    });
    socket.on("error", () => {});
    socket.once("connect", () => socket.end(capability));
    socket.once("close", () => {
      process.exitCode = bytes === 0 ? 0 : 2;
    });
  }
}
