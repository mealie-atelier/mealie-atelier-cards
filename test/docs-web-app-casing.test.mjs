import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "CHANGELOG.md",
  "docs/FAQ.md",
  "docs/MARKETPLACE.md",
  "docs/REPOSITORY_MAP.md",
  "web/.env.example",
];

test('"Web app" is capitalized only at the start of a sentence or line', () => {
  for (const file of files) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const m of line.matchAll(/Web app/g)) {
          const before = line.slice(0, m.index);
          const ok = /^[\s>*#|\-]*$/.test(before) || /[.!?]\s+$/.test(before);
          assert.ok(ok, `${file}:${i + 1} has a mid-sentence "Web app"`);
        }
      });
  }
});
