import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const MAXIMUM_CONTROL_OUTPUT_BYTES = 4 * 1_024;
const MAXIMUM_BOOTSTRAP_BYTES = 64 * 1_024;
const STARTUP_TIMEOUT_MS = 5_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;

export interface SupervisedServiceProcess {
  readonly processId: number;
  readonly exited: Promise<void>;
  readonly close: () => Promise<void>;
}

function exitPromise(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    // A failed spawn emits error without exit.
    child.once("error", () => {
      if (child.pid === undefined) resolve();
    });
  });
}

export async function startSupervisedServiceProcess(options: {
  readonly entrypoint: string;
  readonly bootstrap: unknown;
  readonly readyLine: string;
  readonly environment?: Readonly<Record<string, string>>;
}): Promise<SupervisedServiceProcess> {
  let serializedBootstrap: string | undefined;
  try {
    serializedBootstrap = JSON.stringify(options.bootstrap);
  } catch {
    throw new TypeError("supervised service bootstrap is invalid");
  }
  if (serializedBootstrap === undefined) {
    throw new TypeError("supervised service bootstrap is invalid");
  }
  const bootstrap = Buffer.from(`${serializedBootstrap}\n`, "utf8");
  if (bootstrap.byteLength > MAXIMUM_BOOTSTRAP_BYTES) {
    bootstrap.fill(0);
    throw new TypeError("supervised service bootstrap is oversized");
  }
  const child = spawn(process.execPath, [options.entrypoint], {
    cwd: process.cwd(),
    env: { ...(options.environment ?? {}) },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = exitPromise(child);
  let ready = false;
  let closing = false;
  let outputBytes = 0;
  let stdout = "";
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    if (closePromise !== undefined) return closePromise;
    closing = true;
    closePromise = (async () => {
      if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
      child.kill("SIGTERM");
      let timeout: NodeJS.Timeout | undefined;
      await Promise.race([
        exited,
        new Promise<void>((resolveTimeout) => {
          timeout = setTimeout(resolveTimeout, SHUTDOWN_TIMEOUT_MS);
          timeout.unref();
        }),
      ]);
      if (timeout !== undefined) clearTimeout(timeout);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await exited;
      }
    })();
    return closePromise;
  };

  const startup = new Promise<void>((resolve, reject) => {
    const fail = () => {
      if (ready) return;
      reject(new TypeError("supervised service failed to start"));
    };
    child.once("error", fail);
    child.once("exit", fail);
    child.stderr.on("data", (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > MAXIMUM_CONTROL_OUTPUT_BYTES || chunk.byteLength > 0) {
        if (ready && !closing) void close();
        fail();
      }
    });
    child.stdout.on("data", (chunk: Buffer) => {
      if (ready) {
        if (chunk.byteLength > 0 && !closing) void close();
        return;
      }
      outputBytes += chunk.byteLength;
      if (outputBytes > MAXIMUM_CONTROL_OUTPUT_BYTES) {
        fail();
        return;
      }
      stdout += chunk.toString("utf8");
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      const line = stdout.slice(0, newline).replace(/\r$/u, "");
      const remainder = stdout.slice(newline + 1);
      if (line !== options.readyLine || remainder.length !== 0 || ready) {
        fail();
        return;
      }
      ready = true;
      stdout = "";
      resolve();
    });
  });

  const bootstrapWrite = new Promise<void>((resolveWrite, rejectWrite) => {
    child.stdin.once("error", rejectWrite);
    child.stdin.end(bootstrap, (error?: Error | null) =>
      error === undefined || error === null ? resolveWrite() : rejectWrite(error),
    );
  }).finally(() => {
    bootstrap.fill(0);
  });

  let startupTimedOut = false;
  try {
    let startupTimeout: NodeJS.Timeout | undefined;
    await Promise.race([
      Promise.all([bootstrapWrite, startup]),
      new Promise<void>((_resolve, rejectTimeout) => {
        startupTimeout = setTimeout(() => {
          startupTimedOut = true;
          rejectTimeout(new TypeError("supervised service startup timed out"));
        }, STARTUP_TIMEOUT_MS);
        startupTimeout.unref();
      }),
    ]).finally(() => {
      if (startupTimeout !== undefined) clearTimeout(startupTimeout);
    });
  } catch {
    await close();
    throw new TypeError("supervised service failed to start", {
      cause: startupTimedOut ? "startup_timeout" : "startup_rejected",
    });
  }
  if (child.pid === undefined) {
    await close();
    throw new TypeError("supervised service process is unavailable");
  }

  return {
    processId: child.pid,
    exited,
    close,
  };
}
