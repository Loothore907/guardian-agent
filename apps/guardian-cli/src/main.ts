#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { createPlatformCredentialStore } from "@guardian/credential-store";
import { createCredentialVerifier, GitHubDeviceFlow } from "@guardian/credential-verification";
import { startReferenceAuthoritySupervisor } from "@guardian/reference-supervisor";

import { parseGuardianCliArguments, runGuardianAssistedCli } from "./index.js";
import { runGuardianCompetitionCommand } from "./competition-command.js";
import { startLocalCredentialSurface } from "./local-credential-surface.js";
import {
  parseGuardianSetupArguments,
  runGitHubDeviceSetup,
  runGuardianLocalCredentialEnrollment,
  runGuardianLocalCredentialReview,
  runGuardianSetupRevoke,
  runGuardianSetupStatus,
} from "./setup.js";

const LOCAL_BROWSER_ENROLLMENT_ACCEPTED_RUNTIMES: ReadonlySet<NodeJS.Platform> =
  new Set<NodeJS.Platform>();

function assertInteractiveTerminal(): void {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new TypeError("Guardian requires an interactive terminal");
  }
}

function localCredentialDestination(): "windows_credential_manager" | "linux_secret_service" {
  if (process.platform === "win32") return "windows_credential_manager";
  if (process.platform === "linux") return "linux_secret_service";
  throw new TypeError("guardian credentials does not support this platform");
}

async function runSetup(arguments_: readonly string[]): Promise<void> {
  assertInteractiveTerminal();
  if (process.platform !== "win32" && process.platform !== "linux") {
    throw new TypeError("guardian setup does not support this platform");
  }
  const command = parseGuardianSetupArguments(arguments_);
  const store = createPlatformCredentialStore();
  const destination = localCredentialDestination();
  if (command.operation === "review") {
    if (command.provider === "github") {
      throw new TypeError("GitHub uses its fixed device authorization flow");
    }
    await runGuardianLocalCredentialReview({
      provider: command.provider,
      destination,
      store,
      startSurface: startLocalCredentialSurface,
      io: { interactive: true, write: (text) => process.stdout.write(text) },
    });
    return;
  }
  if (command.operation === "enroll") {
    if (command.provider === "github") {
      const clientId = process.env.GUARDIAN_GITHUB_APP_CLIENT_ID;
      if (clientId === undefined) {
        throw new TypeError("GUARDIAN_GITHUB_APP_CLIENT_ID is required for GitHub setup");
      }
      const repositoryId = process.env.GUARDIAN_GITHUB_REPOSITORY_ID;
      if (repositoryId === undefined) {
        throw new TypeError("GUARDIAN_GITHUB_REPOSITORY_ID is required for GitHub setup");
      }
      await runGitHubDeviceSetup({
        store,
        authorizer: new GitHubDeviceFlow({ clientId, repositoryId }),
        verifier: createCredentialVerifier("github"),
        io: { interactive: true, write: (text) => process.stdout.write(text) },
      });
      return;
    }
    if (!LOCAL_BROWSER_ENROLLMENT_ACCEPTED_RUNTIMES.has(process.platform)) {
      throw new TypeError(
        "local browser credential enrollment is pending hands-on review for this platform; run guardian credentials review nebius",
      );
    }
    await runGuardianLocalCredentialEnrollment({
      provider: command.provider,
      destination,
      store,
      verifier: createCredentialVerifier(command.provider),
      startSurface: startLocalCredentialSurface,
      io: {
        interactive: true,
        write: (text) => process.stdout.write(text),
      },
    });
    return;
  }
  if (command.operation === "status") {
    await runGuardianSetupStatus({
      provider: command.provider,
      store,
      io: { interactive: true, write: (text) => process.stdout.write(text) },
    });
    return;
  }
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await runGuardianSetupRevoke({
      provider: command.provider,
      store,
      io: {
        interactive: true,
        write: (text) => process.stdout.write(text),
        readConfirmation: (prompt) => readline.question(prompt),
      },
    });
  } finally {
    readline.close();
  }
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  if (arguments_[0] === "setup" || arguments_[0] === "credentials") {
    await runSetup(arguments_);
    return;
  }
  assertInteractiveTerminal();
  if (arguments_[0] === "competition") {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
      await runGuardianCompetitionCommand({
        arguments: arguments_,
        environment: process.env,
        projectRoot: process.cwd(),
        startSupervisor: startReferenceAuthoritySupervisor,
        io: {
          interactive: true,
          write: (text) => process.stdout.write(text),
          readConfirmation: (prompt) => readline.question(prompt),
        },
      });
    } finally {
      readline.close();
    }
    return;
  }
  const { objective } = parseGuardianCliArguments(arguments_);
  const projectRoot = process.cwd();
  const stateDirectory = resolve(projectRoot, ".guardian");
  const workspaceStorage = resolve(stateDirectory, "workspaces");

  const sessionId = randomUUID();
  const callerId = randomUUID();
  const principalId = randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(issuedAt) + 10 * 60 * 1_000).toISOString();
  const supervisor = await startReferenceAuthoritySupervisor(
    {
      sessionId,
      callerId,
      authorityStorePath: resolve(stateDirectory, "authority.sqlite"),
      projectRoot,
      workspaceRoots: [workspaceStorage],
      issuedAt,
      expiresAt,
    },
    { interactionProcess: "fake", riskProcess: "fake" },
  );
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await runGuardianAssistedCli({
      objective,
      principalId,
      bootstrap: supervisor.bootstrap,
      io: {
        interactive: true,
        write: (text) => process.stdout.write(text),
        readConfirmation: (prompt) => readline.question(prompt),
      },
    });
  } finally {
    readline.close();
    await supervisor.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown failure";
  process.stderr.write(`guardian failed: ${message}\n`);
  process.exitCode = 1;
});
