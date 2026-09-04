import {
  CredentialVerificationResultSchema,
  GitHubCredentialMetadataSchema,
  registeredCredentialReference,
  type CredentialProvider,
  type CredentialReference,
  type CredentialVerificationResult,
} from "@guardian/contracts";
import type { CredentialStore } from "@guardian/credential-store";
import type { GitHubDeviceAuthorizer } from "@guardian/credential-verification";

export type GuardianSetupCommand = {
  readonly operation: "enroll" | "review" | "status" | "revoke";
  readonly provider: CredentialProvider;
};

type LocalCredentialProvider = Exclude<CredentialProvider, "github">;
type LocalCredentialDestination = "windows_credential_manager" | "linux_secret_service";

export interface GuardianLocalCredentialSurface {
  readonly url: string;
  readonly completed: Promise<"submitted" | "cancelled" | "failed" | "expired">;
  readonly close: () => Promise<void>;
}

export interface GuardianLocalCredentialSurfaceFactory {
  (options: {
    readonly mode: "enroll" | "review";
    readonly provider: LocalCredentialProvider;
    readonly destination: LocalCredentialDestination;
    readonly onSubmit: (secret: Uint8Array) => Promise<void>;
  }): Promise<GuardianLocalCredentialSurface>;
}

function provider(value: string | undefined): CredentialProvider {
  if (value !== "nebius" && value !== "tavily" && value !== "github") {
    throw new TypeError(
      "usage: guardian credentials [enroll|review|status|revoke] <nebius|tavily|github>",
    );
  }
  return value;
}

export function parseGuardianSetupArguments(arguments_: readonly string[]): GuardianSetupCommand {
  if (arguments_[0] !== "setup" && arguments_[0] !== "credentials") {
    throw new TypeError(
      "usage: guardian credentials [enroll|review|status|revoke] <nebius|tavily|github>",
    );
  }
  if (arguments_.length === 2) {
    return { operation: "enroll", provider: provider(arguments_[1]) };
  }
  if (
    arguments_.length === 3 &&
    (arguments_[1] === "enroll" ||
      arguments_[1] === "review" ||
      arguments_[1] === "status" ||
      arguments_[1] === "revoke")
  ) {
    return { operation: arguments_[1], provider: provider(arguments_[2]) };
  }
  throw new TypeError(
    "usage: guardian credentials [enroll|review|status|revoke] <nebius|tavily|github>",
  );
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
  return registeredCredentialReference(providerValue, "default");
}

function githubRefreshReference(): CredentialReference {
  return registeredCredentialReference("github", "refresh");
}

function githubMetadataReference(): CredentialReference {
  return registeredCredentialReference("github", "metadata");
}

function includesSecret(label: string, secret: Uint8Array): boolean {
  if (secret.byteLength < 8) return false;
  return Buffer.from(label, "utf8").includes(Buffer.from(secret));
}

type CredentialSnapshot = {
  readonly reference: CredentialReference;
  readonly previous?: Uint8Array;
};

async function preflightCredentialStore(
  store: CredentialStore,
  references: readonly CredentialReference[],
): Promise<void> {
  try {
    await Promise.all(references.map((reference) => store.status(reference)));
  } catch {
    throw new TypeError("credential store is unavailable");
  }
}

async function snapshotCredential(
  store: CredentialStore,
  reference: CredentialReference,
): Promise<CredentialSnapshot> {
  let previous: Uint8Array | undefined;
  try {
    const status = await store.status(reference);
    if (status.state === "available") {
      previous = await store.use(reference, (secret) => Promise.resolve(Uint8Array.from(secret)));
    }
    return { reference, ...(previous === undefined ? {} : { previous }) };
  } catch {
    previous?.fill(0);
    throw new TypeError("credential store is unavailable");
  }
}

async function snapshotCredentials(
  store: CredentialStore,
  references: readonly CredentialReference[],
): Promise<CredentialSnapshot[]> {
  const snapshots: CredentialSnapshot[] = [];
  try {
    for (const reference of references) {
      snapshots.push(await snapshotCredential(store, reference));
    }
    return snapshots;
  } catch (error) {
    clearCredentialSnapshots(snapshots);
    throw error;
  }
}

async function restoreCredentialSnapshots(
  store: CredentialStore,
  snapshots: readonly CredentialSnapshot[],
): Promise<void> {
  const results = await Promise.allSettled(
    snapshots.map((snapshot) =>
      snapshot.previous === undefined
        ? store.delete(snapshot.reference)
        : store.write(snapshot.reference, snapshot.previous),
    ),
  );
  if (results.some((result) => result.status === "rejected")) {
    throw new TypeError("credential replacement rollback failed");
  }
}

function clearCredentialSnapshots(snapshots: readonly CredentialSnapshot[]): void {
  for (const snapshot of snapshots) snapshot.previous?.fill(0);
}

async function verifyAndStoreCredential(options: {
  readonly provider: LocalCredentialProvider;
  readonly store: CredentialStore;
  readonly verifier: GuardianSetupVerifier;
  readonly write: (text: string) => void;
  readonly secret: Uint8Array;
}): Promise<CredentialVerificationResult> {
  const reference = referenceFor(options.provider);
  const secret = options.secret;
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
    const snapshot = await snapshotCredential(options.store, reference);
    try {
      try {
        await options.store.write(reference, secret);
      } catch {
        await restoreCredentialSnapshots(options.store, [snapshot]);
        throw new TypeError("credential replacement failed");
      }
    } finally {
      clearCredentialSnapshots([snapshot]);
    }
    options.write(
      `Stored ${reference.provider} credential for verified account ${verification.accountLabel}.\n`,
    );
    return verification;
  } finally {
    secret.fill(0);
  }
}

