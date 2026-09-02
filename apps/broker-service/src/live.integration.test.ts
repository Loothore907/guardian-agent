import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { LocalAuthorityIpcClient, createAuthorityIpcEndpoint } from "@guardian/authority-client";
import { startAuthorityService } from "@guardian/authority-service";
import { DevelopmentAuthorizationIssuer } from "@guardian/authorization-service";
import { digestGitHubConnectionScope } from "@guardian/authorization";
import { GitHubCredentialMetadataSchema } from "@guardian/contracts";
import { WindowsCredentialStore } from "@guardian/credential-store";
import { expect, it } from "vitest";

import { createBrokerService } from "./index.js";
import type { GitHubCredentialRefreshDiagnostic } from "./github-credential.js";

const enabled = process.env.GUARDIAN_TEST_LIVE_GITHUB_BROKER === "1";

it.runIf(enabled)(
  "runs the protected OS-store GitHub read path without repository mutation",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "guardian-live-github-"));
    if (process.platform !== "win32") await chmod(directory, 0o700);
    const sessionId = randomUUID();
    const callerId = randomUUID();
    const connectionId = randomUUID();
    const handle = `guardian-credential://github/${randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const endpoint = createAuthorityIpcEndpoint();
    const launcherBinding = {
      schemaVersion: 1 as const,
      capability: randomUUID(),
      callerRole: "launcher" as const,
      callerId,
      sessionId,
      allowedOperations: ["connection.create", "session.create"],
      issuedAt: now,
      expiresAt,
    };
    const brokerBinding = {
      schemaVersion: 1 as const,
      capability: randomUUID(),
      callerRole: "broker_service" as const,
      callerId,
      sessionId,
      allowedOperations: [
        "session.get",
        "connection.list",
        "approval.get",
        "approval.state",
        "budget.consume_tool",
        "approval.consume",
        "context.append_attempt",
        "context.append_decision",
      ],
      issuedAt: now,
      expiresAt,
    };
    const authorizationBinding = {
      schemaVersion: 1 as const,
      capability: randomUUID(),
      callerRole: "authorization_service" as const,
      callerId,
      sessionId,
      allowedOperations: ["approval.store"],
      issuedAt: now,
      expiresAt,
    };
    const authority = await startAuthorityService({
      schemaVersion: 1,
      serviceInstanceId: randomUUID(),
      endpoint,
      authorityStorePath: join(directory, "authority.sqlite"),
      workspaceRoots: [],
      capabilities: [launcherBinding, brokerBinding, authorizationBinding],
    });
    try {
      const launcher = new LocalAuthorityIpcClient({ endpoint, binding: launcherBinding });
      const connection = {
        schemaVersion: 1,
        connectionId,
        provider: "github",
        credentialStoreHandle: handle,
        owner: "loothore907",
        repository: "guardian-agent-demo",
        permissions: ["pull_request:read", "pull_request:merge"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      } as const;
      await launcher.createConnection(connection);
      const missionId = randomUUID();
      const profileId = randomUUID();
      await launcher.createSession(
        {
          schemaVersion: 1,
          sessionId,
          callerId,
          missionId,
          missionVersion: 1,
          profileId,
          profileVersion: 1,
          policyVersion: 1,
          startsAt: now,
          expiresAt,
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
        {
          sessionId,
          remainingToolCalls: 1,
          remainingLocalCommands: 0,
          remainingResearchRequests: 0,
          remainingResearchResults: 0,
        },
        [connectionId],
      );
      const pullRequest = Number(process.env.GUARDIAN_GITHUB_LIVE_PULL_REQUEST ?? "1");
      if (!Number.isInteger(pullRequest) || pullRequest < 1) throw new TypeError("invalid live PR");
      const configuredHead = process.env.GUARDIAN_GITHUB_LIVE_HEAD_SHA;
      if (configuredHead !== undefined && !/^[a-f0-9]{40}$/u.test(configuredHead)) {
        throw new TypeError("invalid live PR head");
      }
      const expectedHead = configuredHead ?? "0".repeat(40);
      const mergeEnabled = process.env.GUARDIAN_GITHUB_LIVE_MERGE === "1";
      const resourceVersion = {
        kind: "github_pull_request" as const,
        owner: "loothore907",
        repository: "guardian-agent-demo",
        pullRequest,
        headCommit: expectedHead,
      };
      const credentialStore = new WindowsCredentialStore();
      const forceRefresh = process.env.GUARDIAN_GITHUB_FORCE_REFRESH === "1";
      let originalMetadata: ReturnType<typeof GitHubCredentialMetadataSchema.parse> | undefined;
      if (forceRefresh) {
        const metadata = await credentialStore.use(
          { schemaVersion: 1, provider: "github", slot: "metadata" },
          (bytes) =>
            Promise.resolve(
              GitHubCredentialMetadataSchema.parse(
                JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown,
              ),
            ),
        );
        if (Date.parse(metadata.refreshExpiresAt) <= Date.now()) {
          throw new TypeError("protected GitHub refresh credential is expired");
        }
        originalMetadata = metadata;
        const forcedMetadata = Uint8Array.from(
          Buffer.from(
            JSON.stringify({
              ...metadata,
              accessExpiresAt: new Date(Date.now() - 1_000).toISOString(),
            }),
            "utf8",
          ),
        );
        try {
          await credentialStore.write(
            { schemaVersion: 1, provider: "github", slot: "metadata" },
            forcedMetadata,
          );
        } finally {
          forcedMetadata.fill(0);
        }
      }
      const refreshDiagnostics: GitHubCredentialRefreshDiagnostic[] = [];
      const broker = createBrokerService({
        authorityEndpoint: endpoint,
        authorityBinding: brokerBinding,
        credentialStoreHandle: handle,
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
        onCredentialRefreshDiagnostic: (diagnostic) => refreshDiagnostics.push(diagnostic),
      });
      const request = {
        schemaVersion: 1,
        requestId: randomUUID(),
        sessionId,
        callerId,
        connectionId,
        missionId,
        missionVersion: 1,
        profileId,
        profileVersion: 1,
        policyVersion: 1,
        proposal: {
          schemaVersion: 1,
          proposalId: randomUUID(),
          sessionId,
          callerId,
          missionId,
          missionVersion: 1,
          profileId,
          profileVersion: 1,
          proposedAt: now,
          operation: mergeEnabled ? "github.pull_request.merge" : "github.pull_request.read",
          arguments: mergeEnabled
            ? {
                owner: "loothore907",
                repository: "guardian-agent-demo",
                pullRequest,
                expectedHeadCommit: expectedHead,
                method: "squash" as const,
              }
            : { owner: "loothore907", repository: "guardian-agent-demo", pullRequest },
          resourceVersion,
        },
        resourceVersion,
      } as const;
      let approval: unknown;
      if (mergeEnabled) {
        const authorization = new LocalAuthorityIpcClient({
          endpoint,
          binding: authorizationBinding,
        });
        const issuer = new DevelopmentAuthorizationIssuer({
          authority: authorization,
          binding: authorizationBinding,
        });
        approval = (
          await issuer.issueExactApproval({
            request,
            scopeDigest: digestGitHubConnectionScope(connection),
            confirmation: { principalId: randomUUID(), confirmedAt: new Date().toISOString() },
            lifetimeSeconds: 120,
          })
        ).approval;
      }
      const result = await broker.execute({
        request,
        ...(approval === undefined ? {} : { approval }),
      });
      if (
        forceRefresh &&
        originalMetadata !== undefined &&
        refreshDiagnostics.some(({ outcome }) => outcome === "failed") &&
        (
          await credentialStore.status({
            schemaVersion: 1,
            provider: "github",
            slot: "metadata",
          })
        ).state === "available"
      ) {
        const originalMetadataBytes = Uint8Array.from(
          Buffer.from(JSON.stringify(originalMetadata), "utf8"),
        );
        try {
          await credentialStore.write(
            { schemaVersion: 1, provider: "github", slot: "metadata" },
            originalMetadataBytes,
          );
        } finally {
          originalMetadataBytes.fill(0);
        }
      }
      if (mergeEnabled) {
        expect(result.ok).toBe(true);
        if (!result.ok || !("status" in result.result) || result.result.status !== "merged") {
          throw new TypeError("expected live merge result");
        }
        expect(result.result).toMatchObject({
          status: "merged",
          owner: "loothore907",
          repository: "guardian-agent-demo",
          pullRequest,
          headCommit: expectedHead,
        });
        expect(result.result.mergeCommit).toMatch(/^[a-f0-9]{40}$/u);
      } else if (configuredHead === undefined) {
        expect(result.ok).toBe(false);
        if (result.ok) throw new TypeError("expected live read denial");
        expect(["resource_changed", "connection_unavailable"]).toContain(result.code);
      } else {
        expect(result).toEqual({
          ok: true,
          result: {
            owner: "loothore907",
            repository: "guardian-agent-demo",
            pullRequest,
            headCommit: configuredHead,
            state: "open",
            draft: false,
            title: "test: exercise exact Guardian approval path",
            baseBranch: "main",
          },
        });
      }
      expect(JSON.stringify(result)).not.toMatch(/gh[ur]_/u);
      await expect(
        credentialStore.status({ schemaVersion: 1, provider: "github", slot: "metadata" }),
      ).resolves.toMatchObject({ state: "available" });
      if (forceRefresh) {
        expect(refreshDiagnostics).toContainEqual({
          stage: "refresh_token_write",
          outcome: "succeeded",
        });
        expect(refreshDiagnostics).toContainEqual({
          stage: "access_token_write",
          outcome: "succeeded",
        });
        expect(refreshDiagnostics).toContainEqual({
          stage: "metadata_write",
          outcome: "succeeded",
        });
        expect(refreshDiagnostics.some(({ outcome }) => outcome === "failed")).toBe(false);
        expect(JSON.stringify(refreshDiagnostics)).not.toMatch(/gh[ur]_/u);
      }
    } finally {
      await authority.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
