import assert from "node:assert/strict";
import test from "node:test";
import { assertLinuxKeyringReady } from "./linux-keyring-preflight.mjs";

const environment = {
  XDG_RUNTIME_DIR: "/run/user/1000",
  DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
};
const alias = 'o "/org/freedesktop/secrets/collection/Default_5fkeyring"\n';
function fixture(outputs, overrides = {}) {
  const calls = [];
  const options = {
    platform: "linux",
    userId: 1000,
    environment,
    run: (file, args, config) => {
      calls.push({ file, args, config });
      const output = outputs.shift();
      return typeof output === "string" ? { status: 0, stdout: output, stderr: "" } : output;
    },
    ...overrides,
  };
  return { options, calls };
}

test("unlocked default collection passes using only two fixed metadata calls", () => {
  const { options, calls } = fixture([alias, "b false\n"]);
  assertLinuxKeyringReady(options);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].file, "/usr/bin/busctl");
  assert.deepEqual(calls[0].args.slice(2), [
    "call",
    "org.freedesktop.secrets",
    "/org/freedesktop/secrets",
    "org.freedesktop.Secret.Service",
    "ReadAlias",
    "s",
    "default",
  ]);
  assert.deepEqual(calls[1].args.slice(2), [
    "get-property",
    "org.freedesktop.secrets",
    "/org/freedesktop/secrets/collection/Default_5fkeyring",
    "org.freedesktop.Secret.Collection",
    "Locked",
  ]);
  assert.deepEqual(calls[0].config.env, environment);
});
test("locked and missing collections have actionable errors without writes", () => {
  assert.throws(
    () => assertLinuxKeyringReady(fixture([alias, "b true"]).options),
    /keyring is locked/,
  );
  const missing = fixture(['o "/"']);
  assert.throws(() => assertLinuxKeyringReady(missing.options), /keyring is missing/);
  assert.equal(missing.calls.length, 1);
});
test("unexpected metadata and arbitrary paths fail closed", () => {
  for (const value of [
    'o "/tmp/other"',
    'o "/org/freedesktop/secrets/collection/a" extra',
    "",
    "s private",
  ]) {
    const invalid = fixture([value]);
    assert.throws(() => assertLinuxKeyringReady(invalid.options), /unavailable/);
    assert.equal(invalid.calls.length, 1);
  }
  assert.throws(() => assertLinuxKeyringReady(fixture([alias, "b maybe"]).options), /unavailable/);
});
test("bus failure, timeout, and diagnostics never reflect raw output", () => {
  for (const result of [
    { status: 1, stdout: "private", stderr: "private" },
    { status: null, error: new Error("private") },
    { status: 0, stdout: alias, stderr: "private" },
  ]) {
    assert.throws(
      () => assertLinuxKeyringReady(fixture([result]).options),
      (error) => error.message.includes("unavailable") && !error.message.includes("private"),
    );
  }
});
test("wrong user or bus routing fails before invocation", () => {
  for (const override of [
    { userId: -1 },
    { userId: 1001 },
    { environment: {} },
    { environment: { ...environment, DBUS_SESSION_BUS_ADDRESS: "tcp:host=example.com" } },
  ]) {
    const invalid = fixture([], override);
    assert.throws(() => assertLinuxKeyringReady(invalid.options), /unavailable/);
    assert.equal(invalid.calls.length, 0);
  }
});
test("non-Linux protected runs do not invoke Linux tooling", () => {
  const windows = fixture([], { platform: "win32" });
  assertLinuxKeyringReady(windows.options);
  assert.equal(windows.calls.length, 0);
});
