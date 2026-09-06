import { describe, expect, it } from "vitest";

import { credentialServiceEnvironment } from "./credential-service-environment.js";

describe("credential service child environment", () => {
  it("forwards only the two Linux Secret Service session variables", () => {
    expect(
      credentialServiceEnvironment(
        { GUARDIAN_PROVIDER: "fixed" },
        {
          platform: "linux",
          userId: 1000,
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
          userId: 1000,
          hostEnvironment: { DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus\nSECRET=x" },
        },
      ),
    ).toThrow("Linux credential service environment is invalid");
  });

  it("accepts one local abstract session bus and normalizes the runtime directory", () => {
    expect(
      credentialServiceEnvironment(
        {},
        {
          platform: "linux",
          userId: 1000,
          hostEnvironment: {
            DBUS_SESSION_BUS_ADDRESS:
              "unix:abstract=/tmp/dbus-AbCdEf0123,guid=0123456789abcdef0123456789abcdef",
            XDG_RUNTIME_DIR: "/run/user/1000/",
          },
        },
      ),
    ).toEqual({
      DBUS_SESSION_BUS_ADDRESS:
        "unix:abstract=/tmp/dbus-AbCdEf0123,guid=0123456789abcdef0123456789abcdef",
      XDG_RUNTIME_DIR: "/run/user/1000",
    });
  });

  it.each([
    {
      DBUS_SESSION_BUS_ADDRESS: "tcp:host=127.0.0.1,port=1234",
      XDG_RUNTIME_DIR: "/run/user/1000",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus;unix:abstract=/tmp/dbus-AbCdEf0123",
      XDG_RUNTIME_DIR: "/run/user/1000",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/tmp/attacker-bus",
      XDG_RUNTIME_DIR: "/run/user/1000",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      XDG_RUNTIME_DIR: "/run/user/1001",
    },
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
    },
  ])(
    "rejects remote, fallback, misplaced, mismatched, or incomplete routing",
    (hostEnvironment) => {
      expect(() =>
        credentialServiceEnvironment({}, { platform: "linux", userId: 1000, hostEnvironment }),
      ).toThrow("Linux credential service environment is invalid");
    },
  );
});
