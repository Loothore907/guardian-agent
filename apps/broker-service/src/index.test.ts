import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LocalAuthorityIpcClient, createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { startAuthorityService } from "@guardian/authority-service";
import { DevelopmentAuthorizationIssuer } from "@guardian/authorization-service";
import { digestGitHubConnectionScope } from "@guardian/authorization";
import { InMemoryCredentialStore } from "@guardian/credential-store";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createBrokerService } from "./index.js";

const temporaryDirectories: string[] = [];
const SESSION = "11111111-1111-4111-8111-111111111111";
const CALLER = "22222222-2222-4222-8222-222222222222";
const CONNECTION = "33333333-3333-4333-8333-333333333333";
const HANDLE = "guardian-credential://github/44444444-4444-4444-8444-444444444444";
const MISSION = "55555555-5555-4555-8555-555555555555";
const PROFILE = "66666666-6666-4666-8666-666666666666";
const START = "2026-08-30T22:30:00.000Z";
const NOW = "2026-08-30T22:32:00.000Z";
const EXPIRY = "2026-08-30T22:40:00.000Z";
const HEAD = "a".repeat(40);
const MERGE = "b".repeat(40);
const SECRET = "ghu_secret_corpus_fixture_0123456789";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function binding(callerRole: "launcher" | "broker_service", allowedOperations: readonly string[]) {
  return {
    schemaVersion: 1,
    capability: randomUUID(),
    callerRole,
    callerId: CALLER,
    sessionId: SESSION,
    allowedOperations,
    issuedAt: START,
    expiresAt: EXPIRY,
  };
}

