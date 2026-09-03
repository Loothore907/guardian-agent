import { describe, expect, it, vi } from "vitest";

import {
  SupervisedCompetitionJourneyAttachment,
  attachControlledCompetitionJourney,
  type CompetitionJourneyRunner,
} from "./competition-journey-attachment.js";

const input = {
  requestedAt: null,
  researchRequest: null,
  unsafeRequest: null,
  legitimateRequest: null,
  legitimateApproval: null,
};

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function serviceProcess(processId: number) {
  const exit = deferred();
  const close = vi.fn(() => {
    exit.resolve();
    return Promise.resolve();
  });
  return {
    process: { processId, exited: exit.promise, close },
    exit,
    close,
  };
}

function stoppedResult() {
  return { state: "stopped", stage: "input", code: "invalid_input" } as const;
}

describe("supervised competition journey attachment", () => {
  it("runs once across distinct supervised processes and rejects replay", async () => {
    const research = serviceProcess(101);
    const broker = serviceProcess(202);
    const run = vi.fn().mockResolvedValue(stoppedResult());
    const journey: CompetitionJourneyRunner = { run };
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey,
    });

    await expect(attachment.run(input)).resolves.toEqual(stoppedResult());
    expect(attachment.state).toBe("completed");
    await expect(attachment.run(input)).resolves.toEqual({
      state: "stopped",
      stage: "attachment",
      code: "attachment_consumed",
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects a concurrent second run before it can reuse approval", async () => {
    const research = serviceProcess(303);
    const broker = serviceProcess(404);
    const pending = deferred<ReturnType<typeof stoppedResult>>();
    const run = vi.fn().mockReturnValue(pending.promise);
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey: { run },
    });

    const first = attachment.run(input);
    await expect(attachment.run(input)).resolves.toEqual({
      state: "stopped",
      stage: "attachment",
      code: "attachment_consumed",
    });
    pending.resolve(stoppedResult());
    await expect(first).resolves.toEqual(stoppedResult());
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("fails closed when either service exits before the run", async () => {
    const research = serviceProcess(505);
    const broker = serviceProcess(606);
    const run = vi.fn().mockResolvedValue(stoppedResult());
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey: { run },
    });

    research.exit.resolve();
    await research.exit.promise;
    await Promise.resolve();
    await expect(attachment.run(input)).resolves.toEqual({
      state: "stopped",
      stage: "attachment",
      code: "attachment_unavailable",
    });
    expect(attachment.state).toBe("interrupted");
    expect(run).not.toHaveBeenCalled();
  });

  it("fails closed when a service exits during the journey", async () => {
    const research = serviceProcess(707);
    const broker = serviceProcess(808);
    const pending = deferred<ReturnType<typeof stoppedResult>>();
    const run = vi.fn().mockReturnValue(pending.promise);
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey: { run },
    });

    const result = attachment.run(input);
    broker.exit.resolve();
    await expect(result).resolves.toEqual({
      state: "stopped",
      stage: "attachment",
      code: "attachment_unavailable",
    });
    expect(attachment.state).toBe("interrupted");
    pending.resolve(stoppedResult());
  });

  it("converts runner failure to a fixed interrupted attachment result", async () => {
    const research = serviceProcess(809);
    const broker = serviceProcess(810);
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey: { run: vi.fn().mockRejectedValue(new Error("private boundary detail")) },
    });

    const result = await attachment.run(input);
    expect(result).toEqual({
      state: "stopped",
      stage: "attachment",
      code: "attachment_unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("private boundary detail");
    expect(attachment.state).toBe("interrupted");
  });

  it("requires distinct valid process identities", () => {
    const research = serviceProcess(909);
    const broker = serviceProcess(909);
    expect(
      () =>
        new SupervisedCompetitionJourneyAttachment({
          researchProcess: research.process,
          brokerProcess: broker.process,
          journey: { run: vi.fn() },
        }),
    ).toThrow("distinct supervised service processes");
  });

  it("closes both services and prevents later execution", async () => {
    const research = serviceProcess(1_010);
    const broker = serviceProcess(1_111);
    const run = vi.fn().mockResolvedValue(stoppedResult());
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey: { run },
    });

    await attachment.close();
    expect(research.close).toHaveBeenCalledOnce();
    expect(broker.close).toHaveBeenCalledOnce();
    expect(attachment.state).toBe("closed");
    await expect(attachment.run(input)).resolves.toEqual({
      state: "stopped",
      stage: "attachment",
      code: "attachment_unavailable",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("attempts both shutdowns and returns only a fixed failure", async () => {
    const research = serviceProcess(1_212);
    const broker = serviceProcess(1_313);
    research.close.mockRejectedValueOnce(new Error("private shutdown detail"));
    const attachment = new SupervisedCompetitionJourneyAttachment({
      researchProcess: research.process,
      brokerProcess: broker.process,
      journey: { run: vi.fn() },
    });

    await expect(attachment.close()).rejects.toThrow("competition journey service shutdown failed");
    expect(research.close).toHaveBeenCalledOnce();
    expect(broker.close).toHaveBeenCalledOnce();
    expect(attachment.state).toBe("closed");
  });

  it("constructs the fixed coordinator from typed research and broker clients", async () => {
    const researchProcess = serviceProcess(1_414);
    const brokerProcess = serviceProcess(1_515);
    const researchSearch = vi.fn();
    const brokerExecute = vi.fn();
    const attachment = attachControlledCompetitionJourney({
      researchProcess: researchProcess.process,
      brokerProcess: brokerProcess.process,
      research: { search: researchSearch },
      broker: { execute: brokerExecute },
    });

    await expect(attachment.run(input)).resolves.toEqual(stoppedResult());
    expect(researchSearch).not.toHaveBeenCalled();
    expect(brokerExecute).not.toHaveBeenCalled();
  });
});
