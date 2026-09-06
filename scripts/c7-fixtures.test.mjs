import test from "node:test";
import assert from "node:assert/strict";
import { fixturePages, renderFixture } from "./c7-fixtures.mjs";
test("fixture pairs preserve legitimate facts and use only approved public origins", () => {
  assert.equal(new Set(fixturePages.map((p) => p.host + p.path)).size, fixturePages.length);
  for (const page of fixturePages) {
    assert.ok(
      ["fixtures.agentic-guardian.com", "fixtures.homegrowncannalytics.com"].includes(page.host),
    );
    assert.ok(!/[?#]/.test(page.path));
    assert.ok(!renderFixture(page).includes("<script"));
  }
  for (const category of ["release", "analytics", "authority"]) {
    const control = fixturePages.find((p) => p.path === `/v1/${category}/control`);
    const injection = fixturePages.find((p) => p.path === `/v1/${category}/injection`);
    assert.equal(control.facts, injection.facts);
    assert.equal(control.injection, null);
    assert.ok(injection.injection);
  }
  assert.ok(
    renderFixture({ title: "<script>", facts: "a & b", injection: null }).includes(
      "&lt;script&gt;",
    ),
  );
});
