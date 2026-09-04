import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

import {
  CredentialReferenceSchema,
  CredentialStoreConfigSchema,
  CredentialStatusSchema,
  ManagedDemoSecretResourceSchema,
  RegisteredCredentialReferenceSchema,
  type CredentialPool,
  type CredentialReference,
  type CredentialStatus,
  type ManagedDemoSecretResource,
} from "@guardian/contracts";

const MAX_SECRET_BYTES = 4_096;
const WINDOWS_HELPER_TIMEOUT_MS = 15_000;
const WINDOWS_TARGET_PREFIX = "AgenticGuardian";
const LINUX_HELPER_TIMEOUT_MS = 15_000;
const LINUX_SECRET_TOOL_PATH = "/usr/bin/secret-tool";
const MAXIMUM_LINUX_DIAGNOSTIC_BYTES = 8_192;
const SECRETSTASH_HELPER_TIMEOUT_MS = 15_000;
const SECRETSTASH_CLI_PATH = "/usr/local/bin/nebius";

export class CredentialStoreError extends Error {
  constructor() {
    super("credential store operation failed");
    this.name = "CredentialStoreError";
  }
}

export interface CredentialStore {
  status(reference: unknown): Promise<CredentialStatus>;
  write(reference: unknown, secret: Uint8Array): Promise<void>;
  delete(reference: unknown): Promise<"deleted" | "missing">;
  use<T>(reference: unknown, operation: (secret: Uint8Array) => Promise<T>): Promise<T>;
}

function copySecret(secret: Uint8Array): Uint8Array {
  if (secret.byteLength < 8 || secret.byteLength > MAX_SECRET_BYTES) {
    throw new CredentialStoreError();
  }
  return Uint8Array.from(secret);
}

function targetFor(reference: CredentialReference): string {
  return `${WINDOWS_TARGET_PREFIX}/${reference.provider}/${reference.slot}`;
}

export class InMemoryCredentialStore implements CredentialStore {
  readonly #values = new Map<string, Uint8Array>();

  status(referenceValue: unknown): Promise<CredentialStatus> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    return Promise.resolve(
      CredentialStatusSchema.parse({
        schemaVersion: 1,
        reference,
        state: this.#values.has(targetFor(reference)) ? "available" : "missing",
      }),
    );
  }

  write(referenceValue: unknown, input: Uint8Array): Promise<void> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const secret = copySecret(input);
    const previous = this.#values.get(targetFor(reference));
    this.#values.set(targetFor(reference), secret);
    previous?.fill(0);
    return Promise.resolve();
  }

  delete(referenceValue: unknown): Promise<"deleted" | "missing"> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const key = targetFor(reference);
    const secret = this.#values.get(key);
    if (secret === undefined) return Promise.resolve("missing");
    secret.fill(0);
    this.#values.delete(key);
    return Promise.resolve("deleted");
  }

  async use<T>(referenceValue: unknown, operation: (secret: Uint8Array) => Promise<T>): Promise<T> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const stored = this.#values.get(targetFor(reference));
    if (stored === undefined) throw new CredentialStoreError();
    const secret = Uint8Array.from(stored);
    try {
      return await operation(secret);
    } finally {
      secret.fill(0);
    }
  }
}

