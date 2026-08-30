import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { canonicalDigest, canonicalJson } from "./index.js";

describe("canonicalJson", () => {
  it("is independent of object insertion order", () => {
    expect(canonicalJson({ repository: "guardian-agent", pullRequest: 17 })).toBe(
      canonicalJson({ pullRequest: 17, repository: "guardian-agent" }),
    );
  });

  it("changes when a material field changes", () => {
    expect(canonicalJson({ pullRequest: 17 })).not.toBe(canonicalJson({ pullRequest: 18 }));
  });

  it("domain-separates versioned contract digests", () => {
    const request = { operation: "github.pull_request.merge", pullRequest: 17 };

    expect(canonicalDigest("action_request", 1, request)).not.toBe(
      canonicalDigest("approval", 1, request),
    );
    expect(canonicalDigest("action_request", 1, request)).not.toBe(
      canonicalDigest("action_request", 2, request),
    );
  });

  it("rejects unsupported numbers, values, objects, and Unicode", () => {
    expect(() => canonicalJson({ value: Number.NaN })).toThrow();
    expect(() => canonicalJson({ value: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => canonicalJson({ value: -0 })).toThrow();
    expect(() => canonicalJson({ value: undefined })).toThrow();
    expect(() => canonicalJson({ value: new Date() })).toThrow();
    expect(() => canonicalJson({ value: "hidden\u200btext" })).toThrow();
    expect(() => canonicalJson({ value: "Cafe\u0301" })).toThrow();
  });

  it("rejects cycles and sparse arrays", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const sparse: unknown[] = [];
    sparse.length = 2;

    expect(() => canonicalJson(cyclic)).toThrow();
    expect(() => canonicalJson(sparse)).toThrow();
  });

  it("property: key insertion order never changes the digest", () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.stringMatching(/^[a-z0-9_-]{0,30}$/u),
        (pullRequest, repository) => {
          const left = { repository, pullRequest };
          const right = { pullRequest, repository };
          expect(canonicalDigest("action_request", 1, left)).toBe(
            canonicalDigest("action_request", 1, right),
          );
        },
      ),
    );
  });

  it("property: material integer mutations change the digest", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        (value, delta) => {
          expect(canonicalDigest("action_request", 1, { value })).not.toBe(
            canonicalDigest("action_request", 1, { value: value + delta }),
          );
        },
      ),
    );
  });
});
