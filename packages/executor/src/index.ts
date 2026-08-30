import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  IsolationProbeResultSchema,
  TimestampSchema,
  type IsolationProbeResult,
} from "@guardian/contracts";

export const REFERENCE_EXECUTOR_BOUNDARY = {
  network: "denied",
  credentials: "absent",
  filesystem: "disposable",
} as const;

function toWslPath(windowsPath: string): string {
  const absolutePath = path.resolve(windowsPath);
  const match = /^([A-Za-z]):\\(.*)$/u.exec(absolutePath);
  if (!match?.[1] || match[2] === undefined) {
    throw new TypeError("the reference executor requires an absolute Windows drive path");
  }
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll("\\", "/")}`;
}

export function parseIsolationProbeOutput(output: string): IsolationProbeResult {
  if (Buffer.byteLength(output, "utf8") > 32_768) {
    throw new TypeError("isolation probe output exceeds the limit");
  }
  const lines = output.trim().split(/\r?\n/u);
  if (lines.length !== 1 || !lines[0]) {
    throw new TypeError("isolation probe must return exactly one result");
  }
  return IsolationProbeResultSchema.parse(JSON.parse(lines[0]) as unknown);
}

export async function runReferenceIsolationProbe(
  observedAt: string,
): Promise<IsolationProbeResult> {
  const canonicalObservedAt = TimestampSchema.parse(observedAt);
  const sandboxPath = toWslPath(
    fileURLToPath(new URL("../runtime/reference-sandbox.sh", import.meta.url)),
  );
  const probePath = toWslPath(
    fileURLToPath(new URL("../runtime/reference-probe.py", import.meta.url)),
  );
  const allowedEnvironment = Object.fromEntries(
    ["SystemRoot", "WINDIR", "PATH"].flatMap((name) => {
      const value = process.env[name];
      return value === undefined ? [] : [[name, value]];
    }),
  );
  const child = spawn(
    "wsl.exe",
    [
      "-d",
      "Ubuntu-22.04",
      "--",
      "unshare",
      "--user",
      "--map-root-user",
      "--mount",
      "--net",
      "--pid",
      "--fork",
      "--mount-proc",
      "bash",
      sandboxPath,
      probePath,
      canonicalObservedAt,
    ],
    { env: allowedEnvironment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout = `${stdout}${chunk}`.slice(0, 32_769);
  });
  child.stderr.on("data", (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(0, 2_048);
  });

  const timeout = setTimeout(() => child.kill(), 30_000);
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).finally(() => clearTimeout(timeout));
  if (exitCode !== 0) {
    const safeError = stderr.trim() || "reference executor exited without a result";
    throw new Error(`reference executor failed: ${safeError}`);
  }
  return parseIsolationProbeOutput(stdout);
}