describe("broker service boundary", () => {
  it("keeps a callback-scoped credential out of public read/merge and durable surfaces", async () => {
    const directory = await mkdtemp(join(tmpdir(), "guardian-broker-service-"));
    temporaryDirectories.push(directory);
    const consoleOutput: unknown[] = [];
    for (const method of ["log", "warn", "error", "debug", "trace"] as const) {
      vi.spyOn(console, method).mockImplementation((...values: unknown[]) => {
        consoleOutput.push({ method, values });
      });
    }
    if (process.platform !== "win32") await chmod(directory, 0o700);
    const endpoint = createAuthorityIpcEndpoint();
    const launcherBinding = binding("launcher", ["connection.create", "session.create"]);
    const brokerBinding = binding("broker_service", [
      "session.get",
      "connection.list",
      "approval.get",
      "approval.state",
      "budget.consume_tool",
      "approval.consume",
      "context.append_attempt",
      "context.append_decision",
    ]);
    const authorizationBinding = {
      ...binding("launcher", ["approval.store"]),
      callerRole: "authorization_service" as const,
    };
    const authorityStorePath = join(directory, "authority.sqlite");
    const authority = await startAuthorityService(
      {
        schemaVersion: 1,
        serviceInstanceId: randomUUID(),
        endpoint,
        authorityStorePath,
        workspaceRoots: [],
        capabilities: [launcherBinding, brokerBinding, authorizationBinding],
      },
      { now: () => NOW },
    );
    try {
      expect(authority.interruptedSessions).toBe(0);
      const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
      await launcher.createConnection({
        schemaVersion: 1,
        connectionId: CONNECTION,
        provider: "github",
        credentialStoreHandle: HANDLE,
        owner: "loothore907",
        repository: "guardian-agent",
        permissions: ["pull_request:read", "pull_request:merge"],
        status: "active",
        createdAt: START,
        updatedAt: START,
      });
      await launcher.createSession(
        {
          schemaVersion: 1,
          sessionId: SESSION,
          callerId: CALLER,
          missionId: MISSION,
          missionVersion: 1,
          profileId: PROFILE,
          profileVersion: 1,
          policyVersion: 1,
          startsAt: START,
          expiresAt: EXPIRY,
          status: "active",
          createdAt: START,
          updatedAt: START,
        },
        {
          sessionId: SESSION,
          remainingToolCalls: 3,
          remainingLocalCommands: 0,
          remainingResearchRequests: 0,
          remainingResearchResults: 0,
        },
        [CONNECTION],
      );

      const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) =>
        Promise.resolve(
          init?.method === "GET"
            ? Response.json({
                head: { sha: HEAD, credential: SECRET },
                base: { ref: "main" },
                state: "open",
                draft: false,
                title: "C6 authority IPC",
                body: SECRET,
              })
            : Response.json({ merged: true, sha: MERGE, message: SECRET }),
        ),
      );
      const credentialStore = new InMemoryCredentialStore();
      await credentialStore.write(
        { schemaVersion: 1, provider: "github", slot: "default" },
        Buffer.from(SECRET),
      );
      await credentialStore.write(
        { schemaVersion: 1, provider: "github", slot: "metadata" },
        Buffer.from(
          JSON.stringify({
            schemaVersion: 1,
            accessExpiresAt: "2026-08-30T23:32:00.000Z",
            refreshExpiresAt: "2027-02-28T22:32:00.000Z",
          }),
        ),
      );
      const broker = createBrokerService({
        authorityEndpoint: endpoint,
        authorityBinding: brokerBinding,
        credentialStoreHandle: HANDLE,
        credentialStore,
        githubClientId: "Iv23liP8Sq3ZEAyeIHju",
        guardian: {
          evaluate: (envelope) =>
            Promise.resolve({
              status: "evaluated" as const,
              providerRequestId: "guardian_test_1",
              recommendation: {
                schemaVersion: 1 as const,
                recommendation: "allow" as const,
                certainty: "certain" as const,
                reasonCodes: ["clean_context" as const],
              },
              authorizationLevel: envelope.deterministicFloor,
            }),
        },
        fetch: fetchMock,
        now: () => NOW,
      });
      const resourceVersion = {
        kind: "github_pull_request",
        owner: "loothore907",
        repository: "guardian-agent",
        pullRequest: 13,
        headCommit: HEAD,
      } as const;
      const request = (operation: "read" | "merge") => ({
        schemaVersion: 1,
        requestId: randomUUID(),
        sessionId: SESSION,
        callerId: CALLER,
        connectionId: CONNECTION,
        missionId: MISSION,
        missionVersion: 1,
        profileId: PROFILE,
        profileVersion: 1,
        policyVersion: 1,
        proposal: {
          schemaVersion: 1,
          proposalId: randomUUID(),
          sessionId: SESSION,
          callerId: CALLER,
          missionId: MISSION,
          missionVersion: 1,
          profileId: PROFILE,
          profileVersion: 1,
          proposedAt: NOW,
          operation:
            operation === "read" ? "github.pull_request.read" : "github.pull_request.merge",
          arguments:
            operation === "read"
              ? { owner: "loothore907", repository: "guardian-agent", pullRequest: 13 }
              : {
                  owner: "loothore907",
                  repository: "guardian-agent",
                  pullRequest: 13,
                  expectedHeadCommit: HEAD,
                  method: "squash" as const,
                },
          resourceVersion,
        },
        resourceVersion,
      });
      const readResult = await broker.execute({ request: request("read") });
      expect(readResult).toMatchObject({ ok: true, result: { headCommit: HEAD } });

      const mergeRequest = request("merge");
      const authorization = new LocalAuthorityIpcClient({
        endpoint,
        binding: authorizationBinding,
      });
      const approval = (
        await new DevelopmentAuthorizationIssuer({
          authority: authorization,
          binding: authorizationBinding,
          now: () => NOW,
        }).issueExactApproval({
          request: mergeRequest,
          scopeDigest: digestGitHubConnectionScope({
            schemaVersion: 1,
            connectionId: CONNECTION,
            provider: "github",
            credentialStoreHandle: HANDLE,
            owner: "loothore907",
            repository: "guardian-agent",
            permissions: ["pull_request:read", "pull_request:merge"],
            status: "active",
            createdAt: START,
            updatedAt: START,
          }),
          confirmation: { principalId: randomUUID(), confirmedAt: NOW },
          lifetimeSeconds: 120,
        })
      ).approval;
      const mergeResult = await broker.execute({ request: mergeRequest, approval });
      expect(mergeResult).toMatchObject({
        ok: true,
        result: { status: "merged", headCommit: HEAD, mergeCommit: MERGE },
      });
      expect(broker.authorityTransport).toBe("authenticated-local-ipc");

      const publicSurfaces = JSON.stringify({
        readResult,
        mergeResult,
        service: {
          credentialSource: broker.credentialSource,
          authorityTransport: broker.authorityTransport,
        },
      });
      expect(publicSurfaces).not.toContain(SECRET);
      expect(JSON.stringify(consoleOutput)).not.toContain(SECRET);
      expect(process.argv.join("\n")).not.toContain(SECRET);
      expect(JSON.stringify(process.env)).not.toContain(SECRET);
      for (const file of await readdir(directory)) {
        expect((await readFile(join(directory, file))).includes(Buffer.from(SECRET))).toBe(false);
      }
    } finally {
      await authority.close();
      vi.restoreAllMocks();
    }
  });
});
