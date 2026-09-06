const MAXIMUM_SESSION_VALUE_LENGTH = 4_096;

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

export function credentialServiceEnvironment(
  base: Readonly<Record<string, string>> = {},
  options: {
    readonly platform?: NodeJS.Platform;
    readonly hostEnvironment?: NodeJS.ProcessEnv;
  } = {},
): Readonly<Record<string, string>> {
  if ((options.platform ?? process.platform) !== "linux") return { ...base };
  const hostEnvironment = options.hostEnvironment ?? process.env;
  const busAddress = validatedSessionValue(hostEnvironment.DBUS_SESSION_BUS_ADDRESS);
  const runtimeDirectory = validatedSessionValue(hostEnvironment.XDG_RUNTIME_DIR);
  return {
    ...base,
    ...(busAddress === undefined ? {} : { DBUS_SESSION_BUS_ADDRESS: busAddress }),
    ...(runtimeDirectory === undefined ? {} : { XDG_RUNTIME_DIR: runtimeDirectory }),
  };
}
