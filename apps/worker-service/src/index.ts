import {
  ProviderRequestIdSchema,
  WorkerOutcomeSchema,
  WorkerServiceProcessConfigSchema,
  WorkerTurnEnvelopeSchema,
  type WorkerOutcome,
  type WorkerServiceProcessConfig,
  type WorkerTurnEnvelope,
} from "@guardian/contracts";
import { LocalWorkerIpcServer } from "@guardian/worker";

export {
  NebiusNativeWorkerProvider,
  NativeWorkerProviderError,
  nativeWorkerBoundary,
  projectNebiusWorkerResponse,
  type NativeWorkerProviderDiagnostic,
} from "./nebius.js";

export interface NativeWorkerProvider {
  readonly selectionKind: "deterministic_reference" | "nebius_native";
  readonly runTurn: (
    turn: WorkerTurnEnvelope,
  ) => Promise<{ readonly requestId: unknown; readonly outcome: unknown }>;
}

export function createFakeWorkerProvider(
  options: {
    readonly outcome?: WorkerOutcome;
  } = {},
): NativeWorkerProvider {
  const fixedOutcome =
    options.outcome === undefined ? undefined : WorkerOutcomeSchema.parse(options.outcome);
  return {
    selectionKind: "deterministic_reference",
    runTurn: (turnValue) => {
      const turn = WorkerTurnEnvelopeSchema.parse(turnValue);
      const outcome = WorkerOutcomeSchema.parse(
        fixedOutcome ??
          (turn.previousToolResult === undefined
            ? {
                kind: "tool_request",
                request: {
                  name: "guardian.local_command",
                  arguments: {
                    executable: "node",
                    arguments: ["-p", "require('fs').readFileSync('README.md','utf8').slice(0,80)"],
                    workingDirectory: "/workspace",
                    timeoutSeconds: 10,
                  },
                },
              }
            : {
                kind: "final_response",
                response:
                  "The deterministic W3 worker received the sanitized local-command result and completed its bounded second turn.",
              }),
      );
      return Promise.resolve({ requestId: `fake_worker_${turn.turnNumber}`, outcome });
    },
  };
}

export async function startWorkerService(
  configValue: unknown,
  provider: NativeWorkerProvider,
  options: { readonly now?: () => string } = {},
): Promise<LocalWorkerIpcServer> {
  const config: WorkerServiceProcessConfig = WorkerServiceProcessConfigSchema.parse(configValue);
  const server = new LocalWorkerIpcServer(
    config,
    async (turnValue) => {
      const turn = WorkerTurnEnvelopeSchema.parse(turnValue);
      if (turn.worker.kind !== provider.selectionKind) {
        throw Object.assign(
          new TypeError("worker provider does not match the trusted assignment"),
          {
            reason: "provider_malformed" as const,
          },
        );
      }
      const result = await provider.runTurn(turn);
      try {
        return {
          providerRequestId: ProviderRequestIdSchema.parse(result.requestId),
          outcome: WorkerOutcomeSchema.parse(result.outcome),
        };
      } catch {
        throw Object.assign(new TypeError("worker provider returned a malformed result"), {
          reason: "provider_malformed" as const,
        });
      }
    },
    options,
  );
  await server.listen();
  return server;
}
