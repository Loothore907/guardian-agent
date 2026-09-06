import { createHash } from "node:crypto";
import { mkdir, lstat, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { JudgeTaskScopeSchema, type JudgeTaskScope } from "@guardian/contracts";

/** Operator-provisioned, single-use fixtures. Reservations survive process death.
 * An abandoned fixture stays consumed until a separate operator reconciliation. */
export class JudgeMutationFixturePool {
  readonly #root: string;
  readonly #scopes: readonly JudgeTaskScope[];

  constructor(root: string, scopes: readonly unknown[]) {
    if (!isAbsolute(root) || scopes.length > 100) throw new TypeError("invalid fixture pool");
    this.#root = root;
    this.#scopes = scopes.map((scope) => JudgeTaskScopeSchema.parse(scope));
    const keys = this.#scopes.map((scope) => {
      if (scope.githubTarget?.operation !== "github.pull_request.merge")
        throw new TypeError("invalid mutation fixture");
      return this.#key(scope);
    });
    if (new Set(keys).size !== keys.length) throw new TypeError("duplicate mutation fixture");
  }

  #key(scope: JudgeTaskScope) {
    const target = scope.githubTarget!;
    return createHash("sha256")
      .update(JSON.stringify([target.owner, target.repository, target.pullRequest]))
      .digest("hex");
  }

  async reserve(): Promise<JudgeTaskScope> {
    return this.#reserve(this.#scopes);
  }

  async reserveTarget(scopeValue: unknown): Promise<void> {
    const scope = JudgeTaskScopeSchema.parse(scopeValue);
    const eligible = this.#scopes.filter(
      (candidate) => JSON.stringify(candidate.githubTarget) === JSON.stringify(scope.githubTarget),
    );
    if (eligible.length !== 1) throw new TypeError("mutation target is not a provisioned fixture");
    await this.#reserve(eligible);
  }

  async #reserve(scopes: readonly JudgeTaskScope[]): Promise<JudgeTaskScope> {
    await mkdir(this.#root, { recursive: true, mode: 0o700 });
    const metadata = await lstat(this.#root);
    if (
      !metadata.isDirectory() ||
      metadata.isSymbolicLink() ||
      (process.platform !== "win32" &&
        ((metadata.mode & 0o077) !== 0 || metadata.uid !== process.getuid?.()))
    )
      throw new TypeError("fixture state is not private");
    for (const scope of scopes) {
      const path = join(this.#root, this.#key(scope));
      try {
        await mkdir(path, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
        // eslint-disable-next-line preserve-caught-error -- Filesystem errors may expose private state paths.
        throw new TypeError("fixture reservation unavailable");
      }
      // Failure after mkdir intentionally burns the fixture; it never resets silently.
      await writeFile(
        join(path, "reservation.json"),
        JSON.stringify({ schemaVersion: 1, target: scope.githubTarget }),
        { flag: "wx", mode: 0o600 },
      );
      return structuredClone(scope);
    }
    throw new TypeError("fixture pool exhausted");
  }
}
