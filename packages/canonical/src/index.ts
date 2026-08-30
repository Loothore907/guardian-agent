import { canonicalize } from "json-canonicalize";

export function canonicalJson(value: unknown): string {
  return canonicalize(value);
}
