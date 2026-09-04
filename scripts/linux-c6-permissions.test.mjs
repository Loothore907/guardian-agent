import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  LocalAuthorityIpcClient,
  createAuthorityIpcEndpoint,
} from "../packages/authority-client/dist/index.js";
import { SqliteAuthorityStore } from "../packages/authority-store/dist/index.js";
import { startAuthorityService } from "../apps/authority-service/dist/index.js";

const SESSION = "11111111-1111-4111-8111-111111111111";
const CALLER = "22222222-2222-4222-8222-222222222222";
const START = "2026-09-03T20:00:00.000Z";
const EXPIRY = "2026-09-03T21:00:00.000Z";

function binding(capability) {
  return {
    schemaVersion: 1,
    capability,
    callerRole: "broker_service",
    callerId: CALLER,
    sessionId: SESSION,
    allowedOperations: ["session.get"],
    issuedAt: START,
    expiresAt: EXPIRY,
  };
}

async function privateDirectory(prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  await chmod(directory, 0o700);
  return directory;
}

async function attemptFromUnrelatedChild(endpoint, authorizedBinding) {
  const source = String.raw`
import { LocalAuthorityIpcClient } from "./packages/authority-client/dist/index.js";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { endpoint, binding, sessionId } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
try {
  await new LocalAuthorityIpcClient({ endpoint, binding }).getSession(sessionId);
  process.exitCode = 2;
} catch {
  process.exitCode = 0;
}
`;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "--eval", source], {
      cwd: process.cwd(),
      env: {},
      stdio: ["pipe", "ignore", "ignore"],
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`unrelated child unexpectedly reached authority service (${code})`));
    });
    child.stdin.end(JSON.stringify({ endpoint, binding: authorizedBinding, sessionId: SESSION }));
  });
}

test(
  "Linux authority IPC and SQLite files are current-user-only",
  { skip: process.platform !== "linux" },
  async () => {
    const directory = await privateDirectory("guardian-c6-linux-");
    const databasePath = join(directory, "authority.sqlite");
    const endpoint = createAuthorityIpcEndpoint();
    const authorizedBinding = binding(randomUUID());
    const service = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath: databasePath,
        workspaceRoots: [],
        capabilities: [authorizedBinding],
      },
      { now: () => "2026-09-03T20:30:00.000Z" },
    );
    try {
      const endpointStat = await stat(endpoint);
      assert.equal(endpointStat.isSocket(), true);
      assert.equal(endpointStat.uid, process.getuid());
      assert.equal(endpointStat.mode & 0o777, 0o600);

      for (const name of await readdir(directory)) {
        if (!name.startsWith("authority.sqlite")) continue;
        const databaseFileStat = await stat(join(directory, name));
        assert.equal(databaseFileStat.uid, process.getuid());
        assert.equal(databaseFileStat.mode & 0o777, 0o600, `${name} must be mode 0600`);
      }

      const unknownClient = new LocalAuthorityIpcClient({
        endpoint,
        binding: binding(randomUUID()),
      });
      await assert.rejects(
        unknownClient.getSession(SESSION),
        (error) => error?.reason === "unauthorized",
      );

      await attemptFromUnrelatedChild(endpoint, authorizedBinding);
    } finally {
      await service.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  "Linux authority state rejects broad permissions and symbolic-link files",
  { skip: process.platform !== "linux" },
  async () => {
    const directory = await privateDirectory("guardian-c6-linux-reject-");
    const databasePath = join(directory, "authority.sqlite");
    const targetPath = join(directory, "outside.sqlite");
    try {
      await chmod(directory, 0o750);
      assert.throws(
        () => new SqliteAuthorityStore(databasePath),
        /parent permissions are too broad/u,
      );
      await chmod(directory, 0o700);

      await writeFile(databasePath, "", { mode: 0o640 });
      assert.throws(
        () => new SqliteAuthorityStore(databasePath),
        /file permissions are too broad/u,
      );
      await chmod(databasePath, 0o600);
      await writeFile(`${databasePath}-wal`, "", { mode: 0o640 });
      assert.throws(
        () => new SqliteAuthorityStore(databasePath),
        /file permissions are too broad/u,
      );
      await rm(`${databasePath}-wal`);
      await rm(databasePath);

      await writeFile(targetPath, "", { mode: 0o600 });
      await symlink(targetPath, databasePath);
      assert.throws(() => new SqliteAuthorityStore(databasePath), /regular SQLite files/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
