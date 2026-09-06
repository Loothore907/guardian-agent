import { CredentialStoreConfigSchema } from "@guardian/contracts";
const MAXIMUM_SESSION_VALUE_LENGTH = 4_096;

function validatedUserId(userId: number | undefined): number {
  if (userId === undefined || !Number.isSafeInteger(userId) || userId < 0) {
    throw new TypeError("Linux credential service environment is invalid");
  }
  return userId;
}

function validatedSessionValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (
    value.length < 1 ||
    value.length > MAXIMUM_SESSION_VALUE_LENGTH ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint === undefined || codePoint < 32 || codePoint === 127;
    })
  ) {
    throw new TypeError("Linux credential service environment is invalid");
  }
  return value;
}

function validatedBusAddress(value: string | undefined, userId: number): string {
  const address = validatedSessionValue(value);
  if (address === undefined || address.includes(";")) {
    throw new TypeError("Linux credential service environment is invalid");
  }
  const optionalGuid = "(?:,guid=[0-9a-f]{32})?";
  const pathAddress = new RegExp(`^unix:path=/run/user/${userId}/bus${optionalGuid}$`, "u");
  const abstractAddress = new RegExp(
    `^unix:abstract=/tmp/dbus-[A-Za-z0-9_-]{6,64}${optionalGuid}$`,
    "u",
  );
  if (!pathAddress.test(address) && !abstractAddress.test(address)) {
    throw new TypeError("Linux credential service environment is invalid");
  }
  return address;
}

export function credentialServiceEnvironment(
  base: Readonly<Record<string, string>> = {},
  options: {
    readonly platform?: NodeJS.Platform;
    readonly hostEnvironment?: NodeJS.ProcessEnv;
    readonly userId?: number;
  } = {},
): Readonly<Record<string, string>> {
  if ((options.platform ?? process.platform) !== "linux") return { ...base };
  const hostEnvironment = options.hostEnvironment ?? process.env;
  const userId = validatedUserId(options.userId ?? process.getuid?.());
  const runtimeDirectory = validatedSessionValue(hostEnvironment.XDG_RUNTIME_DIR)?.replace(
    /\/$/u,
    "",
  );
  const expectedRuntime = `/run/user/${userId}`;
  if (runtimeDirectory !== expectedRuntime) {
    throw new TypeError("Linux credential service environment is invalid");
  }
  const busAddress = validatedBusAddress(hostEnvironment.DBUS_SESSION_BUS_ADDRESS, userId);
  return {
    ...base,
    DBUS_SESSION_BUS_ADDRESS: busAddress,
    XDG_RUNTIME_DIR: runtimeDirectory,
  };
}

/** Managed service identities use no desktop bus or inherited authentication environment. */
export function credentialEnvironmentForStore(
  config: unknown,
  base: Readonly<Record<string, string>> = {},
  options: Parameters<typeof credentialServiceEnvironment>[1] = {},
) {
  const store = CredentialStoreConfigSchema.parse(config);
  return store.custodyProfile === "managed_demo"
    ? { ...base }
    : credentialServiceEnvironment(base, options);
}
