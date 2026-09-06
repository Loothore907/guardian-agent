import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createConnection, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalServiceIpcServer, verifyLocalServiceConnection } from "./service-ipc.js";

const directories: string[] = [];
const servers: LocalServiceIpcServer[] = [];
const sockets: Socket[] = [];
const fixture = fileURLToPath(new URL("../test-fixtures/service-peer.mjs", import.meta.url));
const capability = "fixture-valid-capability";

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy();
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function location() {
  const directory = await mkdtemp(join(tmpdir(), "guardian-service-ipc-"));
  directories.push(directory);
  await chmod(directory, 0o700);
  return { directory, endpoint: join(directory, "service.sock") };
}

function server(handler: (socket: Socket) => Promise<void>) {
  const instance = new LocalServiceIpcServer(handler);
  servers.push(instance);
  return instance;
}

describe.skipIf(process.platform !== "linux")("Linux service IPC admission", () => {
  it("admits the owning process through an owner-only socket and preserves protocol checks", async () => {
    const { endpoint } = await location();
    const handler = vi.fn(async (socket: Socket) => {
      const [chunk] = (await once(socket, "data")) as [Buffer];
      socket.end(chunk.toString() === capability ? "allowed" : "denied");
    });
    await server(handler).listen(endpoint);
    const status = await lstat(endpoint);
    expect(status.uid).toBe(process.getuid?.());
    expect(status.mode & 0o777).toBe(0o600);
    for (const [sent, expected] of [
      [capability, "allowed"],
      ["wrong-capability", "denied"],
    ]) {
      const socket = createConnection(endpoint);
      sockets.push(socket);
      await verifyLocalServiceConnection(socket, endpoint);
      const response = once(socket, "data");
      socket.resume();
      socket.write(sent!);
      expect(String((await response)[0])).toBe(expected);
      socket.destroy();
    }
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("rejects an unrelated process carrying the valid capability before the handler", async () => {
    const { endpoint } = await location();
    const handler = vi.fn((socket: Socket) => {
      socket.end("unexpected");
      return Promise.resolve();
    });
    await server(handler).listen(endpoint);
    const child = spawn(process.execPath, [fixture, "caller"], {
      env: {},
      stdio: ["pipe", "ignore", "ignore"],
    });
    const exited = once(child, "exit");
    child.stdin.end(JSON.stringify({ endpoint, capability }));
    expect((await exited)[0]).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects an unrelated listener before sending the capability", async () => {
    const { directory, endpoint } = await location();
    const outputPath = join(directory, "counts.json");
    const relay = spawn(process.execPath, [fixture, "relay"], {
      env: {},
      stdio: ["pipe", "pipe", "ignore"],
    });
    const exited = once(relay, "exit");
    try {
      const ready = once(relay.stdout, "data");
      relay.stdin.end(JSON.stringify({ endpoint, outputPath }));
      expect(String((await ready)[0])).toBe("ready\n");
      const socket = createConnection(endpoint);
      sockets.push(socket);
      await expect(verifyLocalServiceConnection(socket, endpoint)).rejects.toThrow(
        /^local service IPC is unavailable$/u,
      );
      await vi.waitFor(async () => {
        expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual({ bytes: 0 });
      });
    } finally {
      relay.kill();
      await exited;
    }
  });

  it("preserves occupied files and symlinks and rejects unsafe parent permissions", async () => {
    const { directory, endpoint } = await location();
    await writeFile(endpoint, "preserve", { mode: 0o600 });
    await expect(server(async () => {}).listen(endpoint)).rejects.toThrow(
      "local service IPC is unavailable",
    );
    expect(await readFile(endpoint, "utf8")).toBe("preserve");
    const link = join(directory, "link.sock");
    await symlink(endpoint, link);
    await expect(server(async () => {}).listen(link)).rejects.toThrow(
      "local service IPC is unavailable",
    );
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    await chmod(directory, 0o777);
    await expect(server(async () => {}).listen(join(directory, "unsafe.sock"))).rejects.toThrow(
      "local service IPC is unavailable",
    );
    await chmod(directory, 0o700);
  });

  it("denies socket permission drift on both peers before protocol handling", async () => {
    const { endpoint } = await location();
    const handler = vi.fn(async () => {});
    await server(handler).listen(endpoint);
    await chmod(endpoint, 0o666);
    const socket = createConnection(endpoint);
    sockets.push(socket);
    await expect(verifyLocalServiceConnection(socket, endpoint)).rejects.toThrow(
      "local service IPC is unavailable",
    );
    const raw = createConnection(endpoint);
    sockets.push(raw);
    const closed = new Promise<void>((resolve) => raw.once("close", () => resolve()));
    raw.on("error", () => {});
    raw.end(capability);
    await closed;
    expect(handler).not.toHaveBeenCalled();
  });

  it("closes incomplete and disconnected requests and cannot reopen", async () => {
    const { endpoint } = await location();
    const instance = server(async (socket) => {
      await once(socket, "data");
    });
    await instance.listen(endpoint);
    const socket = createConnection(endpoint);
    sockets.push(socket);
    await verifyLocalServiceConnection(socket, endpoint);
    socket.destroy();
    const pending = createConnection(endpoint);
    sockets.push(pending);
    await verifyLocalServiceConnection(pending, endpoint);
    const closed = once(pending, "close");
    pending.resume();
    await Promise.all([instance.close(), instance.close()]);
    await closed;
    await expect(instance.listen(endpoint)).rejects.toThrow("local service IPC is unavailable");
    await expect(lstat(endpoint)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed when the native helper is absent from an isolated module copy", async () => {
    const { directory } = await location();
    await mkdir(join(directory, "src"));
    await copyFile(
      fileURLToPath(new URL("../dist/peer.js", import.meta.url)),
      join(directory, "src/peer.mjs"),
    );
    const module = (await import(pathToFileURL(join(directory, "src/peer.mjs")).href)) as {
      assertLinuxPeerHelperAvailable: () => void;
    };
    expect(() => module.assertLinuxPeerHelperAvailable()).toThrow(
      /^Linux peer identity helper is unavailable$/u,
    );
  });

  it("cleans up a close racing with initial binding", async () => {
    const { endpoint } = await location();
    const instance = server(async () => {});
    const starting = instance.listen(endpoint);
    const rejected = expect(starting).rejects.toThrow("local service IPC is unavailable");
    await instance.close();
    await rejected;
    await expect(lstat(endpoint)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
