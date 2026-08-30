import { describe, expect, it } from "vitest";

import { parseIsolationProbeOutput, sanitizeLocalCommandOutput } from "./index.js";

const validResult = {
  runtimeProfile: "windows_wsl2_ubuntu_22_04_namespace_v1",
  observedAt: "2026-08-30T08:30:00.000Z",
  checks: {
    localCommandSucceeded: true,
    directPublicEgressBlocked: true,
    directGitPushBlocked: true,
    hostFilesystemHidden: true,
    providerCredentialsAbsent: true,
    runtimeIdentityReduced: true,
  },
} as const;

describe("reference isolation probe output", () => {
  it("accepts one strict bounded result", () => {
    expect(parseIsolationProbeOutput(JSON.stringify(validResult))).toEqual(validResult);
  });

  it("rejects extra output, unknown fields, and oversized output", () => {
    expect(() => parseIsolationProbeOutput(`${JSON.stringify(validResult)}\n{}`)).toThrow();
    expect(() =>
      parseIsolationProbeOutput(JSON.stringify({ ...validResult, credential: "secret" })),
    ).toThrow();
    expect(() => parseIsolationProbeOutput("x".repeat(32_769))).toThrow();
  });
});

describe("local command output sanitization", () => {
  it("removes launcher diagnostics and unsafe terminal controls", () => {
    expect(
      sanitizeLocalCommandOutput(
        "wsl: failed for 'host-user'\ncommand error\u001b[31m\u202esecret",
        1_024,
      ),
    ).toEqual({ text: "command error[31msecret", truncated: false });
  });
});
