/** The deadline bounds awaiting a service as well as admission to it. The owner
 * must terminate its child on abort; a timeout never resumes the loop. */
export async function withinWorkerDeadline<T>(options: {
  deadline: string;
  now: () => string;
  interrupt: () => void;
  run: (signal: AbortSignal) => Promise<T>;
}): Promise<T> {
  const remaining = Date.parse(options.deadline) - Date.parse(options.now());
  if (!Number.isFinite(remaining) || remaining <= 0) {
    options.interrupt();
    throw Object.assign(new Error("worker deadline reached"), { reason: "expired" });
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => {
            controller.abort();
            options.interrupt();
            reject(Object.assign(new Error("worker deadline reached"), { reason: "expired" }));
          },
          Math.min(remaining, 300_000),
        );
      }),
      options.run(controller.signal),
    ]);
    if (Date.parse(options.now()) >= Date.parse(options.deadline)) {
      controller.abort();
      options.interrupt();
      throw Object.assign(new Error("worker deadline reached"), { reason: "expired" });
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}
