import { createHash, randomUUID } from "node:crypto";
import {
  JUDGE_SCENARIOS,
  JudgePortalDraftSchema,
  JudgePortalConfirmationSchema,
  JudgePortalPreviewSchema,
  JudgePortalRunResultSchema,
  JudgeTaskScopeSchema,
  Sha256DigestSchema,
  type JudgeScenarioId,
  type JudgeTaskScope,
  type JudgePortalPreview,
} from "@guardian/contracts";

export class JudgePortalError extends Error {
  constructor(
    readonly code:
      "invalid_request" | "unavailable" | "preview_unavailable" | "capacity_unavailable",
  ) {
    super(code);
  }
}

/** Trusted local adapter. It must bind scope to the actual supervisor preview and
 * activate durable authority before starting any worker. Never supplied by HTTP. */
export interface PreparedJudgePortalSession {
  readonly scope: JudgeTaskScope;
  readonly bindingDigest: string;
  confirmAndRun(signal: AbortSignal): Promise<unknown>;
  close(): Promise<void>;
}
export interface JudgePortalBackend {
  prepare(input: {
    mode: "seeded" | "piloted";
    scenarioId: JudgeScenarioId | null;
    scope: JudgeTaskScope;
    sourceFingerprint: string;
  }): Promise<PreparedJudgePortalSession>;
}

type Pending = {
  preview: JudgePortalPreview;
  source: string;
  session: PreparedJudgePortalSession;
  timer: ReturnType<typeof setTimeout>;
};

/** One-use, caller-bound confirmation. This is development confirmation, not WebAuthn. */
export class JudgePortal {
  readonly #backend: JudgePortalBackend;
  readonly #scenarios = new Map<JudgeScenarioId, () => Promise<JudgeTaskScope>>();
  readonly #pending = new Map<string, Pending>();
  readonly #active = new Map<
    string,
    { abort: AbortController; session: PreparedJudgePortalSession }
  >();
  readonly #now: () => number;
  #preparing = 0;
  #closed = false;

  constructor(options: {
    backend: JudgePortalBackend;
    scenarios: Partial<Record<JudgeScenarioId, () => Promise<JudgeTaskScope>>>;
    now?: () => number;
  }) {
    this.#backend = options.backend;
    this.#now = options.now ?? Date.now;
    for (const scenario of JUDGE_SCENARIOS) {
      const prepare = options.scenarios[scenario.id];
      if (prepare) this.#scenarios.set(scenario.id, prepare);
    }
  }

  catalog() {
    return {
      schemaVersion: 1,
      pilotedAvailable: !this.#closed,
      scenarios: JUDGE_SCENARIOS.map((s) => ({
        ...s,
        available: !this.#closed && this.#scenarios.has(s.id),
      })),
    };
  }

