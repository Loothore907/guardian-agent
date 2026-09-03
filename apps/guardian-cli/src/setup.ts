import {
  CredentialReferenceSchema,
  CredentialVerificationResultSchema,
  GitHubCredentialMetadataSchema,
  type CredentialProvider,
  type CredentialReference,
  type CredentialVerificationResult,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";
import type { GitHubDeviceAuthorizer } from "@guardian/credential-verification";

export type GuardianSetupCommand = {
  readonly operation: "enroll" | "status" | "revoke";
  readonly provider: CredentialProvider;
};

function provider(value: string | undefined): CredentialProvider {
  if (value !== "nebius" && value !== "tavily" && value !== "github") {
    throw new TypeError("usage: guardian setup <nebius|tavily|github>");
  }
  return value;
}

export function parseGuardianSetupArguments(arguments_: readonly string[]): GuardianSetupCommand {
  if (arguments_[0] !== "setup") {
    throw new TypeError("usage: guardian setup <nebius|tavily|github>");
  }
  if (arguments_.length === 2) {
    return { operation: "enroll", provider: provider(arguments_[1]) };
  }
  if (
    arguments_.length === 3 &&
    (arguments_[1] === "enroll" || arguments_[1] === "status" || arguments_[1] === "revoke")
  ) {
    return { operation: arguments_[1], provider: provider(arguments_[2]) };
  }
  throw new TypeError("usage: guardian setup [enroll|status|revoke] <nebius|tavily|github>");
}

export async function readHiddenCredentialFromTerminal(prompt: string): Promise<Uint8Array> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new TypeError("interactive credential enrollment is required");
  }
  process.stdout.write(prompt);
  const input = process.stdin;
  const wasRaw = input.isRaw === true;
  input.setRawMode(true);
  input.resume();
  return await new Promise((resolve, reject) => {
    const bytes: number[] = [];
    const finish = (error?: Error) => {
      input.off("data", onData);
      input.off("error", onError);
      input.setRawMode(wasRaw);
      input.pause();
      process.stdout.write("\n");
      if (error === undefined) {
        const secret = Uint8Array.from(bytes);
        bytes.fill(0);
        resolve(secret);
      } else {
        bytes.fill(0);
        reject(error);
      }
    };
    const onError = () => finish(new TypeError("credential input failed"));
    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 0x03) {
          finish(new TypeError("credential enrollment cancelled"));
          return;
        }
        if (byte === 0x0d || byte === 0x0a) {
          finish();
          return;
        }
        if (byte === 0x08 || byte === 0x7f) {
          bytes.pop();
        } else if (byte >= 0x20) {
          bytes.push(byte);
          if (bytes.length > 4_096) {
            finish(new TypeError("credential input is invalid"));
            return;
          }
        }
      }
    };
    input.on("data", onData);
    input.on("error", onError);
  });
}

export interface GuardianSetupVerifier {
  verify(reference: CredentialReference, secret: Uint8Array): Promise<CredentialVerificationResult>;
}

export interface GuardianSetupIo {
  readonly interactive: boolean;
  readonly write: (text: string) => void;
  readonly readSecret: (prompt: string) => Promise<Uint8Array>;
}

export interface GuardianSetupManagementIo {
  readonly interactive: boolean;
  readonly write: (text: string) => void;
  readonly readConfirmation: (prompt: string) => Promise<string>;
}

function referenceFor(providerValue: CredentialProvider): CredentialReference {
  return CredentialReferenceSchema.parse({
    schemaVersion: 1,
    provider: providerValue,
    slot: "default",
  });
}

function githubRefreshReference(): CredentialReference {
  return CredentialReferenceSchema.parse({
    schemaVersion: 1,
    provider: "github",
    slot: "refresh",
  });
}

function githubMetadataReference(): CredentialReference {
  return CredentialReferenceSchema.parse({
    schemaVersion: 1,
    provider: "github",
    slot: "metadata",
  });
}

function includesSecret(label: string, secret: Uint8Array): boolean {
  if (secret.byteLength < 8) return false;
  return Buffer.from(label, "utf8").includes(Buffer.from(secret));
}

export async function runGuardianSetup(options: {
  readonly provider: CredentialProvider;
  readonly store: CredentialStore;
  readonly verifier: GuardianSetupVerifier;
  readonly io: GuardianSetupIo;
}): Promise<CredentialVerificationResult> {
  if (!options.io.interactive) throw new TypeError("interactive credential enrollment is required");
  const reference = referenceFor(options.provider);
  const secret = await options.io.readSecret(`Enter ${options.provider} credential: `);
  try {
    if (secret.byteLength < 8 || secret.byteLength > 4_096) {
      throw new TypeError("credential input is invalid");
    }
    let verification: CredentialVerificationResult;
    try {
      verification = CredentialVerificationResultSchema.parse(
        await options.verifier.verify(reference, secret),
      );
    } catch {
      throw new TypeError("credential verification failed");
    }
    if (verification.provider !== reference.provider) {
      throw new TypeError("credential verification provider mismatch");
    }
    if (includesSecret(verification.accountLabel, secret)) {
      throw new TypeError("credential verification returned unsafe metadata");
    }
    await options.store.write(reference, secret);
    options.io.write(
      `Stored ${reference.provider} credential for verified account ${verification.accountLabel}.\n`,
    );
    return verification;
  } finally {
    secret.fill(0);
  }
}

