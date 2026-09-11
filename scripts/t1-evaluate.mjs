// Offline scoring of independently verified v2 evidence inputs; no provider imports.
import { readFile, stat } from "node:fs/promises";
import { aggregateRuns } from "./t1-intervention.mjs";
import { evidenceFromReceipt } from "./t1-receipt.mjs";
if ((await stat(process.argv[2])).size > 1_000_000)
  throw new TypeError("Evaluation input too large");
const input = await readFile(process.argv[2], "utf8");
if (Buffer.byteLength(input) > 1_000_000) throw new TypeError("Evaluation input too large");
const runs = JSON.parse(input).map((entry) =>
  entry.receipt === undefined ? entry : evidenceFromReceipt(entry.receipt, entry.verification),
);
console.log(JSON.stringify(aggregateRuns(runs), null, 2));
