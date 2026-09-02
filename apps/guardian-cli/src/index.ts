import {
  SessionBootstrapResultSchema,
  SessionDraftPreviewSchema,
  type DevelopmentSessionConfirmation,
  type MissionDraftReviewOutcome,
  type MissionFormationDraftSnapshot,
  type SessionBootstrapResult,
  type SessionDraftInput,
  type SessionDraftPreview,
} from "@guardian/contracts";

export * from "./setup.js";

export interface GuardianCliBootstrap {
  readonly createDraft: (input: SessionDraftInput) => SessionDraftPreview;
  readonly confirmAndLaunch: (
    input: DevelopmentSessionConfirmation,
  ) => Promise<SessionBootstrapResult>;
}

export interface GuardianCliAssistedBootstrap extends GuardianCliBootstrap {
  readonly createAssistedObjectiveDraft: (
    input: SessionDraftInput,
  ) => MissionFormationDraftSnapshot;
  readonly reviewAssistedDraft: (draftId: string) => Promise<{
    readonly providerRequestId: string;
    readonly outcome: MissionDraftReviewOutcome;
  }>;
  readonly reviseAssistedDraft: (
    draftId: string,
    expectedRevision: number,
    input: MissionFormationDraftSnapshot["draft"],
  ) => MissionFormationDraftSnapshot;
  readonly compileAssistedDraft: (
    draftId: string,
    expectedRevision: number,
  ) => Promise<SessionDraftPreview>;
  readonly compileAssistedFallback: (
    draftId: string,
    expectedRevision: number,
    reason: "provider_unavailable" | "provider_malformed",
  ) => Promise<SessionDraftPreview>;
}

export interface GuardianCliIo {
  readonly interactive: boolean;
  readonly write: (text: string) => void;
  readonly readConfirmation: (prompt: string) => Promise<string>;
}

export function parseGuardianCliArguments(arguments_: readonly string[]): { objective: string } {
  if (arguments_[0] !== "start" || arguments_.length < 2) {
    throw new TypeError('usage: guardian start "<task objective>"');
  }
  return { objective: arguments_.slice(1).join(" ") };
}

function renderPreview(preview: SessionDraftPreview): string {
  const destinations = preview.permissions.network.destinations
    .map((destination) =>
      destination.kind === "public_domain"
        ? destination.hostname
        : `${destination.owner}/${destination.repository}`,
    )
    .join(", ");
  return [
    "Guardian development session preview",
    "",
    `Objective: ${preview.objective}`,
    `Tools: ${preview.permissions.tools.join(", ")}`,
    `Filesystem: ${preview.permissions.filesystem.mode} ${preview.permissions.filesystem.roots.join(", ")}`,
    `Network: ${preview.permissions.network.mode}${destinations.length > 0 ? ` (${destinations})` : ""}`,
    `Side effects: ${preview.permissions.sideEffects.join(", ")}`,
    `Duration: ${preview.permissions.time.maxDurationSeconds} seconds`,
    `Maximum privileged actions: ${preview.permissions.volume.maxPrivilegedActions}`,
    `Integration: ${preview.integration.mode}`,
    `Workspace: Guardian-managed copy of ${preview.workspace.projectName} at ${preview.workspace.mountPath}`,
    `Workspace lifecycle: persistent for this session, no host writeback, deleted on close`,
    `Worker: ${
      preview.worker.kind === "nebius_native"
        ? `${preview.worker.modelId} via Nebius Token Factory`
        : "deterministic reference fixture"
    }`,
    `Preview digest: ${preview.previewDigest}`,
    "",
    "This local prompt is lower-assurance development confirmation, not WebAuthn.",
  ].join("\n");
}

export async function runGuardianCli(options: {
  readonly objective: string;
  readonly principalId: string;
  readonly bootstrap: GuardianCliBootstrap;
  readonly io: GuardianCliIo;
  readonly now?: () => string;
}): Promise<SessionBootstrapResult> {
  const preview = SessionDraftPreviewSchema.parse(
    options.bootstrap.createDraft({ schemaVersion: 1, objective: options.objective }),
  );
  return confirmAndLaunchPreview({ ...options, preview });
}