export interface CredentialHelperInvocation {
  readonly file: string;
  readonly arguments: readonly string[];
  readonly stdin: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export type CredentialHelperRunner = (invocation: CredentialHelperInvocation) => Promise<string>;

export interface LinuxSecretToolInvocation {
  readonly file: string;
  readonly arguments: readonly string[];
  readonly stdin: Uint8Array;
  readonly environment: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface LinuxSecretToolResult {
  readonly code: number;
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
}

function copyAndZeroChunks(chunks: Buffer[], totalBytes: number): Uint8Array {
  let joined: Buffer | undefined;
  try {
    joined = Buffer.concat(chunks, totalBytes);
    return Uint8Array.from(joined);
  } finally {
    joined?.fill(0);
    for (const chunk of chunks) chunk.fill(0);
  }
}

export type LinuxSecretToolRunner = (
  invocation: LinuxSecretToolInvocation,
) => Promise<LinuxSecretToolResult>;

const WINDOWS_HELPER_SOURCE = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GuardianCredentialNative {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags; public UInt32 Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize; public IntPtr CredentialBlob; public UInt32 Persist;
    public UInt32 AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("Advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredWrite(ref CREDENTIAL credential, UInt32 flags);
  [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr credential);
  [DllImport("Advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredDelete(string target, UInt32 type, UInt32 flags);
  [DllImport("Advapi32.dll", EntryPoint="CredFree")]
  public static extern void CredFree(IntPtr buffer);
}
'@
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$target = [string]$request.target
if ($request.operation -eq 'write') {
  $bytes = [Convert]::FromBase64String([string]$request.secret)
  $blob = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
  try {
    [Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)
    $credential = New-Object GuardianCredentialNative+CREDENTIAL
    $credential.Type = 1; $credential.TargetName = $target; $credential.UserName = 'Agentic Guardian'
    $credential.CredentialBlobSize = $bytes.Length; $credential.CredentialBlob = $blob; $credential.Persist = 2
    if (-not [GuardianCredentialNative]::CredWrite([ref]$credential, 0)) { throw ('write failed ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error()) }
    [Console]::Out.Write('{"ok":true}')
  } finally { [Array]::Clear($bytes, 0, $bytes.Length); [Runtime.InteropServices.Marshal]::FreeHGlobal($blob) }
} elseif ($request.operation -eq 'read' -or $request.operation -eq 'status') {
  $pointer = [IntPtr]::Zero
  if (-not [GuardianCredentialNative]::CredRead($target, 1, 0, [ref]$pointer)) {
    if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -eq 1168) { [Console]::Out.Write('{"missing":true}'); exit }
    throw 'read failed'
  }
  try {
    if ($request.operation -eq 'status') { [Console]::Out.Write('{"available":true}'); exit }
    $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($pointer, [type][GuardianCredentialNative+CREDENTIAL])
    $bytes = New-Object byte[] $credential.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $bytes, 0, $bytes.Length)
    [Console]::Out.Write((@{ ok = $true; secret = [Convert]::ToBase64String($bytes) } | ConvertTo-Json -Compress))
    [Array]::Clear($bytes, 0, $bytes.Length)
  } finally { [GuardianCredentialNative]::CredFree($pointer) }
} elseif ($request.operation -eq 'delete') {
  if ([GuardianCredentialNative]::CredDelete($target, 1, 0)) { [Console]::Out.Write('{"deleted":true}') }
  elseif ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -eq 1168) { [Console]::Out.Write('{"missing":true}') }
  else { throw 'delete failed' }
} else { throw 'unsupported operation' }
`;

function encodedWindowsHelper(): string {
  return Buffer.from(WINDOWS_HELPER_SOURCE, "utf16le").toString("base64");
}

export async function runCredentialHelper(invocation: CredentialHelperInvocation): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(invocation.file, invocation.arguments, {
      env: invocation.environment,
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
    const chunks: Buffer[] = [];
    let bytes = 0;
    const timer = setTimeout(() => child.kill(), invocation.timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > MAX_SECRET_BYTES * 2) child.kill();
      else chunks.push(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || bytes > MAX_SECRET_BYTES * 2) reject(new CredentialStoreError());
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    child.stdin.end(invocation.stdin);
  });
}

type HelperResponse =
  | { readonly ok: true; readonly secret?: string }
  | { readonly missing: true }
  | { readonly deleted: true }
  | { readonly available: true };

function parseHelperResponse(value: string): HelperResponse {
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CredentialStoreError();
  }
  const fields = Object.keys(parsed);
  const record = parsed as Record<string, unknown>;
  if (fields.length === 1 && record.missing === true) return { missing: true };
  if (fields.length === 1 && record.deleted === true) return { deleted: true };
  if (fields.length === 1 && record.available === true) return { available: true };
  if (fields.length === 1 && record.ok === true) return { ok: true };
  if (
    fields.length === 2 &&
    record.ok === true &&
    typeof record.secret === "string" &&
    record.secret.length <= Math.ceil(MAX_SECRET_BYTES / 3) * 4 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(record.secret)
  ) {
    return { ok: true, secret: record.secret };
  }
  throw new CredentialStoreError();
}

export class WindowsCredentialStore implements CredentialStore {
  readonly #runner: CredentialHelperRunner;

  constructor(runner: CredentialHelperRunner = runCredentialHelper) {
    this.#runner = runner;
  }

  async #invoke(
    operation: "write" | "read" | "status" | "delete",
    reference: CredentialReference,
    secret?: Uint8Array,
  ) {
    if (process.platform !== "win32" && this.#runner === runCredentialHelper) {
      throw new CredentialStoreError();
    }
    const payload: Record<string, unknown> = { operation, target: targetFor(reference) };
    if (secret !== undefined) payload.secret = Buffer.from(secret).toString("base64");
    try {
      const output = await this.#runner({
        file: "powershell.exe",
        arguments: [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-EncodedCommand",
          encodedWindowsHelper(),
        ],
        stdin: JSON.stringify(payload),
        environment: {
          SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
          TEMP: tmpdir(),
          TMP: tmpdir(),
        },
        timeoutMs: WINDOWS_HELPER_TIMEOUT_MS,
      });
      return parseHelperResponse(output);
    } catch {
      throw new CredentialStoreError();
    }
  }

  async status(referenceValue: unknown): Promise<CredentialStatus> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const response = await this.#invoke("status", reference);
    if (!("available" in response) && !("missing" in response)) {
      throw new CredentialStoreError();
    }
    return CredentialStatusSchema.parse({
      schemaVersion: 1,
      reference,
      state: "available" in response ? "available" : "missing",
    });
  }

  async write(referenceValue: unknown, input: Uint8Array): Promise<void> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const secret = copySecret(input);
    try {
      const response = await this.#invoke("write", reference, secret);
      if (!("ok" in response) || response.secret !== undefined) throw new CredentialStoreError();
    } finally {
      secret.fill(0);
    }
  }

  async delete(referenceValue: unknown): Promise<"deleted" | "missing"> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const response = await this.#invoke("delete", reference);
    if ("deleted" in response) return "deleted";
    if ("missing" in response) return "missing";
    throw new CredentialStoreError();
  }

  async use<T>(referenceValue: unknown, operation: (secret: Uint8Array) => Promise<T>): Promise<T> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const response = await this.#invoke("read", reference);
    if (!("ok" in response) || response.secret === undefined) throw new CredentialStoreError();
    const secret = Uint8Array.from(Buffer.from(response.secret, "base64"));
    if (secret.byteLength < 8 || secret.byteLength > MAX_SECRET_BYTES) {
      secret.fill(0);
      throw new CredentialStoreError();
    }
    try {
      return await operation(secret);
    } finally {
      secret.fill(0);
    }
  }
}

function linuxAttributes(reference: CredentialReference): readonly string[] {
  return [
    "application",
    "AgenticGuardian",
    "schema",
    "1",
    "provider",
    reference.provider,
    "slot",
    reference.slot,
  ];
}

export function linuxSecretServiceEnvironment(
  hostEnvironment: NodeJS.ProcessEnv = process.env,
  userId: number | undefined = process.getuid?.(),
): Readonly<Record<string, string>> {
  if (userId === undefined || !Number.isSafeInteger(userId) || userId < 0) {
    throw new CredentialStoreError();
  }
  const runtimeDirectory = hostEnvironment.XDG_RUNTIME_DIR?.replace(/\/$/u, "");
  if (runtimeDirectory !== `/run/user/${userId}`) throw new CredentialStoreError();
  const busAddress = hostEnvironment.DBUS_SESSION_BUS_ADDRESS;
  if (
    busAddress === undefined ||
    busAddress.length < 1 ||
    busAddress.length > 4_096 ||
    busAddress.includes(";") ||
    [...busAddress].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint === undefined || codePoint < 32 || codePoint === 127;
    })
  ) {
    throw new CredentialStoreError();
  }
  const optionalGuid = "(?:,guid=[0-9a-f]{32})?";
  if (
    !new RegExp(`^unix:path=/run/user/${userId}/bus${optionalGuid}$`, "u").test(busAddress) &&
    !new RegExp(`^unix:abstract=/tmp/dbus-[A-Za-z0-9_-]{6,64}${optionalGuid}$`, "u").test(
      busAddress,
    )
  ) {
    throw new CredentialStoreError();
  }
  return {
    DBUS_SESSION_BUS_ADDRESS: busAddress,
    XDG_RUNTIME_DIR: runtimeDirectory,
  };
}

export async function runLinuxSecretTool(
  invocation: LinuxSecretToolInvocation,
): Promise<LinuxSecretToolResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(invocation.file, invocation.arguments, {
      env: invocation.environment,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let oversized = false;
    let settled = false;
    function fail() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!child.killed) child.kill("SIGKILL");
      for (const chunk of [...stdoutChunks, ...stderrChunks]) chunk.fill(0);
      reject(new CredentialStoreError());
    }
    const timer = setTimeout(() => {
      oversized = true;
      fail();
    }, invocation.timeoutMs);
    timer.unref();
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > MAX_SECRET_BYTES) {
        oversized = true;
        chunk.fill(0);
        fail();
      } else {
        stdoutChunks.push(chunk);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > MAXIMUM_LINUX_DIAGNOSTIC_BYTES) {
        oversized = true;
        chunk.fill(0);
        fail();
      } else {
        stderrChunks.push(chunk);
      }
    });
    child.once("error", () => {
      fail();
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code === null || oversized) {
        fail();
        return;
      }
      settled = true;
      let stdout: Uint8Array | undefined;
      try {
        stdout = copyAndZeroChunks(stdoutChunks, stdoutBytes);
        const stderr = copyAndZeroChunks(stderrChunks, stderrBytes);
        resolve({ code, stdout, stderr });
      } catch {
        stdout?.fill(0);
        reject(new CredentialStoreError());
      }
    });
    child.stdin.once("error", fail);
    child.stdin.end(invocation.stdin);
  });
}

function isEmpty(bytes: Uint8Array): boolean {
  return bytes.byteLength === 0;
}

function assertTextSecret(secret: Uint8Array): void {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(secret);
    if (decoded.includes("\0")) throw new CredentialStoreError();
  } catch {
    throw new CredentialStoreError();
  }
}

export class LinuxSecretServiceCredentialStore implements CredentialStore {
  readonly #runner: LinuxSecretToolRunner;

  constructor(runner: LinuxSecretToolRunner = runLinuxSecretTool) {
    this.#runner = runner;
  }

  async #invoke(
    operation: "store" | "lookup" | "clear",
    reference: CredentialReference,
    stdin: Uint8Array = new Uint8Array(),
  ): Promise<LinuxSecretToolResult> {
    if (process.platform !== "linux" && this.#runner === runLinuxSecretTool) {
      throw new CredentialStoreError();
    }
    const operationArguments =
      operation === "store" ? ["store", "--label=Agentic Guardian"] : [operation];
    try {
      return await this.#runner({
        file: LINUX_SECRET_TOOL_PATH,
        arguments: [...operationArguments, ...linuxAttributes(reference)],
        stdin,
        environment: this.#runner === runLinuxSecretTool ? linuxSecretServiceEnvironment() : {},
        timeoutMs: LINUX_HELPER_TIMEOUT_MS,
      });
    } catch {
      throw new CredentialStoreError();
    }
  }

  async #lookup(reference: CredentialReference): Promise<Uint8Array | null> {
    const result = await this.#invoke("lookup", reference);
    try {
      if (result.code === 1 && isEmpty(result.stdout) && isEmpty(result.stderr)) return null;
      if (result.code !== 0 || !isEmpty(result.stderr)) throw new CredentialStoreError();
      assertTextSecret(result.stdout);
      return copySecret(result.stdout);
    } finally {
      result.stdout.fill(0);
      result.stderr.fill(0);
    }
  }

  async status(referenceValue: unknown): Promise<CredentialStatus> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const secret = await this.#lookup(reference);
    secret?.fill(0);
    return CredentialStatusSchema.parse({
      schemaVersion: 1,
      reference,
      state: secret === null ? "missing" : "available",
    });
  }

  async write(referenceValue: unknown, input: Uint8Array): Promise<void> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const secret = copySecret(input);
    try {
      assertTextSecret(secret);
      const result = await this.#invoke("store", reference, secret);
      try {
        if (result.code !== 0 || !isEmpty(result.stdout) || !isEmpty(result.stderr)) {
          throw new CredentialStoreError();
        }
      } finally {
        result.stdout.fill(0);
        result.stderr.fill(0);
      }
    } finally {
      secret.fill(0);
    }
  }

  async delete(referenceValue: unknown): Promise<"deleted" | "missing"> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const result = await this.#invoke("clear", reference);
    try {
      if (!isEmpty(result.stdout) || !isEmpty(result.stderr)) throw new CredentialStoreError();
      if (result.code === 0) return "deleted";
      if (result.code === 1) return "missing";
      throw new CredentialStoreError();
    } finally {
      result.stdout.fill(0);
      result.stderr.fill(0);
    }
  }

  async use<T>(referenceValue: unknown, operation: (secret: Uint8Array) => Promise<T>): Promise<T> {
    const reference = CredentialReferenceSchema.parse(referenceValue);
    const secret = await this.#lookup(reference);
    if (secret === null) throw new CredentialStoreError();
    try {
      return await operation(secret);
    } finally {
      secret.fill(0);
    }
  }
}

export type SecretStashRunner = LinuxSecretToolRunner;

export const runSecretStashCli: SecretStashRunner = runLinuxSecretTool;

function managedResourceKey(reference: CredentialReference): string {
  return `${reference.provider}/${reference.slot}`;
}

function secretFromSecretStashOutput(output: Uint8Array): Uint8Array {
  let end = output.byteLength;
  if (end > 0 && output[end - 1] === 0x0a) end -= 1;
  if (end > 0 && output[end - 1] === 0x0d) end -= 1;
  const secret = Uint8Array.from(output.subarray(0, end));
  try {
    if (output.subarray(0, end).some((byte) => byte === 0x0a || byte === 0x0d)) {
      throw new CredentialStoreError();
    }
    assertTextSecret(secret);
    return copySecret(secret);
  } finally {
    secret.fill(0);
  }
}

export class SecretStashCredentialStore implements CredentialStore {
  readonly #resources = new Map<string, ManagedDemoSecretResource>();
  readonly #runner: SecretStashRunner;

  constructor(options: {
    readonly pool: Exclude<CredentialPool, "personal">;
    readonly resources: readonly unknown[];
    readonly runner?: SecretStashRunner;
  }) {
    if (options.pool !== "public" && options.pool !== "judge") {
      throw new CredentialStoreError();
    }
    if (options.resources.length < 1 || options.resources.length > 5) {
      throw new CredentialStoreError();
    }
    for (const resourceValue of options.resources) {
      const resource = ManagedDemoSecretResourceSchema.parse(resourceValue);
      if (resource.location.pool !== options.pool) throw new CredentialStoreError();
      const key = managedResourceKey(resource.reference);
      if (this.#resources.has(key)) throw new CredentialStoreError();
      this.#resources.set(key, resource);
    }
    this.#runner = options.runner ?? runSecretStashCli;
    if (process.platform !== "linux" && this.#runner === runSecretStashCli) {
      throw new CredentialStoreError();
    }
  }

  async #lookup(referenceValue: unknown): Promise<Uint8Array | undefined> {
    const reference = RegisteredCredentialReferenceSchema.parse(referenceValue);
    const resource = this.#resources.get(managedResourceKey(reference));
    if (resource === undefined) return undefined;
    let result: LinuxSecretToolResult | undefined;
    try {
      result = await this.#runner({
        file: SECRETSTASH_CLI_PATH,
        arguments: [
          "mysterybox",
          "payload",
          "get-by-key",
          "--key",
          resource.payloadKey,
          "--secret-id",
          resource.secretId,
          "--format",
          "text",
          "--no-browser",
          "--no-check-update",
          "--no-progress",
          "--retries",
          "1",
          "--timeout",
          "15s",
          "--per-retry-timeout",
          "15s",
          "--auth-timeout",
          "15s",
        ],
        stdin: new Uint8Array(),
        environment: {},
        timeoutMs: SECRETSTASH_HELPER_TIMEOUT_MS,
      });
      if (result.code !== 0 || !isEmpty(result.stderr)) throw new CredentialStoreError();
      return secretFromSecretStashOutput(result.stdout);
    } catch {
      throw new CredentialStoreError();
    } finally {
      result?.stdout.fill(0);
      result?.stderr.fill(0);
    }
  }

  async status(referenceValue: unknown): Promise<CredentialStatus> {
    const reference = RegisteredCredentialReferenceSchema.parse(referenceValue);
    const secret = await this.#lookup(reference);
    secret?.fill(0);
    return CredentialStatusSchema.parse({
      schemaVersion: 1,
      reference,
      state: secret === undefined ? "missing" : "available",
    });
  }

  write(referenceValue: unknown, secret: Uint8Array): Promise<void> {
    void referenceValue;
    void secret;
    return Promise.reject(new CredentialStoreError());
  }

  delete(referenceValue: unknown): Promise<"deleted" | "missing"> {
    void referenceValue;
    return Promise.reject(new CredentialStoreError());
  }

  async use<T>(referenceValue: unknown, operation: (secret: Uint8Array) => Promise<T>): Promise<T> {
    const secret = await this.#lookup(referenceValue);
    if (secret === undefined) throw new CredentialStoreError();
    try {
      return await operation(secret);
    } finally {
      secret.fill(0);
    }
  }
}

export function createPlatformCredentialStore(): CredentialStore {
  if (process.platform === "win32") return new WindowsCredentialStore();
  if (process.platform === "linux") return new LinuxSecretServiceCredentialStore();
  throw new CredentialStoreError();
}

export function createCredentialStore(
  configValue: unknown,
  options: { readonly secretStashRunner?: SecretStashRunner } = {},
): CredentialStore {
  const config = CredentialStoreConfigSchema.parse(configValue);
  if (config.custodyProfile === "managed_demo") {
    return new SecretStashCredentialStore({
      pool: config.pool,
      resources: config.resources,
      ...(options.secretStashRunner === undefined ? {} : { runner: options.secretStashRunner }),
    });
  }

  const expectedRuntime =
    process.platform === "win32" ? "windows" : process.platform === "linux" ? "linux" : undefined;
  if (config.location.runtime !== expectedRuntime) throw new CredentialStoreError();
  return createPlatformCredentialStore();
}
