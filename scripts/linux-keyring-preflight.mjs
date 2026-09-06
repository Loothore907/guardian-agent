import { spawnSync } from "node:child_process";

// Metadata only: never search items, look up a secret, unlock, or create a store.
export function assertLinuxKeyringReady({
  platform = process.platform,
  userId = process.getuid?.(),
  environment = process.env,
  run = spawnSync,
} = {}) {
  if (platform !== "linux") return;
  const unavailable = () =>
    new Error(
      "Linux user Secret Service is unavailable; restore the normal user session before retrying.",
    );
  if (
    !Number.isSafeInteger(userId) ||
    userId < 0 ||
    environment.XDG_RUNTIME_DIR !== `/run/user/${userId}` ||
    environment.DBUS_SESSION_BUS_ADDRESS !== `unix:path=/run/user/${userId}/bus`
  )
    throw unavailable();

  function metadata(arguments_) {
    const result = run("/usr/bin/busctl", ["--user", "--timeout=5", ...arguments_], {
      env: {
        DBUS_SESSION_BUS_ADDRESS: environment.DBUS_SESSION_BUS_ADDRESS,
        XDG_RUNTIME_DIR: environment.XDG_RUNTIME_DIR,
      },
      encoding: "utf8",
      timeout: 6_000,
      killSignal: "SIGKILL",
      maxBuffer: 4_096,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    if (
      result.error ||
      result.status !== 0 ||
      result.stderr !== "" ||
      typeof result.stdout !== "string"
    )
      throw unavailable();
    return result.stdout.trim();
  }

  const alias = metadata([
    "call",
    "org.freedesktop.secrets",
    "/org/freedesktop/secrets",
    "org.freedesktop.Secret.Service",
    "ReadAlias",
    "s",
    "default",
  ]);
  if (alias === 'o "/"')
    throw new Error(
      "Linux default keyring is missing; complete the accepted user-operated store setup before retrying.",
    );
  const path = /^o "(\/org\/freedesktop\/secrets\/collection\/[A-Za-z0-9_]+)"$/u.exec(alias)?.[1];
  if (path === undefined) throw unavailable();
  const locked = metadata([
    "get-property",
    "org.freedesktop.secrets",
    path,
    "org.freedesktop.Secret.Collection",
    "Locked",
  ]);
  if (locked === "b true")
    throw new Error(
      "Linux default keyring is locked; unlock it through its native prompt before retrying. Do not reenroll the provider key.",
    );
  if (locked !== "b false") throw unavailable();
}
