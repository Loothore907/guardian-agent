import { chmodSync, lstatSync, type Stats } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import { dirname } from "node:path";

import {
  assertLinuxPeerHelperAvailable,
  LinuxPeerVerifier,
  readLinuxParentProcessId,
  readLinuxPeerCredentials,
} from "./peer.js";

const ACCEPT_TIMEOUT_MS = 2_000;
const MAXIMUM_CONNECTIONS = 16;
const failure = () => new TypeError("local service IPC is unavailable");

function assertParent(endpoint: string): void {
  const parent = lstatSync(dirname(endpoint));
  const uid = process.getuid?.();
  if (
    uid === undefined ||
    !parent.isDirectory() ||
    (parent.uid !== uid && parent.uid !== 0) ||
    ((parent.mode & 0o022) !== 0 && (parent.mode & 0o1000) === 0)
  )
    throw failure();
}

function socketStat(endpoint: string, expected?: Stats): Stats {
  assertParent(endpoint);
  const status = lstatSync(endpoint);
  if (
    !status.isSocket() ||
    status.uid !== process.getuid?.() ||
    (status.mode & 0o777) !== 0o600 ||
    (expected !== undefined && (status.dev !== expected.dev || status.ino !== expected.ino))
  )
    throw failure();
  return status;
}

/** Owns admission and socket lifecycle; protocol capability checks remain mandatory. */
export class LocalServiceIpcServer {
  readonly #server: Server;
  readonly #peer: LinuxPeerVerifier | null;
  readonly #connections = new Set<Socket>();
  #endpoint: string | undefined;
  #identity: Stats | undefined;
  #ready = false;
  #started = false;
  #closed = false;
  #closing: Promise<void> | undefined;
  #binding: Promise<void> | undefined;

  constructor(handler: (socket: Socket) => Promise<void>) {
    if (process.platform === "linux") assertLinuxPeerHelperAvailable();
    this.#peer =
      process.platform === "linux" ? new LinuxPeerVerifier({ supervisorPid: process.ppid }) : null;
    this.#server = createServer({ pauseOnConnect: true }, (socket) => {
      if (this.#closed || this.#connections.size >= MAXIMUM_CONNECTIONS) {
        socket.destroy();
        return;
      }
      this.#connections.add(socket);
      socket.once("close", () => this.#connections.delete(socket));
      socket.on("error", () => socket.destroy());
      const timer = setTimeout(() => socket.destroy(), ACCEPT_TIMEOUT_MS);
      timer.unref();
      void (async () => {
        try {
          if (!this.#ready || this.#endpoint === undefined) throw failure();
          if (this.#peer !== null) {
            socketStat(this.#endpoint, this.#identity);
            await this.#peer.verify(socket);
            socketStat(this.#endpoint, this.#identity);
          }
          if (!this.#ready || socket.destroyed) throw failure();
          clearTimeout(timer);
          const serving = handler(socket);
          socket.resume();
          await serving;
        } catch {
          socket.destroy();
        } finally {
          clearTimeout(timer);
        }
      })();
    });
  }

  async listen(endpoint: string): Promise<void> {
    if (this.#started || this.#closed) throw failure();
    this.#started = true;
    this.#endpoint = endpoint;
    try {
      if (this.#peer !== null) {
        assertParent(endpoint);
        try {
          lstatSync(endpoint);
          throw failure();
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw failure();
        }
      }
      this.#binding = new Promise<void>((resolve, reject) => {
        const onError = () => reject(failure());
        this.#server.once("error", onError);
        this.#server.listen(endpoint, () => {
          this.#server.off("error", onError);
          resolve();
        });
      });
      await this.#binding;
      if (this.#peer !== null) {
        const status = lstatSync(endpoint);
        if (!status.isSocket() || status.uid !== process.getuid?.()) throw failure();
        chmodSync(endpoint, 0o600);
        this.#identity = socketStat(endpoint, status);
      }
      if (this.#closed) throw failure();
      this.#ready = true;
    } catch {
      await this.close();
      throw failure();
    }
  }

  close(): Promise<void> {
    if (this.#closing !== undefined) return this.#closing;
    this.#closed = true;
    this.#ready = false;
    for (const socket of this.#connections) socket.destroy();
    this.#closing = (async () => {
      await this.#binding?.catch(() => {});
      for (const socket of this.#connections) socket.destroy();
      if (!this.#server.listening) return;
      await new Promise<void>((resolve) => this.#server.close(() => resolve()));
    })();
    return this.#closing;
  }
}

/** Authenticate before sending a capability. Attach the response reader, then resume the socket. */
export async function verifyLocalServiceConnection(
  socket: Socket,
  endpoint: string,
): Promise<void> {
  let rejectClosed: (error: Error) => void = () => {};
  const closed = new Promise<never>((_resolve, reject) => {
    rejectClosed = reject;
  });
  const onFailure = () => rejectClosed(failure());
  socket.on("error", onFailure);
  socket.once("close", () => socket.off("error", onFailure));
  socket.once("close", onFailure);
  try {
    await Promise.race([
      closed,
      (async () => {
        const before = process.platform === "linux" ? socketStat(endpoint) : undefined;
        if (socket.connecting)
          await new Promise<void>((resolve) => socket.once("connect", resolve));
        if (process.platform === "linux") {
          const peer = await readLinuxPeerCredentials(socket);
          if (peer.uid !== process.getuid?.() || peer.gid !== process.getgid?.()) throw failure();
          if (peer.pid !== process.pid && peer.pid !== process.ppid) {
            const parent = await readLinuxParentProcessId(peer.pid);
            if (parent !== process.pid && parent !== process.ppid) throw failure();
          }
          socketStat(endpoint, before);
        }
        if (socket.destroyed) throw failure();
      })(),
    ]);
  } catch {
    socket.destroy();
    throw failure();
  } finally {
    socket.off("close", onFailure);
  }
}
