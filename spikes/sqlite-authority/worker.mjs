import { DatabaseSync } from "node:sqlite";

import { SQLiteAuthoritySpike } from "./authority-store.mjs";

const [operation, databasePath, identifier, timestamp, amount] = process.argv.slice(2);

if (operation === "crash-write") {
  const database = new DatabaseSync(databasePath, { timeout: 5_000 });
  database.exec("BEGIN IMMEDIATE;");
  database
    .prepare(
      "INSERT INTO sessions(session_id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
    )
    .run(identifier, timestamp, timestamp);
  process.exit(23);
}

const store = new SQLiteAuthoritySpike(databasePath);
if (operation === "consume-nonce-crash") {
  const consumed = store.consumeNonce(identifier, timestamp);
  process.exit(consumed ? 24 : 3);
}
if (operation === "reserve-research-crash") {
  const reserved = store.reserveResearch(identifier, Number(amount));
  process.exit(reserved ? 25 : 3);
}
try {
  if (operation === "consume-nonce") {
    process.stdout.write(store.consumeNonce(identifier, timestamp) ? "consumed" : "denied");
  } else if (operation === "reserve-research") {
    process.stdout.write(
      store.reserveResearch(identifier, Number(amount)) ? "reserved" : "denied",
    );
  } else {
    process.exitCode = 2;
  }
} finally {
  store.close();
}
