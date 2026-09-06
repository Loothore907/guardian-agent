import { describe, expect, it } from "vitest";

import { credentialServiceEnvironment } from "./credential-service-environment.js";

describe("credential service child environment", () => {
  it("forwards only the two Linux Secret Service session variables", () => {
    expect(
      credentialServiceEnvironment(
        { GUARDIAN_PROVIDER: "fixed" },
        {
          platform: "linux",
          hostEnvironment: {
            DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
            XDG_RUNTIME_DIR: "/run/user/1000",
            HOME: "/private/home",
            PATH: "/untrusted/bin",
            PROVIDER_SECRET: "must-not-cross",
          },
        },
      ),
    ).toEqual({
      GUARDIAN_PROVIDER: "fixed",
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      XDG_RUNTIME_DIR: "/run/user/1000",
    });
  });

  it("does not widen non-Linux child environments", () => {
    expect(
      credentialServiceEnvironment(
        { GUARDIAN_PROVIDER: "fixed" },
        {
          platform: "win32",
          hostEnvironment: { DBUS_SESSION_BUS_ADDRESS: "must-not-cross" },
        },
      ),
    ).toEqual({ GUARDIAN_PROVIDER: "fixed" });
  });

  it("fails closed on malformed session routing values", () => {
    expect(() =>
      credentialServiceEnvironment(
        {},
        {
          platform: "linux",
          hostEnvironment: { DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus\nSECRET=x" },
        },
      ),
    ).toThrow("Linux credential service environment is invalid");
  });
});
