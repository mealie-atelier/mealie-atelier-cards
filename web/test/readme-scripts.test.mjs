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

test("README Bring! section is linked, uses English labels first and a web/-relative fake command", () => {
  const readme = read("README.md");
  const contents = readme.split("\n")[2];
  assert.match(contents, /\[Development\]\(#development\)/);
  assert.match(contents, /\[Bring!\]\(#smart-shopping-sync-to-bring\)/);
  assert.match(readme, /\*\*Connect to Bring!\*\* \(German: Mit Bring! verbinden\)/);
  assert.doesNotMatch(readme, /\*\*Mit Bring! verbinden\*\*/);
  assert.match(readme, /`node test\/support\/fake-bring-server\.mjs 5110`/);
  assert.doesNotMatch(readme, /node web\/test\/support/);
  assert.match(readme, /host\.docker\.internal/);
});

test("fake Bring! server accepts a host and prints a Docker reachable base", async () => {
  const { publicBase } = await import("./support/fake-bring-server.mjs");
  assert.equal(publicBase("http://127.0.0.1:5110", "0.0.0.0"), "http://host.docker.internal:5110");
  assert.equal(publicBase("http://127.0.0.1:5110", "127.0.0.1"), "http://127.0.0.1:5110");
});

test("ATELIER_SYNC_LANGUAGE is documented in README, .env.example and compose.yaml", () => {
  for (const f of ["README.md", ".env.example", "compose.yaml"]) {
    assert.match(read(f), /ATELIER_SYNC_LANGUAGE/, f);
  }
});

test("documented ATELIER_SYNC_LANGUAGE fallback matches server.mjs", () => {
  // Unset, the server follows the language of the last sync request and falls back to English.
  assert.match(read("server.mjs"), /ATELIER_SYNC_LANGUAGE \|\| syncLocale\.getStore\(\) \|\| lastSyncLocale \|\| "en"/);
  const row = read("README.md")
    .split("\n")
    .find((l) => l.includes("`ATELIER_SYNC_LANGUAGE`"));
  assert.match(row, /\| empty\s+\|/);
  assert.match(row, /English until a sync request was made/);
  assert.match(read(".env.example"), /English until one was made/);
  assert.doesNotMatch(read("compose.yaml"), /default de/);
});
