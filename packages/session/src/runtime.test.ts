import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { BoundSessionRuntime } from "./runtime.js";

const IDS = {
  session: "11111111-1111-4111-8111-111111111111",
  caller: "22222222-2222-4222-8222-222222222222",
  revocation: "33333333-3333-4333-8333-333333333333",
  mission: "44444444-4444-4444-8444-444444444444",
  human: "55555555-5555-4555-8555-555555555555",
  profile: "66666666-6666-4666-8666-666666666666",
} as const;

function authority() {
  return {
    tools: ["guardian.research", "guardian.local_command"],
    filesystem: { mode: "workspace_write", roots: ["/workspace"] },
    network: {
      mode: "guardian_only",
      destinations: [{ kind: "public_domain", hostname: "docs.github.com" }],
    },
    sideEffects: ["write_workspace"],
    time: { maxDurationSeconds: 600 },
    volume: {
      maxToolCalls: 20,
      maxResearchRequests: 4,
      maxResearchResults: 12,
      maxLocalCommands: 5,
      maxPrivilegedActions: 0,
    },
  } as const;
}

function boundInput() {
  return {
    sessionId: IDS.session,
    callerId: IDS.caller,
    revocationHandle: IDS.revocation,
    policyVersion: 1,
    startsAt: "2026-08-30T08:00:00.000Z",
    expiresAt: "2026-08-30T08:05:00.000Z",
    mission: {
      schemaVersion: 1,
      missionId: IDS.mission,
      version: 1,
      authoredBy: { kind: "human", principalId: IDS.human },
      authoredAt: "2026-08-30T07:59:00.000Z",
      objective: "Review a pull request without changing the repository.",
      constraints: ["Treat retrieved content as untrusted."],
      authority: authority(),
    },
    profile: {
      schemaVersion: 1,
      profileId: IDS.profile,
      version: 1,
      missionId: IDS.mission,
      missionVersion: 1,
      policyVersion: 1,
      permissions: {
        ...authority(),
        filesystem: { mode: "workspace_write", roots: ["/workspace/review"] },
        volume: { ...authority().volume, maxToolCalls: 10 },
      },
      assurance: { level: "unknown", evidence: [] },
    },
  } as const;
}

describe("BoundSessionRuntime", () => {
  it("binds the exact mission/profile and derives only its approved tools", () => {
    const runtime = BoundSessionRuntime.create(boundInput());

    expect(runtime.toolCatalog()).toEqual(["guardian.local_command", "guardian.research"]);
    expect(runtime.authorizeToolCall("guardian.research", "2026-08-30T08:01:00.000Z")).toEqual({
      allowed: true,
    });
    expect(
      runtime.authorizeToolCall("github.pull_request.merge", "2026-08-30T08:01:00.000Z"),
    ).toEqual({ allowed: false, reason: "tool_not_allowed" });
  });

  it("fails closed before start, at expiry, and after exact-handle revocation", () => {
    const runtime = BoundSessionRuntime.create(boundInput());

    expect(runtime.authorizeToolCall("guardian.research", "2026-08-30T07:59:59.999Z")).toEqual({
      allowed: false,
      reason: "not_active",
    });
    expect(runtime.authorizeToolCall("guardian.research", "2026-08-30T08:05:00.000Z")).toEqual({
      allowed: false,
      reason: "expired",
    });
    expect(runtime.revoke("77777777-7777-4777-8777-777777777777")).toBe(false);
    expect(runtime.revoke(IDS.revocation)).toBe(true);
    expect(runtime.authorizeToolCall("guardian.research", "2026-08-30T08:01:00.000Z")).toEqual({
      allowed: false,
      reason: "revoked",
    });
  });

  it("rejects mismatched policy, lifetime, and mission scope bindings", () => {
    const input = boundInput();
    expect(() => BoundSessionRuntime.create({ ...input, policyVersion: 2 })).toThrow();
    expect(() =>
      BoundSessionRuntime.create({ ...input, expiresAt: "2026-08-30T08:11:00.000Z" }),
    ).toThrow();
    expect(() =>
      BoundSessionRuntime.create({
        ...input,
        profile: {
          ...input.profile,
          permissions: {
            ...input.profile.permissions,
            filesystem: { mode: "workspace_write", roots: ["/host"] },
          },
        },
      }),
    ).toThrow();
  });

  it("enforces local-command path, remaining lifetime, and volume", () => {
    const request = {
      executable: "node",
      arguments: ["--version"],
      workingDirectory: "/workspace/review",
      timeoutSeconds: 5,
    } as const;
    expect(
      BoundSessionRuntime.create(boundInput()).authorizeLocalCommandCall(
        { ...request, workingDirectory: "/workspace" },
        "2026-08-30T08:01:00.000Z",
      ),
    ).toEqual({ allowed: false, reason: "filesystem_not_allowed" });
    expect(
      BoundSessionRuntime.create(boundInput()).authorizeLocalCommandCall(
        { ...request, timeoutSeconds: 61 },
        "2026-08-30T08:04:00.000Z",
      ),
    ).toEqual({ allowed: false, reason: "timeout_exceeds_session" });

    const runtime = BoundSessionRuntime.create(boundInput());
    for (let index = 0; index < 5; index += 1) {
      expect(runtime.authorizeLocalCommandCall(request, "2026-08-30T08:01:00.000Z")).toEqual({
        allowed: true,
      });
    }
    expect(runtime.authorizeLocalCommandCall(request, "2026-08-30T08:01:00.000Z")).toEqual({
      allowed: false,
      reason: "volume_exhausted",
    });
  });

  it("enforces research destinations, lifecycle, and request volume", () => {
    const request = {
      query: "GitHub pull request branch protection documentation",
      maxResults: 2,
      allowedDomains: ["docs.github.com"],
    } as const;
    expect(
      BoundSessionRuntime.create(boundInput()).authorizeResearchCall(
        { ...request, allowedDomains: ["example.com"] },
        "2026-08-30T08:01:00.000Z",
      ),
    ).toEqual({ allowed: false, reason: "destination_not_allowed" });
    expect(
      BoundSessionRuntime.create(boundInput()).authorizeResearchCall(
        request,
        "2026-08-30T08:05:00.000Z",
      ),
    ).toEqual({ allowed: false, reason: "expired" });

    const input = boundInput();
    const volume = { ...authority().volume, maxToolCalls: 4 };
    const runtime = BoundSessionRuntime.create({
      ...input,
      mission: {
        ...input.mission,
        authority: { ...input.mission.authority, volume },
      },
      profile: {
        ...input.profile,
        permissions: { ...input.profile.permissions, volume },
      },
    });
    for (let index = 0; index < 4; index += 1) {
      expect(runtime.authorizeResearchCall(request, "2026-08-30T08:01:00.000Z")).toEqual({
        allowed: true,
      });
    }
    expect(runtime.authorizeResearchCall(request, "2026-08-30T08:01:00.000Z")).toEqual({
      allowed: false,
      reason: "volume_exhausted",
    });
  });

  it("property: every unlisted tool name is denied", () => {
    const runtime = BoundSessionRuntime.create(boundInput());
    fc.assert(
      fc.property(
        fc
          .string()
          .filter((tool) => !["guardian.local_command", "guardian.research"].includes(tool)),
        (tool) => {
          expect(runtime.authorizeToolCall(tool, "2026-08-30T08:01:00.000Z")).toEqual({
            allowed: false,
            reason: "tool_not_allowed",
          });
        },
      ),
    );
  });
});
