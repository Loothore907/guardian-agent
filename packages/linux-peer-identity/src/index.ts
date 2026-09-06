import { spawn } from "node:child_process";
import { lstatSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Socket } from "node:net";
import { fileURLToPath } from "node:url";

const MAXIMUM_HELPER_OUTPUT_BYTES = 256;
const DEFAULT_TIMEOUT_MS = 1_000;
const HELPER_PATH = fileURLToPath(new URL("../dist/guardian-peercred", import.meta.url));

export interface LinuxPeerCredentials {
  readonly pid: number;
  readonly uid: number;
  readonly gid: number;
}

export type LinuxPeerCredentialReader = (socket: Socket) => Promise<LinuxPeerCredentials>;
export type LinuxParentProcessReader = (pid: number) => Promise<number>;

function parseCredentials(value: string): LinuxPeerCredentials {
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("Linux peer identity is unavailable");
  }
  const record = parsed as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !== "gid,pid,uid" ||
    !Number.isSafeInteger(record.pid) ||
    !Number.isSafeInteger(record.uid) ||
    !Number.isSafeInteger(record.gid) ||
    (record.pid as number) <= 0 ||
    (record.uid as number) < 0 ||
    (record.gid as number) < 0
  ) {
    throw new TypeError("Linux peer identity is unavailable");
  }
  return {
    pid: record.pid as number,
    uid: record.uid as number,
    gid: record.gid as number,
  };
}

export function assertLinuxPeerHelperAvailable(): void {
  if (process.platform !== "linux") return;
  try {
    const helperStat = lstatSync(HELPER_PATH);
    const currentUser = process.getuid?.();
    if (
      currentUser === undefined ||
      !helperStat.isFile() ||
      (helperStat.uid !== 0 && helperStat.uid !== currentUser) ||
      (helperStat.mode & 0o022) !== 0 ||
      (helperStat.mode & 0o100) === 0
    ) {
      throw new TypeError("Linux peer identity helper is unavailable");
    }
  } catch {
    throw new TypeError("Linux peer identity helper is unavailable");
  }
}

export async function readLinuxPeerCredentials(socket: Socket): Promise<LinuxPeerCredentials> {
  if (process.platform !== "linux") {
    throw new TypeError("Linux peer identity is unavailable");
  }
  assertLinuxPeerHelperAvailable();
  return await new Promise((resolve, reject) => {
    const child = spawn(HELPER_PATH, [], {
      env: {},
      stdio: ["ignore", "pipe", "ignore", socket],
      windowsHide: true,
    });
    const output = Buffer.alloc(MAXIMUM_HELPER_OUTPUT_BYTES);
    let bytes = 0;
    let oversized = false;
    const timer = setTimeout(() => child.kill(), DEFAULT_TIMEOUT_MS);
    timer.unref();
    child.stdout!.on("data", (chunk: Buffer) => {
      if (bytes + chunk.byteLength > output.byteLength) {
        oversized = true;
        child.kill();
        return;
      }
      chunk.copy(output, bytes);
      bytes += chunk.byteLength;
    });
    child.once("error", () => {
      clearTimeout(timer);
      output.fill(0);
      reject(new TypeError("Linux peer identity is unavailable"));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      try {
        if (code !== 0 || oversized) throw new TypeError("Linux peer identity is unavailable");
        resolve(parseCredentials(output.subarray(0, bytes).toString("utf8").trim()));
      } catch {
        reject(new TypeError("Linux peer identity is unavailable"));
      } finally {
        output.fill(0);
      }
    });
  });
}

export async function readLinuxParentProcessId(pid: number): Promise<number> {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new TypeError("Linux peer identity is unavailable");
  }
  try {
    const processStat = await readFile(`/proc/${pid}/stat`, "utf8");
    const commandEnd = processStat.lastIndexOf(")");
    if (commandEnd < 1) throw new TypeError("invalid process stat");
    const fields = processStat
      .slice(commandEnd + 2)
      .trim()
      .split(/\s+/u);
    const parentPid = Number(fields[1]);
    if (!Number.isSafeInteger(parentPid) || parentPid <= 0) {
      throw new TypeError("invalid parent process");
    }
    return parentPid;
  } catch {
    throw new TypeError("Linux peer identity is unavailable");
  }
}

export class LinuxPeerVerifier {
  readonly #supervisorPid: number;
  readonly #currentPid: number;
  readonly #currentUid: number;
  readonly #currentGid: number;
  readonly #credentials: LinuxPeerCredentialReader;
  readonly #parentProcess: LinuxParentProcessReader;

  constructor(options: {
    readonly supervisorPid: number;
    readonly currentPid?: number;
    readonly currentUid?: number;
    readonly currentGid?: number;
    readonly credentials?: LinuxPeerCredentialReader;
    readonly parentProcess?: LinuxParentProcessReader;
  }) {
    this.#supervisorPid = options.supervisorPid;
    this.#currentPid = options.currentPid ?? process.pid;
    this.#currentUid = options.currentUid ?? process.getuid?.() ?? -1;
    this.#currentGid = options.currentGid ?? process.getgid?.() ?? -1;
    this.#credentials = options.credentials ?? readLinuxPeerCredentials;
    this.#parentProcess = options.parentProcess ?? readLinuxParentProcessId;
    if (
      !Number.isSafeInteger(this.#supervisorPid) ||
      this.#supervisorPid <= 0 ||
      !Number.isSafeInteger(this.#currentPid) ||
      this.#currentPid <= 0 ||
      !Number.isSafeInteger(this.#currentUid) ||
      this.#currentUid < 0 ||
      !Number.isSafeInteger(this.#currentGid) ||
      this.#currentGid < 0
    ) {
      throw new TypeError("Linux peer verifier configuration is invalid");
    }
  }

  async verify(socket: Socket): Promise<LinuxPeerCredentials> {
    let peer: LinuxPeerCredentials;
    try {
      peer = await this.#credentials(socket);
    } catch {
      throw new TypeError("Linux peer identity is unavailable");
    }
    if (peer.uid !== this.#currentUid || peer.gid !== this.#currentGid) {
      throw new TypeError("Linux peer identity is unauthorized");
    }
    if (peer.pid === this.#currentPid || peer.pid === this.#supervisorPid) return peer;
    let parentPid: number;
    try {
      parentPid = await this.#parentProcess(peer.pid);
    } catch {
      throw new TypeError("Linux peer identity is unavailable");
    }
    if (parentPid !== this.#supervisorPid) {
      throw new TypeError("Linux peer identity is unauthorized");
    }
    return peer;
  }
}
