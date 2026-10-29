import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("README tells Docker users to run npm run vapid on a machine with Node", () => {
  const readme = read("README.md");
  const line = readme.split("\n").find((l) => l.includes("`npm run vapid`"));
  assert.ok(line, "vapid instruction present");
  assert.match(line, /any machine with Node 22 or later/);
  assert.match(line, /Docker image does not contain/);
});

test("the Docker image really lacks scripts/ (so the README caveat stays needed)", () => {
  assert.doesNotMatch(read("Dockerfile"), /scripts/);
});
