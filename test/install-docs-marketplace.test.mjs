import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the install docs name where the Marketplace is", () => {
  for (const path of ["README.md", "docs/FAQ.md"]) {
    const text = read(path);
    assert.match(text, /\*\*Settings → Marketplace\*\*/, `${path} names Settings → Marketplace`);
    assert.match(text, /\/marketplace\/browse/, `${path} names the Marketplace route`);
  }
});