async function confirmAndLaunchPreview(options: {
  readonly principalId: string;
  readonly bootstrap: GuardianCliBootstrap;
  readonly io: GuardianCliIo;
  readonly preview: SessionDraftPreview;
  readonly now?: () => string;
}): Promise<SessionBootstrapResult> {
  const { preview } = options;
  options.io.write(`${renderPreview(preview)}\n`);
  if (!options.io.interactive) {
    throw new TypeError("interactive development confirmation is required");
  }

  const confirmationCode = preview.previewDigest.slice(0, 12);
  const response = await options.io.readConfirmation(
    `Type CONFIRM ${confirmationCode} to launch this exact preview: `,
  );
  if (response !== `CONFIRM ${confirmationCode}`) {
    throw new TypeError("session preview was not confirmed");
  }

  const result = SessionBootstrapResultSchema.parse(
    await options.bootstrap.confirmAndLaunch({
      schemaVersion: 1,
      draftId: preview.draftId,
      previewDigest: preview.previewDigest,
      confirmedBy: { kind: "human", principalId: options.principalId },
      confirmedAt: (options.now ?? (() => new Date().toISOString()))(),
      assurance: "development_confirmation",
    }),
  );
  options.io.write(
    [
      "Guardian development bootstrap completed",
      `Session record: ${result.sessionId}`,
      `Runtime assurance at launch: ${result.assurance}`,
      `Confirmation assurance: ${result.confirmationAssurance}`,
      `Workspace: ${result.workspace.fileCount} files in a sanitized session Git baseline`,
      `Worker: ${
        result.worker.kind === "nebius_native"
          ? `${result.worker.modelId} via Nebius Token Factory`
          : "deterministic reference fixture"
      }`,
      `Expires: ${result.expiresAt}`,
      result.runner.state === "completed"
        ? `Guardian mission brief: ${result.runner.outcome.summary}`
        : "No Guardian mission-brief assistant is attached.",
      result.workerTurn.state === "completed"
        ? result.workerTurn.result.outcome.kind === "tool_request"
          ? `Pending worker tool request (not executed): ${result.workerTurn.result.outcome.request.name}`
          : `Worker response: ${result.workerTurn.result.outcome.response}`
        : result.workerTurn.state === "failed_closed"
          ? `Worker turn failed closed: ${result.workerTurn.error}`
          : result.workerTurn.state === "revoked"
            ? result.workerTurn.toolResult.outcome === "denied"
              ? `Worker request denied; session revoked by policy: ${result.workerTurn.toolResult.denial.code}`
              : "Worker session revoked by policy."
            : "No worker-turn boundary is attached.",
      "",
    ].join("\n"),
  );
  return result;
}

export async function runGuardianAssistedCli(options: {
  readonly objective: string;
  readonly principalId: string;
  readonly bootstrap: GuardianCliAssistedBootstrap;
  readonly io: GuardianCliIo;
  readonly now?: () => string;
}): Promise<SessionBootstrapResult> {
  let draft = options.bootstrap.createAssistedObjectiveDraft({
    schemaVersion: 1,
    objective: options.objective,
  });
  let preview: SessionDraftPreview | undefined;

  while (preview === undefined) {
    let reviewed;
    try {
      reviewed = await options.bootstrap.reviewAssistedDraft(draft.draftId);
    } catch (error) {
      const reason =
        typeof error === "object" && error !== null && "reason" in error ? error.reason : undefined;
      if (reason !== "provider_unavailable" && reason !== "provider_malformed") throw error;
      preview = await options.bootstrap.compileAssistedFallback(
        draft.draftId,
        draft.revision,
        reason,
      );
      break;
    }

    if (reviewed.outcome.status === "ready") {
      preview = await options.bootstrap.compileAssistedDraft(draft.draftId, draft.revision);
      break;
    }
    if (!options.io.interactive) {
      throw new TypeError("interactive mission clarification is required");
    }
    const answers: string[] = [];
    for (const question of reviewed.outcome.questions) {
      const answer = await options.io.readConfirmation(`Guardian asks: ${question.question} `);
      answers.push(`Human clarification for ${question.field}: ${answer}`);
    }
    draft = options.bootstrap.reviseAssistedDraft(draft.draftId, draft.revision, {
      ...draft.draft,
      constraints: [...(draft.draft.constraints ?? []), ...answers],
    });
  }

  return confirmAndLaunchPreview({ ...options, preview });
}