export async function runGitHubDeviceSetup(options: {
  readonly store: CredentialStore;
  readonly authorizer: GitHubDeviceAuthorizer;
  readonly verifier: GuardianSetupVerifier;
  readonly io: Pick<GuardianSetupIo, "interactive" | "write">;
  readonly now?: () => number;
}): Promise<CredentialVerificationResult> {
  if (!options.io.interactive) throw new TypeError("interactive credential enrollment is required");
  const reference = referenceFor("github");
  const refreshReference = githubRefreshReference();
  const metadataReference = githubMetadataReference();
  const credential = await options.authorizer.authorize((challenge) => {
    options.io.write(
      `Open ${challenge.verificationUri} and enter code ${challenge.userCode}.\nWaiting for GitHub authorization...\n`,
    );
  });
  let wroteRefresh = false;
  let wroteAccess = false;
  let wroteMetadata = false;
  try {
    let verification: CredentialVerificationResult;
    try {
      verification = CredentialVerificationResultSchema.parse(
        await options.verifier.verify(reference, credential.accessToken),
      );
    } catch {
      throw new TypeError("credential verification failed");
    }
    if (verification.provider !== "github") {
      throw new TypeError("credential verification provider mismatch");
    }
    if (includesSecret(verification.accountLabel, credential.accessToken)) {
      throw new TypeError("credential verification returned unsafe metadata");
    }
    await options.store.write(refreshReference, credential.refreshToken);
    wroteRefresh = true;
    await options.store.write(reference, credential.accessToken);
    wroteAccess = true;
    const enrolledAt = options.now?.() ?? Date.now();
    const metadata = GitHubCredentialMetadataSchema.parse({
      schemaVersion: 1,
      accessExpiresAt: new Date(
        enrolledAt + credential.accessTokenExpiresInSeconds * 1_000,
      ).toISOString(),
      refreshExpiresAt: new Date(
        enrolledAt + credential.refreshTokenExpiresInSeconds * 1_000,
      ).toISOString(),
    });
    const metadataBytes = Uint8Array.from(Buffer.from(JSON.stringify(metadata), "utf8"));
    try {
      await options.store.write(metadataReference, metadataBytes);
      wroteMetadata = true;
    } finally {
      metadataBytes.fill(0);
    }
    options.io.write(
      `Stored expiring GitHub App credential for verified account ${verification.accountLabel}.\n`,
    );
    return verification;
  } catch {
    const cleanup = await Promise.allSettled([
      ...(wroteAccess ? [options.store.delete(reference)] : []),
      ...(wroteRefresh ? [options.store.delete(refreshReference)] : []),
      ...(wroteAccess || wroteRefresh || wroteMetadata
        ? [options.store.delete(metadataReference)]
        : []),
    ]);
    if (cleanup.some((result) => result.status === "rejected")) {
      throw new TypeError("credential enrollment cleanup failed");
    }
    throw new TypeError("credential enrollment failed");
  } finally {
    credential.accessToken.fill(0);
    credential.refreshToken.fill(0);
  }
}

export async function runGuardianSetupStatus(options: {
  readonly provider: CredentialProvider;
  readonly store: CredentialStore;
  readonly io: Pick<GuardianSetupManagementIo, "interactive" | "write">;
}): Promise<"available" | "missing"> {
  if (!options.io.interactive) throw new TypeError("interactive credential management is required");
  const status = await options.store.status(referenceFor(options.provider));
  options.io.write(`${options.provider}: ${status.state}\n`);
  return status.state;
}

export async function runGuardianSetupRevoke(options: {
  readonly provider: CredentialProvider;
  readonly store: CredentialStore;
  readonly io: GuardianSetupManagementIo;
}): Promise<"deleted" | "missing"> {
  if (!options.io.interactive) throw new TypeError("interactive credential management is required");
  const confirmation = await options.io.readConfirmation(
    `Type REVOKE ${options.provider} to delete this local credential: `,
  );
  if (confirmation !== `REVOKE ${options.provider}`) {
    throw new TypeError("credential revocation was not confirmed");
  }
  const result = await options.store.delete(referenceFor(options.provider));
  const refreshResult =
    options.provider === "github"
      ? await options.store.delete(githubRefreshReference())
      : "missing";
  const metadataResult =
    options.provider === "github"
      ? await options.store.delete(githubMetadataReference())
      : "missing";
  const combinedResult =
    result === "deleted" || refreshResult === "deleted" || metadataResult === "deleted"
      ? "deleted"
      : "missing";
  options.io.write(`${options.provider}: ${combinedResult}\n`);
  return combinedResult;
}
