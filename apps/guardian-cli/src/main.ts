#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { WindowsCredentialStore } from "@guardian/credential-store";
import { createCredentialVerifier, GitHubDeviceFlow } from "@guardian/credential-verification";
import { startReferenceAuthoritySupervisor } from "@guardian/reference-supervisor";

import { parseGuardianCliArguments, runGuardianAssistedCli } from "./index.js";
import { runGuardianCompetitionCommand } from "./competition-command.js";
import {
  parseGuardianSetupArguments,
  readHiddenCredentialFromTerminal,
  runGuardianSetup,
  runGitHubDeviceSetup,
  runGuardianSetupRevoke,
  runGuardianSetupStatus,
} from "./setup.js";

function assertInteractiveTerminal(): void {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new TypeError("Guardian requires an interactive terminal");
  }
}

async function runSetup(arguments_: readonly string[]): Promise<void> {
  assertInteractiveTerminal();
  if (process.platform !== "win32") {
    throw new TypeError("guardian setup currently supports Windows Credential Manager only");
  }
  const command = parseGuardianSetupArguments(arguments_);
  const store = new WindowsCredentialStore();
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
    await runGuardianSetup({
      provider: command.provider,
      store,
      verifier: createCredentialVerifier(command.provider),
      io: {
        interactive: true,
        write: (text) => process.stdout.write(text),
        readSecret: readHiddenCredentialFromTerminal,
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
  if (arguments_[0] === "setup") {
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
