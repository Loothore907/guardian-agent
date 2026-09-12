import { describe, expect, it } from "vitest";

import {
  boundedMultilineVisibleText,
  containsSecretLikeMaterial,
  containsSecretLikeOutcomeMaterial,
  secretLikeMaterialCategory,
  secretLikeOutcomeMaterialCategory,
} from "./common.js";

describe("multiline visible text", () => {
  it("accepts canonical line feeds while rejecting other controls and hidden Unicode", () => {
    expect(
      boundedMultilineVisibleText(100).safeParse("Summary\n\n1. Verify\n2. Continue").success,
    ).toBe(true);
    for (const value of ["Summary\r\nNext", "Summary\tNext", "Summary\u200bNext"])
      expect(boundedMultilineVisibleText(100).safeParse(value).success).toBe(false);
  });
});

describe("credential-like text classification", () => {
  it.each([
    ["api_key=value", "api_key"],
    ["api-key=value", "api_key"],
    ["authorization: Basic value", "authorization"],
    ["bearer=value", "bearer"],
    ["password=value", "password"],
    ["secret=value", "secret"],
    ["token=value", "token"],
    ["ghp_abcdefghijklmnopqrstuvwxyz1234", "github_token"],
    ["AKIAABCDEFGHIJKLMNOP", "aws_access_key"],
    ["-----BEGIN TEST PRIVATE KEY-----", "private_key"],
  ] as const)("classifies %s without returning its value", (value, category) => {
    expect(secretLikeMaterialCategory(value)).toBe(category);
    expect(containsSecretLikeMaterial(value)).toBe(true);
  });

  it.each([
    "Authorization: not granted.",
    "Bearer=none; no authenticated request was made.",
    "Password: not yet provided!",
    "Secret: operator confirmation required.",
    "Token=**redacted**.",
    "API_key: unavailable.",
  ])("allows the complete negative status %s only for final outcomes", (value) => {
    expect(containsSecretLikeMaterial(value)).toBe(true);
    expect(containsSecretLikeOutcomeMaterial(value)).toBe(false);
    expect(secretLikeOutcomeMaterialCategory(value)).toBeNull();
  });

  it.each([
    ["Authorization: not granted private-value", "authorization"],
    ["Bearer=none hidden-value", "bearer"],
    ["Password: not provided actual-value", "password"],
    ["Secret: operator confirmation required actual-value", "secret"],
    ["Token=redacted-but-present", "token"],
    ["API_key: unavailable actual-value", "api_key"],
    ["Authorization: not granted; token=actual-value", "token"],
  ] as const)("does not let a status prefix hide data in %s", (value, category) => {
    expect(secretLikeOutcomeMaterialCategory(value)).toBe(category);
    expect(containsSecretLikeOutcomeMaterial(value)).toBe(true);
  });
});
