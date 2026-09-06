import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform === "linux") {
  const source = fileURLToPath(
    new URL("../packages/linux-peer-identity/native/peercred.c", import.meta.url),
  );
  const output = fileURLToPath(
    new URL("../packages/linux-peer-identity/dist/guardian-peercred", import.meta.url),
  );
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const compiled = spawnSync(
    "/usr/bin/cc",
    ["-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", source, "-o", output],
    {
      env: { PATH: "/usr/bin:/bin" },
      stdio: "inherit",
    },
  );
  if (compiled.error !== undefined || compiled.status !== 0) {
    throw new TypeError("Linux peer identity helper build failed");
  }
  chmodSync(output, 0o755);
}