export async function runGuardianSetup(options: {
  readonly provider: LocalCredentialProvider;
  readonly store: CredentialStore;
  readonly verifier: GuardianSetupVerifier;
  readonly io: GuardianSetupIo;
}): Promise<CredentialVerificationResult> {
  if (!options.io.interactive) throw new TypeError("interactive credential enrollment is required");
  const reference = referenceFor(options.provider);
  await preflightCredentialStore(options.store, [reference]);
  const secret = await options.io.readSecret(`Enter ${options.provider} credential: `);
  return await verifyAndStoreCredential({
    provider: options.provider,
    store: options.store,
    verifier: options.verifier,
    write: options.io.write,
    secret,
  });
}

async function closeLocalCredentialSurface(surface: GuardianLocalCredentialSurface): Promise<void> {
  try {
    await surface.close();
  } catch {
    throw new TypeError("credential surface cleanup failed");
  }
}

export async function runGuardianLocalCredentialEnrollment(options: {
  readonly provider: LocalCredentialProvider;
  readonly destination: LocalCredentialDestination;
  readonly store: CredentialStore;
  readonly verifier: GuardianSetupVerifier;
  readonly startSurface: GuardianLocalCredentialSurfaceFactory;
  readonly io: Pick<GuardianSetupIo, "interactive" | "write">;
}): Promise<CredentialVerificationResult> {
  if (!options.io.interactive) throw new TypeError("interactive credential enrollment is required");
  await preflightCredentialStore(options.store, [referenceFor(options.provider)]);
  let verification: CredentialVerificationResult | undefined;
  const surface = await options.startSurface({
    mode: "enroll",
    provider: options.provider,
    destination: options.destination,
    onSubmit: async (secret) => {
      verification = await verifyAndStoreCredential({
        provider: options.provider,
        store: options.store,
        verifier: options.verifier,
        write: options.io.write,
        secret,
      });
    },
  });
  try {
    options.io.write(
      `Open this one-time Guardian URL in your normal browser. Do not paste it into chat or an agent-controlled browser.\n${surface.url}\n`,
    );
    const outcome = await surface.completed;
    if (outcome === "submitted" && verification !== undefined) return verification;
    if (outcome === "cancelled") throw new TypeError("credential enrollment cancelled");
    if (outcome === "expired") throw new TypeError("credential enrollment expired");
    throw new TypeError("credential enrollment failed");
  } finally {
    await closeLocalCredentialSurface(surface);
  }
}

export async function runGuardianLocalCredentialReview(options: {
  readonly provider: LocalCredentialProvider;
  readonly destination: LocalCredentialDestination;
  readonly store: CredentialStore;
  readonly startSurface: GuardianLocalCredentialSurfaceFactory;
  readonly io: Pick<GuardianSetupIo, "interactive" | "write">;
}): Promise<"submitted" | "cancelled"> {
  if (!options.io.interactive) throw new TypeError("interactive credential review is required");
  await preflightCredentialStore(options.store, [referenceFor(options.provider)]);
  const surface = await options.startSurface({
    mode: "review",
    provider: options.provider,
    destination: options.destination,
    onSubmit: () => Promise.resolve(),
  });
  try {
    options.io.write(
      `Review mode cannot contact a provider or write the credential store. Use only an obvious fake value.\nOpen this one-time Guardian URL in your normal browser. Do not paste it into chat or an agent-controlled browser.\n${surface.url}\n`,
    );
    const outcome = await surface.completed;
    if (outcome === "submitted" || outcome === "cancelled") {
      options.io.write(
        outcome === "submitted"
          ? "Fake review value received and discarded. Nothing was stored or sent.\n"
          : "Credential surface review cancelled. Nothing was stored or sent.\n",
      );
      return outcome;
    }
    if (outcome === "expired") throw new TypeError("credential review expired");
    throw new TypeError("credential review failed");
  } finally {
    await closeLocalCredentialSurface(surface);
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
  const references = [reference, refreshReference, metadataReference];
  await preflightCredentialStore(options.store, references);
  const credential = await options.authorizer.authorize((challenge) => {
    options.io.write(
      `Open ${challenge.verificationUri} and enter code ${challenge.userCode}.\nWaiting for GitHub authorization...\n`,
    );
  });
  let snapshots: CredentialSnapshot[] = [];
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
    snapshots = await snapshotCredentials(options.store, references);
    await options.store.write(refreshReference, credential.refreshToken);
    await options.store.write(reference, credential.accessToken);
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
    } finally {
      metadataBytes.fill(0);
    }
    options.io.write(
      `Stored expiring GitHub App credential for verified account ${verification.accountLabel}.\n`,
    );
    return verification;
  } catch {
    if (snapshots.length > 0) {
      await restoreCredentialSnapshots(options.store, snapshots);
    }
    throw new TypeError("credential enrollment failed");
  } finally {
    clearCredentialSnapshots(snapshots);
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
