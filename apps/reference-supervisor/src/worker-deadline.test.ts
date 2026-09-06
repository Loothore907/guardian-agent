import { afterEach, describe, expect, it, vi } from "vitest";
import { withinWorkerDeadline } from "./worker-deadline.js";
afterEach(() => vi.useRealTimers());
describe("worker deadline", () => {
  it("aborts an in-flight service and interrupts its owner", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const interrupt = vi.fn();
    const deadline = new Date(Date.now() + 100).toISOString();
    const pending = withinWorkerDeadline({
      deadline,
      now: () => new Date().toISOString(),
      interrupt,
      run: (s) => {
        signal = s;
        return new Promise(() => undefined);
      },
    });
    const assertion = expect(pending).rejects.toMatchObject({ reason: "expired" });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(signal?.aborted).toBe(true);
    expect(interrupt).toHaveBeenCalledOnce();
  });
  it("never starts an expired service", async () => {
    const run = vi.fn();
    await expect(
      withinWorkerDeadline({
        deadline: "2026-09-05T00:00:00.000Z",
        now: () => "2026-09-05T00:00:00.000Z",
        interrupt: vi.fn(),
        run,
      }),
    ).rejects.toMatchObject({ reason: "expired" });
    expect(run).not.toHaveBeenCalled();
  });
});
