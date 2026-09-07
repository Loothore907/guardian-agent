import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  ManagedDemoBudgetServiceProcessConfigSchema,
  type ManagedDemoBudgetServiceProcessConfig,
} from "@guardian/contracts";

const MAXIMUM_BOOTSTRAP_BYTES = 64 * 1_024;
const MAXIMUM_CONTROL_OUTPUT_BYTES = 4 * 1_024;
const STARTUP_TIMEOUT_MS = 5_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const READY_LINE = "guardian managed-demo budget service ready";

export interface ManagedDemoBudgetChild {
  readonly processId: number;
  readonly exited: Promise<void>;
  close(): Promise<void>;
}

function childExited(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.once("error", () => {
      if (child.pid === undefined) resolve();
    });
  });
}

export async function startManagedDemoBudgetChild(
  configValue: unknown,
): Promise<ManagedDemoBudgetChild> {
  const config: ManagedDemoBudgetServiceProcessConfig =
    ManagedDemoBudgetServiceProcessConfigSchema.parse(configValue);
  const serialized = JSON.stringify(config);
  const bootstrap = Buffer.from(`${serialized}\n`, "utf8");
  if (bootstrap.byteLength > MAXIMUM_BOOTSTRAP_BYTES) {
    bootstrap.fill(0);
    throw new TypeError("managed-demo budget child bootstrap is invalid");
  }
  const entrypoint = fileURLToPath(
    new URL("../../managed-demo-budget-service/dist/main.js", import.meta.url),
  );
  const child = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: {},
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = childExited(child);
  let closing = false;
  let closePromise: Promise<void> | undefined;
  const close = () =>
    (closePromise ??= (async () => {
      closing = true;
      if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
      child.kill("SIGTERM");
      let timeout: NodeJS.Timeout | undefined;
      await Promise.race([
        exited,
        new Promise<void>((resolve) => {
          timeout = setTimeout(resolve, SHUTDOWN_TIMEOUT_MS);
          timeout.unref();
        }),
      ]);
      if (timeout !== undefined) clearTimeout(timeout);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await exited;
      }
    })());

  let outputBytes = 0;
  let stdout = "";
  let ready = false;
  const startup = new Promise<void>((resolve, reject) => {
    const fail = () => {
      if (!ready) reject(new TypeError("managed-demo budget child failed to start"));
    };
    child.once("error", fail);
    child.once("exit", fail);
    child.stderr.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      chunk.fill(0);
      if (!closing) void close();
      fail();
    });
    child.stdout.on("data", (chunk: Buffer) => {
      if (ready) {
        chunk.fill(0);
        if (!closing) void close();
        return;
      }
      outputBytes += chunk.byteLength;
      if (outputBytes > MAXIMUM_CONTROL_OUTPUT_BYTES) {
        chunk.fill(0);
        fail();
        return;
      }
      stdout += chunk.toString("utf8");
      chunk.fill(0);
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      const line = stdout.slice(0, newline).replace(/\r$/u, "");
      const remainder = stdout.slice(newline + 1);
      if (line !== READY_LINE || remainder.length !== 0 || ready) {
        fail();
        return;
      }
      ready = true;
      stdout = "";
      resolve();
    });
  });
  const write = new Promise<void>((resolve, reject) => {
    child.stdin.once("error", reject);
    child.stdin.end(bootstrap, (error?: Error | null) =>
      error === undefined || error === null ? resolve() : reject(error),
    );
  }).finally(() => bootstrap.fill(0));

  try {
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([
      Promise.all([startup, write]),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new TypeError("managed-demo budget child startup timed out")),
          STARTUP_TIMEOUT_MS,
        );
        timer.unref();
      }),
    ]).finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });
  } catch {
    await close();
    throw new TypeError("managed-demo budget child failed to start");
  }
  if (child.pid === undefined) {
    await close();
    throw new TypeError("managed-demo budget child failed to start");
  }
  return { processId: child.pid, exited, close };
}
