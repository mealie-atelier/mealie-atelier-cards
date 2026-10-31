import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const active = readFileSync(new URL("../.env.example", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line.trim() && !line.trim().startsWith("#"));

test(".env.example keeps the documented defaults (writable app, default user)", () => {
  assert.ok(!active.some((l) => /^ATELIER_READ_ONLY=(1|true|yes)$/i.test(l)));
  assert.ok(!active.some((l) => l.startsWith("ATELIER_USERNAME=")));
  assert.ok(!active.some((l) => l.startsWith("ATELIER_EXPERIMENTAL_INGREDIENTS")));
});

test(".env.example documents the sync language and the test-only Bring! variables as comments", () => {
  const text = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  for (const name of ["ATELIER_SYNC_LANGUAGE", "BRING_API_BASE", "BRING_API_KEY"]) {
    assert.match(text, new RegExp(`^# ${name}=`, "m"));
    assert.ok(!active.some((l) => l.startsWith(`${name}=`)));
  }
});
