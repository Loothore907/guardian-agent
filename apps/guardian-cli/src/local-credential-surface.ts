import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { CredentialProviderSchema, CredentialStoreTargetSchema } from "@guardian/contracts";

const MAXIMUM_SECRET_BYTES = 4_096;
const MAXIMUM_SURFACE_LIFETIME_MS = 5 * 60_000;

export type LocalCredentialSurfaceMode = "enroll" | "review";
export type LocalCredentialSurfaceDestination =
  "windows_credential_manager" | "linux_secret_service";

export interface LocalCredentialSurface {
  readonly url: string;
  readonly completed: Promise<"submitted" | "cancelled" | "failed" | "expired">;
  readonly close: () => Promise<void>;
}

function writeHeaders(response: ServerResponse, status: number, contentType: string): void {
  response.writeHead(status, {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": contentType,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
}

function reject(response: ServerResponse): void {
  writeHeaders(response, 404, "text/plain; charset=utf-8");
  response.end("Not found\n");
}

function page(
  mode: LocalCredentialSurfaceMode,
  provider: "nebius" | "tavily",
  destination: string,
  nonce: string,
): string {
  const label = provider === "nebius" ? "Nebius" : "Tavily";
  const review = mode === "review";
  const title = review ? `Review ${label} credential setup` : `Add ${label} credential`;
  const explanation = review
    ? `Review mode. Use only an obvious fake value. Nothing is stored or sent to ${label}. Destination under review: <strong>${destination}</strong>.`
    : `This local one-time window sends the credential only to Guardian on <code>127.0.0.1</code>. Destination: <strong>${destination}</strong>.`;
  const submitLabel = review ? "Submit fake value" : "Verify and save";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guardian credential setup</title>
  <style nonce="${nonce}">
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #0b1020; color: #eef2ff; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; }
    dialog { display: block; position: static; width: min(32rem, calc(100% - 2rem)); border: 1px solid #334155; border-radius: 1rem; background: #111827; color: inherit; padding: 1.5rem; box-shadow: 0 1.5rem 4rem #0008; }
    h1 { margin-top: 0; font-size: 1.35rem; }
    p, label { line-height: 1.5; color: #cbd5e1; }
    code { color: #a5b4fc; }
    input { box-sizing: border-box; width: 100%; margin: .5rem 0 1rem; padding: .8rem; border: 1px solid #475569; border-radius: .5rem; background: #020617; color: #fff; }
    menu { display: flex; justify-content: flex-end; gap: .75rem; padding: 0; margin: 0; }
    button { padding: .7rem 1rem; border-radius: .5rem; border: 1px solid #64748b; background: #1e293b; color: #fff; cursor: pointer; }
    button[type=submit] { background: #4f46e5; border-color: #6366f1; }
    #status { min-height: 1.5rem; }
  </style>
</head>
<body>
  <dialog open aria-labelledby="title">
    <h1 id="title">${title}</h1>
    <p>${explanation}</p>
    <form id="credential-form">
      <label for="credential">Credential</label>
      <input id="credential" name="credential" type="password" minlength="8" maxlength="4096" required autocomplete="new-password" autocapitalize="off" spellcheck="false">
      <p id="status" role="status" aria-live="polite"></p>
      <menu><button id="cancel" type="button">Cancel</button><button type="submit">${submitLabel}</button></menu>
    </form>
  </dialog>
  <script nonce="${nonce}">
    const capability = location.hash.slice(1);
    history.replaceState(null, "", "/");
    const form = document.getElementById("credential-form");
    const input = document.getElementById("credential");
    const status = document.getElementById("status");
    async function send(path, body) {
      return await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "X-Guardian-Capability": capability },
        body,
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer"
      });
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const bytes = new TextEncoder().encode(input.value);
      input.value = "";
      try {
        const response = await send("/submit", bytes);
        status.textContent = response.ok ? "Submitted. You may close this window." : "Submission failed. Close this window and start again.";
        if (response.ok) form.querySelectorAll("input,button").forEach((element) => { element.disabled = true; });
      } finally { bytes.fill(0); }
    });
    document.getElementById("cancel").addEventListener("click", async () => {
      input.value = "";
      const response = await send("/cancel", new Uint8Array());
      status.textContent = response.ok ? "Cancelled. You may close this window." : "Cancellation failed. Close this window.";
      form.querySelectorAll("input,button").forEach((element) => { element.disabled = true; });
    });
  </script>
</body>
</html>`;
}

function readSecret(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, rejectPromise) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let oversized = false;
    let finished = false;
    const fail = () => {
      if (finished) return;
      finished = true;
      for (const chunk of chunks) chunk.fill(0);
      rejectPromise(new TypeError("credential submission is invalid"));
    };
    request.on("data", (chunkValue: Buffer | string) => {
      const chunk = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue);
      total += chunk.byteLength;
      if (oversized || total > MAXIMUM_SECRET_BYTES) {
        oversized = true;
        chunk.fill(0);
      } else {
        chunks.push(chunk);
      }
    });
    request.once("error", fail);
    request.once("end", () => {
      if (finished) return;
      if (total < 8 || oversized) {
        fail();
        return;
      }
      const secret = Buffer.concat(chunks, total);
      for (const chunk of chunks) chunk.fill(0);
      if (secret.some((byte) => byte < 0x21 || byte > 0x7e)) {
        secret.fill(0);
        rejectPromise(new TypeError("credential submission is invalid"));
        return;
      }
      finished = true;
      resolve(secret);
    });
  });
}

export async function startLocalCredentialSurface(options: {
  readonly mode: LocalCredentialSurfaceMode;
  readonly provider: unknown;
  readonly destination: unknown;
  readonly onSubmit: (secret: Uint8Array) => Promise<void>;
  readonly lifetimeMs?: number;
}): Promise<LocalCredentialSurface> {
  if (options.mode !== "enroll" && options.mode !== "review") {
    throw new TypeError("credential surface mode is invalid");
  }
  const provider = CredentialProviderSchema.exclude(["github"]).parse(options.provider);
  const destinationTarget = CredentialStoreTargetSchema.parse(options.destination);
  if (
    destinationTarget !== "windows_credential_manager" &&
    destinationTarget !== "linux_secret_service"
  ) {
    throw new TypeError("local credential destination is unsupported");
  }
  const destination = destinationTarget.replaceAll("_", " ");
  const lifetimeMs = options.lifetimeMs ?? MAXIMUM_SURFACE_LIFETIME_MS;
  if (
    !Number.isSafeInteger(lifetimeMs) ||
    lifetimeMs < 1_000 ||
    lifetimeMs > MAXIMUM_SURFACE_LIFETIME_MS
  ) {
    throw new TypeError("credential surface lifetime is invalid");
  }
  const capability = randomBytes(32).toString("base64url");
  const capabilityBytes = Buffer.from(capability, "ascii");
  const nonce = randomBytes(18).toString("base64url");
  let consumed = false;
  let settled = false;
  let complete!: (value: "submitted" | "cancelled" | "failed" | "expired") => void;
  const completed = new Promise<"submitted" | "cancelled" | "failed" | "expired">((resolve) => {
    complete = resolve;
  });
  const finish = (outcome: "submitted" | "cancelled" | "failed" | "expired") => {
    if (settled) return;
    settled = true;
    complete(outcome);
  };
  const server = createServer((request, response) => {
    void (async () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) return reject(response);
      const origin = `http://127.0.0.1:${address.port}`;
      if (request.headers.host !== `127.0.0.1:${address.port}`) return reject(response);
      if (request.method === "GET" && request.url === "/") {
        response.setHeader(
          "Content-Security-Policy",
          `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
        );
        writeHeaders(response, 200, "text/html; charset=utf-8");
        response.end(page(options.mode, provider, destination, nonce));
        return;
      }
      const supplied = request.headers["x-guardian-capability"];
      const suppliedBytes =
        typeof supplied === "string" ? Buffer.from(supplied, "ascii") : Buffer.alloc(0);
      const authorized =
        request.method === "POST" &&
        request.socket.remoteAddress === "127.0.0.1" &&
        request.headers.origin === origin &&
        request.headers["sec-fetch-site"] === "same-origin" &&
        request.headers["content-type"] === "application/octet-stream" &&
        suppliedBytes.byteLength === capabilityBytes.byteLength &&
        timingSafeEqual(suppliedBytes, capabilityBytes);
      suppliedBytes.fill(0);
      if (!authorized || consumed) return reject(response);
      if (request.url === "/cancel") {
        consumed = true;
        clearTimeout(timer);
        writeHeaders(response, 204, "text/plain; charset=utf-8");
        response.end();
        finish("cancelled");
        return;
      }
      if (request.url !== "/submit") {
        return reject(response);
      }
      consumed = true;
      clearTimeout(timer);
      const secret = await readSecret(request);
      try {
        await options.onSubmit(secret);
        writeHeaders(response, 204, "text/plain; charset=utf-8");
        response.end();
        finish("submitted");
      } catch {
        writeHeaders(response, 500, "text/plain; charset=utf-8");
        response.end("Credential verification failed\n");
        finish("failed");
      } finally {
        secret.fill(0);
      }
    })().catch(() => {
      if (!response.headersSent) writeHeaders(response, 400, "text/plain; charset=utf-8");
      response.end("Credential submission failed\n");
      if (consumed) finish("failed");
    });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  await new Promise<void>((resolve, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (typeof address !== "object" || address === null)
    throw new TypeError("credential surface failed");
  const timer = setTimeout(() => {
    if (consumed) return;
    consumed = true;
    finish("expired");
    void close();
  }, lifetimeMs);
  timer.unref();
  async function close(): Promise<void> {
    clearTimeout(timer);
    capabilityBytes.fill(0);
    finish("expired");
    if (!server.listening) return;
    await new Promise<void>((resolve, rejectPromise) =>
      server.close((error) => (error === undefined ? resolve() : rejectPromise(error))),
    );
  }
  return {
    url: `http://127.0.0.1:${address.port}/#${capability}`,
    completed,
    close,
  };
}
