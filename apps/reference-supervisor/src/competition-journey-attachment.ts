import {
  ControlledCompetitionJourney,
  type CompetitionJourneyBroker,
  type CompetitionJourneyResearchClient,
  type ControlledCompetitionJourneyInput,
  type ControlledCompetitionJourneyResult,
} from "./competition-journey.js";
import type { SupervisedServiceProcess } from "./supervised-process.js";

export type CompetitionJourneyAttachmentState =
  "active" | "running" | "completed" | "interrupted" | "closed";

export type CompetitionJourneyAttachmentResult =
  | ControlledCompetitionJourneyResult
  | {
      readonly state: "stopped";
      readonly stage: "attachment";
      readonly code: "attachment_unavailable" | "attachment_consumed";
    };

export interface CompetitionJourneyRunner {
  run(input: ControlledCompetitionJourneyInput): Promise<ControlledCompetitionJourneyResult>;
}

type AttachedServiceProcess = Pick<SupervisedServiceProcess, "processId" | "exited" | "close">;

function validProcess(process: AttachedServiceProcess): boolean {
  return Number.isInteger(process.processId) && process.processId > 0;
}

/**
 * Binds the fixed journey to two distinct supervised service lifecycles. One
 * attachment can run once. Child exit, concurrent use, replay, or closure stops
 * without restarting either credential-holding boundary.
 */
export class SupervisedCompetitionJourneyAttachment {
  readonly #researchProcess: AttachedServiceProcess;
  readonly #brokerProcess: AttachedServiceProcess;
  readonly #journey: CompetitionJourneyRunner;
  readonly #serviceExited: Promise<void>;
  #state: CompetitionJourneyAttachmentState = "active";
  #consumed = false;

  constructor(options: {
    readonly researchProcess: AttachedServiceProcess;
    readonly brokerProcess: AttachedServiceProcess;
    readonly journey: CompetitionJourneyRunner;
  }) {
    if (
      !validProcess(options.researchProcess) ||
      !validProcess(options.brokerProcess) ||
      options.researchProcess.processId === options.brokerProcess.processId
    ) {
      throw new TypeError("competition journey requires distinct supervised service processes");
    }
    this.#researchProcess = options.researchProcess;
    this.#brokerProcess = options.brokerProcess;
    this.#journey = options.journey;
    const recordExit = () => {
      if (this.#state === "active" || this.#state === "running") {
        this.#state = "interrupted";
      }
    };
    this.#serviceExited = Promise.race([
      this.#researchProcess.exited.then(recordExit, recordExit),
      this.#brokerProcess.exited.then(recordExit, recordExit),
    ]);
  }

  get state(): CompetitionJourneyAttachmentState {
    return this.#state;
  }

  async run(input: ControlledCompetitionJourneyInput): Promise<CompetitionJourneyAttachmentResult> {
    if (this.#state === "interrupted" || this.#state === "closed") {
      return { state: "stopped", stage: "attachment", code: "attachment_unavailable" };
    }
    if (this.#consumed || this.#state !== "active") {
      return { state: "stopped", stage: "attachment", code: "attachment_consumed" };
    }
    this.#consumed = true;
    this.#state = "running";

    const outcome = await Promise.race([
      this.#journey
        .run(input)
        .then((result) => ({ kind: "result" as const, result }))
        .catch(() => ({ kind: "runner_failure" as const })),
      this.#serviceExited.then(() => ({ kind: "service_exit" as const })),
    ]);
    const stateAfterOutcome = this.#state as CompetitionJourneyAttachmentState;
    if (
      outcome.kind !== "result" ||
      stateAfterOutcome === "interrupted" ||
      stateAfterOutcome === "closed"
    ) {
      if (stateAfterOutcome !== "closed") this.#state = "interrupted";
      return { state: "stopped", stage: "attachment", code: "attachment_unavailable" };
    }
    this.#state = "completed";
    return outcome.result;
  }

  async close(): Promise<void> {
    if (this.#state === "closed") return;
    this.#state = "closed";
    const results = await Promise.allSettled([
      this.#researchProcess.close(),
      this.#brokerProcess.close(),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      throw new TypeError("competition journey service shutdown failed");
    }
  }
}

export function attachControlledCompetitionJourney(options: {
  readonly researchProcess: AttachedServiceProcess;
  readonly brokerProcess: AttachedServiceProcess;
  readonly research: CompetitionJourneyResearchClient;
  readonly broker: CompetitionJourneyBroker;
}): SupervisedCompetitionJourneyAttachment {
  return new SupervisedCompetitionJourneyAttachment({
    researchProcess: options.researchProcess,
    brokerProcess: options.brokerProcess,
    journey: new ControlledCompetitionJourney({
      research: options.research,
      broker: options.broker,
    }),
  });
}
