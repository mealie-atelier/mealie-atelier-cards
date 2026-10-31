import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const slug = (h) =>
  h
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/ /g, "-");

test("web README in-page links point to an existing heading other than their own section", () => {
  const lines = readFileSync("web/README.md", "utf8").split("\n");
  const slugs = new Set();
  lines.forEach((l) => {
    const m = /^#{1,6} (.+)$/.exec(l);
    if (m) slugs.add(slug(m[1].replace(/`/g, "")));
  });
  let section = "";
  for (const l of lines) {
    const h = /^#{1,2} (.+)$/.exec(l);
    if (h) section = slug(h[1]);
    for (const m of l.matchAll(/\]\(#([^)]+)\)/g)) {
      assert.ok(slugs.has(m[1]), `broken anchor #${m[1]}`);
      assert.notEqual(m[1], section, `link to its own section #${m[1]}`);
    }
  }
});

test("CHANGELOG release lists stay tight", () => {
  const lines = readFileSync("CHANGELOG.md", "utf8").split("\n");
  lines.forEach((l, i) => {
    if (l === "" && lines[i - 1]?.startsWith("- ") && lines[i + 1]?.startsWith("- ")) {
      assert.fail(`loose list at line ${i + 1}`);
    }
  });
});