  async draft(value: unknown, sourceValue: unknown): Promise<JudgePortalPreview> {
    const input = JudgePortalDraftSchema.safeParse(value);
    const source = Sha256DigestSchema.safeParse(sourceValue);
    if (!input.success || !source.success) throw new JudgePortalError("invalid_request");
    if (this.#closed) throw new JudgePortalError("unavailable");
    if (this.#pending.size + this.#active.size + this.#preparing >= 16)
      throw new JudgePortalError("capacity_unavailable");
    this.#preparing++;
    let session: PreparedJudgePortalSession | undefined;
    try {
      const scenarioId = input.data.mode === "seeded" ? input.data.scenarioId : null;
      const factory = scenarioId === null ? undefined : this.#scenarios.get(scenarioId);
      if (input.data.mode === "seeded" && factory === undefined)
        throw new JudgePortalError("unavailable");
      const scope = JudgeTaskScopeSchema.parse(
        input.data.mode === "piloted" ? input.data.scope : await factory!(),
      );
      if (
        (scenarioId === "unauthorized_destination" &&
          (scope.githubTarget !== null || !scope.researchUrls.length)) ||
        (scenarioId === "read_to_write" &&
          scope.githubTarget?.operation !== "github.pull_request.read") ||
        (scenarioId === "action_substitution" &&
          scope.githubTarget?.operation !== "github.pull_request.merge")
      )
        throw new JudgePortalError("unavailable");
      session = await this.#backend.prepare({
        mode: input.data.mode,
        scenarioId,
        scope: structuredClone(scope),
        sourceFingerprint: source.data,
      });
      // Trusted preparation may reject a target, but must never silently change it.
      const preparedScope = JudgeTaskScopeSchema.parse(session.scope);
      if (JSON.stringify(scope) !== JSON.stringify(preparedScope) || this.#closed)
        throw new JudgePortalError("unavailable");
      const body = {
        schemaVersion: 1 as const,
        previewId: randomUUID(),
        expiresAt: new Date(this.#now() + 30_000).toISOString(),
        mode: input.data.mode,
        scenarioId,
        scope,
        maxToolCalls: 20 as const,
        maxResearchRequests: 2 as const,
        maxMutations:
          scope.githubTarget?.operation === "github.pull_request.merge"
            ? (1 as const)
            : (0 as const),
        confirmation: "development_confirmation" as const,
      };
      const previewDigest = createHash("sha256")
        .update("guardian-portal-preview-v1\0")
        .update(JSON.stringify(body))
        .update(source.data)
        .update(Sha256DigestSchema.parse(session.bindingDigest))
        .digest("hex");
      const preview = JudgePortalPreviewSchema.parse({ ...body, previewDigest });
      const timer = setTimeout(() => {
        void this.#discard(preview.previewId);
      }, 30_000);
      timer.unref();
      this.#pending.set(preview.previewId, { preview, source: source.data, session, timer });
      return structuredClone(preview);
    } catch {
      await session?.close().catch(() => undefined);
      throw new JudgePortalError("unavailable");
    } finally {
      this.#preparing--;
    }
  }

  async #discard(id: string) {
    const pending = this.#pending.get(id);
    if (!pending) return;
    this.#pending.delete(id);
    clearTimeout(pending.timer);
    await pending.session.close().catch(() => undefined);
  }

  async confirm(value: unknown, source: string, signal: AbortSignal) {
    const input = JudgePortalConfirmationSchema.safeParse(value);
    if (!input.success) throw new JudgePortalError("invalid_request");
    const pending = this.#pending.get(input.data.previewId);
    if (
      !pending ||
      this.#closed ||
      pending.source !== source ||
      pending.preview.previewDigest !== input.data.previewDigest
    )
      throw new JudgePortalError("preview_unavailable");
    const now = this.#now();
    if (
      Date.parse(pending.preview.expiresAt) <= now ||
      now < Date.parse(pending.preview.expiresAt) - 30_000 ||
      signal.aborted
    ) {
      await this.#discard(input.data.previewId);
      throw new JudgePortalError("preview_unavailable");
    }
    // Consume synchronously before any await: concurrent confirmation cannot launch twice.
    this.#pending.delete(input.data.previewId);
    clearTimeout(pending.timer);
    const abort = new AbortController();
    const cancel = () => {
      abort.abort();
      void pending.session.close().catch(() => undefined);
    };
    signal.addEventListener("abort", cancel, { once: true });
    this.#active.set(input.data.previewId, { abort, session: pending.session });
    const timeout = setTimeout(cancel, 300_000);
    timeout.unref();
    let stop: (() => void) | undefined;
    const cancelled = new Promise<never>((_resolve, reject) => {
      stop = () => reject(new JudgePortalError("unavailable"));
      abort.signal.addEventListener("abort", stop, { once: true });
    });
    let result: ReturnType<typeof JudgePortalRunResultSchema.parse> | undefined;
    let failed = false;
    try {
      result = JudgePortalRunResultSchema.parse(
        await Promise.race([pending.session.confirmAndRun(abort.signal), cancelled]),
      );
      if (abort.signal.aborted) throw new JudgePortalError("unavailable");
    } catch {
      failed = true;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
      if (stop) abort.signal.removeEventListener("abort", stop);
      this.#active.delete(input.data.previewId);
      try {
        await pending.session.close();
      } catch {
        failed = true;
      }
    }
    if (failed || result === undefined) throw new JudgePortalError("unavailable");
    return result;
  }

  async close() {
    this.#closed = true;
    for (const active of this.#active.values()) active.abort.abort();
    await Promise.allSettled([
      ...[...this.#pending.keys()].map((id) => this.#discard(id)),
      ...[...this.#active.values()].map((active) => active.session.close()),
    ]);
  }
}
