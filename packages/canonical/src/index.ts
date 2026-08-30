import { createHash } from "node:crypto";

import { canonicalize } from "json-canonicalize";

const CONTRACT_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/u;

function containsHiddenOrControlUnicode(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint !== undefined &&
      (codePoint <= 0x1f ||
        (codePoint >= 0x7f && codePoint <= 0x9f) ||
        (codePoint >= 0x200b && codePoint <= 0x200f) ||
        (codePoint >= 0x202a && codePoint <= 0x202e) ||
        codePoint === 0x2060 ||
        (codePoint >= 0x2066 && codePoint <= 0x2069) ||
        codePoint === 0xfeff)
    );
  });
}

function assertCanonicalString(value: string, label: string): void {
  if (value !== value.normalize("NFC") || containsHiddenOrControlUnicode(value)) {
    throw new TypeError(`${label} contains unsupported Unicode`);
  }
}

function assertJsonValue(value: unknown, path: string, ancestors: Set<object>): void {
  if (value === null || typeof value === "boolean") {
    return;
  }
  if (typeof value === "string") {
    assertCanonicalString(value, path);
    return;
  }
  if (typeof value === "number") {
    if (
      !Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
      Object.is(value, -0)
    ) {
      throw new TypeError(`${path} contains an unsupported number`);
    }
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} is not a supported JSON value`);
  }
  if (ancestors.has(value)) {
    throw new TypeError(`${path} contains a cycle`);
  }

  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw new TypeError(`${path} contains a sparse array`);
      }
      assertJsonValue(value[index], `${path}[${index}]`, nextAncestors);
    }
    return;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} contains a non-plain object`);
  }
  for (const [key, child] of Object.entries(value)) {
    assertCanonicalString(key, `${path} key`);
    assertJsonValue(child, `${path}.${key}`, nextAncestors);
  }
}

export function canonicalJson(value: unknown): string {
  assertJsonValue(value, "$", new Set());
  return canonicalize(value);
}

export function canonicalDigest(
  contractName: string,
  contractVersion: number,
  value: unknown,
): string {
  if (!CONTRACT_NAME.test(contractName)) {
    throw new TypeError("contractName is invalid");
  }
  if (!Number.isSafeInteger(contractVersion) || contractVersion < 1) {
    throw new TypeError("contractVersion is invalid");
  }

  const domain = `guardian.${contractName}.v${contractVersion}`;
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}
