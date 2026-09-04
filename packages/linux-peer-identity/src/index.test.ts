import type { Socket } from "node:net";

import { describe, expect, it, vi } from "vitest";

import { LinuxPeerVerifier } from "./index.js";

const socket = {} as Socket;

function verifier(peer: { pid: number; uid: number; gid: number }, parentPid = 10) {
  const credentials = vi.fn(() => Promise.resolve(peer));
  const parentProcess = vi.fn(() => Promise.resolve(parentPid));
  return {
    credentials,
    parentProcess,
    verifier: new LinuxPeerVerifier({
      supervisorPid: 10,
      currentPid: 20,
      currentUid: 1_000,
      currentGid: 1_000,
      credentials,
      parentProcess,
    }),
  };
}

describe("Linux peer identity policy", () => {
  it("accepts the authority process, supervisor, and direct sibling children", async () => {
    for (const peerPid of [20, 10, 30]) {
      const fixture = verifier({ pid: peerPid, uid: 1_000, gid: 1_000 });
      await expect(fixture.verifier.verify(socket)).resolves.toMatchObject({ pid: peerPid });
      expect(fixture.parentProcess).toHaveBeenCalledTimes(peerPid === 30 ? 1 : 0);
    }
  });

  it("rejects another user, group, or unrelated process", async () => {
    await expect(
      verifier({ pid: 30, uid: 2_000, gid: 1_000 }).verifier.verify(socket),
    ).rejects.toThrow(/unauthorized/u);
    await expect(
      verifier({ pid: 30, uid: 1_000, gid: 2_000 }).verifier.verify(socket),
    ).rejects.toThrow(/unauthorized/u);
    await expect(
      verifier({ pid: 30, uid: 1_000, gid: 1_000 }, 99).verifier.verify(socket),
    ).rejects.toThrow(/unauthorized/u);
  });

  it("fails closed when kernel credentials or process ancestry are unavailable", async () => {
    const missingCredentials = new LinuxPeerVerifier({
      supervisorPid: 10,
      currentPid: 20,
      currentUid: 1_000,
      currentGid: 1_000,
      credentials: () => Promise.reject(new Error("private diagnostic")),
    });
    await expect(missingCredentials.verify(socket)).rejects.toThrow(
      "Linux peer identity is unavailable",
    );

    const missingParent = new LinuxPeerVerifier({
      supervisorPid: 10,
      currentPid: 20,
      currentUid: 1_000,
      currentGid: 1_000,
      credentials: () => Promise.resolve({ pid: 30, uid: 1_000, gid: 1_000 }),
      parentProcess: () => Promise.reject(new Error("private diagnostic")),
    });
    await expect(missingParent.verify(socket)).rejects.toThrow(
      "Linux peer identity is unavailable",
    );
  });

  it("rejects invalid trusted-process configuration", () => {
    expect(
      () =>
        new LinuxPeerVerifier({
          supervisorPid: 0,
          currentPid: 20,
          currentUid: 1_000,
          currentGid: 1_000,
        }),
    ).toThrow(/configuration is invalid/u);
  });
});
