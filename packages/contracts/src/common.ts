import { z } from "zod";

export const CONTRACT_VERSION = 1 as const;
export const ContractVersionSchema = z.literal(CONTRACT_VERSION);

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

export function boundedVisibleText(maxLength: number) {
  return z
    .string()
    .min(1)
    .max(maxLength)
    .refine((value) => value === value.trim(), "leading or trailing whitespace is not allowed")
    .refine((value) => value === value.normalize("NFC"), "text must use NFC normalization")
    .refine((value) => !containsHiddenOrControlUnicode(value), "hidden Unicode is not allowed");
}

export const OpaqueIdSchema = z.uuid();
export const Sha256DigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const TimestampSchema = z.iso.datetime({ offset: false, precision: 3 });
export const VersionNumberSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const AuthorizationLevelSchema = z.enum(["allow", "confirm", "step_up", "deny"]);
export type AuthorizationLevel = z.infer<typeof AuthorizationLevelSchema>;
export const PublicHttpUrlSchema = z.httpUrl().refine((value) => {
  const parsed = new URL(value);
  return parsed.username === "" && parsed.password === "";
}, "URL user information is not allowed");

export function addDuplicateIssue(
  values: readonly string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "duplicate values are not allowed", path });
  }
}

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
